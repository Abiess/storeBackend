import 'package:flutter/material.dart';

import '../../services/auth_service.dart';
import '../../theme/markt_theme.dart';
import '../../widgets/shared/markt_app_shell.dart';
import '../../widgets/shared/markt_card.dart';
import '../../widgets/shared/markt_icon_badge.dart';
import '../../widgets/shared/markt_profile_menu.dart';
import '../../widgets/shared/markt_side_nav.dart';
import 'dhl_login_screen.dart';

/// Minimaler DHL/Paketshop-Home-Screen - dritte App aus derselben
/// Codebasis (siehe Multi-App-Beweis vom 22.09.), analog zu
/// `features/maritime/maritime_home_screen.dart`. Verwendet dieselbe
/// [MarktAppShell]/[MarktSideNav], OHNE Documents/Maritime anzufassen.
///
/// Bewusst KEINE Fachlichkeit: keine Paket-/Sendungs-/Tracking-Logik,
/// keine erfundenen APIs/Fake-Daten - nur ein Platzhalter-Inhalt, der klar
/// als "DHL Paketshop" erkennbar ist. Die eigentliche DHL-Fachlichkeit
/// wird bewusst in einem spaeteren, separaten Schritt portiert.
class DhlHomeScreen extends StatelessWidget {
  const DhlHomeScreen({super.key});

  Future<void> _logout(BuildContext context) async {
    await AuthService().logout();
    if (!context.mounted) return;
    Navigator.of(context).pushReplacement(
      MaterialPageRoute(builder: (_) => const DhlLoginScreen()),
    );
  }

  @override
  Widget build(BuildContext context) {
    return MarktAppShell(
      title: 'DHL Paketshop',
      sideNavHeader: _buildBrandHeader(context),
      navItems: const [
        MarktNavItem(icon: Icons.local_shipping, label: 'DHL Paketshop', selected: true),
      ],
      profile: MarktProfileMenu(onLogout: () => _logout(context)),
      body: _buildBody(context),
    );
  }

  /// Kleiner Branding-Slot oberhalb der Sidebar/des Drawers - analog zu
  /// `DocumentsScreen._buildBrandHeader` / `MaritimeHomeScreen._buildBrandHeader`.
  /// Lebt bewusst hier (Consumer), nicht in `MarktSideNav`/`MarktAppShell` selbst.
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
    // erfundenen APIs) - dieser Screen soll ausschliesslich beweisen, dass
    // MarktAppShell/MarktSideNav/MarktCard/MarktIconBadge fuer eine dritte,
    // eigenstaendige App (DHL Paketshop) funktionieren.
    return Center(
      child: MarktCard(
        padding: const EdgeInsets.all(MarktSpacing.xl),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            MarktIconBadge(
              icon: Icon(Icons.local_shipping, color: colorScheme.primary),
              accentColor: colorScheme.primary,
              size: 64,
            ),
            const SizedBox(height: MarktSpacing.lg),
            Text(
              'DHL Paketshop',
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
