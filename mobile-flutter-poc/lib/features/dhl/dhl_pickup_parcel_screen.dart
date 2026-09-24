import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../models/dhl_find_parcel_request.dart';
import '../../models/dhl_parcel_dto.dart';
import '../../models/dhl_pickup_parcel_request.dart';
import '../../services/dhl_service.dart';
import '../../services/token_storage.dart';
import '../../theme/markt_theme.dart';
import '../../widgets/shared/markt_card.dart';
import '../../widgets/shared/markt_icon_badge.dart';

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
/// Wie beim Einlagern unterstuetzt das EINE Trackingnummer-Feld
/// gleichermassen manuelle Eingabe UND Hardware-/USB-/Bluetooth-HID-Scanner
/// (siehe [DhlStoreParcelScreen]-Klassendoku) - kein separater
/// Scan-/Manuell-Modus-Umschalter, bewusst konsistent zum bestehenden
/// Einlagerungs-Screen statt der Angular-Referenz mit getrenntem
/// Scanner-/Manuell-Tab.
class DhlPickupParcelScreen extends StatefulWidget {
  const DhlPickupParcelScreen({super.key, required this.storeId, this.dhlService});

  final int storeId;

  /// Nur fuer Tests: erlaubt das Einschleusen eines Fake-`DhlService`
  /// (analog zum bestehenden Injection-Muster in `DhlStoreParcelScreen`).
  final DhlService? dhlService;

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
  final _trackingController = TextEditingController();
  final _focusNode = FocusNode();

  Timer? _debounceTimer;

  bool _searching = false;
  Object? _findError;
  DhlParcelDto? _foundParcel;

  bool _confirming = false;
  Object? _pickupError;

