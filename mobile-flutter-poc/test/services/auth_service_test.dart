// Tests fuer `AuthService.getCurrentUser` (lib/services/auth_service.dart).
//
// Deckt direkt (ohne Umweg ueber `AuthGate`) ab, dass `GET /auth/me` den
// erwarteten Bearer-Token-Header sendet, `AuthUser` inkl. `apps[]`
// korrekt parst und bei Fehlerstatus eine `ApiException` mit der
// Backend-`message` wirft (siehe Auth-Persistenz-Korrektur vom 23.09.).
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:markt_ma_documents_poc/config/api_config.dart';
import 'package:markt_ma_documents_poc/services/auth_service.dart';
import 'package:markt_ma_documents_poc/services/token_storage.dart';

void main() {
  test('getCurrentUser ruft exakt GET /auth/me mit Bearer-Token-Header auf und parst apps[]', () async {
    late Uri calledUri;
    late String? calledMethod;
    late Map<String, String> calledHeaders;
    final mockClient = MockClient((request) async {
      calledUri = request.url;
      calledMethod = request.method;
      calledHeaders = request.headers;
      return http.Response(
        '{"id":1,"email":"dhl-user@example.com","roles":["USER"],'
        '"appAccessMode":"MANAGED",'
        '"apps":[{"app":"DHL","storeId":7,"enabled":true}]}',
        200,
      );
    });

    final service = AuthService(client: mockClient);
    final user = await service.getCurrentUser('dummy-jwt-token');

    expect(calledMethod, 'GET');
    expect(calledUri.toString(), '${ApiConfig.baseUrl}${ApiConfig.mePath}');
    expect(calledHeaders['Authorization'], 'Bearer dummy-jwt-token');
    expect(user.id, 1);
    expect(user.storeIdForApp('DHL'), 7);
  });

  test('getCurrentUser wirft ApiException(401) bei ungueltigem Token', () async {
    final mockClient = MockClient(
      (request) async => http.Response('{"message":"Ungueltiges Token"}', 401),
    );

    final service = AuthService(client: mockClient);

    expect(
      () => service.getCurrentUser('expired-token'),
      throwsA(isA<ApiException>().having((e) => e.statusCode, 'statusCode', 401)),
    );
  });

  test('getCurrentUser wirft ApiException bei Serverfehler (kein stiller Erfolg)', () async {
    final mockClient = MockClient(
      (request) async => http.Response('{"message":"Interner Fehler"}', 500),
    );

    final service = AuthService(client: mockClient);

    expect(
      () => service.getCurrentUser('dummy-jwt-token'),
      throwsA(isA<ApiException>().having((e) => e.statusCode, 'statusCode', 500)),
    );
  });
}
