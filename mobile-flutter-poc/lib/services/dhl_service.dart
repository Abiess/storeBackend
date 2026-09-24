import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config/api_config.dart';
import '../models/dhl_find_parcel_request.dart';
import '../models/dhl_parcel_dto.dart';
import '../models/dhl_pickup_parcel_request.dart';
import '../models/dhl_store_parcel_request.dart';
import '../models/dhl_tracking_validation_dto.dart';
import 'token_storage.dart';

/// Ruft ausschliesslich BESTEHENDE `/api/stores/{storeId}/dhl/**` Endpunkte
/// auf - keine neuen Endpunkte, kein Aufruf der externen DHL-Tracking-/
/// Shipping-API aus Flutter heraus (die Backend-Endpunkte rufen DHL bei
/// Bedarf serverseitig auf, siehe `DhlController`).
///
/// - `listStoredParcels`: liest ausschliesslich bereits in der DB
///   gespeicherte Pakete (siehe DHL-Audit vom 23.09., "Pakete im Laden").
/// - `validateTrackingCode`/`storeParcel`: Einlagerungs-Flow (AUTO-Modus,
///   siehe DHL-Einlagerungs-Audit vom 23.09.) - Kamera-Scanner und
///   manuelles Slot-Grid sind bewusst NICHT Teil dieses Schritts.
/// - `findParcel`/`pickupParcel`: Abhol-Flow ("Paket ausgeben") - sucht ein
///   eingelagertes Paket und markiert es nach erneuter, autoritativer
///   DHL-Validierung als abgeholt (siehe `DhlController.pickupParcel`).
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

  /// POST /api/stores/{storeId}/dhl/tracking/validate
  ///
  /// Reine UX-Vorpruefung (siehe DHL-Einlagerungs-Audit vom 23.09.) - die
  /// autoritative Pruefung erfolgt serverseitig ERNEUT in [storeParcel].
  /// Liefert bei HTTP 200 IMMER ein Ergebnis (`status` = `VALID` oder
  /// `NOT_FOUND`, siehe `DhlController.validateTrackingCode`).
  ///
  /// Ein Nicht-200-Status wird - identisch zur bestehenden Angular-
  /// Klassifizierung (`DhlErrorService.classifyTrackingValidationError`) -
  /// in genau zwei Faelle unterschieden:
  /// - `errorCode`/`code` == `DHL_VALIDATION_ERROR` oder
  ///   `DHL_TRACKING_NOT_FOUND` (HTTP 422): FACHLICHE Ablehnung, kein
  ///   technisches Problem - wird hier bewusst NICHT als [ApiException]
  ///   geworfen, sondern als `status: NOT_FOUND`-Ergebnis zurueckgegeben
  ///   (identische Behandlung wie ein "echtes" NOT_FOUND).
  /// - alles andere (Connectivity/Auth/DHL-Technikfehler/nicht
  ///   konfiguriert/unbekannt): ECHTES technisches Problem - wird als
  ///   [ApiException] geworfen, der Aufrufer MUSS dies fail-closed als
  ///   technischen Fehlerzustand behandeln (niemals als Einlagern-Freigabe).
  Future<DhlTrackingValidationDto> validateTrackingCode(int storeId, String trackingCode) async {
    final token = await TokenStorage.instance.readToken();
    final uri = Uri.parse('${ApiConfig.baseUrl}${ApiConfig.dhlTrackingValidatePath(storeId)}');

    final response = await _client.post(
      uri,
      headers: {..._authHeaders(token), 'Content-Type': 'application/json'},
      body: jsonEncode({'trackingCode': trackingCode}),
    );

    if (response.statusCode == 200) {
      return DhlTrackingValidationDto.fromJson(jsonDecode(response.body) as Map<String, dynamic>);
    }

    final errorCode = _extractErrorCode(response.body);
    if (errorCode == 'DHL_VALIDATION_ERROR' || errorCode == 'DHL_TRACKING_NOT_FOUND') {
      return DhlTrackingValidationDto(
        status: 'NOT_FOUND',
        trackingCode: trackingCode,
        dhlErrorMessage: _extractMessage(response.body),
      );
    }

    throw ApiException(response.statusCode, _extractMessage(response.body));
  }

  /// POST /api/stores/{storeId}/dhl/parcels/store
  ///
  /// Lagert ein Paket ein - in diesem Implementierungsschritt AUSSCHLIESSLICH
  /// im AUTO-Modus (siehe [DhlStoreParcelRequest]). WICHTIG: Das Backend
  /// validiert den `trackingCode` hierbei selbst NOCHMALS autoritativ gegen
  /// die DHL Tracking API (siehe `DhlController.storeParcel`, Kommentar
  /// "AUTHORITATIVE DHL VALIDATION") - die vorherige [validateTrackingCode]
  /// ist ausschliesslich UX-Vorpruefung. Es werden HIER keine DHL-Metadaten
  /// vom Client mitgesendet/vorgetaeuscht; das serverseitige Validierungs-
  /// ergebnis (Produkt/Gewicht/Status/...) fliesst ausschliesslich
  /// serverseitig in die gespeicherten `DhlParcel`-Metadaten ein und kommt
  /// unveraendert in der Response zurueck (siehe [DhlParcelDto]).
  Future<DhlParcelDto> storeParcel(int storeId, DhlStoreParcelRequest request) async {
    final token = await TokenStorage.instance.readToken();
    final uri = Uri.parse('${ApiConfig.baseUrl}${ApiConfig.dhlStoreParcelPath(storeId)}');

    final response = await _client.post(
      uri,
      headers: {..._authHeaders(token), 'Content-Type': 'application/json'},
      body: jsonEncode(request.toJson()),
    );

    if (response.statusCode != 200) {
      throw ApiException(response.statusCode, _extractMessage(response.body));
    }

    return DhlParcelDto.fromJson(jsonDecode(response.body) as Map<String, dynamic>);
  }

  /// POST /api/stores/{storeId}/dhl/parcels/find
  ///
  /// Sucht ein bereits eingelagertes Paket anhand des Tracking-Codes (reine
  /// DB-Suche, siehe `DhlController.findParcel` - kein DHL-API-Call). Wird
  /// vom Abhol-Flow ([DhlPickupParcelScreen]) genutzt, NACHDEM
  /// [validateTrackingCode] den Code als `VALID` bestaetigt hat.
  ///
  /// Wirft [ApiException] bei 404 (`code == 'PARCEL_NOT_FOUND'`, kein
  /// passendes eingelagertes Paket) oder 400 (leerer Tracking-Code).
  Future<DhlParcelDto> findParcel(int storeId, DhlFindParcelRequest request) async {
    final token = await TokenStorage.instance.readToken();
    final uri = Uri.parse('${ApiConfig.baseUrl}${ApiConfig.dhlFindParcelPath(storeId)}');

    final response = await _client.post(
      uri,
      headers: {..._authHeaders(token), 'Content-Type': 'application/json'},
      body: jsonEncode(request.toJson()),
    );

    if (response.statusCode != 200) {
      throw ApiException(
        response.statusCode,
        _extractMessage(response.body),
        code: _extractErrorCode(response.body),
      );
    }

    return DhlParcelDto.fromJson(jsonDecode(response.body) as Map<String, dynamic>);
  }

  /// POST /api/stores/{storeId}/dhl/parcels/pickup
  ///
  /// Markiert ein gefundenes Paket als abgeholt. WICHTIG: Das Backend
  /// validiert den `trackingCode` hierbei selbst NOCHMALS autoritativ gegen
  /// die DHL Tracking API (siehe `DhlController.pickupParcel`, Kommentar
  /// "AUTHORITATIVE DHL VALIDATION") - [findParcel] davor ist ausschliesslich
  /// UX-Vorpruefung/Anzeige (Fachlagerplatz etc.), keine Berechtigung zur
  /// Abholung.
  ///
  /// Wirft [ApiException] mit strukturiertem `code` u.a. fuer:
  /// - 404 `PARCEL_NOT_FOUND`
  /// - 409 `PARCEL_ALREADY_PICKED_UP`
  /// - 422 `DHL_TRACKING_NOT_FOUND` / `DHL_VALIDATION_ERROR` (DHL bestaetigt
  ///   die Sendung nicht mehr)
  /// - 503/504 technische DHL-Fehler (Authentifizierung/Konnektivitaet)
  Future<DhlParcelDto> pickupParcel(int storeId, DhlPickupParcelRequest request) async {
    final token = await TokenStorage.instance.readToken();
    final uri = Uri.parse('${ApiConfig.baseUrl}${ApiConfig.dhlPickupParcelPath(storeId)}');

    final response = await _client.post(
      uri,
      headers: {..._authHeaders(token), 'Content-Type': 'application/json'},
      body: jsonEncode(request.toJson()),
    );

    if (response.statusCode != 200) {
      throw ApiException(
        response.statusCode,
        _extractMessage(response.body),
        code: _extractErrorCode(response.body),
      );
    }

    return DhlParcelDto.fromJson(jsonDecode(response.body) as Map<String, dynamic>);
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

  /// Extrahiert `code`/`errorCode` aus einer DHL-Fehlerantwort (siehe
  /// `DhlController.validateTrackingCode`/`storeParcel`, die je nach
  /// Fehlerpfad `code` ODER `errorCode` verwenden) - `null` wenn nicht
  /// vorhanden/kein valides JSON.
  String? _extractErrorCode(String body) {
    try {
      final json = jsonDecode(body) as Map<String, dynamic>;
      return (json['errorCode'] as String?) ?? (json['code'] as String?);
    } catch (_) {
      return null;
    }
  }
}
