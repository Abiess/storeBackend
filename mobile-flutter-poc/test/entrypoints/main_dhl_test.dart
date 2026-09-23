// Test fuer den DHL-Entrypoint (`lib/entrypoints/main_dhl.dart`).
//
// Beweist, dass eine dritte App tatsaechlich eigenes Branding/Home liefert
// und Documents/Maritime dabei unangetastet bleiben (siehe Multi-App-Beweis
// vom 22.09., analog zu `test/entrypoints/main_maritime_test.dart`).
// `TokenStorage` wird analog zu `test/core/auth_gate_test.dart` ueber den
// Secure-Storage-MethodChannel gemockt.
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:markt_ma_documents_poc/core/auth_gate.dart';
import 'package:markt_ma_documents_poc/entrypoints/main_dhl.dart' as dhl_entrypoint;
import 'package:markt_ma_documents_poc/features/dhl/dhl_home_screen.dart';
import 'package:markt_ma_documents_poc/features/dhl/dhl_login_screen.dart';
import 'package:markt_ma_documents_poc/features/maritime/maritime_home_screen.dart';
import 'package:markt_ma_documents_poc/features/maritime/maritime_login_screen.dart';
import 'package:markt_ma_documents_poc/screens/documents_screen.dart';
import 'package:markt_ma_documents_poc/screens/login_screen.dart';

void main() {
  const channel = MethodChannel('plugins.it_nomads.com/flutter_secure_storage');
  String? storedToken;

  setUp(() {
    storedToken = null;
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger.setMockMethodCallHandler(
      channel,
      (call) async {
        if (call.method == 'read') return storedToken;
        return null;
      },
    );
  });

  tearDown(() {
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger.setMockMethodCallHandler(channel, null);
  });

  testWidgets('main_dhl.dart startet mit DHL-Konfiguration und zeigt den DHL-Login', (tester) async {
    dhl_entrypoint.main();
    await tester.pumpAndSettle();

    final app = tester.widget<MaterialApp>(find.byType(MaterialApp));
    expect(app.title, 'markt.ma DHL Paketshop');

    // Ohne Token muss AuthGate den DHL-Login zeigen - NICHT Documents-
    // oder Maritime-Login/-Home.
    expect(find.byType(DhlLoginScreen), findsOneWidget);
    expect(find.byType(LoginScreen), findsNothing);
    expect(find.byType(MaritimeLoginScreen), findsNothing);
    expect(find.byType(DocumentsScreen), findsNothing);
    expect(find.byType(MaritimeHomeScreen), findsNothing);
    expect(find.byType(DhlHomeScreen), findsNothing);

    // DHL-Branding aus MarktLoginScreen bleibt sichtbar.
    expect(find.text('DHL Paketshop'), findsWidgets);
  });

  testWidgets('DHL-Konfiguration (AuthGate mit Token) zeigt den DHL-Home-Screen', (tester) async {
    // Bewusst direkt ueber AuthGate + dieselben Builder wie `main_dhl.dart`
    // gepumpt (statt erneut `main()` aufzurufen) - ein zweiter `runApp`-
    // Aufruf im selben Test-File fuehrt sonst zu Ticker-/Animation-
    // Ueberschneidungen zwischen Tests.
    storedToken = 'dummy-jwt-token';

    await tester.pumpWidget(
      MaterialApp(
        home: AuthGate(
          loginBuilder: (context) => const DhlLoginScreen(),
          homeBuilder: (context) => const DhlHomeScreen(),
        ),
      ),
    );
    await tester.pumpAndSettle();

    // Mit Token muss AuthGate DhlHomeScreen zeigen - kein Login, kein
    // Documents/Maritime.
    expect(find.byType(DhlHomeScreen), findsOneWidget);
    expect(find.byType(DhlLoginScreen), findsNothing);
    expect(find.byType(DocumentsScreen), findsNothing);
    expect(find.byType(MaritimeHomeScreen), findsNothing);

    // MarktAppShell-Titel + generische Shared Widgets (MarktCard/
    // MarktIconBadge) werden wiederverwendet, keine Fake-Fachdaten.
    expect(find.text('DHL Paketshop'), findsWidgets);
  });
}
