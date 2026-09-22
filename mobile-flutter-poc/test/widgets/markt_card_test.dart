// Widget-Tests fuer das zentrale markt.ma Karten-Primitiv `MarktCard`.
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:markt_ma_documents_poc/widgets/shared/markt_card.dart';

void main() {
  Widget wrap(Widget child) => MaterialApp(home: Scaffold(body: child));

  testWidgets('rendert das uebergebene child innerhalb eines Card-Widgets', (tester) async {
    await tester.pumpWidget(wrap(const MarktCard(child: Text('Inhalt'))));

    expect(find.text('Inhalt'), findsOneWidget);
    expect(find.byType(Card), findsOneWidget);
  });

  testWidgets('ist klickbar (InkWell) wenn onTap gesetzt ist', (tester) async {
    var tapped = false;
    await tester.pumpWidget(
      wrap(MarktCard(onTap: () => tapped = true, child: const Text('Klickbar'))),
    );

    expect(find.byType(InkWell), findsOneWidget);
    await tester.tap(find.text('Klickbar'));
    expect(tapped, isTrue);
  });

  testWidgets('ist NICHT klickbar (kein InkWell) ohne onTap', (tester) async {
    await tester.pumpWidget(wrap(const MarktCard(child: Text('Nicht klickbar'))));

    expect(find.byType(InkWell), findsNothing);
  });
}
