import 'package:flutter/material.dart';

import 'shop_catalog_service.dart';

/// Product details rendered from the public ProductDTO already loaded with
/// the catalog. The add-to-cart callback remains a local preview action.
class ShopProductDetailScreen extends StatefulWidget {
  const ShopProductDetailScreen({
    super.key,
    required this.product,
    required this.formatPrice,
    required this.resolveImageUrl,
    required this.onAddToCart,
  });

  final ShopProduct product;
  final String Function(ShopProduct product) formatPrice;
  final String? Function(String rawUrl) resolveImageUrl;
  final VoidCallback onAddToCart;

  @override
  State<ShopProductDetailScreen> createState() => _ShopProductDetailScreenState();
}

class _ShopProductDetailScreenState extends State<ShopProductDetailScreen> {
  int _selectedImage = 0;

  List<String> get _images => widget.product.imageUrls.isNotEmpty
      ? widget.product.imageUrls
      : widget.product.imageUrl == null
          ? const []
          : [widget.product.imageUrl!];

  @override
  Widget build(BuildContext context) {
    final product = widget.product;
    final colors = Theme.of(context).colorScheme;
    return Scaffold(
      backgroundColor: colors.surface,
      appBar: AppBar(title: const Text('Produktdetails'), centerTitle: true),
      body: CustomScrollView(
        key: const ValueKey('shop-product-details'),
        slivers: [
          SliverToBoxAdapter(child: _buildGallery(colors)),
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(20, 20, 20, 32),
            sliver: SliverToBoxAdapter(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (product.categoryName != null)
                    Text(product.categoryName!.toUpperCase(),
                        style: TextStyle(
                          color: colors.onSurfaceVariant,
                          letterSpacing: 0.8,
                          fontWeight: FontWeight.w700,
                          fontSize: 12,
                        )),
                  const SizedBox(height: 8),
                  Text(product.name,
                      key: const ValueKey('shop-product-title'),
                      style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700)),
                  const SizedBox(height: 12),
                  Text(widget.formatPrice(product),
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                            color: colors.primary,
                            fontWeight: FontWeight.w800,
                          )),
                  if (product.sku != null) ...[
                    const SizedBox(height: 12),
                    Text('Artikelnummer: ${product.sku}',
                        key: const ValueKey('shop-product-sku'),
                        style: TextStyle(color: colors.onSurfaceVariant)),
                  ],
                  if (product.description != null) ...[
                    const SizedBox(height: 24),
                    Text('Beschreibung', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
                    const SizedBox(height: 8),
                    Text(product.description!,
                        key: const ValueKey('shop-product-description'),
                        style: Theme.of(context).textTheme.bodyLarge),
                  ],
                ],
              ),
            ),
          ),
        ],
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 10, 16, 12),
          child: FilledButton.icon(
            key: const ValueKey('shop-product-add-to-cart'),
            onPressed: () {
              widget.onAddToCart();
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Zur Vorschau-Warenkorb hinzugefügt')),
              );
            },
            icon: const Icon(Icons.add_shopping_cart),
            label: const Text('In den Warenkorb'),
          ),
        ),
      ),
    );
  }

  Widget _buildGallery(ColorScheme colors) {
    final images = _images;
    if (images.isEmpty) {
      return SizedBox(
        height: 320,
        child: ColoredBox(
          color: colors.surfaceContainerLow,
          child: Center(child: Icon(Icons.inventory_2_outlined, size: 84, color: colors.primary)),
        ),
      );
    }
    return Column(
      children: [
        SizedBox(
          height: 320,
          child: PageView.builder(
            key: const ValueKey('shop-product-image-gallery'),
            itemCount: images.length,
            onPageChanged: (index) => setState(() => _selectedImage = index),
            itemBuilder: (context, index) {
              final url = widget.resolveImageUrl(images[index]);
              if (url == null) return _imagePlaceholder(colors);
              return Padding(
                padding: const EdgeInsets.all(24),
                child: Image.network(
                  url,
                  fit: BoxFit.contain,
                  errorBuilder: (_, __, ___) => _imagePlaceholder(colors),
                ),
              );
            },
          ),
        ),
        if (images.length > 1)
          Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(images.length, (index) => Container(
                key: ValueKey('shop-product-image-dot-$index'),
                width: 8,
                height: 8,
                margin: const EdgeInsets.symmetric(horizontal: 4),
                decoration: BoxDecoration(
                  color: index == _selectedImage ? colors.primary : colors.outlineVariant,
                  shape: BoxShape.circle,
                ),
              )),
            ),
          ),
      ],
    );
  }

  Widget _imagePlaceholder(ColorScheme colors) => ColoredBox(
        color: colors.surfaceContainerLow,
        child: Center(child: Icon(Icons.image_not_supported_outlined, size: 56, color: colors.onSurfaceVariant)),
      );
}
