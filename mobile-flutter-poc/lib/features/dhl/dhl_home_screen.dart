import 'package:flutter/material.dart';

import '../../models/auth_response.dart';
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
import 'dhl_dashboard_screen.dart';
import 'dhl_pickup_parcel_screen.dart';
import 'dhl_store_parcel_screen.dart';

/// DHL/Paketshop-Home-Screen - erster echter End-to-End-Flow
/// "Pakete im Laden" (siehe DHL-Audit vom 23.09. + Umsetzung danach).
///
/// Ruft fuer die Liste ausschliesslich den bestehenden, lesenden Endpoint
/// `GET /api/stores/{storeId}/dhl/parcels/stored` ueber [DhlService] auf -
/// KEIN Aufruf der externen DHL-Tracking-API direkt aus diesem Screen (das
/// Backend liest hier nur bereits gespeicherte DB-Daten, siehe
/// `DhlParcelService.listStoredParcels`). Die prominente Aktion
/// "+ Paket einlagern" oeffnet den separaten `DhlStoreParcelScreen`
/// (Einlagerungs-Flow, siehe DHL-Einlagerungs-Audit vom 23.09.); Kamera-
/// Scanner, manuelles Slot-Grid, Abholung und Stornierung sind dort
/// bewusst noch nicht Teil des Umfangs.
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
  const DhlHomeScreen({super.key, this.storeId, this.dhlService, this.user});

  final int? storeId;

  /// Nur fuer Tests: erlaubt das Einschleusen eines Fake-`DhlService`
  /// (analog zum bestehenden `client`-Injection-Muster in
  /// `AuthService`/`DocumentsService`), ohne dass Consumer-Code diesen
  /// Parameter im Normalbetrieb setzen muss.
  final DhlService? dhlService;

  /// Ueber `AuthGate`/`GET /auth/me` geladener aktueller User (siehe
  /// Auth-Persistenz-Korrektur vom 23.09.) - hier ZUSAETZLICH zur
  /// bestehenden `storeId`-Aufloesung (siehe `main_dhl.dart`) fuer die
  /// zentrale Current-User-Anzeige im [MarktProfileMenu] genutzt (Name/
  /// E-Mail). Aendert NICHTS an der bestehenden `storeIdForApp('DHL')`-
  /// Logik im Entrypoint.
  final AuthUser? user;

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

  /// Oeffnet den Einlagerungs-Flow (siehe DHL-Einlagerungs-Audit vom 23.09.
  /// + Umsetzung danach, `DhlStoreParcelScreen`). Nach Rueckkehr (egal ob
  /// per "Zur Uebersicht" oder System-Back) wird die Liste IMMER neu
  /// geladen, damit ein gerade eingelagertes Paket sofort erscheint (siehe
  /// Aufgabenstellung) - ein erneutes `_loadParcels()` ist unschaedlich,
  /// falls in der Zwischenzeit gar nichts eingelagert wurde.
  Future<void> _openStoreParcelScreen() async {
    final storeId = widget.storeId;
    if (storeId == null) return;

    await Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => DhlStoreParcelScreen(storeId: storeId)),
    );
    if (!mounted) return;
    _loadParcels();
  }

  Future<void> _openPickupParcelScreen() async {
    final storeId = widget.storeId;
    if (storeId == null) return;

    await Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => DhlPickupParcelScreen(storeId: storeId)),
    );
    if (!mounted) return;
    _loadParcels();
  }

  void _backToDashboard() {
    final navigator = Navigator.of(context);
    final isRootScreen = ModalRoute.of(context)?.isFirst ?? false;
    // A tablet drawer contributes a local history entry to this route. A
    // single pop would only close the drawer without leaving the parcel list.
    navigator.popUntil((route) => route.isFirst);
    if (isRootScreen) {
      // Also works when a saved browser session restores the parcel list as
      // the first route instead of arriving here from the dashboard.
      navigator.pushReplacement(MaterialPageRoute(
        builder: (_) => DhlDashboardScreen(storeId: widget.storeId, user: widget.user, dhlService: widget.dhlService),
      ));
    }
  }

  @override
  Widget build(BuildContext context) {
    return MarktAppShell(
      title: 'DHL Paketshop',
      sideNavHeader: _buildBrandHeader(context),
      navItems: [
        MarktNavItem(
          icon: Icons.dashboard_outlined,
          label: 'Uebersicht',
          onTap: _backToDashboard,
        ),
        const MarktNavItem(
          icon: Icons.local_shipping_outlined,
          label: 'Pakete im Laden',
          selected: true,
        ),
      ],
      actions: [
        IconButton(
          onPressed: widget.storeId == null || _loading ? null : _loadParcels,
          icon: const Icon(Icons.refresh),
        ),
      ],
      // Kontext-Zeile (23.09. Folgeanpassung, siehe `MarktProfileMenu.
      // contextLabel`): "DHL Paketshop · Store <storeId>" - ausschliesslich
      // aus bereits vorhandenen Daten abgeleitet (App-Name + der ueber
      // `AuthUser.storeIdForApp('DHL')` bereits aufgeloesten `storeId`).
      // KEIN Store-Name (z.B. "Marrakech market"): der ist aktuell weder in
      // `AuthUser` noch im DHL-Parcel-Endpoint enthalten - das wuerde ein
      // neues Backend-Feld erfordern, was hier explizit nicht gewuenscht
      // ist. Ohne aufgeloeste `storeId` (fail-closed-Fall) bleibt der
      // Kontext `null` - der Trigger zeigt dann weiterhin die E-Mail
      // (bisheriges Verhalten).
      profile: MarktProfileMenu(
        userLabel: widget.user?.name,
        userSubLabel: widget.user?.email,
        roleLabel: widget.user?.role,
        contextLabel: widget.storeId == null ? null : 'DHL Paketshop · Store ${widget.storeId}',
        onLogout: _logout,
      ),
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
          // Flexible+ellipsis (Fix waehrend Kontext-Zeilen-Arbeit vom
          // 23.09.): bei der Sidebar-Breite (248px, siehe `MarktAppShell`)
          // ueberlief der reine `Text('markt.ma')` bislang unbemerkt um
          // wenige Pixel, weil dieser Codepfad (Desktop-Sidebar sichtbar,
          // nicht im Drawer versteckt) zuvor in keinem Widget-Test
          // tatsaechlich bei Desktop-Breite gerendert wurde - kein neues
          // Feature, nur eine Absicherung des bestehenden Brand-Headers.
          Flexible(
            child: Text(
              'markt.ma',
              overflow: TextOverflow.ellipsis,
              style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800),
            ),
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
        final isPhone = MarktBreakpoints.isPhone(constraints.maxWidth);
        final horizontalPadding = isDesktop ? MarktSpacing.xl : MarktSpacing.md;

        return Center(
          child: ConstrainedBox(
            // Sinnvolle Max-Content-Breite (siehe Aufgabenstellung) - nur
            // auf ultra-breiten Monitoren relevant; auf typischen
            // 1280-1600px-Desktop-Breiten wird der verfuegbare Platz
            // weiterhin voll genutzt.
            constraints: const BoxConstraints(maxWidth: 1400),
            // Layout-Fix (Regression): Header + Stat-Cards + Suchzeile
            // koennen - je nach Bildschirmhoehe - mehr vertikalen Platz
            // beanspruchen, als verfuegbar ist. Ein `Column`+`Expanded`
            // fuer die Paketliste wuerde in diesem Fall auf (nahezu) 0
            // Hoehe zusammengedrueckt (der Fehler aus dem vorherigen
            // UI-Pass). Ein `CustomScrollView` mit einem abschliessenden
            // `SliverFillRemaining(hasScrollBody: true)` loest das
            // natuerlich/responsiv: Der Header-Bereich nimmt genau so
            // viel Platz ein, wie er benoetigt; die Paketliste bekommt
            // IMMER die tatsaechlich verbleibende Viewport-Hoehe (auf
            // grossen Bildschirmen: viel Platz; auf kleinen: man scrollt
            // ggf. kurz weiter - niemals eine erzwungene/fest verdrahtete
            // Pixelzahl). Kein nested-Scroll-Konflikt:
            // `SliverFillRemaining(hasScrollBody: true)` ist exakt fuer
            // ein scrollbares Kind (hier: `MarktResponsiveDataList`s
            // eigene ListView/GridView + RefreshIndicator) innerhalb eines
            // `CustomScrollView` vorgesehen - dieselbe Technik, die z.B.
            // `NestedScrollView` nutzt, nur ohne Collapsing-Header.
            //
            // Damit die Paketliste auch auf kompakten Bildschirmhoehen
            // (z.B. 800x600) OHNE Scrollen bereits sichtbar ist, bleibt
            // der Header-Bereich selbst bewusst kompakt: Die Stat-Cards
            // stehen ab Tablet-Breite (>= 600px, `!isPhone`) nebeneinander
            // in einer Reihe statt gestapelt - das ist KEIN Test-Hack,
            // sondern schlicht der sinnvollere/kompaktere Aufbau ab dieser
            // Breite (3 kurze Kennzahl-Karten passen dort problemlos in
            // eine Zeile). Nur auf echten Phone-Breiten (< 600px) werden
            // sie gestapelt, weil dort keine 3 Karten nebeneinander
            // passen.
            child: CustomScrollView(
              slivers: [
                SliverPadding(
                  padding: EdgeInsets.fromLTRB(horizontalPadding, MarktSpacing.md, horizontalPadding, 0),
                  sliver: SliverToBoxAdapter(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _buildPageHeader(context, stacked: isPhone),
                        const SizedBox(height: MarktSpacing.lg),
                        _buildStatCards(context, stacked: isPhone),
                        const SizedBox(height: MarktSpacing.lg),
                        _buildSectionHeader(context, stacked: isPhone),
                        const SizedBox(height: MarktSpacing.md),
                      ],
                    ),
                  ),
                ),
                SliverPadding(
                  padding: EdgeInsets.fromLTRB(horizontalPadding, 0, horizontalPadding, MarktSpacing.md),
                  sliver: SliverFillRemaining(
                    hasScrollBody: true,
                    child: _buildParcelList(context),
                  ),
                ),
              ],
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
  Widget _buildPageHeader(BuildContext context, {required bool stacked}) {
    final colorScheme = Theme.of(context).colorScheme;
    final title = Column(
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
    );

    final pickupButton = OutlinedButton.icon(
      key: const ValueKey('dhlHome.pickupAction'),
      onPressed: _openPickupParcelScreen,
      icon: const Icon(Icons.outbox_outlined),
      label: const Text('Paket ausgeben'),
      style: OutlinedButton.styleFrom(
        minimumSize: const Size(0, 48),
        foregroundColor: colorScheme.primary,
        side: BorderSide(color: colorScheme.primary, width: 1.5),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      ),
    );
    final storeButton = FilledButton.icon(
      key: const ValueKey('dhlHome.storeAction'),
      onPressed: _openStoreParcelScreen,
      icon: const Icon(Icons.add),
      label: const Text('Paket einlagern'),
      style: FilledButton.styleFrom(
        minimumSize: const Size(0, 48),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      ),
    );

    if (stacked) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          title,
          const SizedBox(height: MarktSpacing.lg),
          storeButton,
          const SizedBox(height: MarktSpacing.sm),
          pickupButton,
        ],
      );
    }

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(child: title),
        pickupButton,
        const SizedBox(width: MarktSpacing.sm),
        storeButton,
      ],
    );
  }

  /// Kennzahl-Karten (siehe Aufgabenstellung) - ausschliesslich aus der
  /// bereits geladenen [_parcels]-Liste abgeleitet, keine Fake-Daten/neuen
  /// Endpoints. Stehen ab Tablet-Breite (>= 600px) nebeneinander in einer
  /// Reihe (kompakt, bewusst NICHT erst ab Desktop - 3 kurze Karten
  /// passen bereits ab Tablet-Breite problemlos nebeneinander und halten
  /// den Header-Bereich insgesamt niedrig, siehe [_buildBody]). Nur auf
  /// echten Phone-Breiten ([stacked] = `true`) werden sie untereinander
  /// gestapelt, da dort keine 3 Karten nebeneinander passen.
  Widget _buildStatCards(BuildContext context, {required bool stacked}) {
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

    if (stacked) {
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

  /// Sektions-Header "Pakete im Laden" + clientseitige Suche. Steht ab
  /// Tablet-Breite in einer Reihe (Titel links, Suchfeld mit fester Breite
  /// rechts); auf echten Phone-Breiten ([stacked] = `true`) wird das
  /// Suchfeld darunter ueber die volle Breite gestapelt, da eine feste
  /// 320px-Breite auf sehr schmalen Bildschirmen (z.B. 360px) sonst
  /// overflowen wuerde.
  Widget _buildSectionHeader(BuildContext context, {required bool stacked}) {
    final title = Text(
      'Pakete im Laden',
      style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
    );
    final colorScheme = Theme.of(context).colorScheme;
    final searchField = TextField(
      key: const ValueKey('dhlHome.searchField'),
      controller: _searchController,
      decoration: InputDecoration(
        isDense: true,
        prefixIcon: const Icon(Icons.search),
        suffixIcon: _searchQuery.isEmpty
            ? null
            : IconButton(
                key: const ValueKey('dhlHome.clearSearch'),
                tooltip: 'Suche leeren',
                onPressed: _searchController.clear,
                icon: const Icon(Icons.close),
              ),
        hintText: 'Trackingnummer oder Lagerplatz suchen',
        filled: true,
        fillColor: colorScheme.surface,
        enabledBorder: OutlineInputBorder(
          borderRadius: const BorderRadius.all(Radius.circular(10)),
          borderSide: BorderSide(color: colorScheme.outlineVariant),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: const BorderRadius.all(Radius.circular(10)),
          borderSide: BorderSide(color: colorScheme.primary, width: 2),
        ),
      ),
    );

    if (stacked) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          title,
          const SizedBox(height: MarktSpacing.sm),
          searchField,
        ],
      );
    }

    return Row(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        Expanded(child: title),
        const SizedBox(width: MarktSpacing.md),
        SizedBox(width: 320, child: searchField),
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
