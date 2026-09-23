// Test fuer den Documents-Entrypoint (`lib/entrypoints/main_documents.dart`).
//
// Bestaetigt, dass die Entkopplung von `AuthGate`/`app_bootstrap.dart` die
// bisherige Documents-Konfiguration (App-Name, Login ohne Token) unveraendert
// liefert. `TokenStorage` wird wie in `test/core/auth_gate_test.dart` ueber
// den zugrunde liegenden Secure-Storage-MethodChannel gemockt.
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:markt_ma_documents_poc/core/auth_gate.dart';
import 'package:markt_ma_documents_poc/entrypoints/main_documents.dart' as documents_entrypoint;
import 'package:markt_ma_documents_poc/screens/documents_screen.dart';
import 'package:markt_ma_documents_poc/screens/login_screen.dart';
import 'package:markt_ma_documents_poc/services/auth_service.dart';
import 'package:markt_ma_documents_poc/services/documents_service.dart';
import 'package:markt_ma_documents_poc/widgets/shared/markt_profile_menu.dart';

void main() {
  const channel = MethodChannel('plugins.it_nomads.com/flutter_secure_storage');
  String? storedToken;

  setUp(() {
    storedToken = null;
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger.setMockMethodCallHandler(
      channel,
      (call) async {
        // Kein gespeichertes Token -> AuthGate soll den Login zeigen.
        if (call.method == 'read') return storedToken;
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

  testWidgets('Documents-Konfiguration (AuthGate mit Token) zeigt Name/E-Mail des AuthUser im MarktProfileMenu',
      (tester) async {
    // Bewusst direkt ueber AuthGate + dieselben Builder wie
    // `main_documents.dart` gepumpt (statt erneut `main()` aufzurufen) -
    // ein zweiter `runApp`-Aufruf im selben Test-File fuehrt sonst zu
    // Ticker-/Animation-Ueberschneidungen zwischen Tests.
    //
    // Seit der zentralen Current-User-Anzeige wird der ueber `GET /auth/me`
    // geladene `AuthUser` bis zum `MarktProfileMenu` durchgereicht - hier
    // ueber einen injizierten `MockClient` simuliert (kein echter
    // Netzwerk-Request im Test). Die Dokumentenliste selbst wird ebenfalls
    // ueber einen injizierten `DocumentsService`/`MockClient` gestubbt,
    // damit der Test nicht auf einen echten `/api/documents`-Request wartet.
    storedToken = 'dummy-jwt-token';
    final authClient = MockClient((request) async {
      return http.Response('{"id":1,"email":"doc-user@example.com","name":"Documents User","roles":["USER"]}', 200);
    });
    final documentsClient = MockClient((request) async => http.Response('[]', 200));

    await tester.pumpWidget(
      MaterialApp(
        home: AuthGate(
          loginBuilder: (context) => const LoginScreen(),
          homeBuilder: (context, user) =>
              DocumentsScreen(user: user, documentsService: DocumentsService(client: documentsClient)),
          authService: AuthService(client: authClient),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.byType(DocumentsScreen), findsOneWidget);
    expect(find.byType(LoginScreen), findsNothing);

    // MarktProfileMenu-Kopfzeile zeigt Name + E-Mail des geladenen Users -
    // Inhalt erscheint erst nach dem Oeffnen des Popup-Menues.
    await tester.tap(find.byType(MarktProfileMenu));
    await tester.pumpAndSettle();

    expect(find.text('Documents User'), findsOneWidget);
    expect(find.text('doc-user@example.com'), findsOneWidget);
  });

  testWidgets(
      'Bugfix 23.09.: frischer Documents-Login (ohne App-Neustart) zeigt Name/E-Mail im MarktProfileMenu',
      (tester) async {
    // Reproduziert denselben Root-Cause-Fehlerpfad wie bei DHL (siehe
    // `main_dhl_test.dart`): ein FRISCHER Login navigiert bislang OHNE
    // `user` zu `DocumentsScreen` - `MarktProfileMenu` blieb dadurch
    // generisch, obwohl `AuthResponse.user` Name/E-Mail bereits enthielt.
    storedToken = null;
    final loginClient = MockClient((request) async {
      return http.Response(
        '{"token":"dummy-jwt-token","user":{"id":1,"email":"doc-user@example.com","name":"Documents User",'
        '"roles":["USER"]}}',
        200,
      );
    });
    final documentsClient = MockClient((request) async => http.Response('[]', 200));

    await tester.pumpWidget(
      MaterialApp(
        home: LoginScreen(
          authService: AuthService(client: loginClient),
          documentsService: DocumentsService(client: documentsClient),
        ),
      ),
    );
    await tester.pumpAndSettle();

    await tester.enterText(find.widgetWithText(TextField, 'E-Mail'), 'doc-user@example.com');
    await tester.enterText(find.widgetWithText(TextField, 'Passwort'), 'secret123');
    await tester.tap(find.widgetWithText(FilledButton, 'Anmelden'));
    await tester.pumpAndSettle();

    expect(find.byType(DocumentsScreen), findsOneWidget);
    expect(find.byType(LoginScreen), findsNothing);

    await tester.tap(find.byType(MarktProfileMenu));
    await tester.pumpAndSettle();

    expect(find.text('Documents User'), findsOneWidget);
    expect(find.text('doc-user@example.com'), findsOneWidget);
  });
}

