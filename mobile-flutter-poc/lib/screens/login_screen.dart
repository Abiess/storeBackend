import 'package:flutter/material.dart';

import '../services/auth_service.dart';
import '../widgets/shared/markt_login_screen.dart';
import 'documents_screen.dart';

/// Duenner Consumer des zentralen [MarktLoginScreen] (Shared Layout) fuer
/// die Documents-App. Kennt nur sein eigenes Branding (appName/headline/
/// description/icon) und den bestehenden Auth-Vertrag - die eigentliche
/// Formular-/Split-Layout-Darstellung, Lade-/Fehlerzustand und Passwort-
/// Show/Hide leben zentral in `MarktLoginScreen`, damit spaetere Consumer
/// (Maritime/DHL/Loyalty) sie ohne Kopie wiederverwenden koennen.
///
/// Navigation nach erfolgreichem Login bleibt bewusst hier (Consumer-
/// Verantwortung, siehe Doku in `markt_login_screen.dart`): `onLogin` ruft
/// den bestehenden `AuthService.login` auf und navigiert danach explizit
/// zu `DocumentsScreen` - der Shared Screen selbst kennt weder
/// `DocumentsScreen` noch den Navigator.
class LoginScreen extends StatelessWidget {
  const LoginScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final authService = AuthService();

    return MarktLoginScreen(
      appName: 'Documents',
      headline: 'Willkommen zurück',
      description: 'Dokumente sicher verwalten',
      icon: Icons.description,
      onLogin: (email, password) async {
        await authService.login(email: email, password: password);
        if (!context.mounted) return;
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (_) => const DocumentsScreen()),
        );
      },
    );
  }
}
