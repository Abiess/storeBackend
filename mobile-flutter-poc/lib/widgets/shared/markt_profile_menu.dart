import 'package:flutter/material.dart';

import '../../theme/markt_theme.dart';
import 'markt_breakpoints.dart';

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
///
/// Current-User-Fix (23.09.): auf Desktop-Breiten (`MarktBreakpoints.
/// isDesktop`, >= 1024px) zeigt der Trigger selbst bereits Avatar/Initialen
/// + Name + E-Mail + Dropdown-Chevron (vorher nur im geoeffneten Popup
/// sichtbar - auf Desktop wirkte das wie ein rein generisches Icon). Auf
/// kleineren Breiten (Tablet/Phone) bleibt der Trigger bewusst kompakt
/// (nur Avatar/Icon + Chevron), Name/E-Mail erscheinen dort weiterhin erst
/// im geoeffneten Menue - Platzgruende, KEINE App-spezifische Sonderloesung
/// (identische Logik fuer Documents/DHL/Maritime).
///
/// App-/Store-Kontext (23.09. Folgeanpassung): [contextLabel] ist ein
/// optionaler, rein darstellender zweiter String (z.B. "DHL Paketshop ·
/// Store 121"), den EINZELNE Consumer (aktuell nur DHL, siehe
/// `DhlHomeScreen`) aus bereits vorhandenen Daten ableiten (App-Name +
/// `AuthUser.storeIdForApp('DHL')`) - KEINE neue Backend-/DTO-Architektur,
/// kein separates Store-Context-Konzept. Ist [contextLabel] gesetzt, zeigt
/// der Desktop-Trigger ihn als zweite Zeile ANSTELLE der E-Mail (die
/// E-Mail bleibt vollstaendig im geoeffneten Popup sichtbar, siehe unten -
/// sie verschwindet also nicht, sondern wechselt nur die Sichtbarkeits-
/// Ebene). Ohne [contextLabel] (Documents/Maritime aktuell) bleibt das
/// bisherige Verhalten (E-Mail als zweite Zeile im Trigger) unveraendert -
/// kein Bruch fuer bestehende Consumer.
///
/// Das geoeffnete Popup zeigt zusaetzlich zur bisherigen Kopfzeile
/// (Avatar + Name + E-Mail) optionale, klar beschriftete Zeilen fuer
/// [roleLabel] ("Rolle") und [contextLabel] ("Kontext") - jeweils NUR,
/// wenn die zugehoerigen Daten tatsaechlich vorhanden sind (kein Erfinden
/// von Platzhaltern). Eine "Sprache"-Zeile ist bewusst NICHT enthalten:
/// weder `AuthUser` (Backend-`UserDTO`) noch Flutter kennen aktuell eine
/// bevorzugte Sprache des Users - das haette ein neues Backend-Feld
/// erfordert, was explizit nicht gewuenscht ist.
class MarktProfileMenu extends StatelessWidget {
  const MarktProfileMenu({
    super.key,
    required this.onLogout,
    this.userLabel,
    this.userSubLabel,
    this.roleLabel,
    this.contextLabel,
    this.logoutLabel = 'Abmelden',
  });

  /// Fuehrt den eigentlichen Logout durch. Navigation danach ist NICHT
  /// Aufgabe dieser Komponente.
  final VoidCallback onLogout;

  /// Optionaler Anzeigename des angemeldeten Users fuer den Menue-Header
  /// (und, auf Desktop-Breiten, direkt im Trigger). Ohne Angabe wird ein
  /// generisches Label ("Konto") gezeigt.
  final String? userLabel;

  /// Optionale zweite, dezentere Kopfzeile im Popup-Header (i.d.R.
  /// E-Mail). Erscheint zusaetzlich auf Desktop-Breiten direkt im Trigger,
  /// ABER NUR, wenn kein [contextLabel] gesetzt ist (siehe dortige Doku).
  final String? userSubLabel;

  /// Optionale Rolle des Users (z.B. `AuthUser.role`) - wird im geoeffneten
  /// Popup als eigene, beschriftete Zeile ("Rolle") angezeigt, sofern
  /// vorhanden. Kein Einfluss auf den Trigger.
  final String? roleLabel;

  /// Optionaler, aktueller App-/Store-Kontext (z.B. "DHL Paketshop ·
  /// Store 121"), aus bereits vorhandenen Consumer-Daten abgeleitet (siehe
  /// Klassendoku). Wird auf Desktop-Breiten anstelle der E-Mail direkt im
  /// Trigger gezeigt UND zusaetzlich als eigene, beschriftete Zeile
  /// ("Kontext") im geoeffneten Popup.
  final String? contextLabel;

