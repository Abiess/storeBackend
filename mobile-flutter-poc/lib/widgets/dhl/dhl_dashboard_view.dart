import 'package:flutter/material.dart';

/// Praesentations-Widget fuer den neuen DHL/Paketshop-Dashboard-Screen
/// (Einstiegs-Layout "Guten Tag, ..." mit den drei Kernaktionen
/// "Paket einlagern"/"Paket ausgeben"/"Sendung suchen", Kennzahl-Kacheln
/// und "Letzte Aktivitaeten"-Liste).
///
/// Bewusst reines Layout-Widget (kein API-/State-Wissen) - Werte und
/// Callbacks werden komplett vom Aufrufer (`DhlDashboardScreen`, siehe
/// `features/dhl/dhl_dashboard_screen.dart`) geliefert, der sie an die
/// BESTEHENDEN DHL-Flows anbindet (`DhlService.listStoredParcels`,
/// `DhlStoreParcelScreen`, `DhlHomeScreen`, `AuthService.logout`). Farben,
/// Schriftgroessen und Abstaende sind unveraendert aus der Vorlage
/// uebernommen.
class DhlDashboardView extends StatelessWidget {
  const DhlDashboardView({
    super.key,
    required this.userName,
    required this.onStoreParcel,
    required this.onPickupParcel,
    required this.onSearchShipment,
    required this.onShowStoredParcels,
    required this.onSignOut,
    this.storeName,
    this.roleLabel,
    this.onOpenProfile,
    this.storedCount,
    this.pickedUpTodayCount,
    this.activities = const [],
  });

  final String userName;
  final String? storeName;
  final String? roleLabel;
  final VoidCallback onStoreParcel;
  final VoidCallback onPickupParcel;
  final VoidCallback onSearchShipment;
  final VoidCallback onShowStoredParcels;
  final VoidCallback onSignOut;
  final VoidCallback? onOpenProfile;
  final int? storedCount;
  final int? pickedUpTodayCount;
  final List<DhlActivity> activities;

