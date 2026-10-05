import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;
import '../../config/api_config.dart';

class ShopSessionExpired implements Exception {
  const ShopSessionExpired();
  @override
  String toString() => 'Deine Sitzung ist abgelaufen. Bitte erneut anmelden.';
}

/// One atomic secure-storage record per active shop customer, with no password.
class ShopSessionManager {
  ShopSessionManager({http.Client? client, Future<String?> Function()? read,
    Future<void> Function(String)? write, Future<void> Function()? delete})
      : _client = client ?? http.Client(),
        _read = read ?? (() => _storage.read(key: _key)),
        _write = write ?? ((value) => _storage.write(key: _key, value: value)),
        _delete = delete ?? (() => _storage.delete(key: _key));
  static final instance = ShopSessionManager();
  static const _storage = FlutterSecureStorage();
  static const _key = 'markt_ma_shop_session';
  final http.Client _client;
  final Future<String?> Function() _read;
  final Future<void> Function(String) _write;
  final Future<void> Function() _delete;
  Future<String?>? _refreshing;
  Future<void> _writes = Future.value();
  int _generation = 0;

  Future<Map<String, dynamic>?> _stored() async {
    final raw = await _read();
    if (raw == null) return null;
    return jsonDecode(raw) as Map<String, dynamic>;
  }

  Future<void> _save(Map<String, dynamic> session, int generation) {
    final next = _writes.then((_) async {
      if (generation == _generation) await _write(jsonEncode(session));
    });
    _writes = next.catchError((Object _) {});
    return next;
  }

  Future<void> login(int storeId, String identifier, String password) async {
    final generation = ++_generation;
    _refreshing = null;
    final response = await _client.post(
      Uri.parse('${ApiConfig.baseUrl}/public/stores/$storeId/customer-session/login'),
      headers: const {'Content-Type': 'application/json'},
      body: jsonEncode({'identifier': identifier, 'password': password}),
    ).timeout(const Duration(seconds: 20));
    if (response.statusCode == 401) {
      throw StateError('Kunden-ID/Telefonnummer oder Passwort ist falsch.');
    }
    if (response.statusCode != 200) throw StateError('Anmeldung fehlgeschlagen. Bitte erneut versuchen.');
    final data = _credentials(response.body);
    await _save({'storeId': storeId, ...data}, generation);
  }

  Map<String, dynamic> _credentials(String body) {
    final data = jsonDecode(body) as Map<String, dynamic>;
    final token = data['token'];
    final refresh = data['refreshToken'];
    if (token is! String || token.isEmpty || refresh is! String || refresh.isEmpty) {
      throw const FormatException('Ungültige Sitzung');
    }
    return {'token': token, 'refreshToken': refresh};
  }

  Future<bool> restore(int storeId) async {
    final session = await _stored();
    if (session == null || session['storeId'] != storeId) return false;
    try {
      await _refresh(session);
      return true;
    } on ShopSessionExpired {
      return false;
    }
    // Connectivity, rate-limit and server errors reach the retry UI.
    // They never delete the saved session.
  }

  Future<String?> readToken() async {
    final session = await _stored();
    if (session == null) return null;
    final token = session['token'] as String;
    var needsRefresh = true;
    try {
      final payload = jsonDecode(utf8.decode(base64Url.decode(base64Url.normalize(token.split('.')[1])))) as Map<String, dynamic>;
      final exp = payload['exp'] as num;
      needsRefresh = exp * 1000 <= DateTime.now().millisecondsSinceEpoch + 60000;
    } catch (_) {
      // Opaque or old token: ask the server rather than trusting local decoding.
    }
    return needsRefresh ? _refresh(session) : token;
  }

  Future<String?> _refresh(Map<String, dynamic> session) {
    final current = _refreshing;
    if (current != null) return current;
    late final Future<String?> future;
    future = _renew(session).whenComplete(() {
      if (identical(_refreshing, future)) _refreshing = null;
    });
    _refreshing = future;
    return future;
  }

  Future<String?> _renew(Map<String, dynamic> session) async {
    final generation = _generation;
    final storeId = session['storeId'];
    final response = await _client.post(
      Uri.parse('${ApiConfig.baseUrl}/public/stores/$storeId/customer-session/refresh'),
      headers: const {'Content-Type': 'application/json'},
      body: jsonEncode({'refreshToken': session['refreshToken']}),
    ).timeout(const Duration(seconds: 20));
    if (generation != _generation) throw const ShopSessionExpired();
    if (response.statusCode == 401) {
      await _clear(generation);
      throw const ShopSessionExpired();
    }
    if (response.statusCode != 200) throw StateError('Sitzung konnte nicht verlängert werden. Bitte erneut versuchen.');
    final credentials = _credentials(response.body);
    await _save({'storeId': storeId, ...credentials}, generation);
    if (generation != _generation) throw const ShopSessionExpired();
    return credentials['token'] as String;
  }

  Future<void> _clear(int generation) {
    final next = _writes.then((_) async {
      if (generation == _generation) await _delete();
    });
    _writes = next.catchError((Object _) {});
    return next;
  }

  Future<void> logout() async {
    final session = await _stored();
    final generation = ++_generation;
    _refreshing = null;
    await _clear(generation);
    if (session == null) return;
    // Local logout must work offline. Revoke the refresh secret when reachable.
    try {
      await _client.post(
        Uri.parse('${ApiConfig.baseUrl}/public/stores/${session['storeId']}/customer-session/logout'),
        headers: const {'Content-Type': 'application/json'},
        body: jsonEncode({'refreshToken': session['refreshToken']}),
      ).timeout(const Duration(seconds: 5));
    } catch (_) {
      // The secret has already been removed from this device.
    }
  }

  void close() => _client.close();
}
