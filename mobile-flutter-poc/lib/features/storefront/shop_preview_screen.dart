import 'package:flutter/material.dart';

/// UI-only first slice for the customer-facing store app.
///
/// The catalog is intentionally sample data in this PR. Backend/domain
/// resolution is a later slice so the first screen can be reviewed without
/// changing the existing Angular storefront or staff apps.
class ShopPreviewScreen extends StatefulWidget {
  const ShopPreviewScreen({super.key});

  @override
  State<ShopPreviewScreen> createState() => _ShopPreviewScreenState();
}

class _ShopPreviewScreenState extends State<ShopPreviewScreen> {
  static const _categories = ['Alles', 'Mode', 'Elektronik', 'Wohnen', 'Beauty'];
  static const _products = <_ShopProduct>[
    _ShopProduct(name: 'Everyday Sneaker', category: 'Mode', price: '59,90 €', icon: Icons.directions_run, color: Color(0xFFE6E9FF), badge: 'Bestseller'),
    _ShopProduct(name: 'Kompakte Kamera', category: 'Elektronik', price: '129,00 €', icon: Icons.photo_camera_outlined, color: Color(0xFFFFE8D9), badge: 'Neu'),
    _ShopProduct(name: 'Keramik Vase', category: 'Wohnen', price: '24,50 €', icon: Icons.local_florist_outlined, color: Color(0xFFE1F2EB)),
    _ShopProduct(name: 'Pflege Set', category: 'Beauty', price: '18,90 €', icon: Icons.spa_outlined, color: Color(0xFFFFE7EE)),
  ];

  String _selectedCategory = _categories.first;
  int _cartCount = 0;
  int _selectedTab = 0;

  List<_ShopProduct> get _visibleProducts => _selectedCategory == 'Alles'
      ? _products
      : _products.where((product) => product.category == _selectedCategory).toList();

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;

