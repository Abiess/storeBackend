import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../models/dhl_parcel_dto.dart';
import '../../models/dhl_store_parcel_request.dart';
import '../../models/dhl_tracking_validation_dto.dart';
import '../../services/dhl_service.dart';
import '../../services/token_storage.dart';
import '../../theme/markt_theme.dart';
import '../../widgets/shared/markt_card.dart';
import '../../widgets/shared/markt_icon_badge.dart';

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
///   → POST /parcels/store { trackingCode, mode: "auto" }
///     (Backend validiert dabei selbst ERNEUT autoritativ gegen DHL)
///   → Erfolg: Lagerplatz gross anzeigen
///   → [Naechstes Paket] (Zustand zuruecksetzen, Feld fokussieren) oder
///     [Zur Uebersicht] (zurueck zu `DhlHomeScreen`, das die Liste beim
///     Zurueckkehren aktualisiert, siehe dort)
///
/// Bewusst NOCH NICHT Teil dieses Screens (siehe Aufgabenstellung):
/// Kamera-Scanner, manuelles Slot-Grid, Paketabholung. Das
/// Trackingnummer-Feld unterstuetzt gleichermassen manuelle Eingabe UND
/// Hardware-/USB-/Bluetooth-HID-Scanner (die wie eine Tastatur in ein
/// fokussiertes Textfeld "tippen") - beide Eingabewege durchlaufen exakt
/// denselben `onChanged`-Handler, kein Bypass moeglich (analog zum
/// bestehenden Angular-Flow, siehe Audit).
class DhlStoreParcelScreen extends StatefulWidget {
  const DhlStoreParcelScreen({super.key, required this.storeId, this.dhlService});

  final int storeId;

  /// Nur fuer Tests: erlaubt das Einschleusen eines Fake-`DhlService`
  /// (analog zum bestehenden Injection-Muster in `DhlHomeScreen`).
  final DhlService? dhlService;

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
  final _trackingController = TextEditingController();
  final _focusNode = FocusNode();

  Timer? _debounceTimer;

  TrackingValidationState _validationState = TrackingValidationState.idle;
  DhlTrackingValidationDto? _validatedResult;
  String? _validationMessage;

  bool _submitting = false;
  Object? _storeError;

  bool _success = false;
  DhlParcelDto? _storedParcel;

