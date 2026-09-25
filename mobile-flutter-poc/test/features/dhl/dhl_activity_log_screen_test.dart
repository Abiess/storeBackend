import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:markt_ma_documents_poc/features/dhl/dhl_activity_log_screen.dart';
import 'package:markt_ma_documents_poc/services/dhl_service.dart';

void main() {
  const channel = MethodChannel('plugins.it_nomads.com/flutter_secure_storage');
  setUp(() {
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger.setMockMethodCallHandler(
      channel, (call) async => call.method == 'read' ? 'test-token' : null,
    );
  });
  tearDown(() {
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger.setMockMethodCallHandler(channel, null);
  });

  testWidgets('Filter und Seitenwechsel fragen den Store serverseitig ab', (tester) async {
    final requests = <Uri>[];
    final client = MockClient((request) async {
      requests.add(request.url);
      expect(request.headers['Authorization'], 'Bearer test-token');
      expect(request.url.path, '/api/stores/121/dhl/activity-log');
      final page = int.parse(request.url.queryParameters['page']!);
      return http.Response(
        '{"content":[{"action":"STORED","trackingCode":"TRACK-$page","userEmail":"shop@example.com"}],'
        '"totalElements":21,"totalPages":2,"number":$page}', 200,
      );
    });

    await tester.pumpWidget(MaterialApp(home: DhlActivityLogScreen(storeId: 121, dhlService: DhlService(client: client))));
    await tester.pumpAndSettle();
    expect(find.textContaining('TRACK-0'), findsOneWidget);
    expect(requests.last.queryParameters['size'], '20');

    await tester.tap(find.text('Nur heute'));
    await tester.pumpAndSettle();
    expect(requests.last.queryParameters['today'], 'true');
    expect(requests.last.queryParameters['page'], '0');

    await tester.tap(find.byTooltip('Nächste Seite'));
    await tester.pumpAndSettle();
    expect(requests.last.queryParameters['page'], '1');
    expect(find.textContaining('TRACK-1'), findsOneWidget);

    await tester.tap(find.byKey(const ValueKey('dhlLog.action')));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Ausgegeben').last);
    await tester.pumpAndSettle();
    expect(requests.last.queryParameters['action'], 'PICKED_UP');
    expect(requests.last.queryParameters['page'], '0');
  });
}