    return Scaffold(
      backgroundColor: const Color(0xFFF7F7FB),
      body: SafeArea(
        child: CustomScrollView(
          slivers: [
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(20, 14, 20, 0),
              sliver: SliverToBoxAdapter(child: _buildHeader(colors)),
            ),
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
              sliver: SliverToBoxAdapter(child: _buildSearch(colors)),
            ),
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
              sliver: SliverToBoxAdapter(child: _buildHero(colors)),
            ),
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(20, 24, 20, 0),
              sliver: SliverToBoxAdapter(child: _buildSectionTitle('Kategorien', 'Alle ansehen')),
            ),
            SliverToBoxAdapter(child: _buildCategories()),
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(20, 24, 20, 0),
              sliver: SliverToBoxAdapter(
                child: _buildSectionTitle(
                  _selectedCategory == 'Alles' ? 'Für dich entdeckt' : _selectedCategory,
                  'Alle Produkte',
                ),
              ),
            ),
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
              sliver: SliverLayoutBuilder(
                builder: (context, constraints) {
                  final count = constraints.crossAxisExtent > 650 ? 4 : 2;
                  return SliverGrid(
                    delegate: SliverChildBuilderDelegate(
                      (context, index) => _buildProductCard(_visibleProducts[index]),
                      childCount: _visibleProducts.length,
                    ),
                    gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: count,
                      mainAxisSpacing: 12,
                      crossAxisSpacing: 12,
                      childAspectRatio: count == 2 ? 0.76 : 0.82,
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _selectedTab,
        onDestinationSelected: (index) => setState(() => _selectedTab = index),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.home_outlined), selectedIcon: Icon(Icons.home), label: 'Start'),
          NavigationDestination(icon: Icon(Icons.grid_view_outlined), label: 'Kategorien'),
          NavigationDestination(icon: Icon(Icons.favorite_border), label: 'Merkliste'),
          NavigationDestination(icon: Icon(Icons.person_outline), label: 'Konto'),
        ],
      ),
    );
  }

  Widget _buildHeader(ColorScheme colors) {
    return Row(
      children: [
        Container(
          width: 44,
          height: 44,
          decoration: BoxDecoration(color: colors.primary, borderRadius: BorderRadius.circular(15)),
          child: Icon(Icons.storefront_outlined, color: colors.onPrimary),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Marrakesch Market', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800)),
              Text('Vorschau für Store 121 · Beispieldaten', style: Theme.of(context).textTheme.bodySmall?.copyWith(color: colors.onSurfaceVariant)),
            ],
          ),
        ),
        Stack(
          clipBehavior: Clip.none,
          children: [
            IconButton(tooltip: 'Warenkorb', onPressed: () => _showMessage('Warenkorb-Vorschau'), icon: const Icon(Icons.shopping_bag_outlined)),
            if (_cartCount > 0)
              Positioned(right: 3, top: 3, child: CircleAvatar(radius: 9, backgroundColor: colors.primary, child: Text('$_cartCount', style: TextStyle(color: colors.onPrimary, fontSize: 10)))),
          ],
        ),
      ],
    );
  }

  Widget _buildSearch(ColorScheme colors) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(16),
      child: TextField(
        decoration: InputDecoration(
          hintText: 'Produkte suchen',
          prefixIcon: const Icon(Icons.search),
          suffixIcon: Icon(Icons.tune, color: colors.onSurfaceVariant),
          filled: true,
          fillColor: Colors.white,
          contentPadding: const EdgeInsets.symmetric(vertical: 16),
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
        ),
        onSubmitted: (_) => _showMessage('Suche kommt im nächsten Schritt'),
      ),
    );
  }

  Widget _buildHero(ColorScheme colors) {
    return Container(
      height: 184,
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(24),
        gradient: const LinearGradient(colors: [Color(0xFF414FC4), Color(0xFF8178E8)], begin: Alignment.bottomLeft, end: Alignment.topRight),
      ),
      child: Stack(
        children: [
          Positioned(right: -22, bottom: -48, child: Container(width: 200, height: 200, decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.10), shape: BoxShape.circle))),
          Positioned(right: 20, top: 18, child: Icon(Icons.shopping_bag_outlined, size: 94, color: Colors.white.withValues(alpha: 0.9))),
          Padding(
            padding: const EdgeInsets.all(20),
            child: SizedBox(
              width: 220,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Container(padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4), decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.18), borderRadius: BorderRadius.circular(20)), child: const Text('SAISON-AKTION', style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w700, letterSpacing: 1))),
                  const SizedBox(height: 7),
                  const Text('Finde deine\nneuen Lieblinge', style: TextStyle(color: Colors.white, fontSize: 19, height: 1.08, fontWeight: FontWeight.w800)),
                  const SizedBox(height: 7),
                  InkWell(
                    onTap: () => _showMessage('Angebote kommen im nächsten Schritt'),
                    borderRadius: BorderRadius.circular(20),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
                      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(20)),
                      child: Text('Jetzt entdecken', style: TextStyle(color: colors.primary, fontSize: 12, fontWeight: FontWeight.w700)),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSectionTitle(String title, String action) {
    return Row(
      children: [
        Expanded(child: Text(title, style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800))),
        TextButton(onPressed: () => _showMessage('$action kommen im nächsten Schritt'), child: Text(action)),
      ],
    );
  }

  Widget _buildCategories() {
    return SizedBox(
      height: 52,
      child: ListView.separated(
        padding: const EdgeInsets.symmetric(horizontal: 20),
        scrollDirection: Axis.horizontal,
        itemCount: _categories.length,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (context, index) {
          final category = _categories[index];
          final selected = category == _selectedCategory;
          return ChoiceChip(
            label: Text(category),
            selected: selected,
            onSelected: (_) => setState(() => _selectedCategory = category),
            showCheckmark: false,
            labelStyle: TextStyle(fontWeight: FontWeight.w600, color: selected ? Colors.white : Theme.of(context).colorScheme.onSurfaceVariant),
            selectedColor: Theme.of(context).colorScheme.primary,
            backgroundColor: Colors.white,
            side: BorderSide.none,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          );
        },
      ),
    );
  }

  Widget _buildProductCard(_ShopProduct product) {
    final colors = Theme.of(context).colorScheme;
    return Card(
      margin: EdgeInsets.zero,
      color: Colors.white,
      elevation: 0,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => _showMessage('${product.name} – Produktdetails kommen im nächsten Schritt'),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Stack(
                fit: StackFit.expand,
                children: [
                  ColoredBox(color: product.color, child: Icon(product.icon, size: 70, color: colors.primary.withValues(alpha: 0.75))),
                  if (product.badge != null)
                    Positioned(left: 9, top: 9, child: Container(padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5), decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.94), borderRadius: BorderRadius.circular(20)), child: Text(product.badge!, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700)))),
                  Positioned(right: 4, top: 4, child: IconButton(onPressed: () => _showMessage('Merkliste kommt im nächsten Schritt'), icon: const Icon(Icons.favorite_border), style: IconButton.styleFrom(backgroundColor: Colors.white.withValues(alpha: 0.85), minimumSize: const Size(34, 34), padding: EdgeInsets.zero))),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(11, 10, 11, 8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(product.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Expanded(child: Text(product.price, style: TextStyle(color: colors.primary, fontWeight: FontWeight.w800, fontSize: 14))),
                      SizedBox(width: 34, height: 34, child: IconButton(tooltip: 'In den Warenkorb', onPressed: () => setState(() => _cartCount++), icon: const Icon(Icons.add, size: 19), style: IconButton.styleFrom(backgroundColor: colors.primary, foregroundColor: colors.onPrimary, padding: EdgeInsets.zero))),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showMessage(String message) {
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(message), behavior: SnackBarBehavior.floating));
  }
}

class _ShopProduct {
  const _ShopProduct({required this.name, required this.category, required this.price, required this.icon, required this.color, this.badge});

  final String name;
  final String category;
  final String price;
  final IconData icon;
  final Color color;
  final String? badge;
}