  static const _yellow = Color(0xFFFFCC00);
  static const _ink = Color(0xFF202124);
  static const _red = Color(0xFFD40511);
  static const _canvas = Color(0xFFF6F7F8);

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      backgroundColor: _canvas,
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) {
            final wide = constraints.maxWidth >= 760;
            return CustomScrollView(
              slivers: [
                SliverToBoxAdapter(child: _header(context, wide)),
                SliverToBoxAdapter(
                  child: Center(
                    child: ConstrainedBox(
                      constraints: const BoxConstraints(maxWidth: 1060),
                      child: Padding(
                        padding: EdgeInsets.fromLTRB(
                          wide ? 32 : 20, 28, wide ? 32 : 20, 40,
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Guten Tag, $userName',
                                style: theme.textTheme.headlineMedium?.copyWith(
                                  fontWeight: FontWeight.w800,
                                  color: _ink,
                                )),
                            const SizedBox(height: 6),
                            Text(
                              storeName == null || storeName!.trim().isEmpty
                                  ? 'Was möchtest du heute erledigen?'
                                  : 'Paketshop · $storeName',
                              style: theme.textTheme.bodyLarge?.copyWith(
                                color: const Color(0xFF62666C),
                              ),
                            ),
                            const SizedBox(height: 28),
                            _featuredAction(context),
                            const SizedBox(height: 14),
                            if (wide)
                              Row(children: [
                                Expanded(child: _pickupAction(context)),
                                const SizedBox(width: 14),
                                Expanded(child: _searchAction(context)),
                              ])
                            else ...[
                              _pickupAction(context),
                              const SizedBox(height: 14),
                              _searchAction(context),
                            ],
                            if (storedCount != null ||
                                pickedUpTodayCount != null) ...[
                              const SizedBox(height: 36),
                              _sectionTitle(context, 'Dein Überblick'),
                              const SizedBox(height: 14),
                              _overview(context, wide),
                            ],
                            if (activities.isNotEmpty) ...[
                              const SizedBox(height: 36),
                              _sectionTitle(context, 'Letzte Aktivitäten'),
                              const SizedBox(height: 14),
                              _activityList(context),
                            ],
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            );
          },
        ),
      ),
    );
  }

  Widget _header(BuildContext context, bool wide) {
    return Container(
      color: Colors.white,
      padding: EdgeInsets.symmetric(horizontal: wide ? 32 : 20, vertical: 14),
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 1060),
          child: Row(children: [
            Container(
              width: 42,
              height: 42,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: _yellow,
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Icon(Icons.inventory_2_outlined, color: _red),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text('Paketshop',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        color: _ink,
                        fontWeight: FontWeight.w800,
                      )),
            ),
            PopupMenuButton<_ProfileAction>(
              tooltip: 'Profilmenü öffnen',
              onSelected: (action) {
                switch (action) {
                  case _ProfileAction.profile:
                    onOpenProfile?.call();
                  case _ProfileAction.signOut:
                    onSignOut();
                }
              },
              itemBuilder: (context) => [
                PopupMenuItem<_ProfileAction>(
                  enabled: false,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(userName,
                          style: const TextStyle(
                              color: _ink, fontWeight: FontWeight.w700)),
                      if (roleLabel != null && roleLabel!.isNotEmpty)
                        Text(roleLabel!,
                            style: const TextStyle(color: Color(0xFF62666C))),
                      if (storeName != null && storeName!.isNotEmpty)
                        Text(storeName!,
                            style: const TextStyle(color: Color(0xFF62666C))),
                    ],
                  ),
                ),
                const PopupMenuDivider(),
                if (onOpenProfile != null)
                  const PopupMenuItem(
                    value: _ProfileAction.profile,
                    child: _MenuLabel(Icons.person_outline, 'Profil'),
                  ),
                const PopupMenuItem(
                  value: _ProfileAction.signOut,
                  child: _MenuLabel(Icons.logout, 'Abmelden'),
                ),
              ],
              child: Semantics(
                button: true,
                label: 'Profil von $userName',
                child: CircleAvatar(
                  radius: 21,
                  backgroundColor: const Color(0xFFFFF3CC),
                  child: Text(_initials(userName),
                      style: const TextStyle(
                          color: _ink, fontWeight: FontWeight.w800)),
                ),
              ),
            ),
          ]),
        ),
      ),
    );
  }

  Widget _featuredAction(BuildContext context) {
    return _ActionTile(
      title: 'Paket einlagern',
      subtitle: 'Sendung scannen und Lagerplatz zuweisen',
      icon: Icons.add_box_outlined,
      onTap: onStoreParcel,
      background: _yellow,
      iconColor: _red,
      prominent: true,
    );
  }

  Widget _pickupAction(BuildContext context) => _ActionTile(
        title: 'Paket ausgeben',
        subtitle: 'Sendung finden und Übergabe abschließen',
        icon: Icons.outbox_outlined,
        onTap: onPickupParcel,
        background: Colors.white,
        iconColor: _ink,
      );

  Widget _searchAction(BuildContext context) => _ActionTile(
        title: 'Sendung suchen',
        subtitle: 'Per Scan oder Sendungsnummer suchen',
        icon: Icons.search,
        onTap: onSearchShipment,
        background: Colors.white,
        iconColor: _ink,
      );

  Widget _sectionTitle(BuildContext context, String title) => Text(
        title,
        style: Theme.of(context).textTheme.titleLarge?.copyWith(
              color: _ink,
              fontWeight: FontWeight.w800,
            ),
      );

  Widget _overview(BuildContext context, bool wide) {
    final tiles = <Widget>[
      if (storedCount != null)
        _StatTile(
          label: 'Pakete im Laden',
          value: '$storedCount',
          icon: Icons.warehouse_outlined,
          onTap: onShowStoredParcels,
        ),
      if (pickedUpTodayCount != null)
        _StatTile(
          label: 'Heute ausgegeben',
          value: '$pickedUpTodayCount',
          icon: Icons.check_circle_outline,
        ),
    ];
    if (!wide || tiles.length == 1) {
      return Column(children: [
        for (var i = 0; i < tiles.length; i++) ...[
          if (i > 0) const SizedBox(height: 12),
          tiles[i],
        ],
      ]);
    }
    return Row(children: [
      Expanded(child: tiles[0]),
      const SizedBox(width: 14),
      Expanded(child: tiles[1]),
    ]);
  }

  Widget _activityList(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(children: [
        for (var i = 0; i < activities.length; i++) ...[
          if (i > 0)
            const Divider(height: 1, indent: 70, endIndent: 20),
          ListTile(
            contentPadding:
                const EdgeInsets.symmetric(horizontal: 18, vertical: 7),
            leading: CircleAvatar(
              backgroundColor: const Color(0xFFFFF3CC),
              child: Icon(activities[i].icon, color: _red, size: 20),
            ),
            title: Text(activities[i].title,
                maxLines: 1, overflow: TextOverflow.ellipsis),
            subtitle: Text(activities[i].description,
                maxLines: 2, overflow: TextOverflow.ellipsis),
            trailing: Text(activities[i].timeLabel,
                style: Theme.of(context).textTheme.labelSmall),
          ),
        ],
      ]),
    );
  }

  static String _initials(String name) {
    final parts = name.trim().split(RegExp(r'\s+'));
    if (parts.isEmpty || parts.first.isEmpty) return '?';
    return parts.take(2).map((part) => part[0].toUpperCase()).join();
  }
}

