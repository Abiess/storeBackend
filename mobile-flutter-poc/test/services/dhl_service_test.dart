// Tests fuer `DhlService` (lib/services/dhl_service.dart).
//
// `TokenStorage` nutzt `flutter_secure_storage`, das im Test keinen echten
// Platform-Channel hat - deshalb wird der zugrunde liegende MethodChannel
// hier gemockt (identisches Muster wie in `test/core/auth_gate_test.dart`
// und `test/entrypoints/main_dhl_test.dart`). Der eigentliche HTTP-Aufruf
// wird ueber `package:http/testing.dart` MockClient simuliert - es wird
// dabei bewusst NUR der bestehende, lesende Endpoint
// `GET /stores/{storeId}/dhl/parcels/stored` erwartet, kein anderer Pfad.
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:markt_ma_documents_poc/config/api_config.dart';
import 'package:markt_ma_documents_poc/services/dhl_service.dart';
import 'package:markt_ma_documents_poc/services/token_storage.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

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

  test('listStoredParcels ruft exakt GET /stores/{storeId}/dhl/parcels/stored auf und parst die Liste', () async {
    late Uri calledUri;
    late String? calledMethod;
    final mockClient = MockClient((request) async {
      calledUri = request.url;
      calledMethod = request.method;
      return http.Response(
        '[{"id":1,"storeId":7,"trackingCode":"T1","shelfLocation":"A1","receivedAt":"2026-01-15T10:00:00","status":"STORED"}]',
        200,
      );
    });

    final service = DhlService(client: mockClient);
    final parcels = await service.listStoredParcels(7);

    expect(calledMethod, 'GET');
    expect(calledUri.toString(), '${ApiConfig.baseUrl}/stores/7/dhl/parcels/stored');
    expect(parcels, hasLength(1));
    expect(parcels.first.trackingCode, 'T1');
    expect(parcels.first.shelfLocation, 'A1');
  });

  test('listStoredParcels liefert eine leere Liste bei leerem JSON-Array', () async {
    final mockClient = MockClient((request) async => http.Response('[]', 200));

    final service = DhlService(client: mockClient);
    final parcels = await service.listStoredParcels(7);

    expect(parcels, isEmpty);
  });

  test('listStoredParcels wirft eine ApiException bei Fehlerstatus mit Backend-message', () async {
    final mockClient = MockClient(
      (request) async => http.Response('{"message":"Kein Zugriff auf diesen Store"}', 403),
    );

    final service = DhlService(client: mockClient);

    expect(
      () => service.listStoredParcels(7),
      throwsA(
        isA<ApiException>()
            .having((e) => e.statusCode, 'statusCode', 403)
            .having((e) => e.message, 'message', 'Kein Zugriff auf diesen Store'),
      ),
    );
  });

  test('listStoredParcels sendet Authorization-Header wenn ein Token vorhanden ist', () async {
    late Map<String, String> calledHeaders;
    final mockClient = MockClient((request) async {
      calledHeaders = request.headers;
      return http.Response('[]', 200);
    });

    final service = DhlService(client: mockClient);
    await service.listStoredParcels(7);

    expect(calledHeaders.containsKey('Authorization'), isTrue);
  });
}
