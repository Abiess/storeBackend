// Tests fuer das generische Auth-Gate (`lib/core/auth_gate.dart`).
//
// `TokenStorage` nutzt `flutter_secure_storage`, das im Widget-Test keinen
// echten Platform-Channel hat - deshalb wird der zugrunde liegende
// MethodChannel (`plugins.it_nomads.com/flutter_secure_storage`, siehe
// `flutter_secure_storage_platform_interface`) hier gemockt, statt
// `TokenStorage`/`AuthGate` selbst zu aendern.
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:markt_ma_documents_poc/core/auth_gate.dart';

void main() {
  const channel = MethodChannel('plugins.it_nomads.com/flutter_secure_storage');
  String? storedToken;

  setUp(() {
    storedToken = null;
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger.setMockMethodCallHandler(
      channel,
      (call) async {
        switch (call.method) {
          case 'read':
            return storedToken;
          case 'write':
            storedToken = (call.arguments as Map)['value'] as String?;
            return null;
          case 'delete':
            storedToken = null;
            return null;
          default:
            return null;
        }
      },
    );
  });

  tearDown(() {
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger.setMockMethodCallHandler(channel, null);
  });

  testWidgets('ohne gespeichertes Token wird der injizierte Login-Builder angezeigt', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: AuthGate(
          loginBuilder: (context) => const Text('INJECTED_LOGIN'),
          homeBuilder: (context) => const Text('INJECTED_HOME'),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('INJECTED_LOGIN'), findsOneWidget);
    expect(find.text('INJECTED_HOME'), findsNothing);
  });

  testWidgets('mit gespeichertem Token wird der injizierte Home-Builder angezeigt', (tester) async {
    storedToken = 'dummy-jwt-token';

    await tester.pumpWidget(
      MaterialApp(
        home: AuthGate(
          loginBuilder: (context) => const Text('INJECTED_LOGIN'),
          homeBuilder: (context) => const Text('INJECTED_HOME'),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('INJECTED_HOME'), findsOneWidget);
    expect(find.text('INJECTED_LOGIN'), findsNothing);
  });
}
