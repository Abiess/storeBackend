import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../models/dhl_parcel_dto.dart';
import '../../models/dhl_slot_dto.dart';
import '../../models/dhl_store_parcel_request.dart';
import '../../models/dhl_tracking_validation_dto.dart';
import '../../services/dhl_scan_feedback_service.dart';
import '../../services/dhl_service.dart';
import '../../services/token_storage.dart';
import '../../theme/markt_theme.dart';
import '../../widgets/markt_barcode_camera_scanner.dart';

/// Fachlicher Validierungszustand des Tracking-Codes gegen die DHL Tracking
/// API - 1:1 dieselbe Zustandsmaschine wie im bestehenden Angular-Flow
/// (`dhl-store-parcel.component.ts`, `TrackingValidationState`), siehe
/// DHL-Einlagerungs-Audit vom 23.09.:
///
/// idle            → noch nicht (erfolgreich) durch DHL bestaetigt
/// validating      → DHL-Pruefung laeuft gerade
/// valid           → DHL hat die Sendung bestaetigt (Einlagern erlaubt)
/// invalid         → DHL kennt/akzeptiert den Code nicht (fachlicher Fehler)
/// technicalError  → Pruefung konnte technisch nicht durchgefuehrt werden
enum TrackingValidationState { idle, validating, valid, invalid, technicalError }

/// Erster echter Einlagerungs-Flow "Paket einlagern" (siehe
/// DHL-Einlagerungs-Audit vom 23.09. + Umsetzung danach):
///
/// Trackingnummer (Scanner/Hardware-Scanner/manuell)
///   → Debounce
///   → POST /tracking/validate (UX-Vorpruefung)
///   → nur bei VALID: [Einlagern] aktiv
///   → Lagerplatz automatisch oder manuell waehlen
///   → POST /parcels/store { trackingCode, mode, slotCode? }
///     (Backend validiert dabei selbst ERNEUT autoritativ gegen DHL)
///   → Erfolg: Lagerplatz gross anzeigen
///   → [Naechstes Paket] (Zustand zuruecksetzen, Feld fokussieren) oder
///     [Zur Uebersicht] (zurueck zu `DhlHomeScreen`, das die Liste beim
///     Zurueckkehren aktualisiert, siehe dort)
///
/// Bewusst NOCH NICHT Teil dieses Screens (siehe Aufgabenstellung):
/// Kamera-Scanner und Paketabholung. Das
/// Trackingnummer-Feld unterstuetzt gleichermassen manuelle Eingabe UND
/// Hardware-/USB-/Bluetooth-HID-Scanner (die wie eine Tastatur in ein
/// fokussiertes Textfeld "tippen") - beide Eingabewege durchlaufen exakt
/// denselben `onChanged`-Handler, kein Bypass moeglich (analog zum
/// bestehenden Angular-Flow, siehe Audit).
class DhlStoreParcelScreen extends StatefulWidget {
  const DhlStoreParcelScreen({
    super.key,
    required this.storeId,
    this.dhlService,
    this.scanFeedback,
    this.cameraScanner,
  });

  final int storeId;

  /// Nur fuer Tests: erlaubt das Einschleusen eines Fake-`DhlService`
  /// (analog zum bestehenden Injection-Muster in `DhlHomeScreen`).
  final DhlService? dhlService;
  final DhlScanFeedback? scanFeedback;
  final BarcodeCameraScanLauncher? cameraScanner;

  @override
  State<DhlStoreParcelScreen> createState() => _DhlStoreParcelScreenState();
}

class _DhlStoreParcelScreenState extends State<DhlStoreParcelScreen> {
  /// Identische Mindestlaenge wie die bestehende Backend-/Angular-
  /// Normalisierung (`DhlParcelService.normalizeTrackingCode`,
  /// `DhlService.normalizeTrackingCode` in Angular) - ein kuerzerer Code
  /// loest bewusst noch KEINEN Validate-Call aus.
  static const int _minTrackingCodeLength = 10;
  static const Duration _debounceDuration = Duration(milliseconds: 400);

