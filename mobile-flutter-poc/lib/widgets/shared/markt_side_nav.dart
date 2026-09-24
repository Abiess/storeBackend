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
/// Widget-Struktur fuer beide Faelle.
///
/// Visual Pass Phase 2 (22.09., konkrete visuelle Referenz statt nur
/// Architektur-Inspiration: `ColorlibHQ/kite-flutter-admin-dashboard`,
/// `lib/shared/layout/app_shell.dart` - Look 1:1 uebernommen, KEINE
/// Dependencies/Architektur davon: kompakte, FLACHE Nav-Tiles (kleine
/// Icons, kleine Schrift, dichte 2px-Abstaende) statt grosser
/// "Card"-Tiles mit Akzentbalken/Elevation aus Phase 1 - genau das war der
/// in Phase 1 zu wenig sichtbare Unterschied. Zusaetzlich eine dezente,
/// generische Gruppen-Ueberschrift ([sectionLabel], GROSSGESCHRIEBEN,
/// klein, ausgegraut) oberhalb der Liste, analog zu Kites Nav-Group-Labels
/// - ohne jede Fachlichkeit, da der Text vollstaendig ueberschreibbar ist.
///
/// [header] ist ein optionaler Slot fuer Branding (z.B. "markt.ma"-Titel)
/// oberhalb der Liste, [footer] ein optionaler Slot unterhalb (z.B.
/// Account-Kachel) - beide werden vollstaendig vom Aufrufer befuellt,
/// diese Komponente kennt selbst keine Marke/Farbe/Fachlichkeit dafuer.
class MarktSideNav extends StatelessWidget {
  const MarktSideNav({
    super.key,
    required this.items,
    this.header,
    this.footer,
    this.sectionLabel = 'Menu',
  });

  final List<MarktNavItem> items;
  final Widget? header;
  final Widget? footer;

  /// Generische Gruppen-Ueberschrift oberhalb der Nav-Liste (z.B. "Menu").
  /// Bewusst ohne Fachlichkeit - `null` blendet sie aus.
  final String? sectionLabel;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;

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
                // Deutlich dichter als Phase 1 (war `md`/`sm`) - Kite
                // fuehrt die Nav-Liste direkt an den Raendern der Sidebar,
                // nicht als abgesetzten Innenblock.
                padding: const EdgeInsets.symmetric(vertical: MarktSpacing.sm, horizontal: MarktSpacing.sm),
                children: [
                  if (sectionLabel != null)
                    Padding(
                      padding: const EdgeInsets.fromLTRB(
                        MarktSpacing.md,
                        MarktSpacing.sm,
                        MarktSpacing.md,
                        MarktSpacing.xs,
                      ),
                      child: Text(
                        sectionLabel!.toUpperCase(),
                        style: textTheme.labelSmall?.copyWith(
                          color: colorScheme.onSurfaceVariant,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 0.8,
                        ),
                      ),
                    ),
                  for (final item in items) _MarktNavTile(item: item),
                ],
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

    // Flache, kompakte Kite-Kachel statt der grossen "Card"-Kachel aus
    // Phase 1 (kein Akzentbalken, keine Elevation, kein 24px-Icon/
    // bodyLarge-Text) - kleiner Radius, dichte 2px-Vertikalabstaende,
    // vollflaechig eingefaerbt statt nur angedeutet.
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Material(
        color: item.selected ? colorScheme.primary.withValues(alpha: 0.14) : Colors.transparent,
        borderRadius: BorderRadius.circular(8),
        child: InkWell(
          borderRadius: BorderRadius.circular(8),
          hoverColor: colorScheme.onSurface.withValues(alpha: 0.06),
          onTap: item.onTap,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: MarktSpacing.md, vertical: 10),
            child: Row(
              children: [
                Icon(item.icon, color: foreground, size: 18),
                const SizedBox(width: MarktSpacing.md),
                Expanded(
                  child: Text(
                    item.label,
                    overflow: TextOverflow.ellipsis,
                    style: textTheme.bodyMedium?.copyWith(
                      color: foreground,
                      fontSize: 13.5,
                      fontWeight: item.selected ? FontWeight.w600 : FontWeight.w500,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
