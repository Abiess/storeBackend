// Widget-Tests fuer das zentrale markt.ma Icon-Badge-Primitiv `MarktIconBadge`.
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:markt_ma_documents_poc/widgets/shared/markt_icon_badge.dart';

void main() {
  testWidgets('rendert das uebergebene Icon', (tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: MarktIconBadge(
            icon: Icon(Icons.description),
            accentColor: Colors.blue,
          ),
        ),
      ),
    );

    expect(find.byIcon(Icons.description), findsOneWidget);
  });

  testWidgets('nutzt den zentralen MarktBadgeTheme-Default (48) ohne eigenes Theme', (tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: MarktIconBadge(icon: Icon(Icons.description), accentColor: Colors.blue),
        ),
      ),
    );

    final container = tester.widget<Container>(find.byType(Container));
    expect(container.constraints?.maxWidth ?? 48, 48);
  });

  testWidgets('respektiert die uebergebene Groesse', (tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: MarktIconBadge(
            icon: Icon(Icons.description),
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
