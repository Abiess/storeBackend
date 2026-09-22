// Test fuer den Documents-Entrypoint (`lib/entrypoints/main_documents.dart`).
//
// Bestaetigt, dass die Entkopplung von `AuthGate`/`app_bootstrap.dart` die
// bisherige Documents-Konfiguration (App-Name, Login ohne Token) unveraendert
// liefert. `TokenStorage` wird wie in `test/core/auth_gate_test.dart` ueber
// den zugrunde liegenden Secure-Storage-MethodChannel gemockt.
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:markt_ma_documents_poc/entrypoints/main_documents.dart' as documents_entrypoint;
import 'package:markt_ma_documents_poc/screens/documents_screen.dart';
import 'package:markt_ma_documents_poc/screens/login_screen.dart';

void main() {
  const channel = MethodChannel('plugins.it_nomads.com/flutter_secure_storage');

  setUp(() {
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger.setMockMethodCallHandler(
      channel,
      (call) async {
        // Kein gespeichertes Token -> AuthGate soll den Login zeigen.
        if (call.method == 'read') return null;
        return null;
      },
    );
  });

  tearDown(() {
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger.setMockMethodCallHandler(channel, null);
  });

  testWidgets('main_documents.dart startet mit Documents-Konfiguration und zeigt den Login', (tester) async {
    documents_entrypoint.main();
    await tester.pumpAndSettle();

    final app = tester.widget<MaterialApp>(find.byType(MaterialApp));
    expect(app.title, 'markt.ma Documents');

    // Ohne Token muss AuthGate den (bereits Documents-gebrandeten)
    // LoginScreen anzeigen, nicht DocumentsScreen.
    expect(find.byType(LoginScreen), findsOneWidget);
    expect(find.byType(DocumentsScreen), findsNothing);

    // Bestehendes Documents-Branding im gemeinsamen MarktLoginScreen bleibt
    // erhalten (appName wird als Titel/Branding-Text angezeigt).
    expect(find.text('Documents'), findsWidgets);
  });
}
