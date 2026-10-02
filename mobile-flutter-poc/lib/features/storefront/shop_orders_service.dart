import 'dart:convert';
import 'package:http/http.dart' as http;
import '../../config/api_config.dart';
import '../../services/token_storage.dart';

class ShopOrdersService {
  ShopOrdersService({http.Client? client, Future<String?> Function()? readToken})
      : _client = client ?? http.Client(),
        _readToken = readToken ?? TokenStorage.instance.readToken;
  final http.Client _client;
  final Future<String?> Function() _readToken;

  Future<List<ShopOrderSummary>> loadOrders(int storeId) async {
    final token = await _readToken();
    if (token == null || token.isEmpty) {
      throw const ShopOrdersException('Bitte erneut anmelden.');
    }
    final response = await _client.get(
      Uri.parse('${ApiConfig.baseUrl}/public/customer/orders')
          .replace(queryParameters: {'storeId': '$storeId'}),
      headers: {'Authorization': 'Bearer $token'},
    );
    if (response.statusCode == 401 || response.statusCode == 403) {
      throw const ShopOrdersException('Bitte erneut anmelden.');
    }
    if (response.statusCode != 200) {
      throw const ShopOrdersException('Bestellungen konnten nicht geladen werden.');
    }
    try {
      final data = jsonDecode(response.body) as List<dynamic>;
      return data.map((item) => ShopOrderSummary.fromJson(item as Map<String, dynamic>)).toList();
    } on FormatException {
      throw const ShopOrdersException('Ungültige Bestelldaten erhalten.');
    } on TypeError {
      throw const ShopOrdersException('Ungültige Bestelldaten erhalten.');
    }
  }

  void close() => _client.close();
}

class ShopOrdersException implements Exception {
  const ShopOrdersException(this.message);
  final String message;
  @override
  String toString() => message;
}

class ShopOrderSummary {
  const ShopOrderSummary({required this.orderNumber, required this.status,
    required this.totalAmount, required this.itemCount, this.createdAt});
  final String orderNumber;
  final String status;
  final double totalAmount;
  final int itemCount;
  final DateTime? createdAt;
  factory ShopOrderSummary.fromJson(Map<String, dynamic> json) => ShopOrderSummary(
    orderNumber: json['orderNumber'] as String,
    status: json['status'] as String,
    totalAmount: (json['totalAmount'] as num).toDouble(),
    itemCount: (json['itemCount'] as num).toInt(),
    createdAt: DateTime.tryParse(json['createdAt']?.toString() ?? ''),
  );
  String get statusLabel => switch (status) {
    'PENDING' => 'Eingegangen',
    'CONFIRMED' => 'Bestätigt',
    'PROCESSING' => 'In Bearbeitung',
    'SHIPPED' => 'Versendet',
    'DELIVERED' => 'Zugestellt',
    'CANCELLED' => 'Storniert',
    'PENDING_PAYMENT' => 'Zahlung ausstehend',
    'PAYMENT_FAILED' => 'Zahlung fehlgeschlagen',
    'REFUNDED' => 'Erstattet',
    _ => status,
  };
}
