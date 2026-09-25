import 'package:flutter/material.dart';

import '../../models/auth_response.dart';
import '../../models/dhl_activity_log.dart';
import '../../services/auth_service.dart';
import '../../services/dhl_service.dart';
import '../../theme/markt_theme.dart';
import '../../widgets/dhl/dhl_dashboard_view.dart';
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
/// - "Pakete im Laden" kommt aus [DhlService.listStoredParcels]. Die letzten
///   Aktionen und "Heute ausgegeben" kommen aus dem bestehenden, auf den
///   Store begrenzten DHL-Aktivitaetsprotokoll.
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

  int? _storedCount;
  int? _pickedUpTodayCount;
  List<DhlActivityLog> _activityLog = [];

  @override
  void initState() {
    super.initState();
    if (widget.storeId != null) {
      _loadDashboard();
    }
  }

  Future<void> _loadDashboard() async {
    final storeId = widget.storeId;
    if (storeId == null) return; // fail closed: kein Aufruf ohne gesicherte storeId

    try {
      final parcels = await _dhlService.listStoredParcels(storeId);
      if (!mounted) return;
      setState(() => _storedCount = parcels.length);
    } catch (_) {
      if (mounted) setState(() => _storedCount = null);
    }

    try {
      final log = await _dhlService.getActivityLog(storeId);
      if (mounted) setState(() => _activityLog = log.content);
    } catch (_) {
      if (mounted) setState(() => _activityLog = []);
    }

    try {
      final today = await _dhlService.getActivityLog(storeId, size: 1, today: true, action: 'PICKED_UP');
      if (mounted) setState(() => _pickedUpTodayCount = today.totalElements);
    } catch (_) {
      if (mounted) setState(() => _pickedUpTodayCount = null);
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
    _loadDashboard();
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
    _loadDashboard();
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
    _loadDashboard();
  }

  /// Shows actual store/pickup/cancellation events from the audit log.
  List<DhlActivity> get _recentActivities {
    return _activityLog.where((entry) => const {'STORED', 'PICKED_UP', 'STORAGE_CANCELLED'}
        .contains(entry.action)).take(5).map((entry) {
      final shelf = entry.slotSnapshot;
      final label = switch (entry.action) {
        'PICKED_UP' => 'Ausgegeben',
        'STORAGE_CANCELLED' => 'Einlagerung storniert',
        _ => 'Eingelagert',
      };
      return DhlActivity(
        title: '$label: ${entry.trackingCode}',
        description: shelf == null || shelf.trim().isEmpty
            ? 'Kein Lagerplatz angegeben'
            : 'Lagerplatz $shelf',
        timeLabel: entry.createdAt == null
            ? '-'
            : '${entry.createdAt!.day.toString().padLeft(2, '0')}.${entry.createdAt!.month.toString().padLeft(2, '0')}. '
                '${entry.createdAt!.hour.toString().padLeft(2, '0')}:${entry.createdAt!.minute.toString().padLeft(2, '0')}',
        icon: entry.action == 'PICKED_UP' ? Icons.outbox_outlined : Icons.inventory_2_outlined,
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
      storedCount: _storedCount,
      pickedUpTodayCount: _pickedUpTodayCount,
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
