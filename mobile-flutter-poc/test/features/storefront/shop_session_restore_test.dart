import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:markt_ma_documents_poc/features/storefront/shop_catalog_service.dart';
import 'package:markt_ma_documents_poc/features/storefront/shop_preview_screen.dart';
import 'package:markt_ma_documents_poc/features/storefront/shop_session_manager.dart';

String _token() => 'header.${base64Url.encode(utf8.encode(jsonEncode({
  'exp': DateTime.now().millisecondsSinceEpoch ~/ 1000 + 900,
})))}.signature';

void main() {
  for (final failFirst in [false, true]) {
    testWidgets(failFirst ? 'offline restoration offers retry without login or clearing session'
        : 'saved session skips login and restores cart on startup', (tester) async {
      String? stored = jsonEncode({'storeId': 7, 'token': 'old', 'refreshToken': 'secret'});
      var refreshCalls = 0;
      final manager = ShopSessionManager(read: () async => stored,
        write: (value) async { stored = value; }, delete: () async { stored = null; },
        client: MockClient((_) async {
          refreshCalls++;
          if (failFirst && refreshCalls == 1) return http.Response('', 503);
          return http.Response(jsonEncode({'token': _token(), 'refreshToken': 'secret'}), 200);
        }));
      final catalog = ShopCatalogService(sessionManager: manager,
        client: MockClient((request) async {
          if (request.url.path.endsWith('/cart')) {
            expect(request.headers['Authorization'], startsWith('Bearer '));
            return http.Response('{"items":[],"itemCount":0,"subtotal":0}', 200);
          }
          if (request.url.path.endsWith('/products') || request.url.path.endsWith('/categories')) {
            return http.Response('[]', 200);
          }
          return http.Response('{"storeId":7,"name":"Testshop","slug":"test","customerAccountMode":"INVITE_ONLY"}', 200);
        }));
      addTearDown(manager.close);
      addTearDown(catalog.close);
      await tester.pumpWidget(MaterialApp(home: ShopPreviewScreen(catalogService: catalog)));
      await tester.pumpAndSettle();
      if (failFirst) {
        expect(stored, isNotNull);
        expect(find.byKey(const ValueKey('shop-login-submit')), findsNothing);
        await tester.tap(find.text('Erneut laden'));
        await tester.pumpAndSettle();
      }
      expect(find.byKey(const ValueKey('nav-Mehr')), findsOneWidget);
      expect(find.byKey(const ValueKey('shop-login-submit')), findsNothing);
      expect(stored, isNotNull);
    });
  }
}
