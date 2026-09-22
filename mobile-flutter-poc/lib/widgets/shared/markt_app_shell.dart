import 'package:flutter/material.dart';

import '../../theme/markt_theme.dart';
import 'markt_breakpoints.dart';
import 'markt_footer.dart';
import 'markt_side_nav.dart';
import 'markt_top_bar.dart';

/// Zentrale, generische Dashboard-Shell (Shared Layout) fuer die gesamte
/// zukuenftige markt.ma Flutter App Factory.
///
/// Setzt das bewaehrte Layout-Pattern aus
/// `abuanwar072/Flutter-Responsive-Admin-Panel-or-Dashboard` (MIT) um - als
/// eigene, komplett neu geschriebene Komponente auf Basis von [MarktTheme]/
/// [MarktSideNav]/[MarktBreakpoints], mit Visual-Pass Phase 1 (22.09.,
/// inspiriert von der App-Shell-UX aus `ColorlibHQ/kite-flutter-admin-
/// dashboard` und dem Responsive-Verhalten aus `mitchkoko/
/// responsivedashboard` - beides nur als visuelle/Verhaltens-Referenz,
/// keine Architektur/Dependency davon uebernommen):
///
///  - Desktop (`MarktBreakpoints.isDesktop`, >= 1024px): permanente Sidebar
///    links ([MarktSideNav], volle Hoehe) + [MarktTopBar] NUR ueber dem
///    Content-Bereich (nicht ueber der Sidebar) + Content + [MarktFooter].
///  - Tablet (600-1023px): dieselbe [MarktSideNav]-Struktur als
///    `Scaffold.drawer`, [MarktTopBar] mit Hamburger-Button + Content +
///    [MarktFooter].
///  - Phone (< 600px): KEINE zusammengedrueckte Desktop-Sidebar als Drawer.
///    Stattdessen eine Flutter-native kompakte `NavigationBar` am unteren
///    Rand (nur sichtbar, wenn [navItems] mehr als einen Eintrag enthaelt -
///    bei genau einem Eintrag gibt es nichts zu navigieren). Der Footer
///    entfaellt auf Phone-Breiten, um vertikalen Platz zu sparen.
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
        final width = constraints.maxWidth;
        final isDesktop = MarktBreakpoints.isDesktop(width);
        final isPhone = MarktBreakpoints.isPhone(width);
        // Tablet: weder Desktop noch Phone (600-1023px) - nutzt wie bisher
        // den Drawer, siehe Klassendoku.
        final showDrawer = !isDesktop && !isPhone;
        final showBottomNav = isPhone && navItems.length > 1;
        final sideNav = MarktSideNav(items: navItems, header: sideNavHeader);
        final colorScheme = Theme.of(context).colorScheme;

        return Scaffold(
          // Eigener Seiten-Canvas (surfaceContainerLowest, siehe
          // `MarktTheme`) statt einer einzigen grossen weissen/hellen
          // Flaeche ueber Sidebar+Content hinweg - Sidebar und Topbar
          // setzen sich bewusst mit eigenen, davon abgesetzten
          // Oberflaechen ab (siehe [MarktSideNav] und [MarktTopBar]).
          backgroundColor: colorScheme.surfaceContainerLowest,
          drawer: showDrawer ? Drawer(width: 300, child: sideNav) : null,
          floatingActionButton: floatingActionButton,
          bottomNavigationBar: showBottomNav ? _buildBottomNav(context) : null,
          body: SafeArea(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (isDesktop)
                  Container(
                    width: 280,
                    decoration: BoxDecoration(
                      border: Border(right: BorderSide(color: colorScheme.outlineVariant)),
                    ),
                    child: sideNav,
                  ),
                Expanded(
                  child: Column(
                    children: [
                      MarktTopBar(
                        title: title,
                        actions: actions,
                        profile: profile,
                        showMenuButton: showDrawer,
                      ),
                      Expanded(
                        child: Padding(
                          // Dashboard-Rhythmus: der fachliche Inhalt
                          // beginnt nicht direkt unter der Topbar, sondern
                          // in einem konsistenten Innenabstand - unabhaengig
                          // davon, was `body` konkret zeigt (Liste, Grid,
                          // Error-Banner, ...).
                          padding: const EdgeInsets.all(MarktSpacing.lg),
                          child: body,
                        ),
                      ),
                      // Footer nur auf Desktop/Tablet - auf Phone-Breiten
                      // ist vertikaler Platz knapp (siehe Klassendoku).
                      if (!isPhone) const MarktFooter(),
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

  /// Flutter-native kompakte Navigation fuer Phone-Breiten (< 600px) -
  /// ersetzt bewusst NICHT dieselbe Sidebar/denselben Drawer in
  /// zusammengedruecktem Format, sondern nutzt Materials eigenes
  /// `NavigationBar`-Widget (siehe Klassendoku, Referenz:
  /// `mitchkoko/responsivedashboard`-Verhalten). Wird nur gerufen, wenn
  /// [navItems] mehr als einen Eintrag enthaelt.
  Widget _buildBottomNav(BuildContext context) {
    final selectedIndex = navItems.indexWhere((item) => item.selected);
    return NavigationBar(
      selectedIndex: selectedIndex < 0 ? 0 : selectedIndex,
      onDestinationSelected: (index) => navItems[index].onTap?.call(),
      destinations: [
        for (final item in navItems)
          NavigationDestination(icon: Icon(item.icon), label: item.label),
      ],
    );
  }
}

