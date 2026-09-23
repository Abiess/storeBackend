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
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:markt_ma_documents_poc/core/auth_gate.dart';
import 'package:markt_ma_documents_poc/entrypoints/main_dhl.dart' as dhl_entrypoint;
import 'package:markt_ma_documents_poc/features/dhl/dhl_home_screen.dart';
import 'package:markt_ma_documents_poc/features/dhl/dhl_login_screen.dart';
import 'package:markt_ma_documents_poc/features/maritime/maritime_home_screen.dart';
import 'package:markt_ma_documents_poc/features/maritime/maritime_login_screen.dart';
import 'package:markt_ma_documents_poc/screens/documents_screen.dart';
import 'package:markt_ma_documents_poc/screens/login_screen.dart';
import 'package:markt_ma_documents_poc/services/auth_service.dart';
import 'package:markt_ma_documents_poc/services/dhl_service.dart';
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

  testWidgets('DHL-Konfiguration (AuthGate mit Token) zeigt den DHL-Home-Screen mit aufgeloester storeId', (tester) async {
    // Bewusst direkt ueber AuthGate + dieselben Builder wie `main_dhl.dart`
    // gepumpt (statt erneut `main()` aufzurufen) - ein zweiter `runApp`-
    // Aufruf im selben Test-File fuehrt sonst zu Ticker-/Animation-
    // Ueberschneidungen zwischen Tests.
    //
    // Seit der Auth-Persistenz-Korrektur vom 23.09. ruft `AuthGate` bei
    // vorhandenem Token `GET /auth/me` auf; hier ueber einen injizierten
    // `MockClient` mit einem aktivierten DHL-Entitlement simuliert, damit
    // `DhlHomeScreen` eine echte (aufgeloeste) `storeId` erhaelt - kein
    // echter Netzwerk-Request im Test. Der Pakete-Abruf selbst wird
    // zusaetzlich ueber einen injizierten `DhlService`/`MockClient`
    // gestubbt (analog `test/features/dhl/dhl_home_screen_test.dart`).
    storedToken = 'dummy-jwt-token';
    final authClient = MockClient((request) async {
      return http.Response(
        '{"id":1,"email":"dhl-user@example.com","name":"DHL User","roles":["USER"],'
        '"appAccessMode":"MANAGED",'
        '"apps":[{"app":"DHL","storeId":7,"enabled":true}]}',
        200,
      );
    });
    final dhlClient = MockClient((request) async => http.Response('[]', 200));

    await tester.pumpWidget(
      MaterialApp(
        home: AuthGate(
          loginBuilder: (context) => const DhlLoginScreen(),
          homeBuilder: (context, user) => DhlHomeScreen(
            storeId: user?.storeIdForApp('DHL'),
            dhlService: DhlService(client: dhlClient),
            user: user,
          ),
          authService: AuthService(client: authClient),
        ),
      ),
    );
    await tester.pumpAndSettle();

    // Mit Token muss AuthGate DhlHomeScreen zeigen - kein Login, kein
    // Documents/Maritime, und der Kein-Zugriff-Zustand darf NICHT
    // erscheinen (storeId wurde aus /me erfolgreich aufgeloest).
    expect(find.byType(DhlHomeScreen), findsOneWidget);
    expect(find.byType(DhlLoginScreen), findsNothing);
    expect(find.byType(DocumentsScreen), findsNothing);
    expect(find.byType(MaritimeHomeScreen), findsNothing);
    expect(find.text('Kein DHL-Zugriff'), findsNothing);

    // MarktAppShell-Titel + generische Shared Widgets (MarktCard/
    // MarktIconBadge) werden wiederverwendet, keine Fake-Fachdaten.
    expect(find.text('DHL Paketshop'), findsWidgets);

    // MarktProfileMenu-Kopfzeile zeigt Name + E-Mail des geladenen Users,
    // ohne die bestehende storeId-Aufloesung zu beeintraechtigen - Inhalt
    // erscheint erst nach dem Oeffnen des Popup-Menues.
    await tester.tap(find.byType(MarktProfileMenu));
    await tester.pumpAndSettle();

    expect(find.text('DHL User'), findsOneWidget);
    expect(find.text('dhl-user@example.com'), findsOneWidget);
  });

  testWidgets(
      'Bugfix 23.09.: frischer DHL-Login (ohne App-Neustart) zeigt Name/E-Mail im MarktProfileMenu '
      'und behaelt die storeId-Aufloesung', (tester) async {
    // Reproduziert exakt den gemeldeten Produktions-Fehler auf dhl-dev:
    // ein FRISCHER Login (kein Token beim Start, kein AuthGate-`/me`-Pfad)
    // navigiert bislang OHNE `user` zu `DhlHomeScreen` - `MarktProfileMenu`
    // blieb dadurch generisch, obwohl `AuthResponse.user` Name/E-Mail
    // bereits enthielt.
    storedToken = null;
    final loginClient = MockClient((request) async {
      return http.Response(
        '{"token":"dummy-jwt-token","user":{"id":1,"email":"dhl-user@example.com","name":"DHL User",'
        '"roles":["USER"],"appAccessMode":"MANAGED",'
        '"apps":[{"app":"DHL","storeId":7,"enabled":true}]}}',
        200,
      );
    });
    final dhlClient = MockClient((request) async => http.Response('[]', 200));

    await tester.pumpWidget(
      MaterialApp(
        home: DhlLoginScreen(
          authService: AuthService(client: loginClient),
          dhlService: DhlService(client: dhlClient),
        ),
      ),
    );
    await tester.pumpAndSettle();

    await tester.enterText(find.widgetWithText(TextField, 'E-Mail'), 'dhl-user@example.com');
    await tester.enterText(find.widgetWithText(TextField, 'Passwort'), 'secret123');
    await tester.tap(find.widgetWithText(FilledButton, 'Anmelden'));
    await tester.pumpAndSettle();

    expect(find.byType(DhlHomeScreen), findsOneWidget);
    expect(find.byType(DhlLoginScreen), findsNothing);
    expect(find.text('Kein DHL-Zugriff'), findsNothing);

    await tester.tap(find.byType(MarktProfileMenu));
    await tester.pumpAndSettle();

    expect(find.text('DHL User'), findsOneWidget);
    expect(find.text('dhl-user@example.com'), findsOneWidget);
  });
}
