// Widget-Tests fuer `DhlPickupParcelScreen`
// (lib/features/dhl/dhl_pickup_parcel_screen.dart) - Abhol-Flow
// "Paket ausgeben" ueber die bestehenden Endpunkte `/parcels/find` und
// `/parcels/pickup` (siehe Klassendoku dort).
//
// WICHTIG: dieser Flow ruft bewusst NIEMALS `/tracking/validate` (echte
// DHL-API) auf - die Suche laeuft IMMER zuerst (automatisch per Debounce
// UND bei manueller Eingabe/Button) gegen unsere eigene Datenbank
// (`/parcels/find`), die Abholung selbst ist ein rein lokales, atomares
// Status-Update (`/parcels/pickup`). Mehrere Tests verifizieren explizit,
// dass `/tracking/validate` waehrend des gesamten Flows nie kontaktiert wird.
//
// `TokenStorage` wird ueber den Secure-Storage-MethodChannel gemockt
// (identisches Muster wie in `test/features/dhl/dhl_store_parcel_screen_test.dart`),
// der eigentliche HTTP-Aufruf ueber einen in `DhlService` injizierten
// `MockClient` - es wird NIE ein echter Netzwerk-Request ausgefuehrt und
// NIE die externe DHL-API direkt kontaktiert.
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:markt_ma_documents_poc/features/dhl/dhl_pickup_parcel_screen.dart';
import 'package:markt_ma_documents_poc/services/dhl_scan_feedback_service.dart';
import 'package:markt_ma_documents_poc/services/dhl_service.dart';

class _FakeScanFeedback implements DhlScanFeedback {
  _FakeScanFeedback({this.initialEnabled = true});

  final bool initialEnabled;
  final List<bool> savedValues = [];
  final List<DhlScanFeedbackState> playedStates = [];

  @override
  Future<bool> loadEnabled() async => initialEnabled;

  @override
  Future<void> setEnabled(bool enabled) async {
    savedValues.add(enabled);
  }

