import 'package:flutter/material.dart';

import '../features/storefront/shop_preview_screen.dart';
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
  const MarktShopPreviewApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'markt.ma Shop Vorschau',
      debugShowCheckedModeBanner: false,
      theme: MarktTheme.light(),
      darkTheme: MarktTheme.dark(),
      themeMode: ThemeMode.system,
      home: const ShopPreviewScreen(),
    );
  }
}
