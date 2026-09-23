import 'package:flutter/material.dart';

import '../core/app_bootstrap.dart';
import '../features/dhl/dhl_home_screen.dart';
import '../features/dhl/dhl_login_screen.dart';

/// DHL/Paketshop-Entrypoint - dritte, eigenstaendige App aus derselben
/// Codebasis (siehe Multi-App-Beweis vom 22.09., analog zu
/// `entrypoints/main_maritime.dart`).
///
/// Genauso duenn wie `entrypoints/main_documents.dart`/`main_maritime.dart`:
/// konfiguriert NUR, welcher Login-/Home-Screen fuer DHL gilt, und
/// delegiert alles Gemeinsame (Theme/AuthGate/AuthService/TokenStorage/
/// ApiConfig) an [runMarktMaApp] - ohne Documents/Maritime zu kopieren
/// oder zu veraendern.
///
/// Fachlich bewusst minimal (siehe `features/dhl/`): keine Paket-/
/// Sendungs-/Tracking-Logik, keine erfundenen APIs - das ist ein spaeterer,
/// separater Schritt.
void main() {
  runMarktMaApp(
    const MarktAppConfig(
      appName: 'markt.ma DHL Paketshop',
      loginBuilder: _buildLogin,
      homeBuilder: _buildHome,
    ),
  );
}

Widget _buildLogin(BuildContext context) => const DhlLoginScreen();

Widget _buildHome(BuildContext context) => const DhlHomeScreen();
