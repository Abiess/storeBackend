import 'dart:convert';

import 'package:http/http.dart' as http;

import '../../config/api_config.dart';

/// Read-only access to the existing public Storefront APIs.
///
/// This deliberately adds no Backend endpoints and sends no customer token.
class ShopCatalogService {
  ShopCatalogService({http.Client? client}) : _client = client ?? http.Client();

  final http.Client _client;

  Future<ShopCatalog> loadStore(String slug) async {
    final storeJson = await _get(ApiConfig.publicStoreBySlugPath(slug));
    final store = ShopStore.fromJson(storeJson as Map<String, dynamic>);

    final responses = await Future.wait([
      _get(ApiConfig.publicStoreCategoriesPath(store.id)),
      _get(ApiConfig.publicStoreProductsPath(store.id)),
    ]);

    return ShopCatalog(
      store: store,
      categories: (responses[0] as List<dynamic>)
          .map((item) => ShopCategory.fromJson(item as Map<String, dynamic>))
          .toList(),
      products: (responses[1] as List<dynamic>)
          .map((item) => ShopProduct.fromJson(
                item as Map<String, dynamic>,
                defaultCurrencyCode: store.currencyCode,
              ))
          .toList(),
    );
  }

  Future<dynamic> _get(String path) async {
    final response = await _client.get(Uri.parse('${ApiConfig.baseUrl}$path'));
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw ShopCatalogException(
        'Shop-Daten konnten nicht geladen werden (${response.statusCode}).',
        statusCode: response.statusCode,
      );
    }
    try {
      return jsonDecode(response.body);
    } on FormatException {
      throw const ShopCatalogException('Das Backend hat ungültige Shop-Daten geliefert.');
    }
  }

  void close() => _client.close();
}

class ShopCatalogException implements Exception {
  const ShopCatalogException(this.message, {this.statusCode});

  final String message;
  final int? statusCode;

  @override
  String toString() => message;
}

class ShopCatalog {
  const ShopCatalog({required this.store, required this.categories, required this.products});

  final ShopStore store;
  final List<ShopCategory> categories;
  final List<ShopProduct> products;
}

class ShopStore {
  const ShopStore({required this.id, required this.name, required this.slug, this.logoUrl, this.currencyCode = 'EUR'});

  final int id;
  final String name;
  final String slug;
  final String? logoUrl;
  final String currencyCode;

  factory ShopStore.fromJson(Map<String, dynamic> json) => ShopStore(
        id: _readInt(json['storeId'] ?? json['id']),
        name: json['name'] as String? ?? 'markt.ma Shop',
        slug: json['slug'] as String? ?? '',
        logoUrl: _readString(json['logoUrl']),
        currencyCode: json['currencyCode'] as String? ?? 'EUR',
      );
}

class ShopCategory {
  const ShopCategory({required this.id, required this.name, required this.slug});

  final int id;
  final String name;
  final String slug;

  factory ShopCategory.fromJson(Map<String, dynamic> json) => ShopCategory(
        id: _readInt(json['id']),
        name: json['name'] as String? ?? '',
        slug: json['slug'] as String? ?? '',
      );
}

class ShopProduct {
  const ShopProduct({
    required this.id,
    required this.name,
    required this.price,
    required this.currencyCode,
    this.categoryId,
    this.categoryName,
    this.description,
    this.sku,
    this.imageUrl,
    this.imageUrls = const [],
    this.isFeatured = false,
  });

  final int id;
  final String name;
  final double price;
  final String currencyCode;
  final int? categoryId;
  final String? categoryName;
  final String? description;
  final String? sku;
  final String? imageUrl;
  final List<String> imageUrls;
  final bool isFeatured;

  factory ShopProduct.fromJson(
    Map<String, dynamic> json, {
    String defaultCurrencyCode = 'EUR',
  }) {
    final media = (json['media'] as List<dynamic>? ?? const [])
        .whereType<Map<String, dynamic>>()
        .toList();
    final primaryMedia = media.where((item) => item['isPrimary'] == true);
    final firstMedia = primaryMedia.isNotEmpty ? primaryMedia.first : (media.isEmpty ? null : media.first);
    final rawImage = json['primaryImageUrl'] ?? json['imageUrl'] ?? firstMedia?['url'];
    final images = media
        .map((item) => _readString(item['url']))
        .whereType<String>()
        .toList();
    final primaryImage = _readString(rawImage);
    if (primaryImage != null) {
      images.remove(primaryImage);
      images.insert(0, primaryImage);
    }
    final rawPrice = json['basePrice'];
    return ShopProduct(
      id: _readInt(json['id']),
      name: json['title'] as String? ?? '',
      price: rawPrice is num ? rawPrice.toDouble() : double.tryParse('$rawPrice') ?? 0,
      currencyCode: json['currencyCode'] as String? ?? defaultCurrencyCode,
      categoryId: json['categoryId'] == null ? null : _readInt(json['categoryId']),
      categoryName: _readString(json['categoryName']),
      description: _readString(json['description']),
      sku: _readString(json['sku']),
      imageUrl: primaryImage,
      imageUrls: images,
      isFeatured: json['isFeatured'] == true,
    );
  }
}

int _readInt(dynamic value) => value is num ? value.toInt() : int.tryParse('$value') ?? 0;

String? _readString(dynamic value) {
  if (value is! String || value.trim().isEmpty) return null;
  return value.trim();
}
