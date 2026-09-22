import 'package:flutter/material.dart';

import '../../theme/markt_theme.dart';

/// Zentrale, generische Topbar (Shared UI Primitive).
///
/// Visual Pass Phase 2 (22.09., konkrete visuelle Referenz: `ColorlibHQ/
/// kite-flutter-admin-dashboard`, `_TopBar` in `app_shell.dart`): feste,
/// kompakte Bar-Hoehe (60px, vorher variabel ~76-84px durch `lg`-Padding)
/// und ein moderaterer, weniger "fetter" Seitentitel (`titleLarge`/w600
/// statt `headlineSmall`/w700) - beides direkt sichtbar im Screenshot-
/// Vergleich, ohne den Vertrag zu aendern.
///
/// Bewusst kein `AppBar`/`Scaffold.appBar`, sondern ein eigenstaendiges
/// Widget innerhalb des Content-Bereichs - dadurch spannt die Topbar auf
/// Desktop NUR ueber dem Content, nicht ueber der Sidebar (siehe
/// [MarktAppShell]-Layout).
///
/// Kennt bewusst KEINE Fachlichkeit: `title`/`actions`/`profile` werden
/// vollstaendig vom Aufrufer (i.d.R. [MarktAppShell]) geliefert.
class MarktTopBar extends StatelessWidget {
  const MarktTopBar({
    super.key,
    required this.title,
    required this.showMenuButton,
    this.onMenuTap,
    this.actions,
    this.profile,
  });

  /// Feste Hoehe der Bar (Kite-Referenzwert: 60px).
  static const double height = 60;

  final String title;

  /// Ob der Hamburger-Button (Drawer-Trigger) angezeigt werden soll.
  final bool showMenuButton;

  /// Optionaler expliziter Handler fuer den Hamburger-Button. Ohne Angabe
  /// wird `Scaffold.of(context).openDrawer()` verwendet (Standardfall in
  /// [MarktAppShell]).
  final VoidCallback? onMenuTap;

  /// Optionale Topbar-Actions (z.B. Refresh-Button), analog zu
  /// `AppBar.actions`.
  final List<Widget>? actions;

  /// Optionaler Account-/Profil-Bereich rechts in der Topbar (z.B.
  /// [MarktProfileMenu]). Diese Komponente kennt selbst keinen Auth-Zustand.
  final Widget? profile;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Container(
      height: height,
      decoration: BoxDecoration(
        color: colorScheme.surface,
        border: Border(bottom: BorderSide(color: colorScheme.outlineVariant)),
      ),
      padding: const EdgeInsets.symmetric(horizontal: MarktSpacing.xl),
      child: Row(
        children: [
          if (showMenuButton) ...[
            IconButton(
              icon: const Icon(Icons.menu),
              iconSize: 20,
              color: colorScheme.onSurfaceVariant,
              tooltip: 'Menu',
              onPressed: onMenuTap ?? () => Scaffold.of(context).openDrawer(),
            ),
            const SizedBox(width: MarktSpacing.xs),
          ],
          Expanded(
            child: Text(
              title,
              overflow: TextOverflow.ellipsis,
              style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w600),
            ),
          ),
          ...?actions,
          if (profile != null) ...[
            const SizedBox(width: MarktSpacing.sm),
            profile!,
          ],
        ],
      ),
    );
  }
}