  bool _success = false;
  DhlParcelDto? _pickedUpParcel;

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
    } catch (e) {
      if (!mounted || _trackingController.text.trim() != effectiveCode) return;
      setState(() {
        _searching = false;
        _findError = e;
      });
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
      appBar: AppBar(title: const Text('Paket ausgeben')),
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
                icon: Icon(Icons.outbox_outlined, color: colorScheme.primary),
                accentColor: colorScheme.primary,
              ),
              const SizedBox(width: MarktSpacing.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Paket ausgeben', style: textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700)),
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
          // EIN fokussiertes Textfeld fuer BEIDE Eingabewege - siehe
          // Klassendoku, identisches Muster wie [DhlStoreParcelScreen].
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
            decoration: const InputDecoration(
              labelText: 'Trackingnummer',
              hintText: 'z.B. JVGL0605379700518040',
              border: OutlineInputBorder(),
              prefixIcon: Icon(Icons.qr_code_scanner),
            ),
            onChanged: _onTrackingChanged,
          ),
          const SizedBox(height: MarktSpacing.md),
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
          SizedBox(
            width: double.infinity,
            child: _foundParcel == null
                ? FilledButton(
                    key: const ValueKey('dhlPickupParcel.searchButton'),
                    onPressed: _canSearch ? () => _search() : null,
                    child: _searching
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(strokeWidth: 2.5),
                          )
                        : const Text('Suchen'),
                  )
                : FilledButton(
                    key: const ValueKey('dhlPickupParcel.confirmButton'),
                    onPressed: _canConfirmPickup ? _confirmPickup : null,
                    child: _confirming
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(strokeWidth: 2.5),
                          )
                        : const Text('Abholung bestaetigen'),
                  ),
          ),
          if (_foundParcel != null) ...[
            const SizedBox(height: MarktSpacing.sm),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton(
                key: const ValueKey('dhlPickupParcel.searchAgainButton'),
                onPressed: _resetForNextPickup,
                child: const Text('Andere Trackingnummer'),
              ),
            ),
          ],
        ],
      ),
    );
  }

  /// Ersetzt die vormalige DHL-Validierungsanzeige: zeigt lediglich den
  /// Fortschritt der lokalen Datenbank-Suche (`/parcels/find`) - KEIN
  /// DHL-Status mehr, da hier kein DHL-Aufruf mehr stattfindet.
  Widget _buildSearchStatus(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;

    if (_searching) {
      return _statusBox(
        context,
        color: colorScheme.onSurfaceVariant,
        icon: const SizedBox(
          width: 16,
          height: 16,
          child: CircularProgressIndicator(strokeWidth: 2),
        ),
        title: 'Lager wird durchsucht...',
      );
    }

    if (_foundParcel == null && _findError == null) {
      return Text(
        'Mindestens $_minTrackingCodeLength Zeichen fuer die automatische Suche im Lager.',
        style: textTheme.bodySmall?.copyWith(color: colorScheme.onSurfaceVariant),
      );
    }

    return const SizedBox.shrink();
  }

  /// Zeigt das per `/parcels/find` gefundene Paket - unterscheidet
  /// zwischen noch abholbereiten (`STORED`) und bereits abgeholten
  /// (`PICKED_UP`) Sendungen (siehe [DhlParcelDto.status]).
  Widget _buildFoundParcel(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;
    final parcel = _foundParcel!;
    final alreadyPickedUp = parcel.status == 'PICKED_UP';

    return Container(
      key: const ValueKey('dhlPickupParcel.foundParcel'),
      width: double.infinity,
      padding: const EdgeInsets.all(MarktSpacing.md),
      decoration: BoxDecoration(
        color: (alreadyPickedUp ? colorScheme.error : colorScheme.primary).withValues(alpha: 0.10),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: (alreadyPickedUp ? colorScheme.error : colorScheme.primary).withValues(alpha: 0.24),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            parcel.trackingCode,
            style: textTheme.bodyMedium?.copyWith(fontFamily: 'monospace', fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 4),
          Text(
            'Lagerplatz: ${parcel.shelfLocation?.trim().isNotEmpty == true ? parcel.shelfLocation! : '-'}',
            style: textTheme.bodyMedium?.copyWith(color: colorScheme.onSurfaceVariant),
          ),
          const SizedBox(height: MarktSpacing.sm),
          if (alreadyPickedUp)
            Text(
              'Dieses Paket wurde bereits abgeholt.',
              style: textTheme.bodyMedium?.copyWith(color: colorScheme.error, fontWeight: FontWeight.w600),
            )
          else
            Text(
              'Bereit zur Abholung.',
              style: textTheme.bodyMedium?.copyWith(color: colorScheme.primary, fontWeight: FontWeight.w600),
            ),
        ],
      ),
    );
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

  Widget _buildErrorBanner(BuildContext context, String message) {
    final colorScheme = Theme.of(context).colorScheme;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(MarktSpacing.md),
      decoration: BoxDecoration(
        color: colorScheme.errorContainer.withValues(alpha: 0.6),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(message, style: TextStyle(color: colorScheme.onErrorContainer)),
    );
  }

  /// Ordnet bekannte Statuscodes von `/parcels/find` (siehe
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
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;
    final parcel = _pickedUpParcel;

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
          Text('Paket ausgegeben', style: textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700)),
          const SizedBox(height: MarktSpacing.lg),
          Text(
            parcel?.trackingCode ?? '',
            style: textTheme.bodyMedium?.copyWith(fontFamily: 'monospace', color: colorScheme.onSurfaceVariant),
          ),
          const SizedBox(height: MarktSpacing.xl),
          Row(
            children: [
              Expanded(
                child: FilledButton(
                  key: const ValueKey('dhlPickupParcel.nextButton'),
                  onPressed: _resetForNextPickup,
                  child: const Text('Naechste Abholung'),
                ),
              ),
              const SizedBox(width: MarktSpacing.md),
              Expanded(
                child: OutlinedButton(
                  key: const ValueKey('dhlPickupParcel.backButton'),
                  onPressed: _backToOverview,
                  child: const Text('Zur Uebersicht'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
