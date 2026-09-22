// Widget-Tests fuer den generischen Footer (Shared UI Primitive, Phase 1).
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:markt_ma_documents_poc/theme/markt_theme.dart';
import 'package:markt_ma_documents_poc/widgets/shared/markt_footer.dart';

void main() {
  Widget wrap(Widget child) {
    return MaterialApp(theme: MarktTheme.light(), home: Scaffold(body: child));
  }

  testWidgets('zeigt Default-Copyright-Text ohne explizite Angabe', (tester) async {
    await tester.pumpWidget(wrap(const MarktFooter()));
    expect(find.textContaining('markt.ma'), findsOneWidget);
  });

  testWidgets('zeigt ueberschriebenen Text', (tester) async {
    await tester.pumpWidget(wrap(const MarktFooter(text: 'Custom Footer Text')));
    expect(find.text('Custom Footer Text'), findsOneWidget);
  });
}
