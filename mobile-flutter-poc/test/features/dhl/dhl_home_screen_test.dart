// Widget-Tests fuer `DhlHomeScreen` (lib/features/dhl/dhl_home_screen.dart)
// - erster echter End-to-End-Flow "Pakete im Laden" (siehe Aufgabenstellung
// vom 23.09.).
//
// `TokenStorage` wird ueber den Secure-Storage-MethodChannel gemockt
// (identisches Muster wie in `test/core/auth_gate_test.dart`), der
// eigentliche HTTP-Aufruf ueber einen in `DhlService` injizierten
// `MockClient` (siehe `test/services/dhl_service_test.dart`) - es wird NIE
// ein echter Netzwerk-Request ausgefuehrt.
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:markt_ma_documents_poc/features/dhl/dhl_home_screen.dart';
import 'package:markt_ma_documents_poc/services/dhl_service.dart';
import 'package:markt_ma_documents_poc/widgets/dhl/dhl_parcel_card.dart';

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

  testWidgets('ohne storeId (kein aktiviertes Entitlement) wird der fail-closed Zustand angezeigt', (tester) async {
    await tester.pumpWidget(wrap(const DhlHomeScreen(storeId: null)));
    await tester.pumpAndSettle();

    expect(find.text('Kein DHL-Zugriff'), findsOneWidget);
    expect(find.byType(DhlParcelCard), findsNothing);
  });

  testWidgets('mit storeId zeigt Loading, dann die geladenen Pakete', (tester) async {
    final mockClient = MockClient((request) async {
      return http.Response(
        '[{"id":1,"storeId":7,"trackingCode":"T1","shelfLocation":"A1","receivedAt":"2026-01-15T10:00:00","status":"STORED"},'
        '{"id":2,"storeId":7,"trackingCode":"T2","shelfLocation":"A2","receivedAt":"2026-01-16T10:00:00","status":"PICKED_UP"}]',
        200,
      );
    });

    await tester.pumpWidget(
      wrap(DhlHomeScreen(storeId: 7, dhlService: DhlService(client: mockClient))),
    );

    // Direkt nach dem ersten Frame laeuft der Ladevorgang noch.
    await tester.pump();
    expect(find.byType(CircularProgressIndicator), findsOneWidget);

    await tester.pumpAndSettle();

    expect(find.byType(CircularProgressIndicator), findsNothing);
    expect(find.byType(DhlParcelCard), findsNWidgets(2));
    expect(find.text('T1'), findsOneWidget);
    expect(find.text('T2'), findsOneWidget);
  });

  testWidgets('mit storeId aber leerer Liste wird der Empty-State angezeigt', (tester) async {
    final mockClient = MockClient((request) async => http.Response('[]', 200));

    await tester.pumpWidget(
      wrap(DhlHomeScreen(storeId: 7, dhlService: DhlService(client: mockClient))),
    );
    await tester.pumpAndSettle();

    expect(find.text('Keine Pakete im Laden'), findsOneWidget);
    expect(find.byType(DhlParcelCard), findsNothing);
  });

  testWidgets('mit storeId aber Backend-Fehler wird der Error-State angezeigt', (tester) async {
    final mockClient = MockClient(
      (request) async => http.Response('{"message":"Kein Zugriff auf diesen Store"}', 403),
    );

    await tester.pumpWidget(
      wrap(DhlHomeScreen(storeId: 7, dhlService: DhlService(client: mockClient))),
    );
    await tester.pumpAndSettle();

    expect(find.textContaining('Kein Zugriff auf diesen Store'), findsOneWidget);
    expect(find.byType(DhlParcelCard), findsNothing);
  });
}
