import 'package:flutter/material.dart';

import '../core/app_bootstrap.dart';
import '../features/maritime/maritime_home_screen.dart';
import '../features/maritime/maritime_login_screen.dart';
import '../models/auth_response.dart';

/// Maritime-Entrypoint - Beweis, dass eine zweite, eigenstaendige App aus
/// derselben Codebasis buildbar ist (siehe Multi-App-Beweis vom 22.09.).
///
/// Genauso duenn wie `entrypoints/main_documents.dart`: konfiguriert NUR,
/// welcher Login-/Home-Screen fuer Maritime gilt, und delegiert alles
/// Gemeinsame (Theme/AuthGate/AuthService/TokenStorage/ApiConfig) an
/// [runMarktMaApp] - ohne Documents zu kopieren oder zu veraendern.
///
/// Fachlich bewusst minimal (siehe `features/maritime/`): kein AIS, keine
/// Ports/Vessels, keine Angular-Fachlichkeit portiert - das ist ein
/// spaeterer, separater Schritt.
void main() {
  runMarktMaApp(
    const MarktAppConfig(
      appName: 'markt.ma Maritime',
      loginBuilder: _buildLogin,
      homeBuilder: _buildHome,
    ),
  );
}

Widget _buildLogin(BuildContext context) => const MaritimeLoginScreen();

/// Reicht den ueber `AuthGate`/`GET /auth/me` geladenen [AuthUser] an
/// [MaritimeHomeScreen] durch (siehe Auth-Persistenz-Korrektur vom 23.09.) -
/// AUSSCHLIESSLICH fuer die zentrale, app-uebergreifende Current-User-
/// Anzeige im `MarktProfileMenu` (Name/E-Mail). Maritime hat weiterhin
/// keine eigene Entitlement-/Store-Aufloesung.
Widget _buildHome(BuildContext context, AuthUser? user) => MaritimeHomeScreen(user: user);
