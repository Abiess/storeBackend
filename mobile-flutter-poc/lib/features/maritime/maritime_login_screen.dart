import 'package:flutter/material.dart';

import '../../services/auth_service.dart';
import '../../widgets/shared/markt_login_screen.dart';
import 'maritime_home_screen.dart';

/// Duenner Consumer des zentralen [MarktLoginScreen] fuer die Maritime-App
/// - analog zu `screens/login_screen.dart` (Documents), siehe Multi-App-
/// Beweis vom 22.09. Keine eigene Login-UI, kein eigener Auth-Flow: nur
/// Maritime-Branding (appName/headline/description/icon) + der bestehende
/// `AuthService.login`.
///
/// Nach erfolgreichem Login navigiert dieser Consumer zu
/// [MaritimeHomeScreen] - `MarktLoginScreen` selbst kennt weder "Maritime"
/// noch den Navigator (siehe Doku in `markt_login_screen.dart`).
class MaritimeLoginScreen extends StatelessWidget {
  const MaritimeLoginScreen({super.key, this.authService});

  /// Nur fuer Tests: erlaubt das Einschleusen eines Fake-`AuthService`
  /// (analog zum bestehenden `dhlService`/`documentsService`-Injection-
  /// Muster), ohne dass Consumer-Code diesen Parameter im Normalbetrieb
  /// setzen muss.
  final AuthService? authService;

  @override
  Widget build(BuildContext context) {
    final effectiveAuthService = authService ?? AuthService();

    return MarktLoginScreen(
      appName: 'Maritime',
      headline: 'Willkommen zurück',
      description: 'Häfen, Schiffe und Sendungen im Blick',
      icon: Icons.directions_boat,
      onLogin: (email, password) async {
        final authResponse = await effectiveAuthService.login(email: email, password: password);
        if (!context.mounted) return;
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (_) => MaritimeHomeScreen(user: authResponse.user)),
        );
      },
    );
  }
}