  late final DhlService _dhlService = widget.dhlService ?? DhlService();
  late final DhlScanFeedback _scanFeedback = widget.scanFeedback ?? DhlScanFeedbackService();
  final _trackingController = TextEditingController();
  final _notesController = TextEditingController();
  final _focusNode = FocusNode();

  Timer? _debounceTimer;

  TrackingValidationState _validationState = TrackingValidationState.idle;
  DhlTrackingValidationDto? _validatedResult;
  String? _validationMessage;

  bool _scanSoundsEnabled = true;
  bool _submitting = false;
  Object? _storeError;

  String _trackingMode = 'scanner';
  String _slotMode = 'auto';
  List<DhlSlotDto> _slots = const [];
  DhlSlotDto? _selectedSlot;
  bool _loadingSlots = false;
  Object? _slotsError;

  bool _success = false;
  DhlParcelDto? _storedParcel;

  @override
  void initState() {
    super.initState();
    unawaited(_loadScanSoundPreference());
  }

  Future<void> _loadScanSoundPreference() async {
    final enabled = await _scanFeedback.loadEnabled();
    if (!mounted) return;
    setState(() => _scanSoundsEnabled = enabled);
  }

  void _toggleScanSounds() {
    final next = !_scanSoundsEnabled;
    setState(() => _scanSoundsEnabled = next);
    unawaited(_scanFeedback.setEnabled(next));
  }

  void _playScanFeedback(DhlScanFeedbackState state) {
    if (_scanSoundsEnabled) {
      unawaited(_scanFeedback.playForState(state));
    }
  }

