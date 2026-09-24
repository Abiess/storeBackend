import 'package:flutter/material.dart';

import '../../models/auth_response.dart';
import '../../models/dhl_parcel_dto.dart';
import '../../services/auth_service.dart';
import '../../services/dhl_service.dart';
import '../../theme/markt_theme.dart';
import '../../widgets/dhl/dhl_dashboard_view.dart';
import '../../widgets/dhl/dhl_parcel_format.dart';
import '../../widgets/shared/markt_card.dart';
import '../../widgets/shared/markt_icon_badge.dart';
import 'dhl_home_screen.dart';
import 'dhl_login_screen.dart';
import 'dhl_pickup_parcel_screen.dart';
import 'dhl_store_parcel_screen.dart';

/// Neuer DHL/Paketshop-Einstiegsbildschirm ("Guten Tag, ..."-Layout) -
/// bindet die rein praesentationale [DhlDashboardView] an die BESTEHENDEN
/// DHL-Flows an, ohne neue Backend-Endpunkte/Fachlogik zu erfinden:
///
/// - "Paket einlagern" oeffnet den bestehenden [DhlStoreParcelScreen]
///   (Einlagerungs-Flow, siehe DHL-Einlagerungs-Audit vom 23.09.).
/// - "Sendung suchen" und die Kennzahl-Kachel "Pakete im Laden" oeffnen den
///   bestehenden [DhlHomeScreen] ("Pakete im Laden"-Liste inkl. der dort
///   bereits vorhandenen Trackingnummer-/Lagerplatz-Suche).
/// - "Paket ausgeben" oeffnet den [DhlPickupParcelScreen] (Abhol-Flow ueber
///   die bestehenden Endpunkte `/parcels/find` und `/parcels/pickup`,
///   siehe `DhlController`).
/// - Die Kennzahl "Pakete im Laden" und "Letzte Aktivitaeten" werden
///   ausschliesslich aus [DhlService.listStoredParcels] abgeleitet -
///   dieselbe Datenquelle wie [DhlHomeScreen]. "Heute ausgegeben" wird
///   bewusst NICHT angezeigt, da der bestehende Endpoint keine
///   Abhol-Historie liefert (keine Fake-Zahl).
///
/// [storeId] wird - identisch zu [DhlHomeScreen] - ueber
/// `AuthUser.storeIdForApp('DHL')` vom Aufrufer (`main_dhl.dart`)
/// aufgeloest; ist er `null` (kein/kein aktiviertes DHL-Entitlement), zeigt
/// dieser Screen fail-closed denselben Kein-Zugriff-Zustand wie
/// [DhlHomeScreen] statt die Fachlichkeit ohne gesicherten Store-Kontext
/// zu laden.
class DhlDashboardScreen extends StatefulWidget {
  const DhlDashboardScreen({super.key, this.storeId, this.dhlService, this.user});

  final int? storeId;

  /// Nur fuer Tests: erlaubt das Einschleusen eines Fake-`DhlService`
  /// (analog zum bestehenden Injection-Muster in `DhlHomeScreen`).
  final DhlService? dhlService;

  final AuthUser? user;

  @override
  State<DhlDashboardScreen> createState() => _DhlDashboardScreenState();
}

class _DhlDashboardScreenState extends State<DhlDashboardScreen> {
  late final DhlService _dhlService = widget.dhlService ?? DhlService();
  final _authService = AuthService();

