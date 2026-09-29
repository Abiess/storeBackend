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
      '/api/stores/130/categories/root',
      '/api/stores/130/products',
    ]);
    expect(find.text('SPM Shop'), findsOneWidget);
    expect(find.text('Olivenöl'), findsOneWidget);

    await tester.tap(find.byKey(const ValueKey('nav-Kategorien')));
    await tester.pumpAndSettle();
    expect(find.byKey(const ValueKey('category-card-Oliven')),
        findsOneWidget);

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

  testWidgets('shows a retry action when a public catalog request fails', (tester) async {
    await tester.pumpWidget(MarktShopPreviewApp(
      catalogService: ShopCatalogService(client: MockClient((_) async => http.Response('', 503))),
      storeSlug: 'spm',
    ));
    await tester.pumpAndSettle();

    expect(find.textContaining('Die Shop-Daten konnten nicht geladen werden'), findsOneWidget);
    expect(find.text('Erneut laden'), findsOneWidget);
  });
}

ShopCatalogService _service(List<String> requests) {
  return ShopCatalogService(client: MockClient((request) async {
    requests.add(request.url.path);
    switch (request.url.path) {
      case '/api/public/store/by-slug/spm':
        return http.Response(jsonEncode({
          'storeId': 130,
          'name': 'SPM Shop',
          'slug': 'spm',
          'currencyCode': 'MAD',
        }), 200);
      case '/api/stores/130/categories/root':
        return http.Response(jsonEncode([
          {'id': 5, 'name': 'Oliven', 'slug': 'oliven'},
          {'id': 9, 'name': 'Elektronik', 'slug': 'elektronik'},
        ]), 200);
      case '/api/stores/130/products':
        return http.Response(jsonEncode([
          {
            'id': 2,
            'title': 'Olivenöl',
            'basePrice': 12.5,
            'categoryId': 5,
            'categoryName': 'Oliven',
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
