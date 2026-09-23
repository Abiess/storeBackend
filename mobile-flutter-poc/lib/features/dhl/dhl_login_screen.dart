import 'package:flutter/material.dart';

import '../../services/auth_service.dart';
import '../../widgets/shared/markt_login_screen.dart';
import 'dhl_home_screen.dart';

/// Duenner Consumer des zentralen [MarktLoginScreen] fuer die DHL/
/// Paketshop-App - analog zu `screens/login_screen.dart` (Documents) und
/// `features/maritime/maritime_login_screen.dart` (siehe Multi-App-Beweis
/// vom 22.09.). Keine eigene Login-UI, kein eigener Auth-Flow: nur
/// DHL-Branding (appName/headline/description/icon) + der bestehende
/// `AuthService.login`.
///
/// Nach erfolgreichem Login navigiert dieser Consumer zu [DhlHomeScreen] -
/// `MarktLoginScreen` selbst kennt weder "DHL" noch den Navigator (siehe
/// Doku in `markt_login_screen.dart`).
class DhlLoginScreen extends StatelessWidget {
  const DhlLoginScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final authService = AuthService();

    return MarktLoginScreen(
      appName: 'DHL Paketshop',
      headline: 'Willkommen zurück',
      description: 'Pakete und Sendungen im Blick',
      icon: Icons.local_shipping,
      onLogin: (email, password) async {
        await authService.login(email: email, password: password);
        if (!context.mounted) return;
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (_) => const DhlHomeScreen()),
        );
      },
    );
  }
}
