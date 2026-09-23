// Test fuer den Maritime-Entrypoint (`lib/entrypoints/main_maritime.dart`).
//
// Beweist, dass eine zweite App tatsaechlich eigenes Branding/Home liefert
// und Documents dabei unangetastet bleibt (siehe Multi-App-Beweis vom
// 22.09.). `TokenStorage` wird analog zu `test/core/auth_gate_test.dart`
// ueber den Secure-Storage-MethodChannel gemockt.
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:markt_ma_documents_poc/core/auth_gate.dart';
import 'package:markt_ma_documents_poc/entrypoints/main_maritime.dart' as maritime_entrypoint;
import 'package:markt_ma_documents_poc/features/maritime/maritime_home_screen.dart';
import 'package:markt_ma_documents_poc/features/maritime/maritime_login_screen.dart';
import 'package:markt_ma_documents_poc/screens/documents_screen.dart';
import 'package:markt_ma_documents_poc/screens/login_screen.dart';
import 'package:markt_ma_documents_poc/services/auth_service.dart';
import 'package:markt_ma_documents_poc/widgets/shared/markt_profile_menu.dart';

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

  testWidgets('main_maritime.dart startet mit Maritime-Konfiguration und zeigt den Maritime-Login', (tester) async {
    maritime_entrypoint.main();
    await tester.pumpAndSettle();

    final app = tester.widget<MaterialApp>(find.byType(MaterialApp));
    expect(app.title, 'markt.ma Maritime');

    // Ohne Token muss AuthGate den Maritime-Login zeigen - NICHT den
    // Documents-Login und NICHT DocumentsScreen/MaritimeHomeScreen.
    expect(find.byType(MaritimeLoginScreen), findsOneWidget);
    expect(find.byType(LoginScreen), findsNothing);
    expect(find.byType(DocumentsScreen), findsNothing);
    expect(find.byType(MaritimeHomeScreen), findsNothing);

    // Maritime-Branding aus MarktLoginScreen bleibt sichtbar.
    expect(find.text('Maritime'), findsWidgets);
  });

  testWidgets('Maritime-Konfiguration (AuthGate mit Token) zeigt den Maritime-Home-Screen', (tester) async {
    // Bewusst direkt ueber AuthGate + dieselben Builder wie
    // `main_maritime.dart` gepumpt (statt erneut `main()` aufzurufen) -
    // ein zweiter `runApp`-Aufruf im selben Test-File fuehrt sonst zu
    // Ticker-/Animation-Ueberschneidungen zwischen Tests.
    //
    // Seit der Auth-Persistenz-Korrektur vom 23.09. ruft `AuthGate` bei
    // vorhandenem Token `GET /auth/me` auf - hier ueber einen injizierten
    // `MockClient` simuliert (kein echter Netzwerk-Request im Test).
    // Maritime wertet den geladenen User fuer die Store-/Entitlement-Logik
    // bewusst nicht aus, reicht ihn aber seit der zentralen Current-User-
    // Anzeige an `MaritimeHomeScreen`/`MarktProfileMenu` durch.
    storedToken = 'dummy-jwt-token';
    final mockClient = MockClient((request) async {
      return http.Response(
        '{"id":1,"email":"user@example.com","name":"Maritime User","roles":["USER"]}',
        200,
      );
    });

    await tester.pumpWidget(
      MaterialApp(
        home: AuthGate(
          loginBuilder: (context) => const MaritimeLoginScreen(),
          homeBuilder: (context, user) => MaritimeHomeScreen(user: user),
          authService: AuthService(client: mockClient),
        ),
      ),
    );
    await tester.pumpAndSettle();

    // Mit Token muss AuthGate MaritimeHomeScreen zeigen - kein Login,
    // kein Documents.
    expect(find.byType(MaritimeHomeScreen), findsOneWidget);
    expect(find.byType(MaritimeLoginScreen), findsNothing);
    expect(find.byType(DocumentsScreen), findsNothing);

    // MarktAppShell-Titel + generische Shared Widgets (MarktCard/
    // MarktIconBadge) werden wiederverwendet, keine Fake-Fachdaten. Der
    // Titel "Maritime" taucht bewusst mehrfach auf (Topbar-Titel,
    // Nav-Item, Body-Ueberschrift) - relevant ist nur, dass er ueberhaupt
    // sichtbar ist, nicht mehr "(PoC)" heisst.
    expect(find.text('Maritime'), findsWidgets);

    // MarktProfileMenu-Kopfzeile zeigt Name + E-Mail des geladenen Users -
    // Inhalt erscheint erst nach dem Oeffnen des Popup-Menues.
    await tester.tap(find.byType(MarktProfileMenu));
    await tester.pumpAndSettle();

    expect(find.text('Maritime User'), findsOneWidget);
    expect(find.text('user@example.com'), findsOneWidget);
  });
}
