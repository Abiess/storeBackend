// Widget-Tests fuer `DocumentCard` (Feature-UI ueber MarktCard + MarktIconBadge).
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:markt_ma_documents_poc/models/document_dto.dart';
import 'package:markt_ma_documents_poc/widgets/documents/document_card.dart';
import 'package:markt_ma_documents_poc/widgets/shared/markt_card.dart';
import 'package:markt_ma_documents_poc/widgets/shared/markt_icon_badge.dart';

void main() {
  DocumentDto doc({bool hasFile = true, String? filename, String? category}) {
    return DocumentDto(
      id: 1,
      ownerUserId: 1,
      title: 'HUK Kfz-Versicherung',
      hasFile: hasFile,
      originalFilename: filename,
      category: category,
    );
  }

  Widget wrap(Widget child) => MaterialApp(home: Scaffold(body: child));

  testWidgets('baut auf MarktCard und MarktIconBadge auf', (tester) async {
    await tester.pumpWidget(wrap(DocumentCard(document: doc(filename: 'foto.jpg'))));

    expect(find.byType(MarktCard), findsOneWidget);
    expect(find.byType(MarktIconBadge), findsOneWidget);
  });

  testWidgets('zeigt Titel und Dateiname', (tester) async {
    await tester.pumpWidget(wrap(DocumentCard(document: doc(filename: 'foto.jpg'))));

    expect(find.text('HUK Kfz-Versicherung'), findsOneWidget);
    expect(find.text('foto.jpg'), findsOneWidget);
  });

  testWidgets('faellt auf Kategorie zurueck, wenn kein Dateiname vorhanden', (tester) async {
    await tester.pumpWidget(wrap(DocumentCard(document: doc(category: 'Vertrag'))));

    expect(find.text('Vertrag'), findsOneWidget);
  });

  testWidgets('zeigt description-Icon wenn hasFile true ist', (tester) async {
    await tester.pumpWidget(wrap(DocumentCard(document: doc(hasFile: true))));

    expect(find.byIcon(Icons.description), findsOneWidget);
  });

  testWidgets('zeigt article-Icon wenn hasFile false ist', (tester) async {
    await tester.pumpWidget(wrap(DocumentCard(document: doc(hasFile: false))));

    expect(find.byIcon(Icons.article_outlined), findsOneWidget);
  });
}
