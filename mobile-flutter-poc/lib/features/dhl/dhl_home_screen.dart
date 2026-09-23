import 'package:flutter/material.dart';

import '../../models/dhl_parcel_dto.dart';
import '../../services/auth_service.dart';
import '../../services/dhl_service.dart';
import '../../theme/markt_theme.dart';
import '../../widgets/dhl/dhl_parcel_card.dart';
import '../../widgets/dhl/dhl_parcel_format.dart';
import '../../widgets/dhl/dhl_parcel_table.dart';
import '../../widgets/dhl/dhl_stat_card.dart';
import '../../widgets/shared/markt_app_shell.dart';
import '../../widgets/shared/markt_breakpoints.dart';
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
  final _searchController = TextEditingController();

  List<DhlParcelDto> _parcels = [];
  bool _loading = false;
  Object? _error;
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    _searchController.addListener(() {
      setState(() => _searchQuery = _searchController.text.trim().toLowerCase());
    });
    if (widget.storeId != null) {
      _loadParcels();
    }
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  /// Clientseitige Suche nach Trackingnummer/Lagerplatz (siehe
  /// Aufgabenstellung) - filtert ausschliesslich die bereits geladene
  /// [_parcels]-Liste, KEIN neuer API-Aufruf. Beeinflusst bewusst NICHT
  /// die Kennzahl-Karten (siehe [_totalCount] etc.), die weiterhin den
  /// vollstaendigen geladenen Bestand zeigen.
  List<DhlParcelDto> get _filteredParcels {
    if (_searchQuery.isEmpty) return _parcels;
    return _parcels.where((p) {
      final tracking = p.trackingCode.toLowerCase();
      final shelf = (p.shelfLocation ?? '').toLowerCase();
      return tracking.contains(_searchQuery) || shelf.contains(_searchQuery);
    }).toList();
  }

  int get _totalCount => _parcels.length;

  int get _withoutShelfCount =>
      _parcels.where((p) => p.shelfLocation == null || p.shelfLocation!.trim().isEmpty).length;

  int get _receivedTodayCount {
    final now = DateTime.now();
    return _parcels.where((p) => DhlParcelFormat.isReceivedToday(p.receivedAt, now)).length;
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
      // Navigation vorbereitet (siehe Aufgabenstellung "Navigation
      // vorbereiten... noch nicht funktional implementieren"): nur die
      // beiden fuer den aktuellen Flow relevanten Bereiche. "Uebersicht"
      // ist ein reiner Platzhalter (kein eigener Screen/State dahinter) -
      // Scanner/Einlagerung/Abholung werden bewusst noch NICHT als
      // Eintraege ergaenzt, da dafuer noch keine Fachlogik existiert.
      navItems: const [
        MarktNavItem(icon: Icons.dashboard_outlined, label: 'Uebersicht'),
        MarktNavItem(icon: Icons.local_shipping_outlined, label: 'Pakete im Laden', selected: true),
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

    return LayoutBuilder(
      builder: (context, constraints) {
        final isDesktop = MarktBreakpoints.isDesktop(constraints.maxWidth);
        return Center(
          child: ConstrainedBox(
            // Sinnvolle Max-Content-Breite (siehe Aufgabenstellung) - nur
            // auf ultra-breiten Monitoren relevant; auf typischen
            // 1280-1600px-Desktop-Breiten wird der verfuegbare Platz
            // weiterhin voll genutzt.
            constraints: const BoxConstraints(maxWidth: 1400),
            child: Padding(
              padding: EdgeInsets.symmetric(
                horizontal: isDesktop ? MarktSpacing.xl : MarktSpacing.md,
                vertical: MarktSpacing.md,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildPageHeader(context),
                  const SizedBox(height: MarktSpacing.lg),
                  _buildStatCards(context, isDesktop),
                  const SizedBox(height: MarktSpacing.xl),
                  _buildSectionHeader(context),
                  const SizedBox(height: MarktSpacing.md),
                  Expanded(child: _buildParcelList(context)),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  /// Echter Content-Header (siehe Aufgabenstellung) - Titel + Store-
  /// Kontext. Es steht in den aktuell geladenen Daten (`AppEntitlementDTO`
  /// / `DhlParcelResponse`) KEIN Store-Name zur Verfuegung (siehe DHL-
  /// UI-Pass-Audit) - daher bewusst KEIN erfundener Name ("Marrakech
  /// market"), sondern der real vorhandene Wert `storeId`. Eine
  /// zukuenftige, hier bewusst ausgeklammerte Backend-Erweiterung um ein
  /// Store-Namensfeld wuerde ein sprechenderes Label ermoeglichen.
  Widget _buildPageHeader(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'DHL Paketshop',
                style: Theme.of(context).textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 2),
              Text(
                'Store #${widget.storeId}',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: colorScheme.onSurfaceVariant),
              ),
            ],
          ),
        ),
      ],
    );
  }

  /// Kennzahl-Karten (siehe Aufgabenstellung) - ausschliesslich aus der
  /// bereits geladenen [_parcels]-Liste abgeleitet, keine Fake-Daten/neuen
  /// Endpoints. Auf Desktop nebeneinander, auf schmaleren Breiten
  /// (Tablet/Phone) untereinander gestapelt (`Wrap`, damit es bei sehr
  /// schmalen Breiten nicht overflowt).
  Widget _buildStatCards(BuildContext context, bool isDesktop) {
    final colorScheme = Theme.of(context).colorScheme;
    final cards = [
      DhlStatCard(
        icon: Icons.inventory_2_outlined,
        label: 'Pakete im Laden',
        value: '$_totalCount',
        accentColor: colorScheme.primary,
      ),
      DhlStatCard(
        icon: Icons.shelves,
        label: 'Ohne Lagerplatz',
        value: '$_withoutShelfCount',
        accentColor: colorScheme.tertiary,
      ),
      DhlStatCard(
        icon: Icons.today_outlined,
        label: 'Heute eingelagert',
        value: '$_receivedTodayCount',
        accentColor: colorScheme.secondary,
      ),
    ];

    if (!isDesktop) {
      return Column(
        children: [
          for (final card in cards) ...[card, const SizedBox(height: MarktSpacing.sm)],
        ],
      );
    }

    return Row(
      children: [
        for (final card in cards) ...[
          Expanded(child: card),
          if (card != cards.last) const SizedBox(width: MarktSpacing.md),
        ],
      ],
    );
  }

  Widget _buildSectionHeader(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        Expanded(
          child: Text(
            'Pakete im Laden',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
          ),
        ),
        const SizedBox(width: MarktSpacing.md),
        SizedBox(
          width: 320,
          child: TextField(
            controller: _searchController,
            decoration: const InputDecoration(
              isDense: true,
              prefixIcon: Icon(Icons.search),
              hintText: 'Suche nach Trackingnummer/Lagerplatz',
              border: OutlineInputBorder(),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildParcelList(BuildContext context) {
    return MarktResponsiveDataList<DhlParcelDto>(
      items: _filteredParcels,
      loading: _loading,
      error: _error,
      onRefresh: _loadParcels,
      emptyWidget: Text(_searchQuery.isEmpty ? 'Keine Pakete im Laden' : 'Keine Treffer fuer "$_searchQuery"'),
      // 140 statt Default 88 (Documents) / 108: DhlParcelCard zeigt zwei
      // Textzeilen (Lagerplatz+Eingelagert) + einen Status-Badge zusaetzlich
      // zu Titel/Icon - dafuer wird mehr vertikale Hoehe pro Grid-Zelle
      // benoetigt, sonst overflowt der Card-Inhalt im Grid-Modus (Tablet-
      // Breite, siehe MarktBreakpoints). Auf echten Desktop-Breiten wird
      // stattdessen `wideBuilder`/`DhlParcelTable` verwendet.
      gridItemHeight: 140,
      itemBuilder: (context, parcel) => DhlParcelCard(parcel: parcel),
      wideBuilder: (context, parcels) => DhlParcelTable(parcels: parcels),
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