  List<DhlParcelDto> _parcels = [];
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    if (widget.storeId != null) {
      _loadParcels();
    }
  }

  Future<void> _loadParcels() async {
    final storeId = widget.storeId;
    if (storeId == null) return; // fail closed: kein Aufruf ohne gesicherte storeId

    setState(() => _loading = true);
    try {
      final parcels = await _dhlService.listStoredParcels(storeId);
      if (!mounted) return;
      setState(() => _parcels = parcels);
    } catch (_) {
      // Ladefehler blockieren das Dashboard nicht (siehe [DhlHomeScreen],
      // das dieselbe Datenquelle bereits mit eigener Fehleranzeige nutzt) -
      // hier bleibt die Kennzahl-Kachel einfach bei `0`, ein erneuter Besuch
      // von "Pakete im Laden" zeigt den echten Fehlerzustand.
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _logout() async {
    await _authService.logout();
    if (!mounted) return;
    Navigator.of(context).pushReplacement(
      MaterialPageRoute(builder: (_) => const DhlLoginScreen()),
    );
  }

  Future<void> _openStoreParcelScreen() async {
    final storeId = widget.storeId;
    if (storeId == null) return; // fail closed, siehe Klassendoku

    await Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => DhlStoreParcelScreen(storeId: storeId)),
    );
    if (!mounted) return;
    _loadParcels();
  }

  Future<void> _openStoredParcelsScreen() async {
    final storeId = widget.storeId;
    if (storeId == null) return; // fail closed, siehe Klassendoku

    await Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => DhlHomeScreen(storeId: storeId, user: widget.user),
      ),
    );
    if (!mounted) return;
    _loadParcels();
  }

  /// "Paket ausgeben" (Abholung) - oeffnet den bestehenden Abhol-Flow ueber
  /// `/parcels/find`/`/parcels/pickup` (siehe [DhlPickupParcelScreen]).
  /// Nach Rueckkehr wird die Liste/Kennzahl neu geladen, da eine Abholung
  /// den Bestand veraendert (analog zu [_openStoreParcelScreen]).
  Future<void> _openPickupParcelScreen() async {
    final storeId = widget.storeId;
    if (storeId == null) return; // fail closed, siehe Klassendoku

    await Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => DhlPickupParcelScreen(storeId: storeId)),
    );
    if (!mounted) return;
    _loadParcels();
  }

  /// Bildet die letzten (max. 5) eingelagerten Pakete auf
  /// [DhlActivity]-Eintraege ab - ausschliesslich aus bereits geladenen
  /// [_parcels] (identische Datenquelle wie [DhlHomeScreen]), sortiert nach
  /// `receivedAt` absteigend. Parcels ohne parsebares `receivedAt` landen
  /// ans Ende (kein Rateglueck bei der Sortierung, analog zu
  /// [DhlParcelFormat.isReceivedToday]).
  List<DhlActivity> get _recentActivities {
    final sorted = [..._parcels]..sort((a, b) {
        final aTime = DateTime.tryParse(a.receivedAt ?? '');
        final bTime = DateTime.tryParse(b.receivedAt ?? '');
        if (aTime == null && bTime == null) return 0;
        if (aTime == null) return 1;
        if (bTime == null) return -1;
        return bTime.compareTo(aTime);
      });
    return sorted.take(5).map((parcel) {
      final shelf = parcel.shelfLocation;
      return DhlActivity(
        title: 'Sendung ${parcel.trackingCode}',
        description: shelf == null || shelf.trim().isEmpty
            ? 'Noch kein Lagerplatz zugewiesen'
            : 'Lagerplatz $shelf',
        timeLabel: DhlParcelFormat.formatReceivedAt(parcel.receivedAt) ?? '-',
      );
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    if (widget.storeId == null) {
      return _buildNoEntitlement(context);
    }

    return DhlDashboardView(
      userName: widget.user?.name ?? widget.user?.email ?? 'Nutzer',
      storeName: 'Store #${widget.storeId}',
      roleLabel: widget.user?.role,
      storedCount: _loading && _parcels.isEmpty ? null : _parcels.length,
      activities: _recentActivities,
      onStoreParcel: _openStoreParcelScreen,
      onPickupParcel: _openPickupParcelScreen,
      onSearchShipment: _openStoredParcelsScreen,
      onShowStoredParcels: _openStoredParcelsScreen,
      onSignOut: _logout,
    );
  }

  /// Identischer Kein-Zugriff-Zustand wie [DhlHomeScreen] (siehe dort),
  /// nur in einem einfachen `Scaffold` statt der `MarktAppShell`, da das
  /// neue Dashboard-Layout keine Sidebar/Topbar-Shell nutzt.
  Widget _buildNoEntitlement(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Scaffold(
      appBar: AppBar(
        title: const Text('DHL Paketshop'),
        actions: [
          IconButton(onPressed: _logout, icon: const Icon(Icons.logout), tooltip: 'Abmelden'),
        ],
      ),
      body: Center(
        child: MarktCard(
          padding: const EdgeInsets.all(MarktSpacing.xl),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              MarktIconBadge(
                icon: Icon(Icons.lock_outline, color: colorScheme.error),
                accentColor: colorScheme.error,
                size: 64,
              ),
              const SizedBox(height: MarktSpacing.lg),
              Text(
                'Kein DHL-Zugriff',
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: MarktSpacing.sm),
              Text(
                'Fuer diesen Account ist kein aktiviertes DHL-Paketshop-Entitlement '
                'mit Store-Zuordnung bekannt. Bitte an den Administrator wenden.',
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: colorScheme.onSurfaceVariant),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
