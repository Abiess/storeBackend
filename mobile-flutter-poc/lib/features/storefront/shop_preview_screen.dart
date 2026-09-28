import 'package:flutter/material.dart';

/// UI-only customer storefront preview. The catalog remains sample data until
/// the next integration slice connects the screen to the public store API.
class ShopPreviewScreen extends StatefulWidget {
  const ShopPreviewScreen({super.key});

  @override
  State<ShopPreviewScreen> createState() => _ShopPreviewScreenState();
}

class _ShopPreviewScreenState extends State<ShopPreviewScreen> {
  static const _categories = <_ShopCategory>[
    _ShopCategory('Mode', Icons.checkroom_outlined, Color(0xFFECEAFF)),
    _ShopCategory('Elektronik', Icons.photo_camera_outlined, Color(0xFFFFE9D8)),
    _ShopCategory('Wohnen', Icons.chair_outlined, Color(0xFFE2F2E9)),
    _ShopCategory('Beauty', Icons.spa_outlined, Color(0xFFFFE6EC)),
  ];

  static const _products = <_ShopProduct>[
    _ShopProduct(name: 'Everyday Sneaker', category: 'Mode', price: '59,90 €', icon: Icons.directions_run, color: Color(0xFFE6E9FF), badge: 'Bestseller'),
    _ShopProduct(name: 'Kompakte Kamera', category: 'Elektronik', price: '129,00 €', icon: Icons.photo_camera_outlined, color: Color(0xFFFFE8D9), badge: 'Neu'),
    _ShopProduct(name: 'Keramik Vase', category: 'Wohnen', price: '24,50 €', icon: Icons.local_florist_outlined, color: Color(0xFFE1F2EB)),
    _ShopProduct(name: 'Pflege Set', category: 'Beauty', price: '18,90 €', icon: Icons.spa_outlined, color: Color(0xFFFFE7EE)),
  ];

  int _selectedTab = 0;
  int _cartCount = 0;
  String? _selectedCategory;
  String _query = '';

  List<_ShopProduct> get _visibleProducts {
    return _products.where((product) {
      final matchesCategory = _selectedCategory == null || product.category == _selectedCategory;
      final matchesQuery = product.name.toLowerCase().contains(_query.trim().toLowerCase());
      return matchesCategory && matchesQuery;
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    return Scaffold(
      backgroundColor: const Color(0xFFF5F5F7),
      body: SafeArea(child: _buildCurrentPage(colors)),
      bottomNavigationBar: _buildBottomNavigation(colors),
    );
  }

  Widget _buildCurrentPage(ColorScheme colors) {
    if (_selectedTab == 1) {
      return _selectedCategory == null
          ? _buildCategoriesPage(colors)
          : _buildCategoryProductsPage(colors);
    }
    if (_selectedTab == 2) return _buildSearchPage(colors);
    if (_selectedTab == 3) return _buildCartPage(colors);
    if (_selectedTab == 4) return _buildMorePage();
    return _buildHomePage(colors);
  }

  Widget _buildHomePage(ColorScheme colors) {
    return CustomScrollView(
      key: const ValueKey('shop-home'),
      slivers: [
        SliverPadding(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
          sliver: SliverToBoxAdapter(child: _buildHeader(colors)),
        ),
        SliverPadding(
          padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
          sliver: SliverToBoxAdapter(child: _buildSearchField(colors, openSearch: true)),
        ),
        SliverPadding(
          padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
          sliver: SliverToBoxAdapter(child: _buildHero(colors)),
        ),
        SliverPadding(
          padding: const EdgeInsets.fromLTRB(20, 24, 20, 8),
          sliver: SliverToBoxAdapter(child: _sectionHeading('Kategorien', 'Alle ansehen', onTap: () => setState(() => _selectedTab = 1))),
        ),
        SliverToBoxAdapter(child: _buildCategoryStrip(colors)),
        SliverPadding(
          padding: const EdgeInsets.fromLTRB(20, 22, 20, 8),
          sliver: SliverToBoxAdapter(child: _sectionHeading('Für dich entdeckt', 'Alle Produkte', onTap: () => setState(() { _selectedCategory = null; _selectedTab = 1; }))),
        ),
        SliverPadding(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 28),
          sliver: SliverGrid(
            delegate: SliverChildBuilderDelegate((context, index) => _buildProductCard(_products[index], colors), childCount: _products.length),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: 2, mainAxisSpacing: 12, crossAxisSpacing: 12, childAspectRatio: 0.73),
          ),
        ),
      ],
    );
  }

