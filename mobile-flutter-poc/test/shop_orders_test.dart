import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:markt_ma_documents_poc/features/storefront/shop_orders_service.dart';
import 'package:markt_ma_documents_poc/features/storefront/shop_orders_screen.dart';

void main() {
  test('loads only the selected shop with customer authorization', () async {
    final service = ShopOrdersService(readToken: () async => 'customer',
      client: MockClient((request) async {
        expect(request.url.path.endsWith('/public/customer/orders'), isTrue);
        expect(request.url.queryParameters['storeId'], '7');
        expect(request.headers['Authorization'], 'Bearer customer');
        return http.Response('[{"orderNumber":"ORD-1","status":"PENDING_PAYMENT","totalAmount":12.5,"itemCount":2,"createdAt":"2026-10-02T12:00:00"}]', 200);
      }));
    addTearDown(service.close);
    final orders = await service.loadOrders(7);
    expect(orders.single.statusLabel, 'Zahlung ausstehend');
    expect(orders.single.totalAmount, 12.5);
  });
  test('missing login does not send a request', () async {
    final service = ShopOrdersService(readToken: () async => null,
      client: MockClient((_) async => throw StateError('Unexpected request')));
    addTearDown(service.close);
    await expectLater(service.loadOrders(7), throwsA(isA<ShopOrdersException>()));
  });
  test('malformed successful response is rejected', () async {
    final service = ShopOrdersService(readToken: () async => 'customer',
      client: MockClient((_) async => http.Response('{}', 200)));
    addTearDown(service.close);
    await expectLater(service.loadOrders(7), throwsA(isA<ShopOrdersException>()));
  });
  testWidgets('shows shop orders with status date and currency', (tester) async {
    final service = ShopOrdersService(readToken: () async => 'customer',
      client: MockClient((_) async => http.Response('[{"orderNumber":"ORD-1","status":"CONFIRMED","totalAmount":12.5,"itemCount":2,"createdAt":"2026-10-02T12:00:00"}]', 200)));
    addTearDown(service.close);
    await tester.pumpWidget(MaterialApp(home: ShopOrdersScreen(storeId: 7, currencyCode: 'MAD', service: service)));
    await tester.pumpAndSettle();
    expect(find.text('ORD-1'), findsOneWidget);
    expect(find.text('12,50 MAD'), findsOneWidget);
    expect(find.textContaining('02.10.2026 · Bestätigt'), findsOneWidget);
  });
  testWidgets('retry recovers from error into empty state', (tester) async {
    var requests = 0;
    final service = ShopOrdersService(readToken: () async => 'customer',
      client: MockClient((_) async => ++requests == 1
        ? http.Response('', 500) : http.Response('[]', 200)));
    addTearDown(service.close);
    await tester.pumpWidget(MaterialApp(home: ShopOrdersScreen(storeId: 7, currencyCode: 'MAD', service: service)));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Erneut laden'));
    await tester.pumpAndSettle();
    expect(find.text('Noch keine Bestellungen in diesem Shop.'), findsOneWidget);
  });
}
