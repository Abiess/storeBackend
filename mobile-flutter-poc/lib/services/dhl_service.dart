import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config/api_config.dart';
import '../models/dhl_parcel_dto.dart';
import 'token_storage.dart';

/// Ruft ausschliesslich den BESTEHENDEN, lesenden Endpoint
/// `GET /api/stores/{storeId}/dhl/parcels/stored` auf (siehe DHL-Audit vom
/// 23.09., `DhlController.listStoredParcels`) - keine neuen Endpunkte, kein
/// Aufruf der externen DHL-Tracking-/Shipping-API aus Flutter heraus. Diese
/// Methode liest ausschliesslich bereits in der DB gespeicherte Pakete.
///
/// Schreibende Paketshop-Flows (Einlagern/Abholen/Stornieren/Slots) sind
/// bewusst NICHT Teil dieses Service - das ist ein spaeterer, separater
/// Schritt (siehe Aufgabenstellung "Pakete im Laden" vom 23.09.).
class DhlService {
  DhlService({http.Client? client}) : _client = client ?? http.Client();

  final http.Client _client;

  Future<List<DhlParcelDto>> listStoredParcels(int storeId) async {
    final token = await TokenStorage.instance.readToken();
    final uri = Uri.parse('${ApiConfig.baseUrl}${ApiConfig.dhlStoredParcelsPath(storeId)}');

    final response = await _client.get(uri, headers: _authHeaders(token));

    if (response.statusCode != 200) {
      throw ApiException(response.statusCode, _extractMessage(response.body));
    }

    final list = jsonDecode(response.body) as List<dynamic>;
    return list
        .whereType<Map<String, dynamic>>()
        .map(DhlParcelDto.fromJson)
        .toList();
  }

  Map<String, String> _authHeaders(String? token) => {
        if (token != null) 'Authorization': 'Bearer $token',
      };

  /// Das Backend liefert bei Fehlern konsistent {"message": "..."}
  /// (siehe GlobalExceptionHandler) - hier robust extrahiert, falls der
  /// Body doch mal kein valides JSON ist (z.B. Proxy-Fehlerseite).
  String _extractMessage(String body) {
    try {
      final json = jsonDecode(body) as Map<String, dynamic>;
      return (json['message'] as String?) ?? 'Unbekannter Fehler';
    } catch (_) {
      return body.isEmpty ? 'Unbekannter Fehler' : body;
    }
  }
}