  Widget _buildHeader(ColorScheme colors) {
    return Row(children: [
      Container(width: 46, height: 46, decoration: BoxDecoration(color: colors.primary, borderRadius: BorderRadius.circular(14)), child: Icon(Icons.storefront_outlined, color: colors.onPrimary)),
      const SizedBox(width: 12),
      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text('Marrakesch Market', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800)),
        Text('Vorschau für Store 121 · Beispieldaten', style: Theme.of(context).textTheme.bodySmall?.copyWith(color: colors.onSurfaceVariant)),
      ])),
      IconButton(tooltip: 'Warenkorb', onPressed: () => setState(() => _selectedTab = 3), icon: Badge(isLabelVisible: _cartCount > 0, label: Text('$_cartCount'), child: const Icon(Icons.shopping_cart_outlined))),
    ]);
  }

  Widget _buildSearchField(ColorScheme colors, {bool openSearch = false}) {
    return TextField(
      key: const ValueKey('shop-search'),
      readOnly: openSearch,
      onChanged: openSearch ? null : (value) => setState(() => _query = value),
      onTap: openSearch ? () => setState(() => _selectedTab = 2) : null,
      decoration: InputDecoration(
        hintText: 'Produkte suchen',
        prefixIcon: const Icon(Icons.search),
        suffixIcon: IconButton(tooltip: 'Suche öffnen', icon: const Icon(Icons.tune), onPressed: () => setState(() => _selectedTab = 2)),
        filled: true,
        fillColor: Colors.white,
        contentPadding: const EdgeInsets.symmetric(vertical: 15),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide.none),
      ),
    );
  }

  Widget _buildHero(ColorScheme colors) {
    return Container(
      height: 196,
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(borderRadius: BorderRadius.circular(18), gradient: LinearGradient(colors: [colors.primary, Color.lerp(colors.primary, const Color(0xFF8F82EB), 0.55)!], begin: Alignment.bottomLeft, end: Alignment.topRight)),
      child: Stack(children: [
        Positioned(right: -24, bottom: -58, child: Container(width: 190, height: 190, decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.1), shape: BoxShape.circle))),
        Positioned(right: 18, top: 20, child: Icon(Icons.shopping_bag_outlined, size: 88, color: Colors.white.withValues(alpha: 0.92))),
        Padding(padding: const EdgeInsets.all(16), child: SizedBox(width: 220, child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisAlignment: MainAxisAlignment.center, children: [
          Text('SAISON-AKTION', style: TextStyle(color: Colors.white.withValues(alpha: 0.9), fontSize: 10, fontWeight: FontWeight.w700, letterSpacing: 1)),
          const SizedBox(height: 5),
          const Text('Finde deine\nneuen Lieblinge', style: TextStyle(color: Colors.white, fontSize: 18, height: 1.08, fontWeight: FontWeight.w800)),
          const SizedBox(height: 6),
          TextButton(onPressed: () => setState(() => _selectedTab = 1), style: TextButton.styleFrom(backgroundColor: Colors.white, foregroundColor: colors.primary, padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4), minimumSize: Size.zero, tapTargetSize: MaterialTapTargetSize.shrinkWrap), child: const Text('Jetzt entdecken')),
        ]))),
      ]),
    );
  }

  Widget _sectionHeading(String title, String action, {required VoidCallback onTap}) {
    return Row(children: [
      Expanded(child: Text(title, style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800))),
      TextButton(onPressed: onTap, child: Text(action)),
    ]);
  }

  Widget _buildCategoryStrip(ColorScheme colors) {
    return SizedBox(height: 125, child: ListView.separated(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      scrollDirection: Axis.horizontal,
      itemCount: _categories.length,
      separatorBuilder: (_, __) => const SizedBox(width: 12),
      itemBuilder: (context, index) {
        final category = _categories[index];
        return SizedBox(width: 104, child: InkWell(
          key: ValueKey('category-${category.name}'),
          borderRadius: BorderRadius.circular(14),
          onTap: () => _openCategory(category.name),
          child: Column(children: [
            Expanded(child: Container(width: double.infinity, decoration: BoxDecoration(color: category.color, borderRadius: BorderRadius.circular(14)), child: Icon(category.icon, size: 42, color: colors.primary))),
            const SizedBox(height: 7),
            Text(category.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w600)),
          ]),
        ));
      },
    ));
  }

  Widget _buildCategoriesPage(ColorScheme colors) {
    return CustomScrollView(key: const ValueKey('shop-categories'), slivers: [
      SliverAppBar(pinned: true, title: const Text('Kategorien'), centerTitle: true, backgroundColor: colors.surface),
      SliverPadding(padding: const EdgeInsets.all(16), sliver: SliverGrid(
        delegate: SliverChildBuilderDelegate((context, index) => _buildCategoryCard(_categories[index], colors), childCount: _categories.length),
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: 2, mainAxisSpacing: 14, crossAxisSpacing: 14, childAspectRatio: 0.78),
      )),
    ]);
  }

  Widget _buildCategoryCard(_ShopCategory category, ColorScheme colors) {
    final count = _products.where((p) => p.category == category.name).length;
    return Card(margin: EdgeInsets.zero, color: Colors.white, elevation: 0, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16), side: BorderSide(color: colors.outlineVariant)), clipBehavior: Clip.antiAlias, child: InkWell(
      key: ValueKey('category-card-${category.name}'),
      onTap: () => _openCategory(category.name),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Expanded(child: Stack(fit: StackFit.expand, children: [
          ColoredBox(color: category.color, child: Icon(category.icon, size: 74, color: colors.primary)),
          Positioned(top: 10, right: 10, child: Container(padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5), decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.94), borderRadius: BorderRadius.circular(6)), child: Text('$count ARTIKEL', style: TextStyle(color: colors.onSurfaceVariant, fontSize: 10, fontWeight: FontWeight.w700)))),
        ])),
        Padding(padding: const EdgeInsets.fromLTRB(12, 10, 12, 12), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(category.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
          const SizedBox(height: 7),
          Text('$count Artikel', style: TextStyle(color: colors.onSurfaceVariant)),
        ])),
      ]),
    ));
  }

  Widget _buildCategoryProductsPage(ColorScheme colors) {
    final category = _categories.firstWhere((item) => item.name == _selectedCategory);
    final products = _visibleProducts;
    return CustomScrollView(key: const ValueKey('shop-category-products'), slivers: [
      SliverAppBar(pinned: true, leading: IconButton(tooltip: 'Zurück zu Kategorien', onPressed: () => setState(() { _selectedCategory = null; _selectedTab = 1; }), icon: const Icon(Icons.arrow_back)), title: Text('${category.name} (${products.length} Artikel)'), centerTitle: true, backgroundColor: colors.surface),
      SliverToBoxAdapter(child: SizedBox(height: 170, child: Center(child: Container(width: 120, height: 120, decoration: BoxDecoration(color: category.color, shape: BoxShape.circle), child: Icon(category.icon, size: 66, color: colors.primary))))),
      SliverToBoxAdapter(child: Divider(height: 1, color: colors.outlineVariant)),
      SliverToBoxAdapter(child: ListTile(title: const Text('Alle Produkte anzeigen', style: TextStyle(fontWeight: FontWeight.w700)), trailing: Text('${products.length} Artikel', style: TextStyle(color: colors.primary)), onTap: () {})),
      SliverToBoxAdapter(child: Divider(height: 1, color: colors.outlineVariant)),
      if (products.isEmpty)
        const SliverFillRemaining(hasScrollBody: false, child: Center(child: Text('Keine Produkte gefunden')))
      else
        SliverList(delegate: SliverChildBuilderDelegate((context, index) => _buildProductRow(products[index], colors), childCount: products.length)),
      const SliverToBoxAdapter(child: SizedBox(height: 24)),
    ]);
  }

  Widget _buildProductRow(_ShopProduct product, ColorScheme colors) {
    return Container(
      decoration: BoxDecoration(color: Colors.white, border: Border(bottom: BorderSide(color: colors.outlineVariant))),
      padding: const EdgeInsets.fromLTRB(14, 14, 14, 12),
      child: Column(children: [
        Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Container(width: 94, height: 102, decoration: BoxDecoration(color: product.color, borderRadius: BorderRadius.circular(10)), child: Icon(product.icon, size: 46, color: colors.primary)),
          const SizedBox(width: 14),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            if (product.badge != null) Padding(padding: const EdgeInsets.only(bottom: 6), child: Text(product.badge!.toUpperCase(), style: TextStyle(color: colors.primary, fontWeight: FontWeight.w700, fontSize: 12))),
            Text(product.name, style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600)),
            const SizedBox(height: 12),
            Text('AUF LAGER', style: TextStyle(color: Colors.green.shade700, fontWeight: FontWeight.w700, fontSize: 12)),
            const SizedBox(height: 8),
            Text(product.price, style: TextStyle(color: colors.primary, fontWeight: FontWeight.w700, fontSize: 18)),
          ])),
        ]),
        Align(alignment: Alignment.centerRight, child: OutlinedButton.icon(onPressed: () => _addToCart(), icon: const Icon(Icons.add_shopping_cart), label: const Text('In den Warenkorb'))),
      ]),
    );
  }

  Widget _buildProductCard(_ShopProduct product, ColorScheme colors) {
    return Card(margin: EdgeInsets.zero, color: Colors.white, elevation: 0, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16), side: BorderSide(color: colors.outlineVariant)), clipBehavior: Clip.antiAlias, child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Expanded(child: Stack(fit: StackFit.expand, children: [
        ColoredBox(color: product.color, child: Icon(product.icon, size: 64, color: colors.primary)),
        if (product.badge != null) Positioned(left: 8, top: 8, child: Container(padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 4), decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(5)), child: Text(product.badge!, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700)))),
      ])),
      Padding(padding: const EdgeInsets.fromLTRB(10, 9, 8, 8), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(product.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
        const SizedBox(height: 5),
        Row(children: [Expanded(child: Text(product.price, style: TextStyle(color: colors.primary, fontWeight: FontWeight.w800))), IconButton(tooltip: 'In den Warenkorb', onPressed: _addToCart, icon: const Icon(Icons.add_circle), color: colors.primary, padding: EdgeInsets.zero, constraints: const BoxConstraints(minWidth: 36, minHeight: 36))]),
      ])),
    ]));
  }

  Widget _buildSearchPage(ColorScheme colors) {
    final products = _visibleProducts;
    return Column(children: [
      AppBar(title: const Text('Suche'), centerTitle: true),
      Padding(padding: const EdgeInsets.all(16), child: _buildSearchField(colors)),
      Expanded(child: products.isEmpty ? const Center(child: Text('Keine Produkte gefunden')) : ListView.builder(itemCount: products.length, itemBuilder: (context, index) => _buildProductRow(products[index], colors))),
    ]);
  }

  Widget _buildCartPage(ColorScheme colors) {
    return Column(children: [
      AppBar(title: const Text('Warenkorb'), centerTitle: true),
      Expanded(child: Center(child: Column(mainAxisSize: MainAxisSize.min, children: [Icon(Icons.shopping_cart_outlined, size: 58, color: colors.primary), const SizedBox(height: 12), Text(_cartCount == 0 ? 'Dein Warenkorb ist noch leer' : '$_cartCount Artikel im Warenkorb', style: Theme.of(context).textTheme.titleMedium), const SizedBox(height: 6), const Text('Vorschau – Bestellen kommt später')])),),
    ]);
  }

  Widget _buildMorePage() => Column(children: [AppBar(title: const Text('Mehr'), centerTitle: true), const Expanded(child: Center(child: Text('Weitere Shop-Funktionen folgen.')))]);

  Widget _buildBottomNavigation(ColorScheme colors) {
    const labels = ['Kategorien', 'Suche', 'Start', 'Warenkorb', 'Mehr'];
    const icons = [Icons.grid_view, Icons.search, Icons.storefront, Icons.shopping_cart_outlined, Icons.more_horiz];
    return Material(color: colors.surface, elevation: 8, child: SafeArea(top: false, child: SizedBox(height: 66, child: Row(children: List.generate(labels.length, (index) {
          final selected = switch (index) {
            0 => _selectedTab == 1,
            1 => _selectedTab == 2,
            2 => _selectedTab == 0,
            3 => _selectedTab == 3,
            _ => _selectedTab == 4,
          };
          return Expanded(child: InkWell(key: ValueKey('nav-${labels[index]}'), onTap: () => setState(() {
            _selectedTab = switch (index) { 0 => 1, 1 => 2, 2 => 0, _ => index };
            _selectedCategory = null;
          }), child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
        Icon(icons[index], color: selected ? colors.primary : colors.onSurfaceVariant, size: index == 2 ? 26 : 22),
        const SizedBox(height: 3),
        Text(labels[index], maxLines: 1, style: TextStyle(fontSize: 10, color: selected ? colors.primary : colors.onSurfaceVariant, fontWeight: selected ? FontWeight.w600 : FontWeight.normal)),
      ])));
    })))));
  }

  void _openCategory(String name) => setState(() { _selectedCategory = name; _selectedTab = 1; _query = ''; });

  void _addToCart() => setState(() => _cartCount++);
}

class _ShopCategory {
  const _ShopCategory(this.name, this.icon, this.color);
  final String name;
  final IconData icon;
  final Color color;
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
