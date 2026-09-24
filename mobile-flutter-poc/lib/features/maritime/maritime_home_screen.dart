import 'package:flutter/material.dart';

import '../../models/auth_response.dart';
import '../../services/auth_service.dart';
import '../../theme/markt_theme.dart';
import '../../widgets/shared/markt_app_shell.dart';
import '../../widgets/shared/markt_card.dart';
import '../../widgets/shared/markt_icon_badge.dart';
import '../../widgets/shared/markt_profile_menu.dart';
import '../../widgets/shared/markt_side_nav.dart';
import 'maritime_login_screen.dart';

/// Minimaler Maritime-Home-Screen - Beweis, dass eine zweite App dieselbe
/// [MarktAppShell]/[MarktSideNav] wiederverwenden kann, OHNE Documents
/// anzufassen (siehe Multi-App-Beweis vom 22.09.).
///
/// Bewusst KEINE Fachlichkeit: kein AIS, keine Ports/Vessels, keine
/// erfundenen APIs/Fake-Daten - nur ein Platzhalter-Inhalt, der klar
/// anzeigt, dass wir uns in "Maritime" befinden. Die eigentliche
/// Maritime-Fachlichkeit (aus Angular) wird bewusst in einem spaeteren,
/// separaten Schritt portiert.
class MaritimeHomeScreen extends StatelessWidget {
  const MaritimeHomeScreen({super.key, this.user});

  /// Ueber `AuthGate`/`GET /auth/me` geladener aktueller User (siehe
  /// Auth-Persistenz-Korrektur vom 23.09.) - hier AUSSCHLIESSLICH fuer die
  /// zentrale Current-User-Anzeige im [MarktProfileMenu] genutzt (Name/
  /// E-Mail), keine eigene Entitlement-/Store-Logik (Maritime hat noch
  /// keine eigene Entitlement-Aufloesung).
  final AuthUser? user;

  Future<void> _logout(BuildContext context) async {
    await AuthService().logout();
    if (!context.mounted) return;
    Navigator.of(context).pushReplacement(
      MaterialPageRoute(builder: (_) => const MaritimeLoginScreen()),
    );
  }

  @override
  Widget build(BuildContext context) {
    return MarktAppShell(
      title: 'Maritime',
      sideNavHeader: _buildBrandHeader(context),
      navItems: const [
        MarktNavItem(icon: Icons.directions_boat, label: 'Maritime', selected: true),
      ],
      profile: MarktProfileMenu(
        userLabel: user?.name,
        userSubLabel: user?.email,
        onLogout: () => _logout(context),
      ),
      body: _buildBody(context),
    );
  }

  /// Kleiner Branding-Slot oberhalb der Sidebar/des Drawers - analog zu
  /// `DocumentsScreen._buildBrandHeader`. Lebt bewusst hier (Consumer),
  /// nicht in `MarktSideNav`/`MarktAppShell` selbst.
  Widget _buildBrandHeader(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.all(MarktSpacing.lg),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: colorScheme.primary,
              borderRadius: BorderRadius.circular(12),
            ),
            alignment: Alignment.center,
            child: Icon(Icons.apps, color: colorScheme.onPrimary, size: 22),
          ),
          const SizedBox(width: MarktSpacing.md),
          Text(
            'markt.ma',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800),
          ),
        ],
      ),
    );
  }

  Widget _buildBody(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    // Bewusst nur ein Platzhalter-Hinweis (keine Fake-Fachdaten, keine
    // Charts, keine erfundenen APIs) - dieser Screen soll ausschliesslich
    // beweisen, dass MarktAppShell/MarktSideNav/MarktCard/MarktIconBadge
    // fuer eine zweite, eigenstaendige App funktionieren.
    return Center(
      child: MarktCard(
        padding: const EdgeInsets.all(MarktSpacing.xl),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            MarktIconBadge(
              icon: Icon(Icons.directions_boat, color: colorScheme.primary),
              accentColor: colorScheme.primary,
              size: 64,
            ),
            const SizedBox(height: MarktSpacing.lg),
            Text(
              'Maritime',
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: MarktSpacing.sm),
            Text(
              'Dieser Bereich ist noch nicht fachlich implementiert - '
              'die Shell ist bereits einsatzbereit.',
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: colorScheme.onSurfaceVariant),
            ),
          ],
        ),
      ),
    );
  }
}