  @override
  void dispose() {
    _debounceTimer?.cancel();
    _trackingController.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  bool get _canSubmit => _validationState == TrackingValidationState.valid && !_submitting;

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
      } else {
        setState(() {
          _validationState = TrackingValidationState.invalid;
          _validationMessage = result.dhlErrorMessage;
        });
      }
    } on ApiException catch (e) {
      if (!mounted || _trackingController.text.trim() != code) return;
      setState(() {
        _validationState = TrackingValidationState.technicalError;
        _validationMessage = e.message;
      });
    } catch (_) {
      if (!mounted || _trackingController.text.trim() != code) return;
      setState(() {
        _validationState = TrackingValidationState.technicalError;
        _validationMessage = null;
      });
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
      final request = DhlStoreParcelRequest(trackingCode: _trackingController.text.trim(), mode: 'auto');
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
    setState(() {
      _validationState = TrackingValidationState.idle;
      _validatedResult = null;
      _validationMessage = null;
      _submitting = false;
      _storeError = null;
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
      appBar: AppBar(title: const Text('Paket einlagern')),
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 560),
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(MarktSpacing.lg),
              child: _success ? _buildSuccess(context) : _buildForm(context),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildForm(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;

    return MarktCard(
      padding: const EdgeInsets.all(MarktSpacing.xl),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              MarktIconBadge(
                icon: Icon(Icons.inventory_2_outlined, color: colorScheme.primary),
                accentColor: colorScheme.primary,
              ),
              const SizedBox(width: MarktSpacing.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Paket einlagern', style: textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700)),
                    const SizedBox(height: 2),
                    Text(
                      'Trackingnummer scannen oder eingeben',
                      style: textTheme.bodyMedium?.copyWith(color: colorScheme.onSurfaceVariant),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: MarktSpacing.xl),
          // EIN fokussiertes Textfeld fuer BEIDE Eingabewege: manuelle
          // Tastatureingabe UND Hardware-/USB-/Bluetooth-HID-Scanner (der
          // wie eine Tastatur in das fokussierte Feld "tippt") - siehe
          // Klassendoku. Kamera-Scan ist bewusst noch nicht Teil dieses
          // Schritts.
          TextField(
            key: const ValueKey('dhlStoreParcel.trackingField'),
            controller: _trackingController,
            focusNode: _focusNode,
            autofocus: true,
            enabled: !_submitting,
            autocorrect: false,
            enableSuggestions: false,
            inputFormatters: [FilteringTextInputFormatter.deny(RegExp(r'\s'))],
            textCapitalization: TextCapitalization.characters,
            decoration: const InputDecoration(
              labelText: 'Trackingnummer',
              hintText: 'z.B. JVGL0605379700518040',
              border: OutlineInputBorder(),
              prefixIcon: Icon(Icons.qr_code_scanner),
            ),
            onChanged: _onTrackingChanged,
          ),
          const SizedBox(height: MarktSpacing.md),
          _buildValidationStatus(context),
          if (_storeError != null) ...[
            const SizedBox(height: MarktSpacing.md),
            _buildStoreErrorBanner(context),
          ],
          const SizedBox(height: MarktSpacing.xl),
          SizedBox(
            width: double.infinity,
            child: FilledButton(
              key: const ValueKey('dhlStoreParcel.submitButton'),
              onPressed: _canSubmit ? _submit : null,
              child: _submitting
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2.5),
                    )
                  : const Text('Einlagern'),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildValidationStatus(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;

    switch (_validationState) {
      case TrackingValidationState.idle:
        return Text(
          'Mindestens $_minTrackingCodeLength Zeichen fuer die automatische Pruefung.',
          style: textTheme.bodySmall?.copyWith(color: colorScheme.onSurfaceVariant),
        );
      case TrackingValidationState.validating:
        return _statusBox(
          context,
          color: colorScheme.onSurfaceVariant,
          icon: const SizedBox(
            width: 16,
            height: 16,
            child: CircularProgressIndicator(strokeWidth: 2),
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
          color: colorScheme.primary,
          icon: Icon(Icons.check_circle, color: colorScheme.primary, size: 20),
          title: 'Sendung von DHL bestaetigt',
          subtitle: details.isEmpty ? null : details,
        );
      case TrackingValidationState.invalid:
        return _statusBox(
          context,
          color: colorScheme.error,
          icon: Icon(Icons.error_outline, color: colorScheme.error, size: 20),
          title: 'Keine gueltige DHL-Sendung gefunden',
          // Roher DHL-Backend-Text (siehe [_validationMessage]-Doku), falls
          // vorhanden - sonst generischer Hinweistext.
          subtitle: (_validationMessage != null && _validationMessage!.isNotEmpty)
              ? _validationMessage
              : 'Bitte Trackingnummer pruefen oder erneut scannen.',
        );
      case TrackingValidationState.technicalError:
        return _statusBox(
          context,
          color: colorScheme.error,
          icon: Icon(Icons.wifi_off, color: colorScheme.error, size: 20),
          title: 'DHL-Dienst aktuell nicht erreichbar',
          subtitle: (_validationMessage != null && _validationMessage!.isNotEmpty)
              ? _validationMessage
              : 'Bitte kurz warten und erneut versuchen.',
        );
    }
  }

  Widget _statusBox(
    BuildContext context, {
    required Color color,
    required Widget icon,
    required String title,
    String? subtitle,
  }) {
    final textTheme = Theme.of(context).textTheme;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(MarktSpacing.md),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.10),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.24)),
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
                Text(title, style: textTheme.bodyMedium?.copyWith(color: color, fontWeight: FontWeight.w600)),
                if (subtitle != null) ...[
                  const SizedBox(height: 2),
                  Text(subtitle, style: textTheme.bodySmall?.copyWith(color: color)),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  /// Fehlerbanner NUR fuer Fehler des Einlagern-Aufrufs selbst (`/parcels/store`)
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
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;
    final parcel = _storedParcel;

    return MarktCard(
      padding: const EdgeInsets.all(MarktSpacing.xl),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          MarktIconBadge(
            icon: Icon(Icons.check_circle, color: colorScheme.primary),
            accentColor: colorScheme.primary,
            size: 64,
          ),
          const SizedBox(height: MarktSpacing.lg),
          Text('Paket eingelagert', style: textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700)),
          const SizedBox(height: MarktSpacing.lg),
          Text('Lagerplatz', style: textTheme.bodyMedium?.copyWith(color: colorScheme.onSurfaceVariant)),
          const SizedBox(height: 4),
          Text(
            parcel?.shelfLocation?.trim().isNotEmpty == true ? parcel!.shelfLocation! : '-',
            style: textTheme.displaySmall?.copyWith(fontWeight: FontWeight.w800, color: colorScheme.primary),
          ),
          const SizedBox(height: MarktSpacing.md),
          Text(
            parcel?.trackingCode ?? '',
            style: textTheme.bodyMedium?.copyWith(fontFamily: 'monospace', color: colorScheme.onSurfaceVariant),
          ),
          const SizedBox(height: MarktSpacing.xl),
          LayoutBuilder(
            builder: (context, constraints) {
              final stacked = constraints.maxWidth < 420;
              final nextButton = FilledButton(
                key: const ValueKey('dhlStoreParcel.nextButton'),
                onPressed: _resetForNextParcel,
                child: const Text('Naechstes Paket'),
              );
              final backButton = OutlinedButton(
                key: const ValueKey('dhlStoreParcel.backButton'),
                onPressed: _backToOverview,
                child: const Text('Zur Uebersicht'),
              );

              if (stacked) {
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    nextButton,
                    const SizedBox(height: MarktSpacing.sm),
                    backButton,
                  ],
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
      ),
    );
  }
}
