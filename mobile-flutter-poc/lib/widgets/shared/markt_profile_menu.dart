import 'package:flutter/material.dart';

import '../../theme/markt_theme.dart';

/// Zentraler, generischer Profil-/Logout-Menuepunkt fuer die Topbar
/// (Shared UI Primitive).
///
/// Ersetzt den bisherigen einfachen `IconButton(Icons.logout)` durch ein
/// kleines, wiederverwendbares Popup-Menu. Kennt bewusst KEINE Fachlichkeit
/// und KEINEN Auth-Zustand selbst - [onLogout] fuehrt den tatsaechlichen
/// Logout durch (bestehender `AuthService.logout`), diese Komponente ruft
/// ihn nur auf.
///
/// Visual Pass Phase 2 (22.09., konkrete visuelle Referenz: `ColorlibHQ/
/// kite-flutter-admin-dashboard` Account-Menu): Trigger ist jetzt Avatar
/// **plus** kleiner Dropdown-Chevron (vorher nur ein nackter Avatar-Chip
/// ohne Oeffnungs-Affordanz) und der Popup-Header zeigt eine echte
/// zweizeilige Kopfzeile (Avatar + Name/Label als fette erste Zeile,
/// generische zweite Zeile) statt nur eines einzelnen grauen Text-Items.
class MarktProfileMenu extends StatelessWidget {
  const MarktProfileMenu({
    super.key,
    required this.onLogout,
    this.userLabel,
    this.userSubLabel,
    this.logoutLabel = 'Abmelden',
  });

  /// Fuehrt den eigentlichen Logout durch. Navigation danach ist NICHT
  /// Aufgabe dieser Komponente.
  final VoidCallback onLogout;

  /// Optionaler Anzeigename des angemeldeten Users fuer den Menue-Header.
  /// Ohne Angabe wird ein generisches Label ("Konto") gezeigt.
  final String? userLabel;

  /// Optionale zweite, dezentere Kopfzeile (z.B. E-Mail/Rolle).
  final String? userSubLabel;

  /// Beschriftung des Logout-Eintrags, ueberschreibbar fuer i18n.
  final String logoutLabel;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;
    final label = userLabel ?? 'Konto';

    return PopupMenuButton<_MarktProfileMenuAction>(
      tooltip: 'Konto',
      offset: const Offset(0, 44),
      position: PopupMenuPosition.under,
      onSelected: (action) {
        if (action == _MarktProfileMenuAction.logout) onLogout();
      },
      itemBuilder: (context) => [
        PopupMenuItem<_MarktProfileMenuAction>(
          enabled: false,
          child: Row(
            children: [
              CircleAvatar(
                radius: 16,
                backgroundColor: colorScheme.primaryContainer,
                child: Icon(Icons.person_outline, color: colorScheme.onPrimaryContainer, size: 18),
              ),
              const SizedBox(width: MarktSpacing.sm),
              Flexible(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      label,
                      overflow: TextOverflow.ellipsis,
                      style: textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w700),
                    ),
                    if (userSubLabel != null)
                      Text(
                        userSubLabel!,
                        overflow: TextOverflow.ellipsis,
                        style: textTheme.bodySmall?.copyWith(color: colorScheme.onSurfaceVariant),
                      ),
                  ],
                ),
              ),
            ],
          ),
        ),
        const PopupMenuDivider(),
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
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            CircleAvatar(
              radius: 16,
              backgroundColor: colorScheme.primaryContainer,
              child: Icon(Icons.person_outline, color: colorScheme.onPrimaryContainer, size: 18),
            ),
            const SizedBox(width: 2),
            Icon(Icons.keyboard_arrow_down, size: 18, color: colorScheme.onSurfaceVariant),
          ],
        ),
      ),
    );
  }
}

enum _MarktProfileMenuAction { logout }
