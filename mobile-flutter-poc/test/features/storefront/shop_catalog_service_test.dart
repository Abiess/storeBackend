import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:markt_ma_documents_poc/config/api_config.dart';
import 'package:markt_ma_documents_poc/features/storefront/shop_catalog_service.dart';

void main() {
  test('customer login posts store-scoped identifier and saves the returned token', () async {
    late Uri calledUri;
    late Map<String, dynamic> sentBody;
    String? savedToken;
    final service = ShopCatalogService(client: MockClient((request) async {
      calledUri = request.url;
      sentBody = jsonDecode(request.body) as Map<String, dynamic>;
      return http.Response(jsonEncode({
        'token': 'customer-jwt',
        'user': {'id': 77, 'email': null, 'name': 'Kunde'},
      }), 200);
    }));

    final response = await service.loginCustomer(
      storeId: 130,
      identifier: 'C-AB12CD34',
      password: 'secret123',
      saveToken: (token) async {
        savedToken = token;
      },
    );

    expect(calledUri.toString(), '${ApiConfig.baseUrl}/public/stores/130/customer-login');
    expect(sentBody, {'identifier': 'C-AB12CD34', 'password': 'secret123'});
    expect(savedToken, 'customer-jwt');
    expect(response.user.id, 77);
  });
}
