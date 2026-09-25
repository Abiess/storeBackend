// Tests fuer `DhlService` (lib/services/dhl_service.dart).
//
// `TokenStorage` nutzt `flutter_secure_storage`, das im Test keinen echten
// Platform-Channel hat - deshalb wird der zugrunde liegende MethodChannel
// hier gemockt (identisches Muster wie in `test/core/auth_gate_test.dart`
// und `test/entrypoints/main_dhl_test.dart`). Der eigentliche HTTP-Aufruf
// wird ueber `package:http/testing.dart` MockClient simuliert - es werden
// dabei bewusst NUR die bestehenden Endpunkte
// `GET /stores/{storeId}/dhl/parcels/stored`,
// `POST /stores/{storeId}/dhl/tracking/validate` und
// `POST /stores/{storeId}/dhl/parcels/store` erwartet, kein anderer Pfad.
import 'dart:convert';

import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:markt_ma_documents_poc/config/api_config.dart';
import 'package:markt_ma_documents_poc/models/dhl_find_parcel_request.dart';
import 'package:markt_ma_documents_poc/models/dhl_pickup_parcel_request.dart';
import 'package:markt_ma_documents_poc/models/dhl_store_parcel_request.dart';
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

  test('getActivityLog liest Seiteninhalt und totalElements fuer Tageszaehler', () async {
    final client = MockClient((request) async {
      expect(request.method, 'GET');
      expect(request.url.path, '/api/stores/7/dhl/activity-log');
      expect(request.url.queryParameters['today'], 'true');
      expect(request.url.queryParameters['action'], 'PICKED_UP');
      expect(request.url.queryParameters['size'], '1');
      expect(request.headers['Authorization'], 'Bearer dummy-jwt-token');
      return http.Response(
          '{"content":[{"action":"PICKED_UP","trackingCode":"TRACK","createdAt":"2026-01-15T10:00:00"}],"totalElements":12}', 200);
    });
    final page = await DhlService(client: client)
        .getActivityLog(7, size: 1, today: true, action: 'PICKED_UP');
    expect(page.totalElements, 12);
    expect(page.content.single.action, 'PICKED_UP');
  });

  group('validateTrackingCode', () {
    test('ruft exakt POST /stores/{storeId}/dhl/tracking/validate mit dem Tracking-Code auf', () async {
      late Uri calledUri;
      late String? calledMethod;
      late Map<String, dynamic> calledBody;
      final mockClient = MockClient((request) async {
        calledUri = request.url;
        calledMethod = request.method;
        calledBody = jsonDecode(request.body) as Map<String, dynamic>;
        return http.Response('{"status":"VALID","trackingCode":"JVGL0605379700518040","pieceCode":"JVGL0605379700518040"}', 200);
      });

      final service = DhlService(client: mockClient);
      final result = await service.validateTrackingCode(7, 'JVGL0605379700518040');

      expect(calledMethod, 'POST');
      expect(calledUri.toString(), '${ApiConfig.baseUrl}/stores/7/dhl/tracking/validate');
      expect(calledBody['trackingCode'], 'JVGL0605379700518040');
      expect(result.isValid, isTrue);
      expect(result.status, 'VALID');
    });

    test('liefert status NOT_FOUND bei HTTP 200 mit status=NOT_FOUND', () async {
      final mockClient = MockClient(
        (request) async => http.Response('{"status":"NOT_FOUND","trackingCode":"X"}', 200),
      );

      final service = DhlService(client: mockClient);
      final result = await service.validateTrackingCode(7, 'X');

      expect(result.isValid, isFalse);
      expect(result.status, 'NOT_FOUND');
    });

    test('liefert status NOT_FOUND (kein ApiException) bei HTTP 422 DHL_TRACKING_NOT_FOUND', () async {
      final mockClient = MockClient(
        (request) async => http.Response(
          '{"error":"DHL shipment not found","code":"DHL_TRACKING_NOT_FOUND","message":"Keine gueltige DHL-Sendung gefunden."}',
          422,
        ),
      );

      final service = DhlService(client: mockClient);
      final result = await service.validateTrackingCode(7, 'X');

      expect(result.isValid, isFalse);
      expect(result.status, 'NOT_FOUND');
      expect(result.dhlErrorMessage, 'Keine gueltige DHL-Sendung gefunden.');
    });

    test('wirft ApiException bei echtem technischem Fehler (503 DHL_AUTHENTICATION_ERROR)', () async {
      final mockClient = MockClient(
        (request) async => http.Response(
          '{"error":"DHL tracking validation failed","errorCode":"AUTHENTICATION_ERROR","message":"DHL nicht erreichbar"}',
          503,
        ),
      );

      final service = DhlService(client: mockClient);

      expect(
        () => service.validateTrackingCode(7, 'X'),
        throwsA(isA<ApiException>().having((e) => e.statusCode, 'statusCode', 503)),
      );
    });
  });

  group('getSlots', () {
    test('laedt Slots inkl. Kapazitaet/Belegung und sortiert nach sortOrder', () async {
      late Uri calledUri;
      final mockClient = MockClient((request) async {
        calledUri = request.url;
        return http.Response(
          '[{"id":2,"code":"A2","capacity":2,"sortOrder":2,"active":true,"occupiedCount":2},'
          '{"id":1,"code":"A1","capacity":3,"sortOrder":1,"active":true,"occupiedCount":1}]',
          200,
        );
      });

      final slots = await DhlService(client: mockClient).getSlots(7);

      expect(calledUri.toString(), '${ApiConfig.baseUrl}/stores/7/dhl/slots');
      expect(slots.map((s) => s.code).toList(), ['A1', 'A2']);
      expect(slots.first.isSelectable, isTrue);
      expect(slots.last.isFull, isTrue);
    });
  });

  group('storeParcel', () {
    test('ruft exakt POST /stores/{storeId}/dhl/parcels/store mit mode=auto auf und parst das Paket', () async {
      late Uri calledUri;
      late Map<String, dynamic> calledBody;
      final mockClient = MockClient((request) async {
        calledUri = request.url;
        calledBody = jsonDecode(request.body) as Map<String, dynamic>;
        return http.Response(
          '{"id":9,"storeId":7,"trackingCode":"JVGL0605379700518040","shelfLocation":"A3","receivedAt":"2026-01-15T10:00:00","status":"STORED"}',
          200,
        );
      });

      final service = DhlService(client: mockClient);
      final parcel = await service.storeParcel(
        7,
        const DhlStoreParcelRequest(trackingCode: 'JVGL0605379700518040', mode: 'auto'),
      );

      expect(calledUri.toString(), '${ApiConfig.baseUrl}/stores/7/dhl/parcels/store');
      expect(calledBody['trackingCode'], 'JVGL0605379700518040');
      expect(calledBody['mode'], 'auto');
      expect(calledBody.containsKey('slotCode'), isFalse);
      expect(parcel.shelfLocation, 'A3');
    });

    test('sendet mode=manual und slotCode bei manueller Auswahl', () async {
      late Map<String, dynamic> calledBody;
      final mockClient = MockClient((request) async {
        calledBody = jsonDecode(request.body) as Map<String, dynamic>;
        return http.Response(
          '{"id":9,"storeId":7,"trackingCode":"X","shelfLocation":"A1","status":"STORED"}',
          200,
        );
      });

      await DhlService(client: mockClient).storeParcel(
        7,
        const DhlStoreParcelRequest(trackingCode: 'X', mode: 'manual', slotCode: 'A1'),
      );

      expect(calledBody['mode'], 'manual');
      expect(calledBody['slotCode'], 'A1');
    });

    test('wirft ApiException mit Backend-message bei 409 (bereits eingelagert)', () async {
      final mockClient = MockClient(
        (request) async => http.Response('{"code":"PARCEL_ALREADY_STORED","message":"Paket bereits eingelagert"}', 409),
      );

      final service = DhlService(client: mockClient);

      expect(
        () => service.storeParcel(7, const DhlStoreParcelRequest(trackingCode: 'X', mode: 'auto')),
        throwsA(
          isA<ApiException>()
              .having((e) => e.statusCode, 'statusCode', 409)
              .having((e) => e.message, 'message', 'Paket bereits eingelagert'),
        ),
      );
    });
  });

  group('findParcel', () {
    test('ruft exakt POST /stores/{storeId}/dhl/parcels/find mit dem Tracking-Code auf und parst das Paket',
        () async {
      late Uri calledUri;
      late String? calledMethod;
      late Map<String, dynamic> calledBody;
      final mockClient = MockClient((request) async {
        calledUri = request.url;
        calledMethod = request.method;
        calledBody = jsonDecode(request.body) as Map<String, dynamic>;
        return http.Response(
          '{"id":9,"storeId":7,"trackingCode":"JVGL0605379700518040","shelfLocation":"A3","receivedAt":"2026-01-15T10:00:00","status":"STORED"}',
          200,
        );
      });

      final service = DhlService(client: mockClient);
      final parcel = await service.findParcel(
        7,
        const DhlFindParcelRequest(trackingCode: 'JVGL0605379700518040'),
      );

      expect(calledMethod, 'POST');
      expect(calledUri.toString(), '${ApiConfig.baseUrl}/stores/7/dhl/parcels/find');
      expect(calledBody['trackingCode'], 'JVGL0605379700518040');
      expect(parcel.shelfLocation, 'A3');
      expect(parcel.status, 'STORED');
    });

    test('wirft ApiException mit code PARCEL_NOT_FOUND bei 404', () async {
      final mockClient = MockClient(
        (request) async => http.Response('{"code":"PARCEL_NOT_FOUND","message":"Kein Paket gefunden"}', 404),
      );

      final service = DhlService(client: mockClient);

      expect(
        () => service.findParcel(7, const DhlFindParcelRequest(trackingCode: 'X')),
        throwsA(
          isA<ApiException>()
              .having((e) => e.statusCode, 'statusCode', 404)
              .having((e) => e.message, 'message', 'Kein Paket gefunden')
              .having((e) => e.code, 'code', 'PARCEL_NOT_FOUND'),
        ),
      );
    });
  });

  group('pickupParcel', () {
    test('ruft exakt POST /stores/{storeId}/dhl/parcels/pickup mit dem Tracking-Code auf und parst das Paket',
        () async {
      late Uri calledUri;
      late Map<String, dynamic> calledBody;
      final mockClient = MockClient((request) async {
        calledUri = request.url;
        calledBody = jsonDecode(request.body) as Map<String, dynamic>;
        return http.Response(
          '{"id":9,"storeId":7,"trackingCode":"JVGL0605379700518040","shelfLocation":"A3","receivedAt":"2026-01-15T10:00:00","status":"PICKED_UP"}',
          200,
        );
      });

      final service = DhlService(client: mockClient);
      final parcel = await service.pickupParcel(
        7,
        const DhlPickupParcelRequest(trackingCode: 'JVGL0605379700518040'),
      );

      expect(calledUri.toString(), '${ApiConfig.baseUrl}/stores/7/dhl/parcels/pickup');
      expect(calledBody['trackingCode'], 'JVGL0605379700518040');
      expect(parcel.status, 'PICKED_UP');
    });

    test('wirft ApiException mit code PARCEL_ALREADY_PICKED_UP bei 409', () async {
      final mockClient = MockClient(
        (request) async =>
            http.Response('{"code":"PARCEL_ALREADY_PICKED_UP","message":"Bereits abgeholt"}', 409),
      );

      final service = DhlService(client: mockClient);

      expect(
        () => service.pickupParcel(7, const DhlPickupParcelRequest(trackingCode: 'X')),
        throwsA(
          isA<ApiException>()
              .having((e) => e.statusCode, 'statusCode', 409)
              .having((e) => e.code, 'code', 'PARCEL_ALREADY_PICKED_UP'),
        ),
      );
    });

    test('wirft ApiException bei 422 wenn DHL die Sendung nicht mehr bestaetigt', () async {
      final mockClient = MockClient(
        (request) async => http.Response(
          '{"code":"DHL_TRACKING_NOT_FOUND","message":"DHL bestaetigt die Sendung nicht mehr"}',
          422,
        ),
      );

      final service = DhlService(client: mockClient);

      expect(
        () => service.pickupParcel(7, const DhlPickupParcelRequest(trackingCode: 'X')),
        throwsA(
          isA<ApiException>()
              .having((e) => e.statusCode, 'statusCode', 422)
              .having((e) => e.code, 'code', 'DHL_TRACKING_NOT_FOUND'),
        ),
      );
    });
  });
}
