import 'package:flutter/material.dart';

import '../services/token_storage.dart';

/// Generisches Auth-Gate (Core/Shared) - kennt KEINE konkrete App
/// (kein "Documents", kein "Maritime", ...).
///
/// Bewahrt exakt die bisherige Funktion 1:1 (siehe vorherige Version in
/// `screens/login_screen.dart`): beim Start pruefen, ob bereits ein JWT
/// gespeichert ist (`TokenStorage.instance.readToken()`), und je nach
/// Ergebnis [homeBuilder] oder [loginBuilder] anzeigen. Kein Session-
/// Management/Refresh - reine Persistenz-Demo wie bisher.
///
/// Welcher konkrete Login-/Home-Screen gezeigt wird, entscheidet
/// ausschliesslich der Aufrufer (z.B. `lib/entrypoints/main_documents.dart`
/// via `MarktAppConfig`, siehe `lib/core/app_bootstrap.dart`) - dieses
/// Widget selbst importiert keinen einzigen App-spezifischen Screen mehr.
class AuthGate extends StatelessWidget {
  const AuthGate({super.key, required this.loginBuilder, required this.homeBuilder});

  /// Baut den Login-Screen, wenn (noch) kein JWT gespeichert ist.
  final WidgetBuilder loginBuilder;

  /// Baut den Home-Screen der jeweiligen App, wenn bereits ein JWT
  /// gespeichert ist.
  final WidgetBuilder homeBuilder;

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<String?>(
      future: TokenStorage.instance.readToken(),
      builder: (context, snapshot) {
        if (snapshot.connectionState != ConnectionState.done) {
          return const Scaffold(body: Center(child: CircularProgressIndicator()));
        }
        final hasToken = snapshot.data != null && snapshot.data!.isNotEmpty;
        return hasToken ? homeBuilder(context) : loginBuilder(context);
      },
    );
  }
}
