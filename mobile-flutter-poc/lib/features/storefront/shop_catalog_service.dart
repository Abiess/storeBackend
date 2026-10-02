import 'dart:convert';

import 'package:http/http.dart' as http;

import '../../config/api_config.dart';
import '../../models/auth_response.dart';
import '../../services/token_storage.dart';

/// Store metadata/catalog access plus login to the existing invited-customer endpoint.
class ShopCatalogService {
  ShopCatalogService({http.Client? client, Future<String?> Function()? readToken})
      : _client = client ?? http.Client(),
        _readToken = readToken ?? TokenStorage.instance.readToken;

  final http.Client _client;
  final Future<String?> Function() _readToken;

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

  Future<List<ShopVariant>> loadVariants(int storeId, int productId) async {
    final json = await _get('/public/stores/$storeId/products/$productId/variants');
    return (json as List<dynamic>)
        .map((item) => ShopVariant.fromJson(item as Map<String, dynamic>))
        .toList();
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

  Future<ShopCart> loadCart(int storeId) async {
    final token = await _cartToken();
    final response = await _client.get(
      Uri.parse('${ApiConfig.baseUrl}/public/cart?storeId=$storeId'),
      headers: {'Authorization': 'Bearer $token'},
    );
    _checkCartResponse(response);
    try {
      return ShopCart.fromJson(jsonDecode(response.body) as Map<String, dynamic>);
    } on FormatException {
      throw const ShopCatalogException('Das Backend hat ungültige Warenkorb-Daten geliefert.');
    }
  }

  Future<ShopCart> addToCart({required int storeId, required int productId, required int quantity, int? variantId}) async {
    final token = await _cartToken();
    final response = await _client.post(
      Uri.parse('${ApiConfig.baseUrl}/public/cart/items'),
      headers: {'Authorization': 'Bearer $token', 'Content-Type': 'application/json'},
      body: jsonEncode({'storeId': storeId, if (variantId == null) 'productId': productId else 'variantId': variantId, 'quantity': quantity}),
    );
    _checkCartResponse(response);
    return loadCart(storeId);
  }

  Future<ShopCart> updateCartItem({
    required int storeId,
    required int itemId,
    required int quantity,
  }) async {
    if (quantity < 1) throw ArgumentError.value(quantity, 'quantity', 'Must be positive');
    final token = await _cartToken();
    final response = await _client.put(
      Uri.parse('${ApiConfig.baseUrl}/public/cart/items/$itemId'),
      headers: {'Authorization': 'Bearer $token', 'Content-Type': 'application/json'},
      body: jsonEncode({'quantity': quantity}),
    );
    _checkCartResponse(response);
    return loadCart(storeId);
  }

  Future<ShopCart> removeCartItem({required int storeId, required int itemId}) async {
    final token = await _cartToken();
    final response = await _client.delete(
      Uri.parse('${ApiConfig.baseUrl}/public/cart/items/$itemId'),
      headers: {'Authorization': 'Bearer $token'},
    );
    _checkCartResponse(response);
    return loadCart(storeId);
  }

  Future<String> submitOrderRequest(int storeId) async {
    final token = await _cartToken();
    final response = await _client.post(
      Uri.parse('${ApiConfig.baseUrl}/public/orders/checkout'),
      headers: {'Authorization': 'Bearer $token', 'Content-Type': 'application/json'},
      body: jsonEncode({
        'storeId': storeId,
        'paymentMethod': 'ORDER_REQUEST',
        'shippingProvider': 'PICKUP',
        'deliveryType': 'PICKUP',
        'shippingAddress': <String, String>{},
        'billingAddress': <String, String>{},
      }),
    );
    _checkCartResponse(response);
    try {
      final json = jsonDecode(response.body) as Map<String, dynamic>;
      final orderNumber = json['orderNumber'] as String?;
      if (orderNumber == null || orderNumber.isEmpty) throw const FormatException();
      return orderNumber;
    } on FormatException {
      throw const ShopCatalogException('Das Backend hat keine Bestellnummer geliefert.');
    }
  }

  Future<String> _cartToken() async {
    final token = await _readToken();
    if (token == null || token.isEmpty) {
      throw const ShopCatalogException('Bitte erneut anmelden.', statusCode: 401);
    }
    return token;
  }

  void _checkCartResponse(http.Response response) {
    if (response.statusCode >= 200 && response.statusCode < 300) return;
    if (response.statusCode == 401 || response.statusCode == 403) {
      throw ShopCatalogException('Bitte erneut anmelden.', statusCode: response.statusCode);
    }
    throw ShopCatalogException('Warenkorb konnte nicht aktualisiert werden (${response.statusCode}).',
        statusCode: response.statusCode);
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

class ShopCart {
  const ShopCart({required this.items, required this.itemCount, required this.subtotal});

  final List<ShopCartItem> items;
  final int itemCount;
  final double subtotal;

  factory ShopCart.fromJson(Map<String, dynamic> json) => ShopCart(
        items: (json['items'] as List<dynamic>? ?? const [])
            .map((item) => ShopCartItem.fromJson(item as Map<String, dynamic>)).toList(),
        itemCount: _readInt(json['itemCount']),
        subtotal: _readDouble(json['subtotal']),
      );
}

class ShopCartItem {
  const ShopCartItem({this.id, required this.name, required this.quantity});

  final int? id;
  final String name;
  final int quantity;

  factory ShopCartItem.fromJson(Map<String, dynamic> json) => ShopCartItem(
        id: json['id'] == null ? null : _readInt(json['id']),
        name: json['productTitle'] as String? ?? 'Produkt',
        quantity: _readInt(json['quantity']),
      );
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
    this.maintenanceEnabled = false,
    this.maintenanceMode = 'DEFAULT',
    this.maintenanceImageUrl,
    this.whatsappButtonEnabled = true,
    this.whatsappNumber,
    this.greetingMessage,
  });

  final int id;
  final String name;
  final String slug;
  final String? logoUrl;
  final String currencyCode;
  final String customerAccountMode;
  final bool maintenanceEnabled;
  final String maintenanceMode;
  final String? maintenanceImageUrl;
  final bool whatsappButtonEnabled;
  final String? whatsappNumber;
  final String? greetingMessage;

  Uri? get whatsappUri {
    if (maintenanceEnabled || customerAccountMode == 'INVITE_ONLY' || !whatsappButtonEnabled) return null;
    final number = (whatsappNumber ?? '').replaceAll(RegExp(r'[^0-9]'), '');
    if (number.isEmpty) return null;
    return Uri.https('wa.me', '/$number', {
      'text': greetingMessage?.trim().isNotEmpty == true
          ? greetingMessage!.trim()
          : 'Hallo, ich interessiere mich für eure Produkte auf markt.ma',
    });
  }

  factory ShopStore.fromJson(Map<String, dynamic> json) => ShopStore(
        id: _readInt(json['storeId'] ?? json['id']),
        name: json['name'] as String? ?? 'markt.ma Shop',
        slug: json['slug'] as String? ?? '',
        logoUrl: _readString(json['logoUrl']),
        currencyCode: json['currencyCode'] as String? ?? 'EUR',
        customerAccountMode: json['customerAccountMode'] as String? ?? 'PUBLIC_REGISTRATION',
        maintenanceEnabled: json['maintenanceEnabled'] == true,
        maintenanceMode: json['maintenanceMode'] as String? ?? 'DEFAULT',
        maintenanceImageUrl: _readString(json['maintenanceImageUrl']),
        whatsappButtonEnabled: json['whatsappButtonEnabled'] != false,
        whatsappNumber: _readString(json['whatsappNumber']),
        greetingMessage: _readString(json['greetingMessage']),
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
    this.taxRate,
    this.stock,
    this.isFeatured = false,
  });

