import 'dart:convert';

import 'package:http/http.dart' as http;

import '../../config/api_config.dart';
import '../../models/auth_response.dart';
import '../../services/token_storage.dart';

/// Store metadata/catalog access plus login to the existing invited-customer endpoint.
class ShopCatalogService {
  ShopCatalogService({http.Client? client}) : _client = client ?? http.Client();

  final http.Client _client;

  Future<ShopCatalog> loadStore(String slug) async {
    final store = await loadStoreMetadata(slug);
    return loadCatalog(store);
  }

  Future<ShopStore> loadStoreMetadata(String slug) async {
    final storeJson = await _get(ApiConfig.publicStoreBySlugPath(slug));
    return ShopStore.fromJson(storeJson as Map<String, dynamic>);
  }

  Future<ShopCatalog> loadCatalog(ShopStore store) async {
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

  Future<AuthResponse> loginCustomer({
    required int storeId,
    required String identifier,
    required String password,
    Future<void> Function(String token)? saveToken,
  }) async {
    final uri = Uri.parse('${ApiConfig.baseUrl}/public/stores/$storeId/customer-login');
    final response = await _client.post(
      uri,
      headers: const {'Content-Type': 'application/json'},
      body: jsonEncode({'identifier': identifier, 'password': password}),
    );
    if (response.statusCode != 200) {
      if (response.statusCode == 401) {
        throw const ShopCatalogException('Kunden-ID/Telefonnummer oder Passwort ist falsch.', statusCode: 401);
      }
      if (response.statusCode == 429) {
        throw const ShopCatalogException('Zu viele Anmeldeversuche. Bitte später erneut versuchen.', statusCode: 429);
      }
      throw ShopCatalogException(_extractMessage(response.body), statusCode: response.statusCode);
    }
    try {
      final auth = AuthResponse.fromJson(jsonDecode(response.body) as Map<String, dynamic>);
      await (saveToken ?? TokenStorage.instance.saveToken)(auth.token);
      return auth;
    } on FormatException {
      throw const ShopCatalogException('Das Backend hat eine ungültige Login-Antwort geliefert.');
    }
  }

  Future<void> logoutCustomer() => TokenStorage.instance.clearToken();

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

  String _extractMessage(String body) {
    try {
      return (jsonDecode(body) as Map<String, dynamic>)['message'] as String? ??
          'Anmeldung fehlgeschlagen. Prüfe Kunden-ID/Telefonnummer und Passwort.';
    } on FormatException {
      return 'Anmeldung fehlgeschlagen. Prüfe Kunden-ID/Telefonnummer und Passwort.';
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
  const ShopStore({
    required this.id,
    required this.name,
    required this.slug,
    this.logoUrl,
    this.currencyCode = 'EUR',
    this.customerAccountMode = 'PUBLIC_REGISTRATION',
  });

  final int id;
  final String name;
  final String slug;
  final String? logoUrl;
  final String currencyCode;
  final String customerAccountMode;

  factory ShopStore.fromJson(Map<String, dynamic> json) => ShopStore(
        id: _readInt(json['storeId'] ?? json['id']),
        name: json['name'] as String? ?? 'markt.ma Shop',
        slug: json['slug'] as String? ?? '',
        logoUrl: _readString(json['logoUrl']),
        currencyCode: json['currencyCode'] as String? ?? 'EUR',
        customerAccountMode: json['customerAccountMode'] as String? ?? 'PUBLIC_REGISTRATION',
      );
}

class ShopCategory {
  const ShopCategory({required this.id, required this.name, required this.slug, this.parentId, this.imageUrl});

  final int id;
  final String name;
  final String slug;
  final int? parentId;
  final String? imageUrl;

  factory ShopCategory.fromJson(Map<String, dynamic> json) => ShopCategory(
        id: _readInt(json['id']),
        name: json['name'] as String? ?? '',
        slug: json['slug'] as String? ?? '',
        parentId: json['parentId'] == null ? null : _readInt(json['parentId']),
        imageUrl: _readString(json['imageUrl']),
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
    this.imageUrl,
    this.isFeatured = false,
  });

  final int id;
  final String name;
  final double price;
  final String currencyCode;
  final int? categoryId;
  final String? categoryName;
  final String? imageUrl;
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
    final rawPrice = json['basePrice'];
    return ShopProduct(
      id: _readInt(json['id']),
      name: json['title'] as String? ?? '',
      price: rawPrice is num ? rawPrice.toDouble() : double.tryParse('$rawPrice') ?? 0,
      currencyCode: json['currencyCode'] as String? ?? defaultCurrencyCode,
      categoryId: json['categoryId'] == null ? null : _readInt(json['categoryId']),
      categoryName: _readString(json['categoryName']),
      imageUrl: _readString(rawImage),
      isFeatured: json['isFeatured'] == true,
    );
  }
}

int _readInt(dynamic value) => value is num ? value.toInt() : int.tryParse('$value') ?? 0;

String? _readString(dynamic value) {
  if (value is! String || value.trim().isEmpty) return null;
  return value.trim();
}
