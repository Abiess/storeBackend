import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:markt_ma_documents_poc/entrypoints/main_shop.dart';
import 'package:markt_ma_documents_poc/features/storefront/shop_catalog_service.dart';

void main() {
  for (final mode in ['PUBLIC_REGISTRATION', 'INVITE_ONLY']) {
    testWidgets('maintenance takes priority over catalog and login in $mode', (tester) async {
      final requests = <String>[];
      await tester.pumpWidget(MarktShopPreviewApp(
        catalogService: _service(requests, accountMode: mode, maintenanceEnabled: true),
        storeSlug: 'spm',
      ));
      await tester.pumpAndSettle();
      expect(requests, ['/api/public/store/by-slug/spm']);
      expect(find.byKey(const ValueKey('shop-maintenance-message')), findsOneWidget);
      expect(find.byKey(const ValueKey('shop-login-submit')), findsNothing);
      expect(find.byKey(const ValueKey('nav-Kategorien')), findsNothing);
      expect(find.byKey(const ValueKey('shop-whatsapp')), findsNothing);
      expect(find.text('Olivenöl'), findsNothing);
    });
  }

  testWidgets('custom maintenance image falls back when image cannot load', (tester) async {
    await tester.pumpWidget(MarktShopPreviewApp(
      catalogService: _service([], maintenanceEnabled: true,
        maintenanceMode: 'CUSTOM_IMAGE', maintenanceImageUrl: 'https://example.invalid/card.png'),
      storeSlug: 'spm',
    ));
    await tester.pumpAndSettle();
    expect(find.byKey(const ValueKey('shop-maintenance-message')), findsOneWidget);
    expect(find.byKey(const ValueKey('nav-Kategorien')), findsNothing);
  });


  testWidgets('cart edits use item ID and backend totals; last removal shows empty cart', (tester) async {
    final edits = <String>[];
    await tester.pumpWidget(MarktShopPreviewApp(
      catalogService: _service([], accountMode: 'INVITE_ONLY',
        additions: [{'existing': true}], cartEdits: edits),
      storeSlug: 'spm', customerLogin: (_, __, ___) async {},
    ));
    await tester.pumpAndSettle();
    await tester.enterText(find.byKey(const ValueKey('shop-login-identifier')), 'C-AB12CD34');
    await tester.enterText(find.byKey(const ValueKey('shop-login-password')), 'secret123');
    await tester.tap(find.byKey(const ValueKey('shop-login-submit')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const ValueKey('nav-Warenkorb')));
    await tester.pumpAndSettle();

    await tester.tap(find.byKey(const ValueKey('cart-increase-41')));
    await tester.pumpAndSettle();
    expect(edits, ['PUT:41:3']);
    expect(find.text('3 Artikel'), findsOneWidget);
    expect(find.text('37,50 MAD'), findsOneWidget);

    await tester.tap(find.byKey(const ValueKey('cart-decrease-41')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const ValueKey('cart-decrease-41')));
    await tester.pumpAndSettle();
    expect(find.text('1 Artikel'), findsOneWidget);
    expect(tester.widget<IconButton>(find.byKey(const ValueKey('cart-decrease-41'))).onPressed, isNull);

    await tester.tap(find.byKey(const ValueKey('cart-remove-41')));
    await tester.pumpAndSettle();
    expect(edits.last, 'DELETE:41');
    expect(find.text('Dein Warenkorb ist noch leer'), findsOneWidget);
    expect(find.byKey(const ValueKey('shop-submit-order')), findsNothing);
  });

  testWidgets('failed cart mutation preserves items and can be retried', (tester) async {
    await tester.pumpWidget(MarktShopPreviewApp(
      catalogService: _service([], accountMode: 'INVITE_ONLY',
        additions: [{'existing': true}], failCartEdit: true),
      storeSlug: 'spm', customerLogin: (_, __, ___) async {},
    ));
    await tester.pumpAndSettle();
    await tester.enterText(find.byKey(const ValueKey('shop-login-identifier')), 'C-AB12CD34');
    await tester.enterText(find.byKey(const ValueKey('shop-login-password')), 'secret123');
    await tester.tap(find.byKey(const ValueKey('shop-login-submit')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const ValueKey('nav-Warenkorb')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const ValueKey('cart-remove-41')));
    await tester.pumpAndSettle();
    expect(find.text('2 Artikel'), findsOneWidget);
    expect(find.text('Warenkorb konnte nicht aktualisiert werden. Bitte erneut versuchen.'), findsOneWidget);
    expect(tester.widget<IconButton>(find.byKey(const ValueKey('cart-remove-41'))).onPressed, isNotNull);
  });

  for (final enabled in [true, false]) {
    testWidgets('public store WhatsApp visibility follows backend flag $enabled', (tester) async {
      await tester.pumpWidget(MarktShopPreviewApp(
        catalogService: _service([], whatsappEnabled: enabled),
        storeSlug: 'spm',
      ));
      await tester.pumpAndSettle();
      expect(find.byKey(const ValueKey('shop-whatsapp')), enabled ? findsOneWidget : findsNothing);
    });
  }

  test('WhatsApp link uses backend number and safely encodes greeting', () {
    final store = ShopStore.fromJson({
      'storeId': 130,
      'whatsappNumber': '+212 600-123456',
      'greetingMessage': 'Hallo & guten Tag!',
    });
    expect(store.whatsappUri?.host, 'wa.me');
    expect(store.whatsappUri?.path, '/212600123456');
    expect(store.whatsappUri?.queryParameters['text'], 'Hallo & guten Tag!');
    expect(ShopStore.fromJson({'whatsappNumber': '   '}).whatsappUri, isNull);
    expect(ShopStore.fromJson({
      'customerAccountMode': 'INVITE_ONLY',
      'whatsappNumber': '+212600123456',
      'whatsappButtonEnabled': true,
    }).whatsappUri, isNull);
  });

  testWidgets('loads the configured public store and browses live catalog data', (tester) async {
    await tester.binding.setSurfaceSize(const Size(390, 844));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    final requests = <String>[];
    final service = _service(requests);
    await tester.pumpWidget(MarktShopPreviewApp(catalogService: service, storeSlug: 'spm'));
    await tester.pumpAndSettle();

    expect(requests, [
      '/api/public/store/by-slug/spm',
      '/api/stores/130/categories',
      '/api/stores/130/products',
    ]);
    expect(find.text('SPM Shop'), findsOneWidget);
    expect(find.text('Olivenöl'), findsOneWidget);

    await tester.tap(find.byKey(const ValueKey('nav-Kategorien')));
    await tester.pumpAndSettle();
    expect(find.byKey(const ValueKey('category-card-Oliven')),
        findsOneWidget);
    expect(find.byKey(const ValueKey('category-card-Leere Kategorie')),
        findsNothing);

    await tester.tap(find.byKey(const ValueKey('category-card-Oliven')));
    await tester.pumpAndSettle();
    expect(find.text('Oliven (1 Artikel)'), findsOneWidget);
    expect(find.text('Olivenöl'), findsOneWidget);
    expect(find.text('EUR'), findsNothing);
    expect(find.text('12,50 MAD'), findsOneWidget);
  });

  testWidgets('search tab filters products loaded from the public API', (tester) async {
    await tester.binding.setSurfaceSize(const Size(390, 844));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    await tester.pumpWidget(MarktShopPreviewApp(catalogService: _service([]), storeSlug: 'spm'));
    await tester.pumpAndSettle();

    await tester.tap(find.byKey(const ValueKey('nav-Suche')));
    await tester.pumpAndSettle();
    await tester.enterText(find.byKey(const ValueKey('shop-search')), 'Kamera');
    await tester.pumpAndSettle();

    expect(find.text('Kompakte Kamera'), findsOneWidget);
    expect(find.text('Olivenöl'), findsNothing);
  });

  testWidgets('invite-only product detail adds to backend cart and shows its response', (tester) async {
    await tester.binding.setSurfaceSize(const Size(390, 844));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    final requests = <String>[];
    final additions = <Map<String, dynamic>>[];
    await tester.pumpWidget(MarktShopPreviewApp(
      catalogService: _service(requests, accountMode: 'INVITE_ONLY', additions: additions),
      storeSlug: 'spm',
      customerLogin: (_, __, ___) async {},
    ));
    await tester.pumpAndSettle();
    await tester.enterText(find.byKey(const ValueKey('shop-login-identifier')), 'C-AB12CD34');
    await tester.enterText(find.byKey(const ValueKey('shop-login-password')), 'secret123');
    await tester.tap(find.byKey(const ValueKey('shop-login-submit')));
    await tester.pumpAndSettle();

    await tester.tap(find.byKey(const ValueKey('nav-Kategorien')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const ValueKey('category-card-Oliven')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const ValueKey('shop-product-2')));
    await tester.pumpAndSettle();
    expect(find.byKey(const ValueKey('shop-product-detail')), findsOneWidget);
    expect(find.text('MwSt. 7 %'), findsOneWidget);
    expect(find.textContaining('WhatsApp'), findsNothing);
    expect(find.text('Beschreibung'), findsNothing);

    await tester.tap(find.byTooltip('Menge erhöhen'));
    await tester.tap(find.byKey(const ValueKey('shop-add-to-cart')));
    await tester.pumpAndSettle();
    expect(additions, [{'storeId': 130, 'productId': 2, 'quantity': 2}]);
    expect(requests.where((path) => path == '/api/public/cart').length, 2);
    expect(find.text('2 Artikel'), findsOneWidget);
    expect(find.text('Olivenöl'), findsOneWidget);
    expect(find.text('25,00 MAD'), findsOneWidget);
  });

  testWidgets('invite-only order request requires confirmation and uses backend checkout', (tester) async {
    await tester.binding.setSurfaceSize(const Size(390, 844));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    final requests = <String>[];
    final additions = <Map<String, dynamic>>[];
    final orders = <Map<String, dynamic>>[];
    await tester.pumpWidget(MarktShopPreviewApp(
      catalogService: _service(requests, accountMode: 'INVITE_ONLY', additions: additions, orders: orders),
      storeSlug: 'spm',
      customerLogin: (_, __, ___) async {},
    ));
    await tester.pumpAndSettle();
    await tester.enterText(find.byKey(const ValueKey('shop-login-identifier')), 'C-AB12CD34');
    await tester.enterText(find.byKey(const ValueKey('shop-login-password')), 'secret123');
    await tester.tap(find.byKey(const ValueKey('shop-login-submit')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const ValueKey('nav-Kategorien')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const ValueKey('category-card-Oliven')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const ValueKey('shop-product-2')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const ValueKey('shop-add-to-cart')));
    await tester.pumpAndSettle();

    await tester.tap(find.byKey(const ValueKey('shop-submit-order')));
    await tester.pumpAndSettle();
    expect(orders, isEmpty);
    await tester.tap(find.text('Abbrechen'));
    await tester.pumpAndSettle();
    expect(orders, isEmpty);
    await tester.tap(find.byKey(const ValueKey('shop-submit-order')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const ValueKey('shop-confirm-order')));
    await tester.pumpAndSettle();

    expect(orders, [{
      'storeId': 130,
      'paymentMethod': 'ORDER_REQUEST',
      'shippingProvider': 'PICKUP',
      'deliveryType': 'PICKUP',
      'shippingAddress': {},
      'billingAddress': {},
    }]);
    expect(find.byKey(const ValueKey('shop-order-success')), findsOneWidget);
    expect(find.textContaining('ORD-123'), findsOneWidget);
    expect(find.byKey(const ValueKey('shop-submit-order')), findsNothing);
    expect(requests.where((path) => path == '/api/public/orders/checkout').length, 1);
  });

  testWidgets('shows a retry action when a public catalog request fails', (tester) async {
    await tester.pumpWidget(MarktShopPreviewApp(
      catalogService: ShopCatalogService(client: MockClient((_) async => http.Response('', 503))),
      storeSlug: 'spm',
    ));
    await tester.pumpAndSettle();

    expect(find.textContaining('Die Shop-Daten konnten nicht geladen werden'), findsOneWidget);
    expect(find.text('Erneut laden'), findsOneWidget);
  });

  testWidgets('invite-only store shows login before fetching categories or products', (tester) async {
    await tester.binding.setSurfaceSize(const Size(390, 844));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    final requests = <String>[];
    final logins = <String>[];
    await tester.pumpWidget(MarktShopPreviewApp(
      catalogService: _service(requests, accountMode: 'INVITE_ONLY'),
      storeSlug: 'spm',
      customerLogin: (storeId, identifier, password) async {
        logins.add('$storeId:$identifier:$password');
      },
    ));
    await tester.pumpAndSettle();

    expect(requests, ['/api/public/store/by-slug/spm']);
    expect(find.byKey(const ValueKey('shop-login-submit')), findsOneWidget);
    expect(find.text('Registrieren'), findsNothing);
    expect(find.text('Olivenöl'), findsNothing);

    await tester.enterText(find.byKey(const ValueKey('shop-login-identifier')), 'C-AB12CD34');
    await tester.enterText(find.byKey(const ValueKey('shop-login-password')), 'secret123');
    await tester.tap(find.byKey(const ValueKey('shop-login-submit')));
    await tester.pumpAndSettle();

    expect(logins, ['130:C-AB12CD34:secret123']);
    expect(requests, [
      '/api/public/store/by-slug/spm',
      '/api/stores/130/categories',
      '/api/stores/130/products',
      '/api/public/cart',
    ]);
    expect(find.text('Olivenöl'), findsOneWidget);
  });

  testWidgets('shows child categories and filters products in the chosen branch', (tester) async {
    await tester.binding.setSurfaceSize(const Size(390, 844));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    await tester.pumpWidget(MarktShopPreviewApp(catalogService: _service([], withSubcategories: true), storeSlug: 'spm'));
    await tester.pumpAndSettle();

    await tester.tap(find.byKey(const ValueKey('nav-Kategorien')));
    await tester.pumpAndSettle();
    expect(find.byKey(const ValueKey('category-card-Extra Virgin')), findsNothing);

    await tester.tap(find.byKey(const ValueKey('category-card-Oliven')));
    await tester.pumpAndSettle();
    expect(find.byKey(const ValueKey('subcategory-Extra Virgin')), findsOneWidget);

    await tester.tap(find.byKey(const ValueKey('subcategory-Extra Virgin')));
    await tester.pumpAndSettle();
    expect(find.text('Olivenöl'), findsOneWidget);
    expect(find.text('Kompakte Kamera'), findsNothing);

    await tester.tap(find.byTooltip('Zurück zu Kategorien'));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const ValueKey('shop-category-all')));
    await tester.pumpAndSettle();
    expect(find.text('Olivenöl'), findsOneWidget);
  });
}

