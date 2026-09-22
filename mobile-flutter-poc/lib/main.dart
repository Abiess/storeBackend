import 'package:flutter/material.dart';

import 'screens/login_screen.dart';
import 'theme/markt_theme.dart';

void main() {
  runApp(const MarktMaDocumentsPocApp());
}

class MarktMaDocumentsPocApp extends StatelessWidget {
  const MarktMaDocumentsPocApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'markt.ma Documents PoC',
      // Zentrales markt.ma Theme (siehe lib/theme/markt_theme.dart) statt
      // Inline-ThemeData - einziger Ort fuer Farben/Card-/AppBar-Stil,
      // wiederverwendbar fuer alle zukuenftigen App-Factory-Screens.
      theme: MarktTheme.light(),
      darkTheme: MarktTheme.dark(),
      themeMode: ThemeMode.system,
      home: const AuthGate(),
    );
  }
}
