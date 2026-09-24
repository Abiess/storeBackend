import 'package:flutter/material.dart';

import '../core/app_bootstrap.dart';
import '../models/auth_response.dart';
import '../screens/documents_screen.dart';
import '../screens/login_screen.dart';

/// Documents-Entrypoint - bewusst sehr duenn (siehe Multi-App-Audit vom
/// 22.09.): konfiguriert NUR, welcher Login-/Home-Screen fuer die
/// Documents-App gilt, und delegiert alles Gemeinsame (Theme/AuthGate) an
/// [runMarktMaApp].
///
/// `LoginScreen` (bereits vorhanden, `screens/login_screen.dart`) traegt
/// selbst schon das Documents-Branding (appName/headline/description/icon
/// fuer `MarktLoginScreen`) sowie die Navigation zu `DocumentsScreen` nach
/// erfolgreichem Login - dieser Entrypoint dupliziert das NICHT erneut,
/// sondern reicht die vorhandenen Screens nur als Builder durch.
///
/// Kuenftige Apps (Maritime/DHL/Loyalty) bekommen jeweils eine eigene,
/// genauso duenne `lib/entrypoints/main_<app>.dart` mit eigenem
/// Login-/Home-Screen - OHNE `app_bootstrap.dart`, `AuthGate` oder
/// `MarktLoginScreen`/`MarktAppShell` zu kopieren oder zu aendern.
void main() {
  runMarktMaApp(
    const MarktAppConfig(
      appName: 'markt.ma Documents',
      loginBuilder: _buildLogin,
      homeBuilder: _buildHome,
    ),
  );
}

Widget _buildLogin(BuildContext context) => const LoginScreen();

/// Reicht den ueber `AuthGate`/`GET /auth/me` geladenen [AuthUser] an
/// [DocumentsScreen] durch (siehe Auth-Persistenz-Korrektur vom 23.09.) -
/// AUSSCHLIESSLICH fuer die zentrale, app-uebergreifende Current-User-
/// Anzeige im `MarktProfileMenu` (Name/E-Mail). Documents hat weiterhin
/// keine eigene Entitlement-/Store-Aufloesung.
Widget _buildHome(BuildContext context, AuthUser? user) => DocumentsScreen(user: user);