  final int id;
  final String name;
  final double price;
  final String currencyCode;
  final int? categoryId;
  final String? categoryName;
  final String? imageUrl;
  final double? taxRate;
  final int? stock;
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
      stock: json['stock'] == null ? null : _readInt(json['stock']),
      taxRate: switch (json['taxRate']) {
        num value => value.toDouble(),
        String value => double.tryParse(value),
        _ => null,
      },
      isFeatured: json['isFeatured'] == true,
    );
  }
}

class ShopVariant {
  const ShopVariant({required this.id, required this.label, this.price,
    this.stock, this.imageUrl, this.isActive = true});

  final int id;
  final String label;
  final double? price;
  final int? stock;
  final String? imageUrl;
  final bool isActive;

  factory ShopVariant.fromJson(Map<String, dynamic> json) {
    final attributes = json['attributes'];
    final options = [
      for (final key in ['option1', 'option2', 'option3'])
        if (_readString(json[key]) != null) _readString(json[key])!,
    ];
    final labels = options.isNotEmpty ? options : [
      if (attributes is Map)
        for (final value in attributes.values)
          if (_readString(value) != null) _readString(value)!,
    ];
    final stock = json['stockQuantity'] ?? json['quantity'];
    return ShopVariant(
      id: _readInt(json['id']),
      label: labels.isNotEmpty ? labels.join(' / ') : _readString(json['sku']) ?? 'Variante',
      price: json['price'] == null ? null : _readDouble(json['price']),
      stock: stock == null ? null : _readInt(stock),
      imageUrl: _readString(json['imageUrl']),
      isActive: json['isActive'] != false,
    );
  }
}

int _readInt(dynamic value) => value is num ? value.toInt() : int.tryParse('$value') ?? 0;

double _readDouble(dynamic value) => value is num ? value.toDouble() : double.tryParse('$value') ?? 0;

String? _readString(dynamic value) {
  if (value is! String || value.trim().isEmpty) return null;
  return value.trim();
}
