import 'package:flutter/material.dart';

import '../../theme/markt_theme.dart';

/// Zentraler, generischer Profil-/Logout-Menuepunkt fuer die Topbar
/// (Shared UI Primitive, Phase 1).
///
/// Ersetzt den bisherigen einfachen `IconButton(Icons.logout)` in
/// `DocumentsScreen`/`MaritimeHomeScreen` durch ein kleines, wiederverwend-
/// bares Popup-Menu im Kite-Stil (Avatar/Initialen-Chip + Dropdown mit
/// optionalem Nutzer-Label und "Abmelden"). Kennt bewusst KEINE
/// Fachlichkeit und KEINEN Auth-Zustand selbst - [onLogout] fuehrt den
/// tatsaechlichen Logout durch (bestehender `AuthService.logout`), diese
/// Komponente ruft ihn nur auf.
class MarktProfileMenu extends StatelessWidget {
  const MarktProfileMenu({
    super.key,
    required this.onLogout,
    this.userLabel,
    this.logoutLabel = 'Abmelden',
  });

  /// Fuehrt den eigentlichen Logout durch. Navigation danach ist NICHT
  /// Aufgabe dieser Komponente.
  final VoidCallback onLogout;

  /// Optionaler Anzeigename/E-Mail des angemeldeten Users, z.B. im
  /// Menue-Header gezeigt. Ohne Angabe wird kein Header gerendert.
  final String? userLabel;

  /// Beschriftung des Logout-Eintrags, ueberschreibbar fuer i18n.
  final String logoutLabel;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;

    return PopupMenuButton<_MarktProfileMenuAction>(
      tooltip: 'Konto',
      offset: const Offset(0, 48),
      onSelected: (action) {
        if (action == _MarktProfileMenuAction.logout) onLogout();
      },
      itemBuilder: (context) => [
        if (userLabel != null) ...[
          PopupMenuItem<_MarktProfileMenuAction>(
            enabled: false,
            child: Text(
              userLabel!,
              overflow: TextOverflow.ellipsis,
              style: textTheme.bodyMedium?.copyWith(
                color: colorScheme.onSurfaceVariant,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          const PopupMenuDivider(),
        ],
        PopupMenuItem<_MarktProfileMenuAction>(
          value: _MarktProfileMenuAction.logout,
          child: Row(
            children: [
              Icon(Icons.logout, size: 20, color: colorScheme.error),
              const SizedBox(width: MarktSpacing.sm),
              Text(logoutLabel, style: TextStyle(color: colorScheme.error)),
            ],
          ),
        ),
      ],
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: MarktSpacing.xs),
        child: CircleAvatar(
          radius: 18,
          backgroundColor: colorScheme.primaryContainer,
          child: Icon(Icons.person_outline, color: colorScheme.onPrimaryContainer, size: 20),
        ),
      ),
    );
  }
}

enum _MarktProfileMenuAction { logout }
