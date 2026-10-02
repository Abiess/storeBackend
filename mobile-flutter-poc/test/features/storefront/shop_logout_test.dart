import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:markt_ma_documents_poc/features/storefront/shop_catalog_service.dart';
import 'package:markt_ma_documents_poc/features/storefront/shop_preview_screen.dart';

class _CustomerService extends ShopCatalogService {
  _CustomerService() : super(clearToken: () async {});
  int logoutCalls = 0;
  int cartCalls = 0;
  bool failLogout = false;
  Completer<void>? pendingLogout;
  Completer<ShopCart>? oldCart;
  @override
  Future<ShopStore> loadStoreMetadata(String slug) async => const ShopStore(
    id: 7, name: 'Testshop', slug: 'test', customerAccountMode: 'INVITE_ONLY');
  @override
  Future<ShopCatalog> loadCatalog(ShopStore store) async => ShopCatalog(
    store: store, categories: const [], products: const []);
  @override
  Future<ShopCart> loadCart(int storeId) async {
    cartCalls++;
    if (cartCalls == 2 && oldCart != null) return oldCart!.future;
    return const ShopCart(items: [
      ShopCartItem(id: 1, name: 'Aktueller Warenkorb', quantity: 1),
    ], itemCount: 1, subtotal: 10);
  }
  @override
  Future<void> logoutCustomer() async {
    logoutCalls++;
    if (failLogout) throw StateError('Storage unavailable');
    if (pendingLogout != null) await pendingLogout!.future;
  }
}

Future<void> _login(WidgetTester tester) async {
  await tester.enterText(find.byKey(const ValueKey('shop-login-identifier')), 'customer');
  await tester.enterText(find.byKey(const ValueKey('shop-login-password')), 'secret');
  await tester.tap(find.byKey(const ValueKey('shop-login-submit')));
  await tester.pumpAndSettle();
}
Future<void> _openLogout(WidgetTester tester) async {
  await tester.tap(find.byKey(const ValueKey('nav-Mehr')));
  await tester.pumpAndSettle();
  await tester.tap(find.byKey(const ValueKey('shop-logout')));
  await tester.pumpAndSettle();
}
Future<void> _start(WidgetTester tester, _CustomerService service) async {
  addTearDown(service.close);
  await tester.pumpWidget(MaterialApp(home: ShopPreviewScreen(
    catalogService: service, customerLogin: (_, __, ___) async {})));
  await tester.pumpAndSettle();
  await _login(tester);
}

void main() {
  test('logout clears the configured token storage', () async {
    var clears = 0;
    final service = ShopCatalogService(clearToken: () async { clears++; });
    addTearDown(service.close);
    await service.logoutCustomer();
    expect(clears, 1);
  });
  testWidgets('cancel keeps session; confirmed logout returns to blank login', (tester) async {
    final service = _CustomerService();
    await _start(tester, service);
    await _openLogout(tester);
    await tester.tap(find.text('Abbrechen'));
    await tester.pumpAndSettle();
    expect(service.logoutCalls, 0);
    expect(find.byKey(const ValueKey('shop-logout')), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey('shop-logout')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const ValueKey('shop-confirm-logout')));
    await tester.pumpAndSettle();
    expect(service.logoutCalls, 1);
    expect(find.byKey(const ValueKey('nav-Mehr')), findsNothing);
    final identifier = tester.widget<TextField>(find.byKey(const ValueKey('shop-login-identifier')));
    final password = tester.widget<TextField>(find.byKey(const ValueKey('shop-login-password')));
    expect(identifier.controller!.text, isEmpty);
    expect(password.controller!.text, isEmpty);
  });
  testWidgets('storage error allows logout retry without claiming success', (tester) async {
    final service = _CustomerService()..failLogout = true;
    await _start(tester, service);
    await _openLogout(tester);
    await tester.tap(find.byKey(const ValueKey('shop-confirm-logout')));
    await tester.pumpAndSettle();
    expect(find.text('Abmelden fehlgeschlagen. Bitte erneut versuchen.'), findsOneWidget);
    expect(find.byKey(const ValueKey('shop-logout')), findsOneWidget);
    service.failLogout = false;
    await tester.tap(find.byKey(const ValueKey('shop-logout')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const ValueKey('shop-confirm-logout')));
    await tester.pumpAndSettle();
    expect(find.byKey(const ValueKey('shop-login-submit')), findsOneWidget);
  });
  testWidgets('logout hides customer UI while storage is being cleared', (tester) async {
    final service = _CustomerService()..pendingLogout = Completer<void>();
    await _start(tester, service);
    await _openLogout(tester);
    await tester.tap(find.byKey(const ValueKey('shop-confirm-logout')));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));
    expect(find.byKey(const ValueKey('shop-logging-out')), findsOneWidget);
    expect(find.byKey(const ValueKey('nav-Mehr')), findsNothing);
    service.pendingLogout!.complete();
    await tester.pumpAndSettle();
    expect(find.byKey(const ValueKey('shop-login-submit')), findsOneWidget);
  });
  testWidgets('old cart response cannot replace a newly signed in cart', (tester) async {
    final service = _CustomerService()..oldCart = Completer<ShopCart>();
    await _start(tester, service);
    await tester.tap(find.byKey(const ValueKey('nav-Warenkorb')));
    await tester.pump();
    await _openLogout(tester);
    await tester.tap(find.byKey(const ValueKey('shop-confirm-logout')));
    await tester.pumpAndSettle();
    await _login(tester);
    service.oldCart!.complete(const ShopCart(items: [
      ShopCartItem(id: 9, name: 'Alter Kunde', quantity: 9),
    ], itemCount: 9, subtotal: 90));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const ValueKey('nav-Warenkorb')));
    await tester.pumpAndSettle();
    expect(find.text('Alter Kunde'), findsNothing);
    expect(find.text('Aktueller Warenkorb'), findsOneWidget);
  });
}