ShopCatalogService _service(List<String> requests, {String accountMode = 'PUBLIC_REGISTRATION', bool whatsappEnabled = true, bool maintenanceEnabled = false, String maintenanceMode = 'DEFAULT', String? maintenanceImageUrl, bool withSubcategories = false, List<Map<String, dynamic>>? additions, List<Map<String, dynamic>>? orders, List<String>? cartEdits, bool failCartEdit = false}) {
  var cartQuantity = 2;
  var removed = false;
  return ShopCatalogService(readToken: () async => 'invite-jwt', client: MockClient((request) async {
    requests.add(request.url.path);
    if (request.url.path == '/api/public/cart/items/41') {
      expect(request.headers['Authorization'], 'Bearer invite-jwt');
      if (failCartEdit) return http.Response('{"error":"Unavailable"}', 503);
      if (request.method == 'PUT') {
        expect(request.headers['Content-Type'], 'application/json');
        cartQuantity = (jsonDecode(request.body) as Map<String, dynamic>)['quantity'] as int;
        cartEdits?.add('PUT:41:$cartQuantity');
        return http.Response('{}', 200);
      }
      expect(request.method, 'DELETE');
      removed = true;
      cartEdits?.add('DELETE:41');
      return http.Response('', 204);
    }
    if (request.url.path == '/api/public/orders/checkout') {
      expect(request.headers['Authorization'], 'Bearer invite-jwt');
      orders?.add(jsonDecode(request.body) as Map<String, dynamic>);
      return http.Response(jsonEncode({'orderNumber': 'ORD-123'}), 200);
    }
    if (request.url.path == '/api/public/cart' || request.url.path == '/api/public/cart/items') {
      expect(request.headers['Authorization'], 'Bearer invite-jwt');
      if (request.method == 'POST') {
        additions?.add(jsonDecode(request.body) as Map<String, dynamic>);
        return http.Response('{}', 200);
      }
      expect(request.url.queryParameters['storeId'], '130');
      return http.Response(jsonEncode(additions?.isNotEmpty == true && orders?.isNotEmpty != true && !removed
          ? {'items': [{'id': 41, 'productTitle': 'Olivenöl', 'quantity': cartQuantity}], 'itemCount': cartQuantity, 'subtotal': 12.5 * cartQuantity}
          : {'items': [], 'itemCount': 0, 'subtotal': 0}), 200);
    }
    switch (request.url.path) {
      case '/api/public/store/by-slug/spm':
        return http.Response(jsonEncode({
          'storeId': 130,
          'name': 'SPM Shop',
          'slug': 'spm',
          'currencyCode': 'MAD',
          'customerAccountMode': accountMode,
          'maintenanceEnabled': maintenanceEnabled,
          'maintenanceMode': maintenanceMode,
          'maintenanceImageUrl': maintenanceImageUrl,
          'whatsappButtonEnabled': whatsappEnabled,
          'whatsappNumber': '+212600123456',
        }), 200);
      case '/api/stores/130/categories':
        return http.Response(jsonEncode([
          {'id': 5, 'name': 'Oliven', 'slug': 'oliven'},
          {'id': 9, 'name': 'Elektronik', 'slug': 'elektronik'},
          {'id': 15, 'name': 'Leere Kategorie', 'slug': 'leere-kategorie'},
          if (withSubcategories) {'id': 12, 'name': 'Extra Virgin', 'slug': 'extra-virgin', 'parentId': 5},
        ]), 200);
      case '/api/stores/130/products':
        return http.Response(jsonEncode([
          {
            'id': 2,
            'title': 'Olivenöl',
            'basePrice': 12.5,
            'categoryId': withSubcategories ? 12 : 5,
            'categoryName': 'Oliven',
            'taxRate': 7,
            'isFeatured': true,
          },
          {
            'id': 3,
            'title': 'Kompakte Kamera',
            'basePrice': 120,
            'categoryId': 9,
            'categoryName': 'Elektronik',
            'currencyCode': 'EUR',
          },
        ]), 200);
      default:
        return http.Response('unexpected endpoint ${request.url.path}', 404);
    }
  }));
}
