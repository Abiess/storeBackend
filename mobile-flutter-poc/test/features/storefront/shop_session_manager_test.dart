import 'dart:async';
import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:markt_ma_documents_poc/features/storefront/shop_session_manager.dart';

String _jwt(int seconds) => 'header.${base64Url.encode(utf8.encode(jsonEncode({
  'exp': DateTime.now().millisecondsSinceEpoch ~/ 1000 + seconds,
})))}.signature';
String _session(String token) => jsonEncode({'storeId': 7, 'token': token, 'refreshToken': 'secret'});

void main() {
  test('app restart restores and renews without sending password', () async {
    String? stored = _session(_jwt(-10));
    final manager = ShopSessionManager(read: () async => stored,
      write: (value) async { stored = value; }, delete: () async { stored = null; },
      client: MockClient((request) async {
        expect(request.url.path.endsWith('/customer-session/refresh'), isTrue);
        expect(jsonDecode(request.body), {'refreshToken': 'secret'});
        return http.Response(jsonEncode({'token': _jwt(900), 'refreshToken': 'secret'}), 200);
      }));
    addTearDown(manager.close);
    expect(await manager.restore(7), isTrue);
    expect(await manager.readToken(), isNotNull);
    expect(await manager.restore(8), isFalse);
  });

  test('server and network errors retain credentials for later retry', () async {
    for (final status in [429, 500, 503]) {
      String? stored = _session(_jwt(-1));
      final original = stored;
      final manager = ShopSessionManager(read: () async => stored,
        write: (value) async { stored = value; }, delete: () async { stored = null; },
        client: MockClient((_) async => http.Response('', status)));
      addTearDown(manager.close);
      await expectLater(manager.restore(7), throwsA(isA<StateError>()));
      expect(stored, original);
    }
    String? stored = _session(_jwt(-1));
    final manager = ShopSessionManager(read: () async => stored,
      write: (value) async { stored = value; }, delete: () async { stored = null; },
      client: MockClient((_) async => throw http.ClientException('offline')));
    addTearDown(manager.close);
    await expectLater(manager.restore(7), throwsA(isA<http.ClientException>()));
    expect(stored, isNotNull);
  });

  test('only definitive refresh rejection clears the session', () async {
    String? stored = _session(_jwt(-1));
    final manager = ShopSessionManager(read: () async => stored,
      write: (value) async { stored = value; }, delete: () async { stored = null; },
      client: MockClient((_) async => http.Response('', 401)));
    addTearDown(manager.close);
    expect(await manager.restore(7), isFalse);
    expect(stored, isNull);
  });

  test('parallel requests share a single refresh', () async {
    String? stored = _session(_jwt(-1));
    final response = Completer<http.Response>();
    var calls = 0;
    final manager = ShopSessionManager(read: () async => stored,
      write: (value) async { stored = value; }, delete: () async { stored = null; },
      client: MockClient((_) { calls++; return response.future; }));
    addTearDown(manager.close);
    final first = manager.readToken();
    final second = manager.readToken();
    await Future<void>.delayed(Duration.zero);
    expect(calls, 1);
    response.complete(http.Response(jsonEncode({'token': _jwt(900), 'refreshToken': 'secret'}), 200));
    expect(await first, await second);
  });

  test('late refresh cannot resurrect a logged out session', () async {
    String? stored = _session(_jwt(-1));
    final response = Completer<http.Response>();
    final manager = ShopSessionManager(read: () async => stored,
      write: (value) async { stored = value; }, delete: () async { stored = null; },
      client: MockClient((request) => request.url.path.endsWith('/logout')
        ? Future.value(http.Response('', 204)) : response.future));
    addTearDown(manager.close);
    final refresh = manager.readToken();
    final rejected = expectLater(refresh, throwsA(isA<ShopSessionExpired>()));
    await Future<void>.delayed(Duration.zero);
    await manager.logout();
    response.complete(http.Response(jsonEncode({'token': _jwt(900), 'refreshToken': 'secret'}), 200));
    await rejected;
    expect(stored, isNull);
  });

  test('persistent login stores tokens and never the password', () async {
    String? stored;
    final manager = ShopSessionManager(read: () async => stored,
      write: (value) async { stored = value; }, delete: () async { stored = null; },
      client: MockClient((request) async {
        expect(request.url.path.endsWith('/customer-session/login'), isTrue);
        return http.Response(jsonEncode({'token': _jwt(900), 'refreshToken': 'secret'}), 200);
      }));
    addTearDown(manager.close);
    await manager.login(7, 'customer', 'password-never-save');
    expect(stored, isNot(contains('password-never-save')));
    expect(jsonDecode(stored!)['storeId'], 7);
  });
}