  /// Beschriftung des Logout-Eintrags, ueberschreibbar fuer i18n.
  final String logoutLabel;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;
    final label = userLabel ?? 'Konto';
    final initials = _initialsFor(userLabel: userLabel, userSubLabel: userSubLabel);
    final isDesktop = MarktBreakpoints.isDesktop(MediaQuery.sizeOf(context).width);
    // Zweite Zeile im Trigger: Kontext hat Vorrang vor E-Mail (siehe
    // Klassendoku zu [contextLabel]) - ohne Kontext bisheriges Verhalten
    // (E-Mail) unveraendert.
    final triggerSecondLine = contextLabel ?? userSubLabel;

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
              _Avatar(colorScheme: colorScheme, initials: initials),
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
        // Zusaetzliche, klar beschriftete Zeilen - nur wenn die jeweiligen
        // Daten tatsaechlich vorhanden sind (kein Erfinden von
        // Platzhaltern, siehe Klassendoku). Kein "Sprache"-Eintrag: dafuer
        // fehlt aktuell sowohl im Backend-`UserDTO` als auch in Flutter
        // ein Datenfeld.
        if (roleLabel != null || contextLabel != null)
          PopupMenuItem<_MarktProfileMenuAction>(
            enabled: false,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                if (roleLabel != null)
                  _ProfileInfoRow(icon: Icons.badge_outlined, label: 'Rolle', value: roleLabel!),
                if (contextLabel != null)
                  _ProfileInfoRow(icon: Icons.storefront_outlined, label: 'Kontext', value: contextLabel!),
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
            _Avatar(colorScheme: colorScheme, initials: initials),
            // Name/Kontext-oder-E-Mail direkt im Trigger nur auf Desktop-
            // Breiten (siehe Klassendoku) - auf Tablet/Phone bleibt der
            // Trigger kompakt, die Werte erscheinen dort erst im
            // geoeffneten Popup oben.
            if (isDesktop && userLabel != null) ...[
              const SizedBox(width: MarktSpacing.sm),
              ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 160),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      label,
                      overflow: TextOverflow.ellipsis,
                      style: textTheme.bodySmall?.copyWith(fontWeight: FontWeight.w700),
                    ),
                    if (triggerSecondLine != null)
                      Text(
                        triggerSecondLine,
                        overflow: TextOverflow.ellipsis,
                        style: textTheme.bodySmall?.copyWith(color: colorScheme.onSurfaceVariant, fontSize: 11),
                      ),
                  ],
                ),
              ),
            ],
            const SizedBox(width: 2),
            Icon(Icons.keyboard_arrow_down, size: 18, color: colorScheme.onSurfaceVariant),
          ],
        ),
      ),
    );
  }
}

/// Ermittelt Initialen (max. 2 Zeichen) aus `userLabel` (Vor-/Nachname oder
/// einzelnes Wort), mit Fallback auf den ersten Buchstaben von
/// `userSubLabel` (z.B. E-Mail), falls kein `userLabel` vorhanden ist.
/// Liefert `null`, wenn beides fehlt - dann zeigt [_Avatar] das generische
/// Personen-Icon (bisheriges Verhalten, kein Bruch fuer bestehende
/// Consumer ohne Name/E-Mail).
String? _initialsFor({String? userLabel, String? userSubLabel}) {
  final name = userLabel?.trim();
  if (name != null && name.isNotEmpty) {
    final parts = name.split(RegExp(r'\s+')).where((p) => p.isNotEmpty).toList();
    if (parts.length >= 2) {
      return (parts.first[0] + parts[1][0]).toUpperCase();
    }
    return parts.first.substring(0, 1).toUpperCase();
  }
  final email = userSubLabel?.trim();
  if (email != null && email.isNotEmpty) {
    return email.substring(0, 1).toUpperCase();
  }
  return null;
}

/// Gemeinsamer Avatar-Chip fuer Trigger UND Popup-Header - zeigt Initialen,
/// sobald diese ermittelt werden konnten, sonst das bisherige generische
/// Personen-Icon.
class _Avatar extends StatelessWidget {
  const _Avatar({required this.colorScheme, required this.initials});

  final ColorScheme colorScheme;
  final String? initials;

  @override
  Widget build(BuildContext context) {
    return CircleAvatar(
      radius: 16,
      backgroundColor: colorScheme.primaryContainer,
      child: initials != null
          ? Text(
              initials!,
              style: TextStyle(
                color: colorScheme.onPrimaryContainer,
                fontWeight: FontWeight.w700,
                fontSize: 12,
              ),
            )
          : Icon(Icons.person_outline, color: colorScheme.onPrimaryContainer, size: 18),
    );
  }
}

/// Eine einzelne, klar beschriftete Zeile im Popup-Header (z.B. "Rolle:
/// Store Manager") - kleine Caption-Zeile ueber dem eigentlichen Wert,
/// analog zu uebrigen Shared-Detail-Darstellungen (siehe `MarktCard`).
/// Bewusst kein eigenes generisches "Detail-Row"-Widget in einer neuen
/// Shared-Datei - dieser Baustein ist ausschliesslich fuer den
/// Profil-Popup-Kontext gedacht.
class _ProfileInfoRow extends StatelessWidget {
  const _ProfileInfoRow({required this.icon, required this.label, required this.value});

  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;
    return Padding(
      padding: const EdgeInsets.only(top: MarktSpacing.xs),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 16, color: colorScheme.onSurfaceVariant),
          const SizedBox(width: MarktSpacing.xs),
          Flexible(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  label,
                  style: textTheme.labelSmall?.copyWith(color: colorScheme.onSurfaceVariant),
                ),
                Text(
                  value,
                  overflow: TextOverflow.ellipsis,
                  style: textTheme.bodySmall?.copyWith(fontWeight: FontWeight.w600),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

enum _MarktProfileMenuAction { logout }
