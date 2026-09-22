import 'package:flutter/material.dart';

import '../../theme/markt_theme.dart';
import 'markt_breakpoints.dart';
import 'markt_side_nav.dart';

/// Zentrale, generische Dashboard-Shell (Shared Layout) fuer die gesamte
/// zukuenftige markt.ma Flutter App Factory.
///
/// Setzt das bewaehrte Layout-Pattern aus
/// `abuanwar072/Flutter-Responsive-Admin-Panel-or-Dashboard` (MIT) um - als
/// eigene, komplett neu geschriebene Komponente auf Basis von [MarktTheme]/
/// [MarktSideNav]/[MarktBreakpoints], siehe Audit vom 22.09.:
///
///  - Desktop (`MarktBreakpoints.isDesktop`, >= 1024px): permanente Sidebar
///    links ([MarktSideNav], volle Hoehe) + Topbar NUR ueber dem
///    Content-Bereich (nicht ueber der Sidebar) + Content darunter.
///  - Mobile/Tablet (< 1024px): dieselbe [MarktSideNav]-Struktur als
///    `Scaffold.drawer`, Topbar spannt die volle Breite und zeigt einen
///    Hamburger-Button, der den Drawer oeffnet.
///
/// Kennt bewusst KEINE Fachlichkeit (kein "Documents"/"DHL"/"Loyalty"/...)
/// und KEINEN App-Registry-/Entitlement-Mechanismus - `title`, `navItems`,
/// `body`, `actions`, `profile` werden vollstaendig vom Aufrufer geliefert.
class MarktAppShell extends StatelessWidget {
  const MarktAppShell({
    super.key,
    required this.title,
    required this.navItems,
    required this.body,
    this.actions,
    this.profile,
    this.sideNavHeader,
    this.floatingActionButton,
  });

  /// Titel in der Topbar (z.B. "Documents").
  final String title;

  /// Eintraege der Sidebar/des Drawers. Generisch - siehe [MarktNavItem].
  final List<MarktNavItem> navItems;

  /// Fachlicher Inhalt (z.B. `DocumentsScreen`-Body). Die Shell selbst
  /// kennt dessen Inhalt nicht.
  final Widget body;

  /// Optionale Topbar-Actions (z.B. Refresh-Button), analog zu
  /// `AppBar.actions`.
  final List<Widget>? actions;

  /// Optionaler Account-/Profil-Bereich rechts in der Topbar (z.B. Avatar-
  /// oder Logout-Button). Diese Shell kennt selbst keinen Auth-Zustand.
  final Widget? profile;

  /// Optionaler Branding-Slot oberhalb der Navigationsliste
  /// (z.B. "markt.ma"-Schriftzug). Ohne Vorgabe bleibt er leer.
  final Widget? sideNavHeader;

  /// Durchgereicht an den inneren `Scaffold` (z.B. Kamera-/Upload-FAB von
  /// `DocumentsScreen`). Rein strukturell, keine Fachlichkeit in der Shell.
  final Widget? floatingActionButton;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final isDesktop = MarktBreakpoints.isDesktop(constraints.maxWidth);
        final sideNav = MarktSideNav(items: navItems, header: sideNavHeader);
        final colorScheme = Theme.of(context).colorScheme;

        return Scaffold(
          drawer: isDesktop ? null : Drawer(child: sideNav),
          floatingActionButton: floatingActionButton,
          body: SafeArea(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (isDesktop) SizedBox(width: 260, child: sideNav),
                if (isDesktop) VerticalDivider(width: 1, color: colorScheme.outlineVariant),
                Expanded(
                  child: Column(
                    children: [
                      _MarktTopBar(
                        title: title,
                        actions: actions,
                        profile: profile,
                        showMenuButton: !isDesktop,
                      ),
                      Divider(height: 1, color: colorScheme.outlineVariant),
                      Expanded(child: body),
                    ],
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

/// Topbar-Inhalt der Shell. Bewusst kein `AppBar`/`Scaffold.appBar`, sondern
/// ein eigenstaendiges Widget innerhalb des Content-Bereichs - dadurch
/// spannt die Topbar auf Desktop NUR ueber dem Content, nicht ueber der
/// Sidebar (siehe Layout-Skizze in der Klassendoku von [MarktAppShell]).
class _MarktTopBar extends StatelessWidget {
  const _MarktTopBar({
    required this.title,
    required this.showMenuButton,
    this.actions,
    this.profile,
  });

  final String title;
  final bool showMenuButton;
  final List<Widget>? actions;
  final Widget? profile;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final appBarTheme = theme.appBarTheme;

    return Material(
      color: appBarTheme.backgroundColor ?? theme.colorScheme.surface,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: MarktSpacing.lg, vertical: MarktSpacing.md),
        child: Row(
          children: [
            if (showMenuButton) ...[
              IconButton(
                icon: const Icon(Icons.menu),
                tooltip: 'Menu',
                onPressed: () => Scaffold.of(context).openDrawer(),
              ),
              const SizedBox(width: MarktSpacing.sm),
            ],
            Expanded(
              child: Text(
                title,
                overflow: TextOverflow.ellipsis,
                style: appBarTheme.titleTextStyle ?? theme.textTheme.titleLarge,
              ),
            ),
            ...?actions,
            if (profile != null) ...[
              const SizedBox(width: MarktSpacing.sm),
              profile!,
            ],
          ],
        ),
      ),
    );
  }
}
