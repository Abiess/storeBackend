// Widget-Tests fuer `DhlDashboardScreen` (lib/features/dhl/dhl_dashboard_screen.dart)
// - neuer "Guten Tag, ..."-Einstiegsbildschirm, der die praesentationale
// `DhlDashboardView` an die bestehenden DHL-Flows anbindet (siehe
// Klassendoku dort). Der HTTP-Aufruf wird ueber einen in `DhlService`
// injizierten `MockClient` gestubbt (analog
// `test/features/dhl/dhl_home_screen_test.dart`) - es wird NIE ein echter
// Netzwerk-Request ausgefuehrt.
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:markt_ma_documents_poc/features/dhl/dhl_dashboard_screen.dart';
import 'package:markt_ma_documents_poc/features/dhl/dhl_home_screen.dart';
import 'package:markt_ma_documents_poc/features/dhl/dhl_activity_log_screen.dart';
import 'package:markt_ma_documents_poc/features/dhl/dhl_pickup_parcel_screen.dart';
import 'package:markt_ma_documents_poc/features/dhl/dhl_store_parcel_screen.dart';
import 'package:markt_ma_documents_poc/models/auth_response.dart';
import 'package:markt_ma_documents_poc/services/dhl_service.dart';

void main() {
  // `TokenStorage` wird ueber den Secure-Storage-MethodChannel gemockt
  // (identisches Muster wie in `test/features/dhl/dhl_home_screen_test.dart`)
  // - ohne diesen Mock haengt jeder `DhlService`-Aufruf (Plugin-Call ohne
  // Handler) und `pumpAndSettle()` laeuft in ein Timeout.
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
    await tester.pumpWidget(wrap(const DhlDashboardScreen(storeId: null)));
    await tester.pumpAndSettle();

    expect(find.text('Kein DHL-Zugriff'), findsOneWidget);
    expect(find.text('Guten Tag'), findsNothing);
  });

  testWidgets('mit storeId zeigt Bestand, echte Aktivitaeten und heutige Abholungen',
      (tester) async {
    final mockClient = MockClient((request) async {
      if (request.url.path.endsWith('/activity-log')) {
        if (request.url.queryParameters['action'] == 'PICKED_UP') {
          expect(request.url.queryParameters['today'], 'true');
          return http.Response('{"content":[],"totalElements":3}', 200);
        }
        return http.Response(
          '{"content":['
          '{"action":"PICKED_UP","trackingCode":"T9","slotSnapshot":"A1","createdAt":"2026-01-16T11:00:00"},'
          '{"action":"FOUND","trackingCode":"T9","createdAt":"2026-01-16T10:55:00"},'
          '{"action":"STORED","trackingCode":"T2","slotSnapshot":null,"createdAt":"2026-01-15T10:00:00"}'
          '],"totalElements":3}', 200,
        );
      }
      return http.Response(
          '[{"id":1,"storeId":7,"trackingCode":"T1","shelfLocation":"A1","receivedAt":"2026-01-15T10:00:00","status":"STORED"},'
          '{"id":2,"storeId":7,"trackingCode":"T2","shelfLocation":null,"receivedAt":"2026-01-16T10:00:00","status":"STORED"}]', 200);
    });
    final user = AuthUser(id: 1, email: 'dhl-user@example.com', name: 'DHL User', role: 'STORE_MANAGER');

    await tester.pumpWidget(
      wrap(DhlDashboardScreen(storeId: 7, dhlService: DhlService(client: mockClient), user: user)),
    );
    await tester.pumpAndSettle();

    expect(find.text('Guten Tag, DHL User'), findsOneWidget);
    expect(find.text('Paketshop · Store #7'), findsOneWidget);
    // Kennzahl-Kachel "Pakete im Laden" spiegelt die Anzahl der geladenen
    // (gestubbten) Pakete.
    expect(find.text('2'), findsOneWidget);
    expect(find.text('Heute ausgegeben'), findsOneWidget);
    expect(find.text('3'), findsOneWidget);
    expect(find.text('Ausgegeben: T9'), findsOneWidget);
    expect(find.text('Eingelagert: T2'), findsOneWidget);
    expect(find.text('Kein Lagerplatz angegeben'), findsOneWidget);
    expect(find.text('FOUND: T9'), findsNothing);
  });

  testWidgets('Datenfehler wird angezeigt und erneuter Versuch laedt Kennzahlen', (tester) async {
    var fail = true;
    final mockClient = MockClient((request) async {
      if (fail) return http.Response('{"message":"Backend nicht erreichbar"}', 503);
      if (request.url.path.endsWith('/activity-log')) {
        return http.Response('{"content":[],"totalElements":0}', 200);
      }
      return http.Response('[]', 200);
    });
    await tester.pumpWidget(wrap(DhlDashboardScreen(storeId: 7, dhlService: DhlService(client: mockClient))));
    await tester.pumpAndSettle();
    expect(find.text('Einige Daten konnten nicht geladen werden.'), findsOneWidget);

    fail = false;
    await tester.tap(find.text('Erneut versuchen'));
    await tester.pumpAndSettle();
    expect(find.text('Einige Daten konnten nicht geladen werden.'), findsNothing);
    expect(find.text('Pakete im Laden'), findsOneWidget);
  });

  testWidgets('"Paket einlagern" oeffnet den bestehenden Einlagerungs-Flow', (tester) async {
    final mockClient = MockClient((request) async => http.Response('[]', 200));

    await tester.pumpWidget(
      wrap(DhlDashboardScreen(storeId: 7, dhlService: DhlService(client: mockClient))),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.text('Paket einlagern'));
    await tester.pumpAndSettle();

    expect(find.byType(DhlStoreParcelScreen), findsOneWidget);
  });

  testWidgets('"Sendung suchen" oeffnet die bestehende Pakete-im-Laden-Liste', (tester) async {
    final mockClient = MockClient((request) async => http.Response('[]', 200));

    await tester.pumpWidget(
      wrap(DhlDashboardScreen(storeId: 7, dhlService: DhlService(client: mockClient))),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.text('Sendung suchen'));
    await tester.pumpAndSettle();

    expect(find.byType(DhlHomeScreen), findsOneWidget);
  });

  testWidgets('"Paket ausgeben" oeffnet den bestehenden Abhol-Flow', (tester) async {
    final mockClient = MockClient((request) async => http.Response('[]', 200));

    await tester.pumpWidget(
      wrap(DhlDashboardScreen(storeId: 7, dhlService: DhlService(client: mockClient))),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.text('Paket ausgeben'));
    await tester.pumpAndSettle();

    expect(find.byType(DhlPickupParcelScreen), findsOneWidget);
  });

  testWidgets('Aktivitaetsprotokoll wird aus dem Dashboard geoeffnet', (tester) async {
    final mockClient = MockClient((request) async {
      if (request.url.path.endsWith('/activity-log')) {
        return http.Response('{"content":[],"totalElements":0,"totalPages":0,"number":0}', 200);
      }
      return http.Response('[]', 200);
    });
    await tester.pumpWidget(wrap(DhlDashboardScreen(storeId: 7, dhlService: DhlService(client: mockClient))));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Aktivitätsprotokoll anzeigen'));
    await tester.pumpAndSettle();
    expect(find.byType(DhlActivityLogScreen), findsOneWidget);
  });
}
