import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../models/dhl_find_parcel_request.dart';
import '../../models/dhl_parcel_dto.dart';
import '../../models/dhl_pickup_parcel_request.dart';
import '../../services/dhl_scan_feedback_service.dart';
import '../../services/dhl_service.dart';
import '../../services/token_storage.dart';
import '../../theme/markt_theme.dart';

/// Abhol-Flow "Paket ausgeben" - nutzt die BESTEHENDEN Endpunkte
/// `POST /parcels/find` und `POST /parcels/pickup`
/// (`DhlController.findParcel`/`pickupParcel`), analog zum bereits
/// vorhandenen Einlagerungs-Flow ([DhlStoreParcelScreen]):
///
/// Trackingnummer (Scanner/Hardware-Scanner/manuell)
///   → Debounce
///   → POST /parcels/find { trackingCode } (reine DB-Suche im Laden - KEIN
///     DHL-API-Aufruf, siehe `DhlController.findParcel`)
///   → Treffer mit Status `STORED`: [Abholung bestaetigen] aktiv
///     Treffer mit Status `PICKED_UP`: nur Hinweis, kein erneuter Abholen-Call
///   → POST /parcels/pickup { trackingCode }
///     (rein lokales, atomares Status-Update STORED -> PICKED_UP - ebenfalls
///     KEIN erneuter DHL-API-Aufruf, siehe `DhlController.pickupParcel`,
///     Kommentar zur entfernten DHL-Neuvalidierung)
///   → Erfolg: Bestaetigung anzeigen
///   → [Naechste Abholung] (Zustand zuruecksetzen, Feld fokussieren) oder
///     [Zur Uebersicht] (zurueck zum Dashboard)
///
/// Bewusst KEIN `POST /tracking/validate` (echter DHL-API-Aufruf) mehr in
/// diesem Flow: ein bereits eingelagertes Paket ist als DB-Datensatz bereits
/// vertrauenswuerdig, die Suche laeuft daher IMMER zuerst (und ausschliesslich)
/// gegen unsere eigene Datenbank - sowohl bei automatischer Debounce-Suche
/// als auch bei manueller Eingabe/Scan ueber denselben [_search]-Aufruf.
///
/// Wie beim Einlagern gibt es einen sichtbaren Scanner-/Manuell-Modus.
/// Beide Modi nutzen bewusst dasselbe Trackingfeld und denselben DB-Suchpfad;
/// der Scanner-Modus ist fuer Hardware-/USB-/Bluetooth-HID-Scanner gedacht.
class DhlPickupParcelScreen extends StatefulWidget {
  const DhlPickupParcelScreen({
    super.key,
    required this.storeId,
    this.dhlService,
    this.scanFeedback,
  });

  final int storeId;

  /// Nur fuer Tests: erlaubt das Einschleusen eines Fake-`DhlService`
  /// (analog zum bestehenden Injection-Muster in `DhlStoreParcelScreen`).
  final DhlService? dhlService;
  final DhlScanFeedback? scanFeedback;

  @override
  State<DhlPickupParcelScreen> createState() => _DhlPickupParcelScreenState();
}

class _DhlPickupParcelScreenState extends State<DhlPickupParcelScreen> {
  /// Identische Mindestlaenge wie [DhlStoreParcelScreen] (siehe dort) - ab
  /// dieser Laenge startet die automatische (Debounce-)Suche gegen unsere
  /// eigene Datenbank (`/parcels/find`). KEIN DHL-Aufruf mehr an dieser
  /// Stelle (siehe Klassendoku).
  static const int _minTrackingCodeLength = 10;
  static const Duration _debounceDuration = Duration(milliseconds: 400);

  late final DhlService _dhlService = widget.dhlService ?? DhlService();
  late final DhlScanFeedback _scanFeedback = widget.scanFeedback ?? DhlScanFeedbackService();
  final _trackingController = TextEditingController();
  final _focusNode = FocusNode();

  Timer? _debounceTimer;

  String _trackingMode = 'scanner';
  bool _scanSoundsEnabled = true;

  bool _searching = false;
  Object? _findError;
  DhlParcelDto? _foundParcel;

  bool _confirming = false;
  Object? _pickupError;

