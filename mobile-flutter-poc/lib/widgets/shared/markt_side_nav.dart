import 'package:flutter/material.dart';

import '../../theme/markt_theme.dart';

/// Generisches Datenmodell fuer einen Eintrag in [MarktSideNav].
///
/// Bewusst ohne jede Fachlichkeit (kein `DocumentsNavItem`, kein
/// App-Registry-/Entitlement-Konzept) - analog zur Trennung, die
/// `MarktResponsiveDataList<T>` schon fuer Listen/Grids durchsetzt: Diese
/// Klasse kennt nur Icon/Label/Auswahlzustand/Tap-Handler. Welche
/// konkreten Eintraege (Documents, spaeter DHL/Loyalty/...) existieren,
/// entscheidet ausschliesslich der Aufrufer (`MarktAppShell`-Consumer).
@immutable
class MarktNavItem {
  const MarktNavItem({
    required this.icon,
    required this.label,
    this.selected = false,
    this.onTap,
  });

  final IconData icon;
  final String label;

  /// Ob dieser Eintrag aktuell als "aktiv" hervorgehoben werden soll.
  final bool selected;

  /// Optionaler Tap-Handler. `null`, wenn der Eintrag (noch) nicht
  /// navigierbar ist (z.B. aktuell einziger Consumer "Documents").
  final VoidCallback? onTap;
}

/// Zentrale, generische Navigations-Liste (Shared Layout).
///
/// Wird von [MarktAppShell] sowohl als permanente Desktop-Sidebar als auch
/// unveraendert als Inhalt eines mobilen `Drawer` verwendet - dieselbe
/// Widget-Struktur fuer beide Faelle. Inspiriert vom `SideMenu`-Pattern aus
/// `abuanwar072/Flutter-Responsive-Admin-Panel-or-Dashboard` (MIT), aber
/// komplett neu geschrieben: keine hartcodierten Farben (nur
/// `Theme.of(context).colorScheme`/`textTheme`), keine SVG-Icons/Assets,
/// keine fachlichen Nav-Eintraege.
///
/// Visual Pass (22.09.): Die Sidebar bekommt bewusst eine eigene, vom
/// restlichen Workspace abgesetzte Oberflaeche (`surfaceContainerHigh`
/// statt `surface`) sowie deutlich praesentere Nav-Tiles (groessere
/// Touch-/Textflaeche, linker Akzentbalken im Selected-State), damit sie
/// wie ein echter Navigationsbereich wirkt statt wie schmaler Fuelltext.
///
/// [header] ist ein optionaler Slot fuer Branding (z.B. "markt.ma"-Titel)
/// oberhalb der Liste, [footer] ein optionaler Slot unterhalb (z.B.
/// spaeter Account/Settings) - beide werden vollstaendig vom Aufrufer
/// befuellt, diese Komponente kennt selbst keine Marke/Farbe/Fachlichkeit
/// dafuer.
class MarktSideNav extends StatelessWidget {
  const MarktSideNav({super.key, required this.items, this.header, this.footer});

  final List<MarktNavItem> items;
  final Widget? header;
  final Widget? footer;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Material(
      color: colorScheme.surfaceContainerHigh,
      child: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (header != null) ...[
              header!,
              Divider(height: 1, thickness: 1, color: colorScheme.outlineVariant),
            ],
            Expanded(
              child: ListView(
                padding: const EdgeInsets.symmetric(vertical: MarktSpacing.md, horizontal: MarktSpacing.sm),
                children: [for (final item in items) _MarktNavTile(item: item)],
              ),
            ),
            if (footer != null) ...[
              Divider(height: 1, thickness: 1, color: colorScheme.outlineVariant),
              footer!,
            ],
          ],
        ),
      ),
    );
  }
}

class _MarktNavTile extends StatelessWidget {
  const _MarktNavTile({required this.item});

  final MarktNavItem item;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;
    final foreground = item.selected ? colorScheme.primary : colorScheme.onSurfaceVariant;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: MarktSpacing.sm, vertical: MarktSpacing.xs / 2),
      child: Material(
        // Etwas praesenterer Selected-Zustand (Kite-Richtung): kraeftigerer
        // Tint statt nur `withValues(alpha: 0.55)` plus dezente Elevation,
        // damit sich der aktive Eintrag klarer vom Rest abhebt.
        color: item.selected ? colorScheme.primaryContainer.withValues(alpha: 0.7) : Colors.transparent,
        elevation: item.selected ? 1 : 0,
        shadowColor: colorScheme.shadow.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(16),
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          hoverColor: colorScheme.surfaceContainerHighest.withValues(alpha: 0.6),
          onTap: item.onTap,
          child: Row(
            children: [
              // Linker Akzentbalken im Selected-State - gibt der Navigation
              // mehr visuelle Praesenz, statt nur eine dezent getoente
              // Hintergrundflaeche zu zeigen.
              AnimatedContainer(
                duration: const Duration(milliseconds: 150),
                width: 4,
                height: 32,
                margin: const EdgeInsets.only(left: MarktSpacing.xs),
                decoration: BoxDecoration(
                  color: item.selected ? colorScheme.primary : Colors.transparent,
                  borderRadius: BorderRadius.circular(4),
                ),
              ),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: MarktSpacing.md, vertical: MarktSpacing.md),
                  child: Row(
                    children: [
                      Icon(item.icon, color: foreground, size: 24),
                      const SizedBox(width: MarktSpacing.md),
                      Expanded(
                        child: Text(
                          item.label,
                          overflow: TextOverflow.ellipsis,
                          style: textTheme.bodyLarge?.copyWith(
                            color: foreground,
                            fontWeight: item.selected ? FontWeight.w700 : FontWeight.w500,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
