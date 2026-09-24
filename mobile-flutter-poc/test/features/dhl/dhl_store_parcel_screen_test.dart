// Widget-Tests fuer `DhlStoreParcelScreen`
// (lib/features/dhl/dhl_store_parcel_screen.dart) - erster echter
// Einlagerungs-Flow "Paket einlagern" (siehe DHL-Einlagerungs-Audit vom
// 23.09. + Umsetzung danach).
//
// `TokenStorage` wird ueber den Secure-Storage-MethodChannel gemockt
// (identisches Muster wie in `test/features/dhl/dhl_home_screen_test.dart`),
// der eigentliche HTTP-Aufruf ueber einen in `DhlService` injizierten
// `MockClient` - es wird NIE ein echter Netzwerk-Request ausgefuehrt und
// NIE die externe DHL-API direkt kontaktiert.
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:markt_ma_documents_poc/features/dhl/dhl_store_parcel_screen.dart';
import 'package:markt_ma_documents_poc/services/dhl_service.dart';

void main() {
  const channel = MethodChannel('plugins.it_nomads.com/flutter_secure_storage');

  setUp(() {
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger.setMockMethodCallHandler(
      channel,
      (call) async {
        if (call.method == 'read') return 'dummy-jwt-token';
        return null;
      },
    );
  });

  tearDown(() {
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger.setMockMethodCallHandler(channel, null);
  });

  Widget wrap(Widget child) => MaterialApp(home: child);

  const trackingField = ValueKey('dhlStoreParcel.trackingField');
  const submitButton = ValueKey('dhlStoreParcel.submitButton');
  const nextButton = ValueKey('dhlStoreParcel.nextButton');
  const backButton = ValueKey('dhlStoreParcel.backButton');

  const validResponse = '{"status":"VALID","trackingCode":"JVGL0605379700518040","pieceCode":"JVGL0605379700518040"}';
  const storedResponse = '{"id":9,"storeId":7,"trackingCode":"JVGL0605379700518040","shelfLocation":"A3",'
      '"receivedAt":"2026-01-15T10:00:00","status":"STORED"}';

  Future<void> enterAndDebounce(WidgetTester tester, String code) async {
    await tester.enterText(find.byKey(trackingField), code);
    await tester.pump(const Duration(milliseconds: 500));
    await tester.pump();
  }

  testWidgets('zu kurzer Code loest keinen Validate-Call aus und Einlagern bleibt disabled', (tester) async {
    var validateCalls = 0;
    final mockClient = MockClient((request) async {
      if (request.url.path.endsWith('/tracking/validate')) validateCalls++;
      return http.Response(validResponse, 200);
    });

    await tester.pumpWidget(wrap(DhlStoreParcelScreen(storeId: 7, dhlService: DhlService(client: mockClient))));
    await enterAndDebounce(tester, 'ABC123');

    expect(validateCalls, 0);
    final button = tester.widget<FilledButton>(find.byKey(submitButton));
    expect(button.onPressed, isNull);
  });

  testWidgets('gueltiger Code fuehrt zu VALID und aktiviert den Einlagern-Button', (tester) async {
    final mockClient = MockClient((request) async => http.Response(validResponse, 200));

    await tester.pumpWidget(wrap(DhlStoreParcelScreen(storeId: 7, dhlService: DhlService(client: mockClient))));
    await enterAndDebounce(tester, 'JVGL0605379700518040');

    expect(find.text('Sendung von DHL bestaetigt'), findsOneWidget);
    final button = tester.widget<FilledButton>(find.byKey(submitButton));
    expect(button.onPressed, isNotNull);
  });

  testWidgets('NOT_FOUND (HTTP 200) verhindert Einlagern', (tester) async {
    final mockClient = MockClient(
      (request) async => http.Response('{"status":"NOT_FOUND","trackingCode":"X"}', 200),
    );

    await tester.pumpWidget(wrap(DhlStoreParcelScreen(storeId: 7, dhlService: DhlService(client: mockClient))));
    await enterAndDebounce(tester, 'JVGL0605379700518040');

    expect(find.text('Keine gueltige DHL-Sendung gefunden'), findsOneWidget);
    final button = tester.widget<FilledButton>(find.byKey(submitButton));
    expect(button.onPressed, isNull);
  });

  testWidgets('technischer Fehler (503) verhindert Einlagern', (tester) async {
    final mockClient = MockClient(
      (request) async => http.Response(
        '{"error":"DHL tracking validation failed","errorCode":"AUTHENTICATION_ERROR","message":"DHL nicht erreichbar"}',
        503,
      ),
    );

    await tester.pumpWidget(wrap(DhlStoreParcelScreen(storeId: 7, dhlService: DhlService(client: mockClient))));
    await enterAndDebounce(tester, 'JVGL0605379700518040');

    expect(find.text('DHL-Dienst aktuell nicht erreichbar'), findsOneWidget);
    final button = tester.widget<FilledButton>(find.byKey(submitButton));
    expect(button.onPressed, isNull);
  });

  testWidgets('erfolgreicher Auto-Store zeigt den Lagerplatz und verhindert Doppel-Submit', (tester) async {
    var storeCalls = 0;
    final mockClient = MockClient((request) async {
      if (request.url.path.endsWith('/tracking/validate')) {
        return http.Response(validResponse, 200);
      }
      if (request.url.path.endsWith('/parcels/store')) {
        storeCalls++;
        // Kuenstliche Verzoegerung, damit ein zweiter Tap waehrend
        // laufendem Submit real (nicht nur zeitlich zufaellig) getestet wird.
        await Future<void>.delayed(const Duration(milliseconds: 50));
        return http.Response(storedResponse, 200);
      }
      return http.Response('{}', 404);
    });

    await tester.pumpWidget(wrap(DhlStoreParcelScreen(storeId: 7, dhlService: DhlService(client: mockClient))));
    await enterAndDebounce(tester, 'JVGL0605379700518040');

    await tester.tap(find.byKey(submitButton));
    await tester.pump(); // Frame direkt nach dem Tap: Button ist jetzt disabled/Ladezustand
    await tester.tap(find.byKey(submitButton)); // Doppel-Tap waehrend Submit laeuft - darf nichts ausloesen
    await tester.pumpAndSettle();

    expect(storeCalls, 1);
    expect(find.text('Paket eingelagert'), findsOneWidget);
    expect(find.text('A3'), findsOneWidget);
    expect(find.text('JVGL0605379700518040'), findsOneWidget);
  });

  testWidgets('Naechstes Paket setzt den Zustand vollstaendig zurueck', (tester) async {
    final mockClient = MockClient((request) async {
      if (request.url.path.endsWith('/tracking/validate')) {
        return http.Response(validResponse, 200);
      }
      return http.Response(storedResponse, 200);
    });

    await tester.pumpWidget(wrap(DhlStoreParcelScreen(storeId: 7, dhlService: DhlService(client: mockClient))));
    await enterAndDebounce(tester, 'JVGL0605379700518040');
    await tester.tap(find.byKey(submitButton));
    await tester.pumpAndSettle();

    expect(find.text('Paket eingelagert'), findsOneWidget);

    await tester.tap(find.byKey(nextButton));
    await tester.pump();

    expect(find.text('Paket eingelagert'), findsNothing);
    final textField = tester.widget<TextField>(find.byKey(trackingField));
    expect(textField.controller?.text, isEmpty);
    final button = tester.widget<FilledButton>(find.byKey(submitButton));
    expect(button.onPressed, isNull); // zurueck auf IDLE - fail closed
  });

  testWidgets('Zur Uebersicht schliesst den Screen (Navigator.pop)', (tester) async {
    final mockClient = MockClient((request) async {
      if (request.url.path.endsWith('/tracking/validate')) {
        return http.Response(validResponse, 200);
      }
      return http.Response(storedResponse, 200);
    });

    await tester.pumpWidget(
      MaterialApp(
        home: Builder(
          builder: (context) => Scaffold(
            body: Center(
              child: ElevatedButton(
                onPressed: () => Navigator.of(context).push(
                  MaterialPageRoute(
                    builder: (_) => DhlStoreParcelScreen(storeId: 7, dhlService: DhlService(client: mockClient)),
                  ),
                ),
                child: const Text('open'),
              ),
            ),
          ),
        ),
      ),
    );

    await tester.tap(find.text('open'));
    await tester.pumpAndSettle();

    await enterAndDebounce(tester, 'JVGL0605379700518040');
    await tester.tap(find.byKey(submitButton));
    await tester.pumpAndSettle();

    await tester.tap(find.byKey(backButton));
    await tester.pumpAndSettle();

    expect(find.text('open'), findsOneWidget);
    expect(find.text('Paket eingelagert'), findsNothing);
  });
}
