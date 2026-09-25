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
import 'package:markt_ma_documents_poc/features/dhl/dhl_dashboard_screen.dart';
import 'package:markt_ma_documents_poc/features/dhl/dhl_pickup_parcel_screen.dart';
import 'package:markt_ma_documents_poc/models/auth_response.dart';
import 'package:markt_ma_documents_poc/services/dhl_service.dart';
import 'package:markt_ma_documents_poc/widgets/dhl/dhl_parcel_card.dart';
import 'package:markt_ma_documents_poc/widgets/shared/markt_profile_menu.dart';

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

  testWidgets('mit storeId zeigt die geladenen Pakete', (tester) async {
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
    // Der Ladevorgang laesst sich mit einem instantan aufloesenden
    // `MockClient` nicht zuverlaessig zwischen zwei einzelnen `pump()`-
    // Aufrufen beobachten (die Future kann bereits als Microtask
    // durchlaufen sein, bevor der naechste `pump()` greift) - deshalb
    // wird hier bewusst nur der Endzustand nach `pumpAndSettle()`
    // geprueft, nicht der Zwischenzustand des Spinners.
    await tester.pumpAndSettle();

    expect(find.byType(CircularProgressIndicator), findsNothing);
    expect(find.byType(DhlParcelCard), findsNWidgets(2));
    expect(find.text('T1'), findsOneWidget);
    expect(find.text('T2'), findsOneWidget);
  });

  testWidgets(
      'MarktProfileMenu zeigt "DHL Paketshop · Store <id>" als Kontext (statt E-Mail) im Desktop-Trigger '
      'und Rolle/Kontext als eigene Zeilen im geoeffneten Popup - E-Mail bleibt dort weiterhin sichtbar',
      (tester) async {
    // Desktop-Breite (>= 1024px), damit der Trigger selbst geprueft werden
    // kann (siehe `MarktProfileMenu`-Desktop/Kompakt-Unterscheidung).
    tester.view.physicalSize = const Size(1280, 900);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final mockClient = MockClient((request) async => http.Response('[]', 200));
    final user = AuthUser(
      id: 1,
      email: 'dhl-user@example.com',
      name: 'DHL User',
      role: 'STORE_MANAGER',
      apps: [AppEntitlement(app: 'DHL', storeId: 121, enabled: true)],
    );

    await tester.pumpWidget(
      wrap(DhlHomeScreen(storeId: 121, dhlService: DhlService(client: mockClient), user: user)),
    );
    await tester.pumpAndSettle();

    // Trigger zeigt Kontext ANSTELLE der E-Mail - E-Mail erscheint hier
    // (noch) NICHT.
    expect(find.text('DHL Paketshop · Store 121'), findsOneWidget);
    expect(find.text('dhl-user@example.com'), findsNothing);

    await tester.tap(find.byType(MarktProfileMenu));
    await tester.pumpAndSettle();

    // Im geoeffneten Popup: E-Mail weiterhin in der Kopfzeile sichtbar,
    // zusaetzlich beschriftete Rolle- und Kontext-Zeilen - "Sprache" ist
    // bewusst NICHT enthalten (keine entsprechenden Daten vorhanden).
    expect(find.text('dhl-user@example.com'), findsOneWidget);
    expect(find.text('Rolle'), findsOneWidget);
    expect(find.text('STORE_MANAGER'), findsOneWidget);
    expect(find.text('Kontext'), findsOneWidget);
    // Kontext erscheint jetzt zweimal (Trigger + Popup-Zeile).
    expect(find.text('DHL Paketshop · Store 121'), findsNWidgets(2));
    expect(find.text('Sprache'), findsNothing);
  });

  testWidgets('Suche filtert Pakete clientseitig und kann geleert werden', (tester) async {
    final mockClient = MockClient((request) async {
      return http.Response(
        '[{"id":1,"storeId":7,"trackingCode":"TRACK-A1","shelfLocation":"A1","receivedAt":"2026-01-15T10:00:00","status":"STORED"},'
        '{"id":2,"storeId":7,"trackingCode":"TRACK-B2","shelfLocation":"B2","receivedAt":"2026-01-16T10:00:00","status":"STORED"}]',
        200,
      );
    });

    await tester.pumpWidget(
      wrap(DhlHomeScreen(storeId: 7, dhlService: DhlService(client: mockClient))),
    );
    await tester.pumpAndSettle();

    await tester.enterText(find.byKey(const ValueKey('dhlHome.searchField')), 'B2');
    await tester.pump();

    expect(find.text('TRACK-B2'), findsOneWidget);
    expect(find.text('TRACK-A1'), findsNothing);

    await tester.tap(find.byKey(const ValueKey('dhlHome.clearSearch')));
    await tester.pump();

    expect(find.text('TRACK-A1'), findsOneWidget);
    expect(find.text('TRACK-B2'), findsOneWidget);
  });

  testWidgets('Paket ausgeben Aktion oeffnet den bestehenden Abhol-Flow', (tester) async {
    final mockClient = MockClient((request) async => http.Response('[]', 200));

    await tester.pumpWidget(
      wrap(DhlHomeScreen(storeId: 7, dhlService: DhlService(client: mockClient))),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.byKey(const ValueKey('dhlHome.pickupAction')));
    await tester.pumpAndSettle();

    expect(find.byType(DhlPickupParcelScreen), findsOneWidget);
    expect(find.byKey(const ValueKey('dhlPickupParcel.trackingField')), findsOneWidget);
  });

  testWidgets('Uebersicht im Tablet-Drawer kehrt zum vorherigen Dashboard zurueck', (tester) async {
    tester.view.physicalSize = const Size(800, 900);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final mockClient = MockClient((request) async => http.Response('[]', 200));

    await tester.pumpWidget(
      MaterialApp(
        home: Builder(
          builder: (context) => Scaffold(
            body: Center(
              child: ElevatedButton(
                key: const ValueKey('dashboardMarker'),
                onPressed: () => Navigator.of(context).push(
                  MaterialPageRoute(
                    builder: (_) => DhlHomeScreen(
                      storeId: 7,
                      dhlService: DhlService(client: mockClient),
                    ),
                  ),
                ),
                child: const Text('Dashboard'),
              ),
            ),
          ),
        ),
      ),
    );

    await tester.tap(find.byKey(const ValueKey('dashboardMarker')));
    await tester.pumpAndSettle();
    expect(find.text('Pakete im Laden'), findsWidgets);

    await tester.tap(find.byTooltip('Menu'));
    await tester.pumpAndSettle();
    expect(find.text('Uebersicht'), findsOneWidget);

    await tester.tap(find.text('Uebersicht'));
    await tester.pumpAndSettle();

    expect(find.byKey(const ValueKey('dashboardMarker')), findsOneWidget);
    expect(find.byType(DhlHomeScreen), findsNothing);
  });

  testWidgets('Uebersicht aus einer wiederhergestellten Root-Liste oeffnet das Dashboard', (tester) async {
    tester.view.physicalSize = const Size(1280, 900);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    final mockClient = MockClient((request) async => http.Response('[]', 200));
    await tester.pumpWidget(wrap(DhlHomeScreen(storeId: 7, dhlService: DhlService(client: mockClient))));
    await tester.pumpAndSettle();

    await tester.tap(find.text('Uebersicht'));
    await tester.pumpAndSettle();

    expect(find.byType(DhlDashboardScreen), findsOneWidget);
    expect(find.byType(DhlHomeScreen), findsNothing);
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

  testWidgets('FAB "Paket einlagern" oeffnet den Einlagerungs-Screen und laedt die Liste beim Zurueckkehren neu',
      (tester) async {
    var listCalls = 0;
    final mockClient = MockClient((request) async {
      if (request.url.path.endsWith('/dhl/parcels/stored')) {
        listCalls++;
        return http.Response('[]', 200);
      }
      return http.Response('{}', 404);
    });

    await tester.pumpWidget(
      wrap(DhlHomeScreen(storeId: 7, dhlService: DhlService(client: mockClient))),
    );
    await tester.pumpAndSettle();
    expect(listCalls, 1);

    await tester.tap(find.byKey(const ValueKey('dhlHome.storeAction')));
    await tester.pumpAndSettle();

    expect(find.byKey(const ValueKey('dhlStoreParcel.trackingField')), findsOneWidget);

    await tester.tap(find.text('Zurueck'));
    await tester.pumpAndSettle();

    expect(listCalls, 2);
  });
}