  bool _success = false;
  DhlParcelDto? _pickedUpParcel;

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
    _focusNode.dispose();
    super.dispose();
  }

  bool get _canSearch =>
      _trackingController.text.trim().length >= _minTrackingCodeLength && !_searching && _foundParcel == null;

  bool get _canConfirmPickup =>
      _foundParcel != null && _foundParcel!.status == 'STORED' && !_confirming;

  void _setTrackingMode(String mode) {
    if (_searching || _confirming || _foundParcel != null || mode == _trackingMode) return;
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

  /// Reagiert auf jede Eingabe (Tastatur ODER Scanner-Zeichenstrom) im EINEN
  /// Trackingnummer-Feld. Sobald die Mindestlaenge erreicht ist, wird
  /// [_search] automatisch (debounced) angestossen - identisch fuer
  /// manuelle Eingabe und Scan, IMMER zuerst gegen unsere DB
  /// (`/parcels/find`), NIE gegen DHL direkt (siehe Klassendoku).
  void _onTrackingChanged(String raw) {
    _debounceTimer?.cancel();
    setState(() {
      _findError = null;
      _foundParcel = null;
      _pickupError = null;
    });

    final trimmed = raw.trim();
    if (trimmed.length < _minTrackingCodeLength) {
      return;
    }

    _debounceTimer = Timer(_debounceDuration, () => _search(code: trimmed));
  }

  /// Sucht das Paket im Laden (`/parcels/find`) - rein lokale DB-Suche,
  /// KEIN DHL-API-Aufruf. Wird sowohl automatisch (nach Debounce, sobald die
  /// Mindestlaenge erreicht ist) als auch manuell ueber den [Suchen]-Button
  /// ausgeloest; race-guarded gegen einen inzwischen veraenderten Code
  /// (analog zum frueheren `_runValidation`-Muster).
  Future<void> _search({String? code}) async {
    final effectiveCode = code ?? _trackingController.text.trim();
    if (effectiveCode.length < _minTrackingCodeLength || _searching || _foundParcel != null) {
      return;
    }

    setState(() {
      _searching = true;
      _findError = null;
    });

    try {
      final request = DhlFindParcelRequest(trackingCode: effectiveCode);
      final parcel = await _dhlService.findParcel(widget.storeId, request);
      if (!mounted || _trackingController.text.trim() != effectiveCode) return;
      setState(() {
        _foundParcel = parcel;
        _searching = false;
      });
      _playScanFeedback(
        parcel.status == 'STORED' ? DhlScanFeedbackState.valid : DhlScanFeedbackState.invalid,
      );
    } catch (e) {
      if (!mounted || _trackingController.text.trim() != effectiveCode) return;
      setState(() {
        _searching = false;
        _findError = e;
      });
      _playScanFeedback(
        e is ApiException && e.statusCode == 404
            ? DhlScanFeedbackState.invalid
            : DhlScanFeedbackState.technicalError,
      );
    }
  }

  /// Fuehrt die eigentliche Abholung durch - NUR moeglich, wenn das
  /// gefundene Paket noch `STORED` ist (siehe [_canConfirmPickup]). Rein
  /// lokales, atomares Status-Update im Backend - KEIN erneuter DHL-Aufruf
  /// (siehe `DhlController.pickupParcel` und Klassendoku).
  Future<void> _confirmPickup() async {
    if (!_canConfirmPickup) return;

    setState(() {
      _confirming = true;
      _pickupError = null;
    });

    try {
      final trackingCode = _foundParcel!.trackingCode;
      final request = DhlPickupParcelRequest(trackingCode: trackingCode);
      final parcel = await _dhlService.pickupParcel(widget.storeId, request);
      if (!mounted) return;
      setState(() {
        _pickedUpParcel = parcel;
        _success = true;
        _confirming = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _confirming = false;
        _pickupError = e;
      });
    }
  }

  /// "Naechste Abholung": Zustand vollstaendig zuruecksetzen und das Feld
  /// wieder fokussieren, analog zu
  /// [DhlStoreParcelScreen._resetForNextParcel].
  void _resetForNextPickup() {
    _debounceTimer?.cancel();
    _trackingController.clear();
    setState(() {
      _trackingMode = 'scanner';
      _searching = false;
      _findError = null;
      _foundParcel = null;
      _confirming = false;
      _pickupError = null;
      _success = false;
      _pickedUpParcel = null;
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
        const Icon(Icons.outbox_outlined, size: 32, color: Color(0xFF667EEA)),
        const SizedBox(width: MarktSpacing.sm),
        Expanded(
          child: Text(
            'Paket ausgeben',
            style: textTheme.headlineMedium?.copyWith(
              fontWeight: FontWeight.w700,
              color: const Color(0xFF333333),
            ),
          ),
        ),
        TextButton.icon(
          key: const ValueKey('dhlPickupParcel.scanSoundsToggle'),
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
                key: const ValueKey('dhlPickupParcel.trackingModeScanner'),
                label: 'Scanner',
                icon: Icons.qr_code_scanner,
                selected: _trackingMode == 'scanner',
                onPressed: () => _setTrackingMode('scanner'),
              ),
            ),
            const SizedBox(width: MarktSpacing.sm),
            Expanded(
              child: _modeButton(
                key: const ValueKey('dhlPickupParcel.trackingModeManual'),
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
        TextField(
          key: const ValueKey('dhlPickupParcel.trackingField'),
          controller: _trackingController,
          focusNode: _focusNode,
          autofocus: true,
          enabled: !_searching && _foundParcel == null,
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
        const SizedBox(height: MarktSpacing.sm),
        Text(
          _trackingMode == 'scanner'
              ? 'Hardware-/Bluetooth-Scanner bereit. Die Suche erfolgt nur in unserer Datenbank.'
              : 'Trackingnummer manuell eingeben. Die Suche erfolgt nur in unserer Datenbank.',
          key: const ValueKey('dhlPickupParcel.trackingModeHint'),
          style: textTheme.bodySmall?.copyWith(color: const Color(0xFF666666)),
        ),
        const SizedBox(height: MarktSpacing.sm),
        _buildSearchStatus(context),
        if (_findError != null) ...[
          const SizedBox(height: MarktSpacing.md),
          _buildErrorBanner(context, _friendlyFindErrorMessage(_findError)),
        ],
        if (_foundParcel != null) ...[
          const SizedBox(height: MarktSpacing.md),
          _buildFoundParcel(context),
        ],
        if (_pickupError != null) ...[
          const SizedBox(height: MarktSpacing.md),
          _buildErrorBanner(context, _friendlyPickupErrorMessage(_pickupError)),
        ],
        const SizedBox(height: MarktSpacing.xl),
        if (_foundParcel == null)
          _gradientFilledButton(
            key: const ValueKey('dhlPickupParcel.searchButton'),
            enabled: _canSearch,
            onPressed: _search,
            loading: _searching,
            label: 'Suchen',
          )
        else
          _gradientFilledButton(
            key: const ValueKey('dhlPickupParcel.confirmButton'),
            enabled: _canConfirmPickup,
            onPressed: _confirmPickup,
            loading: _confirming,
            label: 'Abholung bestaetigen',
          ),
        if (_foundParcel != null) ...[
          const SizedBox(height: MarktSpacing.sm),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton(
              key: const ValueKey('dhlPickupParcel.searchAgainButton'),
              onPressed: _resetForNextPickup,
              style: OutlinedButton.styleFrom(
                minimumSize: const Size.fromHeight(52),
                foregroundColor: const Color(0xFF667EEA),
                side: const BorderSide(color: Color(0xFF667EEA), width: 2),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
              child: const Text('Andere Trackingnummer'),
            ),
          ),
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
      onPressed: (_searching || _confirming || _foundParcel != null) ? null : onPressed,
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

  Widget _buildSearchStatus(BuildContext context) {
    if (_searching) {
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
        title: 'Lager wird durchsucht...',
      );
    }

    return const SizedBox.shrink();
  }

  Widget _buildFoundParcel(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final parcel = _foundParcel!;
    final alreadyPickedUp = parcel.status == 'PICKED_UP';
    final backgroundColor = alreadyPickedUp ? const Color(0xFFF8D7DA) : const Color(0xFFD4EDDA);
    final borderColor = alreadyPickedUp ? const Color(0xFFDC3545) : const Color(0xFF28A745);
    final textColor = alreadyPickedUp ? const Color(0xFF721C24) : const Color(0xFF155724);

    return Container(
      key: const ValueKey('dhlPickupParcel.foundParcel'),
      width: double.infinity,
      padding: const EdgeInsets.all(MarktSpacing.lg),
      decoration: BoxDecoration(
        color: backgroundColor,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: borderColor, width: 2),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            parcel.trackingCode,
            style: textTheme.bodyMedium?.copyWith(
              fontFamily: 'monospace',
              fontWeight: FontWeight.w600,
              color: textColor,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Lagerplatz: ${parcel.shelfLocation?.trim().isNotEmpty == true ? parcel.shelfLocation! : '-'}',
            style: textTheme.bodyMedium?.copyWith(color: textColor),
          ),
          const SizedBox(height: MarktSpacing.sm),
          Text(
            alreadyPickedUp ? 'Dieses Paket wurde bereits abgeholt.' : 'Bereit zur Abholung.',
            style: textTheme.bodyMedium?.copyWith(color: textColor, fontWeight: FontWeight.w600),
          ),
        ],
      ),
    );
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

  Widget _buildErrorBanner(BuildContext context, String message) {
    final textTheme = Theme.of(context).textTheme;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(MarktSpacing.lg),
      decoration: BoxDecoration(
        color: const Color(0xFFFFE6E6),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: const Color(0xFFDC3545), width: 2),
      ),
      child: Text(
        message,
        style: textTheme.bodyMedium?.copyWith(
          color: const Color(0xFFDC3545),
          fontWeight: FontWeight.w500,
        ),
      ),
    );
  }

  /// Ordnet bekannte Statuscodes von `/parcels/find`  /// Ordnet bekannte Statuscodes von `/parcels/find` (siehe
  /// `DhlController.findParcel`) einer klaren Meldung zu.
  String _friendlyFindErrorMessage(Object? error) {
    if (error is ApiException) {
      switch (error.statusCode) {
        case 400:
          return 'Eingabe ungueltig: ${error.message}';
        case 404:
          return 'Kein eingelagertes Paket mit dieser Trackingnummer gefunden.';
        default:
          return 'Suche fehlgeschlagen: ${error.message}';
      }
    }
    return 'Suche fehlgeschlagen. Bitte erneut versuchen.';
  }

  /// Ordnet bekannte Statuscodes von `/parcels/pickup` (siehe
  /// `DhlController.pickupParcel`) einer klaren, nutzerverstaendlichen
  /// Meldung zu - KEINE rohe technische Exception im normalen UI (analog zu
  /// [DhlStoreParcelScreen._friendlyStoreErrorMessage]). Seit der Entfernung
  /// der erneuten DHL-Validierung bei der Abholung liefert der Endpoint nur
  /// noch 400/404/409 (siehe Backend-Javadoc) - kein 422/503/504 mehr.
  String _friendlyPickupErrorMessage(Object? error) {
    if (error is ApiException) {
      switch (error.statusCode) {
        case 400:
          return 'Eingabe ungueltig: ${error.message}';
        case 404:
          return 'Paket nicht gefunden: ${error.message}';
        case 409:
          return 'Dieses Paket wurde bereits abgeholt.';
        default:
          return 'Abholung fehlgeschlagen: ${error.message}';
      }
    }
    return 'Abholung fehlgeschlagen. Bitte erneut versuchen.';
  }

  Widget _buildSuccess(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final parcel = _pickedUpParcel;

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        const Icon(Icons.check_circle, size: 80, color: Color(0xFF28A745)),
        const SizedBox(height: MarktSpacing.lg),
        Text(
          'Paket ausgegeben',
          style: textTheme.headlineSmall?.copyWith(
            fontWeight: FontWeight.w700,
            color: const Color(0xFF28A745),
          ),
        ),
        const SizedBox(height: MarktSpacing.lg),
        Text(
          parcel?.trackingCode ?? '',
          style: textTheme.bodyMedium?.copyWith(fontFamily: 'monospace', color: const Color(0xFF666666)),
        ),
        const SizedBox(height: MarktSpacing.xl),
        LayoutBuilder(
          builder: (context, constraints) {
            final stacked = constraints.maxWidth < 420;
            final nextButton = _gradientFilledButton(
              key: const ValueKey('dhlPickupParcel.nextButton'),
              enabled: true,
              onPressed: _resetForNextPickup,
              loading: false,
              label: 'Naechste Abholung',
            );
            final backButton = OutlinedButton(
              key: const ValueKey('dhlPickupParcel.backButton'),
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
