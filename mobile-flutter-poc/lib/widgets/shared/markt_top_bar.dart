import 'package:flutter/material.dart';

import '../../theme/markt_theme.dart';

/// Zentrale, generische Topbar (Shared UI Primitive).
///
/// Vorher ein privates `_MarktTopBar` innerhalb von `markt_app_shell.dart` -
/// als eigene, oeffentliche Komponente extrahiert (Visual Pass Phase 1),
/// damit sie unabhaengig von [MarktAppShell] wiederverwendet/getestet
/// werden kann, ohne den Shell-Vertrag selbst zu vergroessern.
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
      decoration: BoxDecoration(
        color: colorScheme.surface,
        border: Border(bottom: BorderSide(color: colorScheme.outlineVariant)),
      ),
      padding: const EdgeInsets.symmetric(horizontal: MarktSpacing.xl, vertical: MarktSpacing.lg),
      child: Row(
        children: [
          if (showMenuButton) ...[
            Material(
              color: Colors.transparent,
              borderRadius: BorderRadius.circular(12),
              child: IconButton(
                icon: const Icon(Icons.menu),
                tooltip: 'Menu',
                onPressed: onMenuTap ?? () => Scaffold.of(context).openDrawer(),
              ),
            ),
            const SizedBox(width: MarktSpacing.sm),
          ],
          Expanded(
            child: Text(
              title,
              overflow: TextOverflow.ellipsis,
              style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700),
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
