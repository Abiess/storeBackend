import 'package:flutter/material.dart';

import '../config/api_config.dart';
import '../features/storefront/shop_preview_screen.dart';
import '../features/storefront/shop_catalog_service.dart';
import '../theme/markt_theme.dart';

/// Eigenständiger Einstiegspunkt für die öffentliche Flutter-Shop-Vorschau.
///
/// Bewusst ohne AuthGate: Produktkatalog und Storefront sind öffentlich.
/// Kundenauthentifizierung wird erst an den Stellen ergänzt, an denen sie
/// für Konto, Wunschliste oder Bestellhistorie gebraucht wird.
void main() {
  runApp(const MarktShopPreviewApp());
}

class MarktShopPreviewApp extends StatelessWidget {
  const MarktShopPreviewApp({super.key, this.catalogService, this.storeSlug});

  final ShopCatalogService? catalogService;
  final String? storeSlug;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'markt.ma Shop Vorschau',
      debugShowCheckedModeBanner: false,
      theme: MarktTheme.light(),
      darkTheme: MarktTheme.dark(),
      themeMode: ThemeMode.system,
      home: ShopPreviewScreen(
        catalogService: catalogService,
        storeSlug: storeSlug ?? ApiConfig.shopStoreSlug,
      ),
    );
  }
}
