import 'package:flutter/material.dart';

import '../../models/dhl_parcel_dto.dart';
import '../../services/auth_service.dart';
import '../../services/dhl_service.dart';
import '../../theme/markt_theme.dart';
import '../../widgets/dhl/dhl_parcel_card.dart';
import '../../widgets/shared/markt_app_shell.dart';
import '../../widgets/shared/markt_card.dart';
import '../../widgets/shared/markt_icon_badge.dart';
import '../../widgets/shared/markt_profile_menu.dart';
import '../../widgets/shared/markt_responsive_data_list.dart';
import '../../widgets/shared/markt_side_nav.dart';
import 'dhl_login_screen.dart';

/// DHL/Paketshop-Home-Screen - erster echter End-to-End-Flow
/// "Pakete im Laden" (siehe DHL-Audit vom 23.09. + Umsetzung danach).
///
/// Ruft ausschliesslich den bestehenden, lesenden Endpoint
/// `GET /api/stores/{storeId}/dhl/parcels/stored` ueber [DhlService] auf -
/// KEIN Scanner, KEIN Einlagern/Abholen/Stornieren, KEIN Aufruf der
/// externen DHL-Tracking-API aus Flutter (das Backend liest hier nur
/// bereits gespeicherte DB-Daten, siehe `DhlParcelService.listStoredParcels`).
///
/// [storeId] wird vom Aufrufer (i.d.R. `DhlLoginScreen` direkt nach
/// erfolgreichem Login, siehe dort) aus `AuthUser.storeIdForApp('DHL')`
/// aufgeloest und hier lediglich entgegengenommen - dieser Screen kennt
/// selbst keine Login-/Entitlement-Logik.
///
/// WICHTIG (fail-closed, siehe Audit-Abschnitt "kein DHL entitlement / kein
/// storeId / DHL disabled"): Ist [storeId] `null` (z.B. kein aktiviertes
/// DHL-Entitlement, oder DHL-Entitlement mit `enabled: false`), wird NIE
/// versucht, eine storeId zu raten oder den Endpoint ohne storeId
/// aufzurufen. Stattdessen zeigt dieser Screen einen expliziten
/// Kein-Zugriff-Zustand.
///
/// Seit der Auth-Persistenz-Korrektur vom 23.09. wird [storeId] nicht nur
/// direkt nach Login (`DhlLoginScreen`), sondern auch nach App-/
/// Browser-Neustart zuverlaessig aufgeloest: `AuthGate` laedt den aktuellen
/// User bei vorhandenem JWT ueber das (nun erweiterte) `GET /api/auth/me`
/// (liefert denselben Contract wie `/login`, inkl. `apps[]`) und reicht ihn
/// an `main_dhl.dart`s `homeBuilder` durch, der daraus wie hier `storeId`
/// aufloest - kein separates storeId-Caching, keine neue Store-Context-
/// Architektur.
class DhlHomeScreen extends StatefulWidget {
  const DhlHomeScreen({super.key, this.storeId, this.dhlService});

  final int? storeId;

  /// Nur fuer Tests: erlaubt das Einschleusen eines Fake-`DhlService`
  /// (analog zum bestehenden `client`-Injection-Muster in
  /// `AuthService`/`DocumentsService`), ohne dass Consumer-Code diesen
  /// Parameter im Normalbetrieb setzen muss.
  final DhlService? dhlService;

  @override
  State<DhlHomeScreen> createState() => _DhlHomeScreenState();
}

class _DhlHomeScreenState extends State<DhlHomeScreen> {
  late final DhlService _dhlService = widget.dhlService ?? DhlService();
  final _authService = AuthService();

  List<DhlParcelDto> _parcels = [];
  bool _loading = false;
  Object? _error;

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

    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final parcels = await _dhlService.listStoredParcels(storeId);
      if (!mounted) return;
      setState(() => _parcels = parcels);
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e);
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

  @override
  Widget build(BuildContext context) {
    return MarktAppShell(
      title: 'DHL Paketshop',
      sideNavHeader: _buildBrandHeader(context),
      navItems: const [
        MarktNavItem(icon: Icons.local_shipping, label: 'DHL Paketshop', selected: true),
      ],
      actions: [
        IconButton(
          onPressed: widget.storeId == null || _loading ? null : _loadParcels,
          icon: const Icon(Icons.refresh),
        ),
      ],
      profile: MarktProfileMenu(onLogout: _logout),
      body: _buildBody(context),
    );
  }

  /// Kleiner Branding-Slot oberhalb der Sidebar/des Drawers - analog zu
  /// `DocumentsScreen`/`MaritimeHomeScreen`.
  Widget _buildBrandHeader(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.all(MarktSpacing.lg),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: colorScheme.primary,
              borderRadius: BorderRadius.circular(12),
            ),
            alignment: Alignment.center,
            child: Icon(Icons.apps, color: colorScheme.onPrimary, size: 22),
          ),
          const SizedBox(width: MarktSpacing.md),
          Text(
            'markt.ma',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800),
          ),
        ],
      ),
    );
  }

  Widget _buildBody(BuildContext context) {
    if (widget.storeId == null) {
      return _buildNoEntitlement(context);
    }

    return MarktResponsiveDataList<DhlParcelDto>(
      items: _parcels,
      loading: _loading,
      error: _error,
      onRefresh: _loadParcels,
      emptyWidget: const Text('Keine Pakete im Laden'),
      // 140 statt Default 88 (Documents) / 108: DhlParcelCard zeigt zwei
      // Textzeilen (Lagerplatz+Eingelagert) + einen Status-Badge zusaetzlich
      // zu Titel/Icon - dafuer wird mehr vertikale Hoehe pro Grid-Zelle
      // benoetigt, sonst overflowt der Card-Inhalt im Grid-Modus (Tablet/
      // Desktop-Breite, siehe MarktBreakpoints).
      gridItemHeight: 140,
      itemBuilder: (context, parcel) => DhlParcelCard(parcel: parcel),
    );
  }

  /// Fail-closed-Zustand: kein aktiviertes DHL-Entitlement / keine
  /// aufgeloeste storeId (siehe Klassendoku). Zeigt dies explizit an statt
  /// eine leere Liste zu simulieren oder den Endpoint ohne storeId
  /// aufzurufen.
  Widget _buildNoEntitlement(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Center(
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
    );
  }
}
