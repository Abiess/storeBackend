import 'package:flutter/material.dart';

import 'screens/login_screen.dart';

void main() {
  runApp(const MarktMaDocumentsPocApp());
}

class MarktMaDocumentsPocApp extends StatelessWidget {
  const MarktMaDocumentsPocApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'markt.ma Documents PoC',
      theme: ThemeData(
        colorSchemeSeed: const Color(0xFF667EEA), // gleicher Lila-Ton wie Angular-Design-Token
        useMaterial3: true,
      ),
      home: const AuthGate(),
    );
  }
}