  @override
  void dispose() {
    _debounceTimer?.cancel();
    _trackingController.dispose();
    _notesController.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  bool get _canSubmit =>
      _validationState == TrackingValidationState.valid &&
      !_submitting &&
      (_slotMode == 'auto' || _selectedSlot != null);

  void _setTrackingMode(String mode) {
    if (_submitting || mode == _trackingMode) return;
    setState(() {
      _trackingMode = mode;
    });
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      _focusNode.requestFocus();
      if (mode == 'scanner') {
        SystemChannels.textInput.invokeMethod<void>('TextInput.hide');
      }
    });
  }

  Future<void> _scanWithCamera() async {
    if (_submitting) return;
    final launcher = widget.cameraScanner ?? showMarktBarcodeCameraScanner;
    final scanned = await launcher(context);
    if (!mounted) return;

    final code = scanned?.trim();
    if (code == null || code.isEmpty) return;

    _trackingController.value = TextEditingValue(
      text: code,
      selection: TextSelection.collapsed(offset: code.length),
    );
    _onTrackingChanged(code);
  }

  Future<void> _setSlotMode(String mode) async {
    if (_submitting || mode == _slotMode) return;
    setState(() {
      _slotMode = mode;
      _selectedSlot = null;
      _slotsError = null;
    });
    if (mode == 'manual' && _slots.isEmpty) {
      await _loadSlots();
    }
  }

  Future<void> _loadSlots() async {
    setState(() {
      _loadingSlots = true;
      _slotsError = null;
    });
    try {
      final slots = await _dhlService.getSlots(widget.storeId);
      if (!mounted) return;
      setState(() {
        _slots = slots;
        _loadingSlots = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loadingSlots = false;
        _slotsError = e;
      });
    }
  }

  void _onTrackingChanged(String raw) {
    _debounceTimer?.cancel();
    _storeError = null;

    if (_validationState != TrackingValidationState.idle) {
      setState(() {
        _validationState = TrackingValidationState.idle;
        _validatedResult = null;
        _validationMessage = null;
      });
    }

    final trimmed = raw.trim();
    if (trimmed.length < _minTrackingCodeLength) {
      return;
    }

    _debounceTimer = Timer(_debounceDuration, () => _runValidation(trimmed));
  }

  /// Automatische DHL-Validierung (debounced). Race-Guard: Ergebnisse eines
  /// veralteten Requests (Code hat sich inzwischen erneut geaendert) werden
  /// verworfen - identisch zum bestehenden Angular-Verhalten
  /// (`runValidation()` in `dhl-store-parcel.component.ts`).
  Future<void> _runValidation(String code) async {
    if (_trackingController.text.trim() != code) {
      return;
    }

    setState(() {
      _validationState = TrackingValidationState.validating;
      _validatedResult = null;
      _validationMessage = null;
    });

    try {
      final result = await _dhlService.validateTrackingCode(widget.storeId, code);
      if (!mounted || _trackingController.text.trim() != code) return;

      if (result.isValid) {
        setState(() {
          _validationState = TrackingValidationState.valid;
          _validatedResult = result;
        });
        _playScanFeedback(DhlScanFeedbackState.valid);
      } else {
        setState(() {
          _validationState = TrackingValidationState.invalid;
          _validationMessage = result.dhlErrorMessage;
        });
        _playScanFeedback(DhlScanFeedbackState.invalid);
      }
    } on ApiException catch (e) {
      if (!mounted || _trackingController.text.trim() != code) return;
      setState(() {
        _validationState = TrackingValidationState.technicalError;
        _validationMessage = e.message;
      });
      _playScanFeedback(DhlScanFeedbackState.technicalError);
    } catch (_) {
      if (!mounted || _trackingController.text.trim() != code) return;
      setState(() {
        _validationState = TrackingValidationState.technicalError;
        _validationMessage = null;
      });
      _playScanFeedback(DhlScanFeedbackState.technicalError);
    }
  }

  /// Fuehrt die eigentliche Einlagerung durch - NUR ueber den (per
  /// [_canSubmit] fail-closed abgesicherten) Button auslösbar, NACHDEM
  /// [_validationState] bereits `valid` ist. Keine erneute clientseitige
  /// Validierung noetig: das autoritative Backend validiert beim Speichern
  /// ohnehin nochmals (siehe `DhlController.storeParcel`).
  Future<void> _submit() async {
    if (!_canSubmit) return; // fail-closed + Doppel-Submit-Schutz in einem Guard

    setState(() {
      _submitting = true;
      _storeError = null;
    });

    try {
      final request = DhlStoreParcelRequest(
        trackingCode: _trackingController.text.trim(),
        mode: _slotMode,
        slotCode: _slotMode == 'manual' ? _selectedSlot?.code : null,
        notes: _notesController.text.trim().isEmpty ? null : _notesController.text.trim(),
      );
      final parcel = await _dhlService.storeParcel(widget.storeId, request);
      if (!mounted) return;
      setState(() {
        _storedParcel = parcel;
        _success = true;
        _submitting = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _submitting = false;
        _storeError = e;
      });
    }
  }

  /// "Naechstes Paket": Zustand vollstaendig zuruecksetzen und das Feld
  /// wieder fokussieren, damit ein Hardware-/USB-Scanner direkt weiter
  /// tippen kann, ohne dass der Mitarbeiter manuell zurueck ins Feld
  /// klicken muss (siehe Aufgabenstellung).
  void _resetForNextParcel() {
    _debounceTimer?.cancel();
    _trackingController.clear();
    _notesController.clear();
    setState(() {
      _validationState = TrackingValidationState.idle;
      _validatedResult = null;
      _validationMessage = null;
      _submitting = false;
      _storeError = null;
      _trackingMode = 'scanner';
      _slotMode = 'auto';
      _selectedSlot = null;
      _slotsError = null;
      _success = false;
      _storedParcel = null;
    });
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _focusNode.requestFocus();
    });
  }

  void _backToOverview() {
    Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 800),
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(MarktSpacing.lg),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  TextButton.icon(
                    onPressed: _backToOverview,
                    icon: const Icon(Icons.arrow_back),
                    label: const Text('Zurueck'),
                    style: TextButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: MarktSpacing.sm),
                      foregroundColor: const Color(0xFF667EEA),
                    ),
                  ),
                  const SizedBox(height: MarktSpacing.sm),
                  _buildPageTitle(context),
                  const SizedBox(height: 32),
                  _success ? _buildSuccess(context) : _buildForm(context),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildPageTitle(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    return Row(
      children: [
        const Icon(Icons.inventory_2_outlined, size: 32, color: Color(0xFF667EEA)),
        const SizedBox(width: MarktSpacing.sm),
        Expanded(
          child: Text(
            'Paket einlagern',
            style: textTheme.headlineMedium?.copyWith(
              fontWeight: FontWeight.w700,
              color: const Color(0xFF333333),
            ),
          ),
        ),
        TextButton.icon(
          key: const ValueKey('dhlStoreParcel.scanSoundsToggle'),
          onPressed: _toggleScanSounds,
          icon: Icon(_scanSoundsEnabled ? Icons.volume_up_outlined : Icons.volume_off_outlined),
          label: Text(_scanSoundsEnabled ? 'Toene: An' : 'Toene: Aus'),
          style: TextButton.styleFrom(
            foregroundColor: const Color(0xFF667EEA),
            visualDensity: VisualDensity.compact,
          ),
        ),
      ],
    );
  }

  InputDecoration _trackingInputDecoration() {
    const borderColor = Color(0xFFDDDDDD);
    const focusColor = Color(0xFF667EEA);
    return const InputDecoration(
      hintText: 'z.B. JVGL0605379700518040',
      prefixIcon: Icon(Icons.qr_code_scanner),
      contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 16),
      filled: true,
      fillColor: Colors.white,
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.all(Radius.circular(8)),
        borderSide: BorderSide(color: borderColor, width: 2),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.all(Radius.circular(8)),
        borderSide: BorderSide(color: focusColor, width: 2),
      ),
      disabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.all(Radius.circular(8)),
        borderSide: BorderSide(color: borderColor, width: 2),
      ),
    );
  }

  Widget _buildForm(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          'Tracking-Erfassung',
          style: textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.w600,
            color: const Color(0xFF333333),
          ),
        ),
        const SizedBox(height: MarktSpacing.sm),
        Row(
          children: [
            Expanded(
              child: _modeButton(
                key: const ValueKey('dhlStoreParcel.trackingModeScanner'),
                label: 'Scanner',
                icon: Icons.qr_code_scanner,
                selected: _trackingMode == 'scanner',
                onPressed: () => _setTrackingMode('scanner'),
              ),
            ),
            const SizedBox(width: MarktSpacing.sm),
            Expanded(
              child: _modeButton(
                key: const ValueKey('dhlStoreParcel.trackingModeManual'),
                label: 'Manuell',
                icon: Icons.keyboard_alt_outlined,
                selected: _trackingMode == 'manual',
                onPressed: () => _setTrackingMode('manual'),
              ),
            ),
          ],
        ),
        const SizedBox(height: MarktSpacing.lg),
        Text(
          'Trackingnummer',
          style: textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.w600,
            color: const Color(0xFF333333),
          ),
        ),
        const SizedBox(height: MarktSpacing.sm),
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: TextField(
                        key: const ValueKey('dhlStoreParcel.trackingField'),
                        controller: _trackingController,
                        focusNode: _focusNode,
                        autofocus: true,
                        keyboardType: TextInputType.text,
                        enabled: !_submitting,
                        autocorrect: false,
                        enableSuggestions: false,
                        inputFormatters: [FilteringTextInputFormatter.deny(RegExp(r'\s'))],
                        textCapitalization: TextCapitalization.characters,
                        decoration: _trackingInputDecoration().copyWith(
                          suffixIcon: _trackingMode == 'scanner'
                              ? const Tooltip(
                                  message: 'Scanner-Modus aktiv',
                                  child: Icon(Icons.sensors, color: Color(0xFF667EEA)),
                                )
                              : const Tooltip(
                                  message: 'Manuelle Eingabe aktiv',
                                  child: Icon(Icons.keyboard_alt_outlined),
                                ),
                        ),
                        onChanged: _onTrackingChanged,
              ),
            ),
            if (_trackingMode == 'scanner') ...[
              const SizedBox(width: MarktSpacing.sm),
              SizedBox(
                width: 56,
                height: 56,
                child: OutlinedButton(
                  key: const ValueKey('dhlStoreParcel.cameraButton'),
                  onPressed: (_submitting) ? null : _scanWithCamera,
                  style: OutlinedButton.styleFrom(
                    padding: EdgeInsets.zero,
                    foregroundColor: const Color(0xFF667EEA),
                    side: const BorderSide(color: Color(0xFF667EEA), width: 2),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  child: const Icon(Icons.camera_alt_outlined),
                ),
              ),
            ],
          ],
        ),
        const SizedBox(height: MarktSpacing.sm),
        Text(
          _trackingMode == 'scanner'
              ? 'Hardware-/Bluetooth-Scanner bereit. Der Scan landet direkt in diesem Feld.'
              : 'Trackingnummer manuell eingeben. Mindestens $_minTrackingCodeLength Zeichen.',
          key: const ValueKey('dhlStoreParcel.trackingModeHint'),
          style: textTheme.bodySmall?.copyWith(color: const Color(0xFF666666)),
        ),
        const SizedBox(height: MarktSpacing.sm),
        _buildValidationStatus(context),
        if (_storeError != null) ...[
          const SizedBox(height: MarktSpacing.md),
          _buildStoreErrorBanner(context),
        ],
        const SizedBox(height: MarktSpacing.xl),
        _buildSlotModeSection(context),
        const SizedBox(height: MarktSpacing.xl),
        Text(
          'Notizen (optional)',
          style: textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.w600,
            color: const Color(0xFF333333),
          ),
        ),
        const SizedBox(height: MarktSpacing.sm),
        TextField(
          key: const ValueKey('dhlStoreParcel.notesField'),
          controller: _notesController,
          enabled: !_submitting,
          minLines: 2,
          maxLines: 4,
          textInputAction: TextInputAction.newline,
          decoration: _trackingInputDecoration().copyWith(
            hintText: 'z.B. Paket beschaedigt, Kunde angerufen ...',
            prefixIcon: const Icon(Icons.notes_outlined),
          ),
        ),
        const SizedBox(height: MarktSpacing.xl),
        _gradientFilledButton(
          key: const ValueKey('dhlStoreParcel.submitButton'),
          enabled: _canSubmit,
          onPressed: _submit,
          loading: _submitting,
          label: 'Einlagern',
        ),
        const SizedBox(height: MarktSpacing.sm),
        Text(
          _slotMode == 'manual'
              ? 'Der Button wird aktiv, wenn DHL bestaetigt hat und ein freies Fach gewaehlt ist.'
              : 'Der Button wird erst aktiv, wenn DHL die Sendung bestaetigt hat.',
          style: textTheme.bodySmall?.copyWith(color: colorScheme.onSurfaceVariant),
        ),
      ],
    );
  }

  Widget _buildSlotModeSection(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Lagerplatz',
          style: textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.w600,
            color: const Color(0xFF333333),
          ),
        ),
        const SizedBox(height: MarktSpacing.sm),
        Row(
          children: [
            Expanded(
              child: _modeButton(
                key: const ValueKey('dhlStoreParcel.slotModeAuto'),
                label: 'Automatisch',
                icon: Icons.auto_awesome,
                selected: _slotMode == 'auto',
                onPressed: () => _setSlotMode('auto'),
              ),
            ),
            const SizedBox(width: MarktSpacing.sm),
            Expanded(
              child: _modeButton(
                key: const ValueKey('dhlStoreParcel.slotModeManual'),
                label: 'Manuell',
                icon: Icons.touch_app_outlined,
                selected: _slotMode == 'manual',
                onPressed: () => _setSlotMode('manual'),
              ),
            ),
          ],
        ),
        if (_slotMode == 'manual') ...[
          const SizedBox(height: MarktSpacing.md),
          _buildSlotGrid(context),
        ],
      ],
    );
  }

  Widget _modeButton({
    required Key key,
    required String label,
    required IconData icon,
    required bool selected,
    required VoidCallback onPressed,
  }) {
    return OutlinedButton.icon(
      key: key,
      onPressed: _submitting ? null : onPressed,
      icon: Icon(icon),
      label: Text(label),
      style: OutlinedButton.styleFrom(
        minimumSize: const Size.fromHeight(52),
        foregroundColor: selected ? const Color(0xFF667EEA) : const Color(0xFF333333),
        backgroundColor: selected ? const Color(0x14667EEA) : Colors.white,
        side: BorderSide(
          color: selected ? const Color(0xFF667EEA) : const Color(0xFFDDDDDD),
          width: 2,
        ),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      ),
    );
  }

  Widget _buildSlotGrid(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    if (_loadingSlots) {
      return const Center(child: CircularProgressIndicator());
    }
    if (_slotsError != null) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Lagerfaecher konnten nicht geladen werden.',
            style: textTheme.bodyMedium?.copyWith(color: const Color(0xFFDC3545)),
          ),
          TextButton(onPressed: _loadSlots, child: const Text('Erneut laden')),
        ],
      );
    }
    if (_slots.isEmpty) {
      return Text(
        'Keine Lagerfaecher vorhanden.',
        style: textTheme.bodyMedium?.copyWith(color: const Color(0xFF666666)),
      );
    }

    return Wrap(
      spacing: MarktSpacing.sm,
      runSpacing: MarktSpacing.sm,
      children: _slots.map((slot) {
        final selected = _selectedSlot?.id == slot.id;
        final full = slot.isFull;
        final borderColor = selected
            ? const Color(0xFF667EEA)
            : full
                ? const Color(0xFFDC3545)
                : slot.occupiedCount == 0
                    ? const Color(0xFF28A745)
                    : const Color(0xFFFFC107);
        final backgroundColor = selected
            ? const Color(0x14667EEA)
            : full
                ? const Color(0xFFF8D7DA)
                : slot.occupiedCount == 0
                    ? const Color(0xFFD4EDDA)
                    : const Color(0xFFFFF3CD);

        return SizedBox(
          width: 104,
          child: OutlinedButton(
            key: ValueKey('dhlStoreParcel.slot.${slot.code}'),
            onPressed: slot.isSelectable && !_submitting
                ? () => setState(() => _selectedSlot = slot)
                : null,
            style: OutlinedButton.styleFrom(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 12),
              foregroundColor: const Color(0xFF333333),
              backgroundColor: backgroundColor,
              disabledBackgroundColor: backgroundColor,
              side: BorderSide(color: borderColor, width: selected ? 3 : 2),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            child: Column(
              children: [
                Text(slot.code, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
                const SizedBox(height: 2),
                Text('${slot.occupiedCount} / ${slot.capacity}', style: textTheme.bodySmall),
              ],
            ),
          ),
        );
      }).toList(),
    );
  }

  Widget _buildValidationStatus(BuildContext context) {
    switch (_validationState) {
      case TrackingValidationState.idle:
        return const SizedBox.shrink();
      case TrackingValidationState.validating:
        return _statusBox(
          context,
          backgroundColor: const Color(0xFFE6F3FF),
          borderColor: const Color(0xFF667EEA),
          textColor: const Color(0xFF333333),
          icon: const SizedBox(
            width: 16,
            height: 16,
            child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF667EEA)),
          ),
          title: 'Sendung wird geprueft...',
        );
      case TrackingValidationState.valid:
        final result = _validatedResult;
        final details = <String>[
          if (result?.productName != null && result!.productName!.isNotEmpty) result.productName!,
          if (result?.weightKg != null) '${result!.weightKg!.toStringAsFixed(2)} kg',
        ].join(' · ');
        return _statusBox(
          context,
          backgroundColor: const Color(0xFFD4EDDA),
          borderColor: const Color(0xFF28A745),
          textColor: const Color(0xFF155724),
          icon: const Icon(Icons.check_circle, color: Color(0xFF28A745), size: 20),
          title: 'Sendung von DHL bestaetigt',
          subtitle: details.isEmpty ? null : details,
        );
      case TrackingValidationState.invalid:
        return _statusBox(
          context,
          backgroundColor: const Color(0xFFF8D7DA),
          borderColor: const Color(0xFFDC3545),
          textColor: const Color(0xFF721C24),
          icon: const Icon(Icons.error_outline, color: Color(0xFFDC3545), size: 20),
          title: 'Keine gueltige DHL-Sendung gefunden',
          subtitle: (_validationMessage != null && _validationMessage!.isNotEmpty)
              ? _validationMessage
              : 'Bitte Trackingnummer pruefen oder erneut scannen.',
        );
      case TrackingValidationState.technicalError:
        return _statusBox(
          context,
          backgroundColor: const Color(0xFFFFF3CD),
          borderColor: const Color(0xFFFFC107),
          textColor: const Color(0xFF856404),
          icon: const Icon(Icons.wifi_off, color: Color(0xFF856404), size: 20),
          title: 'DHL-Dienst aktuell nicht erreichbar',
          subtitle: (_validationMessage != null && _validationMessage!.isNotEmpty)
              ? _validationMessage
              : 'Bitte kurz warten und erneut versuchen.',
        );
    }
  }

  Widget _statusBox(
    BuildContext context, {
    required Color backgroundColor,
    required Color borderColor,
    required Color textColor,
    required Widget icon,
    required String title,
    String? subtitle,
  }) {
    final textTheme = Theme.of(context).textTheme;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: MarktSpacing.lg, vertical: 14),
      decoration: BoxDecoration(
        color: backgroundColor,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: borderColor, width: 2),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          icon,
          const SizedBox(width: MarktSpacing.sm),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: textTheme.bodyMedium?.copyWith(color: textColor, fontWeight: FontWeight.w600)),
                if (subtitle != null) ...[
                  const SizedBox(height: 4),
                  Text(subtitle, style: textTheme.bodySmall?.copyWith(color: textColor)),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _gradientFilledButton({
    required Key key,
    required bool enabled,
    required VoidCallback onPressed,
    required bool loading,
    required String label,
  }) {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        gradient: enabled
            ? const LinearGradient(
                colors: [Color(0xFF667EEA), Color(0xFF764BA2)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              )
            : null,
        color: enabled ? null : const Color(0xFFCCCCCC),
        borderRadius: BorderRadius.circular(8),
      ),
      child: FilledButton(
        key: key,
        onPressed: enabled ? onPressed : null,
        style: FilledButton.styleFrom(
          minimumSize: const Size.fromHeight(56),
          backgroundColor: Colors.transparent,
          disabledBackgroundColor: Colors.transparent,
          foregroundColor: Colors.white,
          disabledForegroundColor: const Color(0xFF777777),
          shadowColor: Colors.transparent,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
          textStyle: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
        ),
        child: loading
            ? const SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white),
              )
            : Text(label),
      ),
    );
  }

  /// Fehlerbanner NUR fuer Fehler des Einlagern-Aufrufs selbst  /// Fehlerbanner NUR fuer Fehler des Einlagern-Aufrufs selbst (`/parcels/store`)
  /// - bewusst gefiltert/nutzerfreundlich formuliert je nach HTTP-Status statt
  /// der rohen technischen Backend-Antwort (siehe Aufgabenstellung), analog
  /// zur bestehenden Angular-Fehlerklassifizierung.
  Widget _buildStoreErrorBanner(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(MarktSpacing.md),
      decoration: BoxDecoration(
        color: colorScheme.errorContainer.withValues(alpha: 0.6),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        _friendlyStoreErrorMessage(_storeError),
        style: textTheme.bodyMedium?.copyWith(color: colorScheme.onErrorContainer),
      ),
    );
  }

  /// Ordnet bekannte Backend-Statuscodes (siehe DHL-Einlagerungs-Audit vom
  /// 23.09., `DhlController.storeParcel`) einer klaren, nutzerverstaendlichen
  /// Meldung zu - KEINE rohe technische Exception im normalen UI (siehe
  /// Aufgabenstellung).
  String _friendlyStoreErrorMessage(Object? error) {
    if (error is ApiException) {
      switch (error.statusCode) {
        case 400:
          return 'Eingabe ungueltig: ${error.message}';
        case 409:
          return 'Einlagern nicht moeglich: ${error.message}';
        case 422:
          return 'DHL-Sendung nicht bestaetigt: ${error.message}';
        case 503:
        case 504:
          return 'DHL-Dienst aktuell nicht erreichbar. Bitte spaeter erneut versuchen.';
        default:
          return 'Einlagern fehlgeschlagen: ${error.message}';
      }
    }
    return 'Einlagern fehlgeschlagen. Bitte erneut versuchen.';
  }

  Widget _buildSuccess(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final parcel = _storedParcel;

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        const Icon(Icons.check_circle, size: 80, color: Color(0xFF28A745)),
        const SizedBox(height: MarktSpacing.lg),
        Text(
          'Paket eingelagert',
          style: textTheme.headlineSmall?.copyWith(
            fontWeight: FontWeight.w700,
            color: const Color(0xFF28A745),
          ),
        ),
        const SizedBox(height: MarktSpacing.xl),
        Text('Lagerplatz', style: textTheme.bodyMedium?.copyWith(color: const Color(0xFF666666))),
        const SizedBox(height: MarktSpacing.sm),
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(32),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [Color(0x1A667EEA), Color(0x1A764BA2)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Text(
            parcel?.shelfLocation?.trim().isNotEmpty == true ? parcel!.shelfLocation! : '-',
            textAlign: TextAlign.center,
            style: textTheme.displaySmall?.copyWith(
              fontWeight: FontWeight.w800,
              color: const Color(0xFF667EEA),
            ),
          ),
        ),
        const SizedBox(height: MarktSpacing.md),
        Text(
          parcel?.trackingCode ?? '',
          style: textTheme.bodyMedium?.copyWith(fontFamily: 'monospace', color: const Color(0xFF666666)),
        ),
        const SizedBox(height: MarktSpacing.xl),
        LayoutBuilder(
          builder: (context, constraints) {
            final stacked = constraints.maxWidth < 420;
            final nextButton = _gradientFilledButton(
              key: const ValueKey('dhlStoreParcel.nextButton'),
              enabled: true,
              onPressed: _resetForNextParcel,
              loading: false,
              label: 'Naechstes Paket',
            );
            final backButton = OutlinedButton(
              key: const ValueKey('dhlStoreParcel.backButton'),
              onPressed: _backToOverview,
              style: OutlinedButton.styleFrom(
                minimumSize: const Size.fromHeight(56),
                foregroundColor: const Color(0xFF667EEA),
                side: const BorderSide(color: Color(0xFF667EEA), width: 2),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
              child: const Text('Zur Uebersicht'),
            );

            if (stacked) {
              return Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [nextButton, const SizedBox(height: MarktSpacing.sm), backButton],
              );
            }

            return Row(
              children: [
                Expanded(child: nextButton),
                const SizedBox(width: MarktSpacing.md),
                Expanded(child: backButton),
              ],
            );
          },
        ),
      ],
    );
  }

}
