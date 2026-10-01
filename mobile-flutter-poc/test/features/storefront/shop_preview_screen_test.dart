import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:markt_ma_documents_poc/entrypoints/main_shop.dart';
import 'package:markt_ma_documents_poc/features/storefront/shop_catalog_service.dart';

void main() {
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

ShopCatalogService _service(List<String> requests, {String accountMode = 'PUBLIC_REGISTRATION', bool withSubcategories = false, List<Map<String, dynamic>>? additions}) {
  return ShopCatalogService(readToken: () async => 'invite-jwt', client: MockClient((request) async {
    requests.add(request.url.path);
    if (request.url.path == '/api/public/cart' || request.url.path == '/api/public/cart/items') {
      expect(request.headers['Authorization'], 'Bearer invite-jwt');
      if (request.method == 'POST') {
        additions?.add(jsonDecode(request.body) as Map<String, dynamic>);
        return http.Response('{}', 200);
      }
      expect(request.url.queryParameters['storeId'], '130');
      return http.Response(jsonEncode(additions?.isNotEmpty == true
          ? {'items': [{'productTitle': 'Olivenöl', 'quantity': 2}], 'itemCount': 2, 'subtotal': 25}
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
