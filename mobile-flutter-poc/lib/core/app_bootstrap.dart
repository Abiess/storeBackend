import 'package:flutter/material.dart';

import '../theme/markt_theme.dart';
import 'auth_gate.dart';

/// Minimale, wirklich app-uebergreifende Bootstrap-Konfiguration.
///
/// Enthaelt bewusst NUR das, was fuer JEDE zukuenftige markt.ma Flutter-App
/// (Documents, spaeter Maritime/DHL/Loyalty) identisch ablaufen muss:
/// `MaterialApp` + zentrales [MarktTheme] (Light/Dark/System) + [AuthGate].
///
/// Enthaelt bewusst NICHT: Navigation/`navItemsBuilder`, App-Icon,
/// Login-Headline/-Description, o.ae. - das ist Sache der jeweiligen App
/// (siehe `lib/entrypoints/main_documents.dart`, das bereits vorhandene,
/// selbst konfigurierte `LoginScreen`/`DocumentsScreen`-Widgets uebergibt).
/// Kein `MarktResponsiveDataList`/`MarktAppShell`-Wissen hier - das bleibt
/// Sache der Home-Screens der jeweiligen App.
class MarktAppConfig {
  const MarktAppConfig({
    required this.appName,
    required this.loginBuilder,
    required this.homeBuilder,
  });

  /// App-Name, u.a. als `MaterialApp.title` genutzt (Fenstertitel/Task-
  /// Switcher-Label) - NICHT der sichtbare Login-/Sidebar-Titel, der bleibt
  /// Sache der jeweiligen Screens (`MarktLoginScreen.appName`,
  /// `MarktAppShell.title`).
  final String appName;

  /// Baut den Login-Screen der jeweiligen App (i.d.R. ein duenner Consumer
  /// von `MarktLoginScreen`, siehe `screens/login_screen.dart`).
  final WidgetBuilder loginBuilder;

  /// Baut den Home-Screen der jeweiligen App nach erfolgreichem Login
  /// (i.d.R. ein duenner Consumer von `MarktAppShell`).
  final WidgetBuilder homeBuilder;
}

/// Startet eine markt.ma Flutter-App mit der gemeinsamen Basis
/// (Theme/AuthGate). Wird von jedem `lib/entrypoints/main_*.dart`
/// aufgerufen - dort UND NUR dort unterscheidet sich [MarktAppConfig].
void runMarktMaApp(MarktAppConfig config) {
  runApp(_MarktMaApp(config: config));
}

class _MarktMaApp extends StatelessWidget {
  const _MarktMaApp({required this.config});

  final MarktAppConfig config;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: config.appName,
      // Zentrales markt.ma Theme (siehe lib/theme/markt_theme.dart) -
      // einziger Ort fuer Farben/Card-/AppBar-Stil, identisch fuer jede
      // App, die ueber diesen Bootstrap startet.
      theme: MarktTheme.light(),
      darkTheme: MarktTheme.dark(),
      themeMode: ThemeMode.system,
      home: AuthGate(loginBuilder: config.loginBuilder, homeBuilder: config.homeBuilder),
    );
  }
}