enum _ProfileAction { profile, signOut }

class _MenuLabel extends StatelessWidget {
  const _MenuLabel(this.icon, this.label);
  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) => Row(children: [
        Icon(icon, size: 20),
        const SizedBox(width: 12),
        Text(label),
      ]);
}

class _ActionTile extends StatelessWidget {
  const _ActionTile({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.onTap,
    required this.background,
    required this.iconColor,
    this.prominent = false,
  });
  final String title;
  final String subtitle;
  final IconData icon;
  final VoidCallback onTap;
  final Color background;
  final Color iconColor;
  final bool prominent;

  @override
  Widget build(BuildContext context) => Material(
        color: background,
        borderRadius: BorderRadius.circular(20),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(20),
          child: Padding(
            padding: EdgeInsets.all(prominent ? 24 : 20),
            child: Row(children: [
              Container(
                width: prominent ? 56 : 48,
                height: prominent ? 56 : 48,
                decoration: BoxDecoration(
                  color: prominent
                      ? const Color(0xFFFFE785)
                      : const Color(0xFFF6F7F8),
                  borderRadius: BorderRadius.circular(15),
                ),
                child: Icon(icon, color: iconColor, size: 27),
              ),
              const SizedBox(width: 16),
              Expanded(child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title,
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w800,
                          color: DhlDashboardView._ink)),
                  const SizedBox(height: 4),
                  Text(subtitle,
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: const Color(0xFF54575C))),
                ],
              )),
              const SizedBox(width: 8),
              const Icon(Icons.arrow_forward_rounded, size: 20),
            ]),
          ),
        ),
      );
}

class _StatTile extends StatelessWidget {
  const _StatTile({
    required this.label,
    required this.value,
    required this.icon,
    this.onTap,
  });
  final String label;
  final String value;
  final IconData icon;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) => Material(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(20),
          child: Padding(
            padding: const EdgeInsets.all(22),
            child: Row(children: [
              Icon(icon, color: DhlDashboardView._red),
              const SizedBox(width: 14),
              Expanded(child: Text(label,
                  style: Theme.of(context).textTheme.bodyMedium)),
              Text(value,
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.w800)),
              if (onTap != null) ...[
                const SizedBox(width: 8),
                const Icon(Icons.chevron_right, size: 20),
              ],
            ]),
          ),
        ),
      );
}

/// Ein Eintrag der "Letzte Aktivitäten"-Liste - vom Aufrufer
/// (`DhlDashboardScreen`) aus real geladenen `DhlParcelDto`-Daten abgeleitet
/// (Trackingnummer/Lagerplatz/Eingelagert-am), keine erfundenen Werte.
class DhlActivity {
  const DhlActivity({
    required this.title,
    required this.description,
    required this.timeLabel,
    this.icon = Icons.inventory_2_outlined,
  });

  final String title;
  final String description;
  final String timeLabel;
  final IconData icon;
}
