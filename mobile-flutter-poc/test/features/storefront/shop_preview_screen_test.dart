import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:markt_ma_documents_poc/entrypoints/main_shop.dart';

void main() {
  testWidgets('shop preview shows a storefront and filters its sample catalog', (tester) async {
    await tester.binding.setSurfaceSize(const Size(390, 844));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    await tester.pumpWidget(const MarktShopPreviewApp());

    expect(find.text('Marrakesch Market'), findsOneWidget);
    expect(find.text('Everyday Sneaker'), findsOneWidget);
    expect(find.text('Kompakte Kamera'), findsOneWidget);

    await tester.tap(find.widgetWithText(ChoiceChip, 'Elektronik'));
    await tester.pumpAndSettle();

    expect(find.text('Kompakte Kamera'), findsOneWidget);
    expect(find.text('Everyday Sneaker'), findsNothing);
  });

  testWidgets('adding a sample product updates the cart badge', (tester) async {
    await tester.binding.setSurfaceSize(const Size(390, 844));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    await tester.pumpWidget(const MarktShopPreviewApp());

    final addButton = find.byTooltip('In den Warenkorb').first;
    await tester.ensureVisible(addButton);
    await tester.tap(addButton);
    await tester.pump();

    expect(find.text('1'), findsOneWidget);
  });
}
