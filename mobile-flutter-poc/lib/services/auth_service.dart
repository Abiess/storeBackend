import 'dart:convert';
import 'package:http/http.dart' as http;

import '../config/api_config.dart';
import '../models/auth_response.dart';
import 'token_storage.dart';

/// Login gegen das BESTEHENDE `/api/auth/login` - exakt derselbe Request-
/// Body wie Angular (`LoginRequest.java`: email, password). Kein separater
/// Mobile-Auth-Endpunkt, keine parallele Auth-Architektur.
class AuthService {
  AuthService({http.Client? client}) : _client = client ?? http.Client();

  final http.Client _client;

  Future<AuthResponse> login({required String email, required String password}) async {
    final uri = Uri.parse('${ApiConfig.baseUrl}${ApiConfig.loginPath}');

    final response = await _client.post(
      uri,
      headers: const {'Content-Type': 'application/json'},
      body: jsonEncode({'email': email, 'password': password}),
    );

    if (response.statusCode != 200) {
      throw ApiException(response.statusCode, _extractMessage(response.body));
    }

    final json = jsonDecode(response.body) as Map<String, dynamic>;
    final auth = AuthResponse.fromJson(json);
    await TokenStorage.instance.saveToken(auth.token);
    return auth;
  }

  Future<void> logout() => TokenStorage.instance.clearToken();

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