  @override
  Future<void> playForState(DhlScanFeedbackState state) async {
    playedStates.add(state);
  }
}

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

  const trackingField = ValueKey('dhlPickupParcel.trackingField');
  const searchButton = ValueKey('dhlPickupParcel.searchButton');
  const confirmButton = ValueKey('dhlPickupParcel.confirmButton');
  const nextButton = ValueKey('dhlPickupParcel.nextButton');
  const backButton = ValueKey('dhlPickupParcel.backButton');
  const searchAgainButton = ValueKey('dhlPickupParcel.searchAgainButton');
  const scannerModeButton = ValueKey('dhlPickupParcel.trackingModeScanner');
  const manualModeButton = ValueKey('dhlPickupParcel.trackingModeManual');
  const scanSoundsToggle = ValueKey('dhlPickupParcel.scanSoundsToggle');
  const cameraButton = ValueKey('dhlPickupParcel.cameraButton');

  const storedParcelResponse = '{"id":9,"storeId":7,"trackingCode":"JVGL0605379700518040","shelfLocation":"A3",'
      '"receivedAt":"2026-01-15T10:00:00","status":"STORED"}';
  const alreadyPickedUpParcelResponse =
      '{"id":9,"storeId":7,"trackingCode":"JVGL0605379700518040","shelfLocation":"A3",'
      '"receivedAt":"2026-01-15T10:00:00","status":"PICKED_UP"}';
  const pickedUpResponse = '{"id":9,"storeId":7,"trackingCode":"JVGL0605379700518040","shelfLocation":"A3",'
      '"receivedAt":"2026-01-15T10:00:00","status":"PICKED_UP"}';

  Future<void> enterAndDebounce(WidgetTester tester, String code) async {
    await tester.enterText(find.byKey(trackingField), code);
    await tester.pump(const Duration(milliseconds: 500));
    await tester.pump();
  }

  testWidgets('Scan-Toene Einstellung wird geladen und kann umgeschaltet werden', (tester) async {
    final feedback = _FakeScanFeedback(initialEnabled: false);
    final mockClient = MockClient((request) async => http.Response(storedParcelResponse, 200));

    await tester.pumpWidget(
      wrap(
        DhlPickupParcelScreen(
          storeId: 7,
          dhlService: DhlService(client: mockClient),
          scanFeedback: feedback,
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.byKey(scanSoundsToggle), findsOneWidget);
    expect(find.text('Toene: Aus'), findsOneWidget);

    await tester.tap(find.byKey(scanSoundsToggle));
    await tester.pump();

    expect(find.text('Toene: An'), findsOneWidget);
    expect(feedback.savedValues, [true]);
  });

  testWidgets('DB-Suchergebnis spielt passendes Feedback ohne DHL-Validierungsaufruf', (tester) async {
    final feedback = _FakeScanFeedback(initialEnabled: true);
    var validateCalls = 0;
    final mockClient = MockClient((request) async {
      if (request.url.path.endsWith('/tracking/validate')) validateCalls++;
      if (request.url.path.endsWith('/parcels/find')) {
        return http.Response(storedParcelResponse, 200);
      }
      return http.Response('{}', 404);
    });

    await tester.pumpWidget(
      wrap(
        DhlPickupParcelScreen(
          storeId: 7,
          dhlService: DhlService(client: mockClient),
          scanFeedback: feedback,
        ),
      ),
    );
    await tester.pumpAndSettle();
    await enterAndDebounce(tester, 'JVGL0605379700518040');
    await tester.pumpAndSettle();

    expect(validateCalls, 0);
    expect(feedback.playedStates, [DhlScanFeedbackState.valid]);
  });

  testWidgets('nicht gefundenes Paket spielt Fehler-Feedback', (tester) async {
    final feedback = _FakeScanFeedback(initialEnabled: true);
    final mockClient = MockClient((request) async {
      if (request.url.path.endsWith('/parcels/find')) {
        return http.Response('{"code":"PARCEL_NOT_FOUND","message":"Kein Paket gefunden"}', 404);
      }
      return http.Response('{}', 404);
    });

    await tester.pumpWidget(
      wrap(
        DhlPickupParcelScreen(
          storeId: 7,
          dhlService: DhlService(client: mockClient),
          scanFeedback: feedback,
        ),
      ),
    );
    await tester.pumpAndSettle();
    await enterAndDebounce(tester, 'JVGL0605379700518040');
    await tester.pumpAndSettle();

    expect(feedback.playedStates, [DhlScanFeedbackState.invalid]);
  });

  testWidgets('zu kurzer Code loest keine Suche aus und Suchen bleibt disabled', (tester) async {
    var findCalls = 0;
    final mockClient = MockClient((request) async {
      if (request.url.path.endsWith('/parcels/find')) findCalls++;
      return http.Response(storedParcelResponse, 200);
    });

    await tester.pumpWidget(wrap(DhlPickupParcelScreen(storeId: 7, dhlService: DhlService(client: mockClient))));
    await enterAndDebounce(tester, 'ABC123');

    expect(findCalls, 0);
    final button = tester.widget<FilledButton>(find.byKey(searchButton));
    expect(button.onPressed, isNull);
  });

  testWidgets('Tracking-Modus wechselt zwischen Scanner und Manuell ohne Code zu verlieren', (tester) async {
    final mockClient = MockClient((request) async => http.Response(storedParcelResponse, 200));

    await tester.pumpWidget(wrap(DhlPickupParcelScreen(storeId: 7, dhlService: DhlService(client: mockClient))));
    expect(find.byKey(scannerModeButton), findsOneWidget);
    expect(
      find.text('Hardware-/Bluetooth-Scanner bereit. Die Suche erfolgt nur in unserer Datenbank.'),
      findsOneWidget,
    );

    await tester.enterText(find.byKey(trackingField), 'JVGL0605379700518040');
    await tester.tap(find.byKey(manualModeButton));
    await tester.pump();

    final field = tester.widget<TextField>(find.byKey(trackingField));
    expect(field.controller?.text, 'JVGL0605379700518040');
    expect(
      find.text('Trackingnummer manuell eingeben. Die Suche erfolgt nur in unserer Datenbank.'),
      findsOneWidget,
    );

    await tester.tap(find.byKey(scannerModeButton));
    await tester.pump();
    expect(
      find.text('Hardware-/Bluetooth-Scanner bereit. Die Suche erfolgt nur in unserer Datenbank.'),
      findsOneWidget,
    );
  });

  testWidgets('Kamera-Scan schreibt Trackingcode und sucht weiterhin nur in der DB', (tester) async {
    var findCalls = 0;
    var validateCalls = 0;
    final mockClient = MockClient((request) async {
      if (request.url.path.endsWith('/tracking/validate')) validateCalls++;
      if (request.url.path.endsWith('/parcels/find')) {
        findCalls++;
        return http.Response(storedParcelResponse, 200);
      }
      return http.Response('{}', 404);
    });

    await tester.pumpWidget(
      wrap(
        DhlPickupParcelScreen(
          storeId: 7,
          dhlService: DhlService(client: mockClient),
          cameraScanner: (_) async => 'JVGL0605379700518040',
        ),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.byKey(cameraButton));
    await tester.pump(const Duration(milliseconds: 500));
    await tester.pumpAndSettle();

    final field = tester.widget<TextField>(find.byKey(trackingField));
    expect(field.controller?.text, 'JVGL0605379700518040');
    expect(findCalls, 1);
    expect(validateCalls, 0);
    expect(find.text('Bereit zur Abholung.'), findsOneWidget);
  });

  testWidgets('ausreichend langer Code loest automatisch (debounced) die DB-Suche aus - NIE /tracking/validate',
      (tester) async {
    var findCalls = 0;
    var validateCalls = 0;
    final mockClient = MockClient((request) async {
      if (request.url.path.endsWith('/tracking/validate')) validateCalls++;
      if (request.url.path.endsWith('/parcels/find')) {
        findCalls++;
        return http.Response(storedParcelResponse, 200);
      }
      return http.Response('{}', 404);
    });

    await tester.pumpWidget(wrap(DhlPickupParcelScreen(storeId: 7, dhlService: DhlService(client: mockClient))));
    await enterAndDebounce(tester, 'JVGL0605379700518040');
    await tester.pumpAndSettle();

    expect(validateCalls, 0);
    expect(findCalls, 1);
    expect(find.text('Lagerplatz: A3'), findsOneWidget);
    expect(find.text('Bereit zur Abholung.'), findsOneWidget);
    final button = tester.widget<FilledButton>(find.byKey(confirmButton));
    expect(button.onPressed, isNotNull);
  });

  testWidgets('manuelle Eingabe ueber den Suchen-Button ruft ebenfalls direkt /parcels/find auf (kein Validate davor)',
      (tester) async {
    var findCalls = 0;
    var validateCalls = 0;
    final mockClient = MockClient((request) async {
      if (request.url.path.endsWith('/tracking/validate')) validateCalls++;
      if (request.url.path.endsWith('/parcels/find')) {
        findCalls++;
        return http.Response(storedParcelResponse, 200);
      }
      return http.Response('{}', 404);
    });

    await tester.pumpWidget(wrap(DhlPickupParcelScreen(storeId: 7, dhlService: DhlService(client: mockClient))));
    // Sofort nach Erreichen der Mindestlaenge tippen, VOR Ablauf des Debounce,
    // und den Button manuell antippen - simuliert eine schnelle manuelle
    // Eingabe/Bestaetigung statt der automatischen Debounce-Suche.
    await tester.enterText(find.byKey(trackingField), 'JVGL0605379700518040');
    await tester.pump();
    await tester.ensureVisible(find.byKey(searchButton));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(searchButton));
    await tester.pumpAndSettle();

    expect(validateCalls, 0);
    expect(findCalls, 1);
    expect(find.text('Bereit zur Abholung.'), findsOneWidget);
  });

  testWidgets('gefundenes, bereits abgeholtes Paket zeigt nur einen Hinweis (kein Bestaetigen moeglich)',
      (tester) async {
    final mockClient = MockClient((request) async {
      if (request.url.path.endsWith('/parcels/find')) {
        return http.Response(alreadyPickedUpParcelResponse, 200);
      }
      return http.Response('{}', 404);
    });

    await tester.pumpWidget(wrap(DhlPickupParcelScreen(storeId: 7, dhlService: DhlService(client: mockClient))));
    await enterAndDebounce(tester, 'JVGL0605379700518040');
    await tester.pumpAndSettle();

    expect(find.text('Dieses Paket wurde bereits abgeholt.'), findsOneWidget);
    final button = tester.widget<FilledButton>(find.byKey(confirmButton));
    expect(button.onPressed, isNull);
  });

  testWidgets('Notiz und Abholzeit aus der DB erscheinen beim gefundenen Paket', (tester) async {
    final mockClient = MockClient((request) async {
      expect(request.url.path.endsWith('/parcels/find'), isTrue);
      return http.Response(
        '{"id":9,"storeId":7,"trackingCode":"JVGL0605379700518040",'
        '"shelfLocation":"A3","status":"PICKED_UP",'
        '"notes":" Empfaenger ruft vorher an ","pickedUpAt":"2026-09-25T08:14:00"}',
        200,
      );
    });

    await tester.pumpWidget(wrap(DhlPickupParcelScreen(storeId: 7, dhlService: DhlService(client: mockClient))));
    await enterAndDebounce(tester, 'JVGL0605379700518040');
    await tester.pumpAndSettle();

    expect(find.text('Notiz: Empfaenger ruft vorher an'), findsOneWidget);
    expect(find.text('Abgeholt am: 2026-09-25 08:14'), findsOneWidget);
    expect(tester.widget<FilledButton>(find.byKey(confirmButton)).onPressed, isNull);
  });

  testWidgets('404 bei der Suche zeigt einen Fehlerhinweis (kein DHL-Aufruf)', (tester) async {
    var validateCalls = 0;
    final mockClient = MockClient((request) async {
      if (request.url.path.endsWith('/tracking/validate')) validateCalls++;
      if (request.url.path.endsWith('/parcels/find')) {
        return http.Response('{"code":"PARCEL_NOT_FOUND","message":"Kein Paket gefunden"}', 404);
      }
      return http.Response('{}', 404);
    });

    await tester.pumpWidget(wrap(DhlPickupParcelScreen(storeId: 7, dhlService: DhlService(client: mockClient))));
    await enterAndDebounce(tester, 'JVGL0605379700518040');
    await tester.pumpAndSettle();

    expect(validateCalls, 0);
    expect(find.text('Kein eingelagertes Paket mit dieser Trackingnummer gefunden.'), findsOneWidget);
  });

  testWidgets('erfolgreiche Abholung zeigt die Bestaetigung und verhindert Doppel-Submit (kein DHL-Aufruf)',
      (tester) async {
    var pickupCalls = 0;
    var validateCalls = 0;
    final mockClient = MockClient((request) async {
      if (request.url.path.endsWith('/tracking/validate')) validateCalls++;
      if (request.url.path.endsWith('/parcels/find')) {
        return http.Response(storedParcelResponse, 200);
      }
      if (request.url.path.endsWith('/parcels/pickup')) {
        pickupCalls++;
        await Future<void>.delayed(const Duration(milliseconds: 50));
        return http.Response(pickedUpResponse, 200);
      }
      return http.Response('{}', 404);
    });

    await tester.pumpWidget(wrap(DhlPickupParcelScreen(storeId: 7, dhlService: DhlService(client: mockClient))));
    await enterAndDebounce(tester, 'JVGL0605379700518040');
    await tester.pumpAndSettle();

    await tester.ensureVisible(find.byKey(confirmButton));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(confirmButton));
    await tester.pump(); // Frame direkt nach dem Tap: Button ist jetzt disabled/Ladezustand
    await tester.tap(find.byKey(confirmButton)); // Doppel-Tap waehrend Confirm laeuft - darf nichts ausloesen
    await tester.pumpAndSettle();

    expect(pickupCalls, 1);
    expect(validateCalls, 0);
    expect(find.text('Paket ausgegeben'), findsOneWidget);
    expect(find.text('JVGL0605379700518040'), findsOneWidget);
  });

  testWidgets('409 bei der Abholung (zwischenzeitlich abgeholt) zeigt einen Fehlerhinweis', (tester) async {
    final mockClient = MockClient((request) async {
      if (request.url.path.endsWith('/parcels/find')) {
        return http.Response(storedParcelResponse, 200);
      }
      if (request.url.path.endsWith('/parcels/pickup')) {
        return http.Response('{"code":"PARCEL_ALREADY_PICKED_UP","message":"Bereits abgeholt"}', 409);
      }
      return http.Response('{}', 404);
    });

    await tester.pumpWidget(wrap(DhlPickupParcelScreen(storeId: 7, dhlService: DhlService(client: mockClient))));
    await enterAndDebounce(tester, 'JVGL0605379700518040');
    await tester.pumpAndSettle();

    await tester.ensureVisible(find.byKey(confirmButton));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(confirmButton));
    await tester.pumpAndSettle();

    expect(find.text('Dieses Paket wurde bereits abgeholt.'), findsWidgets);
    expect(find.text('Paket ausgegeben'), findsNothing);
  });

  testWidgets('Andere Trackingnummer setzt den Suchzustand zurueck', (tester) async {
    final mockClient = MockClient((request) async => http.Response(storedParcelResponse, 200));

    await tester.pumpWidget(wrap(DhlPickupParcelScreen(storeId: 7, dhlService: DhlService(client: mockClient))));
    await enterAndDebounce(tester, 'JVGL0605379700518040');
    await tester.pumpAndSettle();

    expect(find.byKey(searchAgainButton), findsOneWidget);
    await tester.ensureVisible(find.byKey(searchAgainButton));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(searchAgainButton));
    await tester.pump();

    final textField = tester.widget<TextField>(find.byKey(trackingField));
    expect(textField.controller?.text, isEmpty);
    expect(find.byKey(searchButton), findsOneWidget);
  });

  testWidgets('Naechste Abholung setzt den Zustand vollstaendig zurueck', (tester) async {
    final mockClient = MockClient((request) async {
      if (request.url.path.endsWith('/parcels/find')) {
        return http.Response(storedParcelResponse, 200);
      }
      return http.Response(pickedUpResponse, 200);
    });

    await tester.pumpWidget(wrap(DhlPickupParcelScreen(storeId: 7, dhlService: DhlService(client: mockClient))));
    await enterAndDebounce(tester, 'JVGL0605379700518040');
    await tester.pumpAndSettle();
    await tester.ensureVisible(find.byKey(confirmButton));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(confirmButton));
    await tester.pumpAndSettle();

    expect(find.text('Paket ausgegeben'), findsOneWidget);

    await tester.ensureVisible(find.byKey(nextButton));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(nextButton));
    await tester.pump();

    expect(find.text('Paket ausgegeben'), findsNothing);
    final textField = tester.widget<TextField>(find.byKey(trackingField));
    expect(textField.controller?.text, isEmpty);
    final button = tester.widget<FilledButton>(find.byKey(searchButton));
    expect(button.onPressed, isNull); // zurueck auf leeres Feld - fail closed
    expect(
      find.text('Hardware-/Bluetooth-Scanner bereit. Die Suche erfolgt nur in unserer Datenbank.'),
      findsOneWidget,
    );
  });

  testWidgets('Zur Uebersicht schliesst den Screen (Navigator.pop)', (tester) async {
    final mockClient = MockClient((request) async {
      if (request.url.path.endsWith('/parcels/find')) {
        return http.Response(storedParcelResponse, 200);
      }
      return http.Response(pickedUpResponse, 200);
    });

    await tester.pumpWidget(
      MaterialApp(
        home: Builder(
          builder: (context) => Scaffold(
            body: Center(
              child: ElevatedButton(
                onPressed: () => Navigator.of(context).push(
                  MaterialPageRoute(
                    builder: (_) => DhlPickupParcelScreen(storeId: 7, dhlService: DhlService(client: mockClient)),
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
    await tester.pumpAndSettle();
    await tester.ensureVisible(find.byKey(confirmButton));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(confirmButton));
    await tester.pumpAndSettle();

    await tester.ensureVisible(find.byKey(backButton));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(backButton));
    await tester.pumpAndSettle();

    expect(find.text('open'), findsOneWidget);
    expect(find.text('Paket ausgegeben'), findsNothing);
  });
}
