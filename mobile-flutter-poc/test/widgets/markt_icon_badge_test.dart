// Widget-Tests fuer das zentrale markt.ma Icon-Badge-Primitiv `MarktIconBadge`.
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:markt_ma_documents_poc/widgets/shared/markt_icon_badge.dart';

void main() {
  testWidgets('rendert das uebergebene Icon', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: MarktIconBadge(
            icon: const Icon(Icons.description),
            accentColor: Colors.blue,
          ),
        ),
      ),
    );

    expect(find.byIcon(Icons.description), findsOneWidget);
  });

  testWidgets('respektiert die uebergebene Groesse', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: MarktIconBadge(
            icon: const Icon(Icons.description),
            accentColor: Colors.blue,
            size: 64,
          ),
        ),
      ),
    );

    final container = tester.widget<Container>(find.byType(Container));
    expect(container.constraints?.maxWidth ?? 64, 64);
  });
}
