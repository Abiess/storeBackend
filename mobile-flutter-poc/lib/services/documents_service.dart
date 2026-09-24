import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';

import '../config/api_config.dart';
import '../models/document_dto.dart';
import 'token_storage.dart';

/// Ruft ausschliesslich BESTEHENDE `/api/documents/**` Endpunkte auf - keine
/// neuen Endpunkte, keine neuen DTO-Vertraege. Multipart-Feldnamen sind
/// exakt wie vom bestehenden `DocumentController.upload(...)` erwartet:
/// `file` (MultipartFile) + `title` (String, Pflichtfeld) als eigene
/// Form-Felder (KEIN JSON-Part, siehe Audit).
class DocumentsService {
  DocumentsService({http.Client? client}) : _client = client ?? http.Client();

  final http.Client _client;

  Future<List<DocumentDto>> listMine() async {
    final token = await TokenStorage.instance.readToken();
    final uri = Uri.parse('${ApiConfig.baseUrl}${ApiConfig.documentsListPath}');

    final response = await _client.get(uri, headers: _authHeaders(token));

    if (response.statusCode != 200) {
      throw ApiException(response.statusCode, _extractMessage(response.body));
    }

    final list = jsonDecode(response.body) as List<dynamic>;
    return list.map((e) => DocumentDto.fromJson(e as Map<String, dynamic>)).toList();
  }

  /// Foto (native Kamera, siehe `image_picker` in DocumentsScreen) + Titel
  /// als Multipart-Request an das bestehende `/api/documents/upload`.
  ///
  /// WICHTIG (Lehre aus dem Angular/iOS-Bugfix): `contentType` wird explizit
  /// aus der Dateiendung bestimmt statt dem Default zu vertrauen, da manche
  /// Kamera-Implementierungen sonst `application/octet-stream` senden
  /// wuerden (identisches Risiko wie beim Android-Capture-Bug im
  /// Angular-Client - hier von Anfang an vermieden statt spaeter gefixt).
  Future<DocumentDto> uploadPhoto({required File photo, required String title}) async {
    final token = await TokenStorage.instance.readToken();
    final uri = Uri.parse('${ApiConfig.baseUrl}${ApiConfig.documentsUploadPath}');

    final request = http.MultipartRequest('POST', uri);
    if (token != null) {
      request.headers['Authorization'] = 'Bearer $token';
    }
    request.fields['title'] = title;
    request.files.add(
      await http.MultipartFile.fromPath(
        'file',
        photo.path,
        filename: photo.uri.pathSegments.isNotEmpty ? photo.uri.pathSegments.last : 'photo.jpg',
        contentType: _guessImageMediaType(photo.path),
      ),
    );

    final streamedResponse = await _client.send(request);
    final response = await http.Response.fromStream(streamedResponse);

    if (response.statusCode != 200 && response.statusCode != 201) {
      throw ApiException(response.statusCode, _extractMessage(response.body));
    }

    return DocumentDto.fromJson(jsonDecode(response.body) as Map<String, dynamic>);
  }

  Map<String, String> _authHeaders(String? token) => {
        if (token != null) 'Authorization': 'Bearer $token',
      };

  MediaType _guessImageMediaType(String path) {
    final lower = path.toLowerCase();
    if (lower.endsWith('.png')) return MediaType('image', 'png');
    if (lower.endsWith('.heic')) return MediaType('image', 'heic');
    if (lower.endsWith('.heif')) return MediaType('image', 'heif');
    if (lower.endsWith('.webp')) return MediaType('image', 'webp');
    // Native Kamera (Android/iOS via image_picker) liefert praktisch immer .jpg/.jpeg.
    return MediaType('image', 'jpeg');
  }

  String _extractMessage(String body) {
    try {
      final json = jsonDecode(body) as Map<String, dynamic>;
      return (json['message'] as String?) ?? 'Unbekannter Fehler';
    } catch (_) {
      return body.isEmpty ? 'Unbekannter Fehler' : body;
    }
  }
}
