import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Haelt das markt.ma-JWT sicher lokal (Android Keystore / iOS Keychain
/// via `flutter_secure_storage`) - KEIN SharedPreferences/Plaintext.
///
/// Bewusst ein einzelner, langlebiger Token (kein Refresh-Flow im PoC,
/// da das Backend aktuell nur ein einzelnes 7-Tage-JWT ausstellt, siehe
/// `jwt.expiration` in application.yml - kein Refresh-Token-Endpunkt
/// vorhanden).
class TokenStorage {
  TokenStorage._();
  static final TokenStorage instance = TokenStorage._();

  final _storage = const FlutterSecureStorage();
  static const _tokenKey = 'markt_ma_jwt';

  Future<void> saveToken(String token) => _storage.write(key: _tokenKey, value: token);

  Future<String?> readToken() => _storage.read(key: _tokenKey);

  Future<void> clearToken() => _storage.delete(key: _tokenKey);
}

/// Einheitliche Fehlerdarstellung fuer die UI. Das Backend liefert bei
/// Fehlern konsistent ein JSON-Objekt mit einem "message"-Feld (siehe
/// GlobalExceptionHandler) - wird hier 1:1 durchgereicht.
class ApiException implements Exception {
  final int statusCode;
  final String message;

  ApiException(this.statusCode, this.message);

  @override
  String toString() => 'ApiException($statusCode): $message';
}
