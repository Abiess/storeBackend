// Tests fuer das generische Auth-Gate (`lib/core/auth_gate.dart`).
//
// `TokenStorage` nutzt `flutter_secure_storage`, das im Widget-Test keinen
// echten Platform-Channel hat - deshalb wird der zugrunde liegende
// MethodChannel (`plugins.it_nomads.com/flutter_secure_storage`, siehe
// `flutter_secure_storage_platform_interface`) hier gemockt, statt
// `TokenStorage`/`AuthGate` selbst zu aendern. Der eigentliche `/auth/me`-
// HTTP-Aufruf wird ueber einen in `AuthService` injizierten `MockClient`
// simuliert (identisches Muster wie in `test/services/dhl_service_test.dart`)
// - es wird NIE ein echter Netzwerk-Request ausgefuehrt.
//
// Siehe Auth-Persistenz-Audit + -Korrektur vom 23.09.: `AuthGate` prueft
// nicht mehr nur, OB ein Token existiert, sondern loest bei vorhandenem
// Token zusaetzlich `GET /api/auth/me` auf und reicht den geladenen
// `AuthUser` an `homeBuilder` durch.
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:markt_ma_documents_poc/core/auth_gate.dart';
import 'package:markt_ma_documents_poc/models/auth_response.dart';
import 'package:markt_ma_documents_poc/services/auth_service.dart';
import 'package:markt_ma_documents_poc/services/token_storage.dart';

void main() {
  const channel = MethodChannel('plugins.it_nomads.com/flutter_secure_storage');
  String? storedToken;

  setUp(() {
    storedToken = null;
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger.setMockMethodCallHandler(
      channel,
      (call) async {
        switch (call.method) {
          case 'read':
            return storedToken;
          case 'write':
            storedToken = (call.arguments as Map)['value'] as String?;
            return null;
          case 'delete':
            storedToken = null;
            return null;
          default:
            return null;
        }
      },
    );
  });

  tearDown(() {
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger.setMockMethodCallHandler(channel, null);
  });

  Widget wrap(Widget child) => MaterialApp(home: child);

  testWidgets('ohne gespeichertes Token wird der injizierte Login-Builder angezeigt (kein /me-Aufruf)', (tester) async {
    // Kein `authService` injiziert - waere ein echter Netzwerk-Request
    // noetig, wuerde dieser Test haengen/fehlschlagen; da kein Token
    // gespeichert ist, darf `AuthGate` `/me` gar nicht erst aufrufen.
    await tester.pumpWidget(
      wrap(
        AuthGate(
          loginBuilder: (context) => const Text('INJECTED_LOGIN'),
          homeBuilder: (context, user) => const Text('INJECTED_HOME'),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('INJECTED_LOGIN'), findsOneWidget);
    expect(find.text('INJECTED_HOME'), findsNothing);
  });

  testWidgets('mit gespeichertem Token und erfolgreichem /me wird der User an homeBuilder uebergeben', (tester) async {
    storedToken = 'dummy-jwt-token';
    AuthUser? receivedUser;

    final mockClient = MockClient((request) async {
      expect(request.url.path, endsWith('/auth/me'));
      expect(request.headers['Authorization'], 'Bearer dummy-jwt-token');
      return http.Response(
        '{"id":42,"email":"dhl-user@example.com","name":"DHL Betreiber","roles":["USER"],'
        '"appAccessMode":"MANAGED",'
        '"apps":[{"app":"DHL","storeId":7,"enabled":true}]}',
        200,
      );
    });

    await tester.pumpWidget(
      wrap(
        AuthGate(
          loginBuilder: (context) => const Text('INJECTED_LOGIN'),
          homeBuilder: (context, user) {
            receivedUser = user;
            return const Text('INJECTED_HOME');
          },
          authService: AuthService(client: mockClient),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('INJECTED_HOME'), findsOneWidget);
    expect(find.text('INJECTED_LOGIN'), findsNothing);

    // Kern-Anforderung: der aus /me geladene User (inkl. apps[]) kommt
    // tatsaechlich bei homeBuilder an - das ist die Grundlage fuer die
    // DHL-storeId-Aufloesung nach App-/Browser-Neustart.
    expect(receivedUser, isNotNull);
    expect(receivedUser!.email, 'dhl-user@example.com');
    expect(receivedUser!.storeIdForApp('DHL'), 7);

    // Token bleibt bei Erfolg unangetastet (kein faelschliches Loeschen).
    expect(storedToken, 'dummy-jwt-token');
  });

  testWidgets('bei 401 von /me wird das Token geloescht und der Login-Builder angezeigt (fail closed)', (tester) async {
    storedToken = 'expired-or-invalid-token';

    final mockClient = MockClient((request) async {
      return http.Response('{"message":"Invalid or expired token"}', 401);
    });

    await tester.pumpWidget(
      wrap(
        AuthGate(
          loginBuilder: (context) => const Text('INJECTED_LOGIN'),
          homeBuilder: (context, user) => const Text('INJECTED_HOME'),
          authService: AuthService(client: mockClient),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('INJECTED_LOGIN'), findsOneWidget);
    expect(find.text('INJECTED_HOME'), findsNothing);

    // Fail closed: das ungueltige Token darf nicht liegen bleiben (sonst
    // wuerde jeder weitere App-Start erneut denselben 401 produzieren).
    expect(storedToken, isNull);
    expect(await TokenStorage.instance.readToken(), isNull);
  });

  testWidgets('bei Netzwerk-/Serverfehler von /me wird ein expliziter Fehlerzustand angezeigt (kein Login, kein Home)',
      (tester) async {
    storedToken = 'dummy-jwt-token';

    final mockClient = MockClient((request) async {
      return http.Response('{"message":"Internal Server Error"}', 500);
    });

    await tester.pumpWidget(
      wrap(
        AuthGate(
          loginBuilder: (context) => const Text('INJECTED_LOGIN'),
          homeBuilder: (context, user) => const Text('INJECTED_HOME'),
          authService: AuthService(client: mockClient),
        ),
      ),
    );
    await tester.pumpAndSettle();

    // Ein Server-/Netzwerkfehler darf NIE faelschlich wie ein erfolgreicher
    // Login (INJECTED_HOME) behandelt werden - aber auch nicht automatisch
    // zum Login zwingen (das Token koennte noch gueltig sein, siehe
    // Klassendoku `AuthGate`). Stattdessen expliziter Fehlerzustand.
    expect(find.text('INJECTED_HOME'), findsNothing);
    expect(find.text('INJECTED_LOGIN'), findsNothing);
    expect(find.text('Sitzung konnte nicht geladen werden'), findsOneWidget);
    expect(find.text('Erneut versuchen'), findsOneWidget);

    // Token bleibt bei einem reinen Serverfehler erhalten (kein
    // faelschliches Loeschen, koennte transient sein).
    expect(storedToken, 'dummy-jwt-token');
  });
}
