import 'package:flutter/material.dart';

import '../../models/document_dto.dart';

/// Fachliche Darstellung eines einzelnen [DocumentDto].
///
/// Bewusst kein Redesign: extrahiert 1:1 die Informationen, die vorher
/// direkt als `ListTile` in `documents_screen.dart` gerendert wurden
/// (Icon je nach `hasFile`, Titel, Dateiname/Kategorie als Subtitle).
/// Diese Card ist app-spezifisch (Documents) und lebt bewusst NICHT unter
/// `widgets/shared/`, da `MarktResponsiveDataList` nichts von `DocumentDto`
/// wissen soll.
class DocumentCard extends StatelessWidget {
  const DocumentCard({super.key, required this.document});

  final DocumentDto document;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      child: ListTile(
        leading: Icon(
          document.hasFile ? Icons.description : Icons.article_outlined,
        ),
        title: Text(document.title),
        subtitle: Text(document.originalFilename ?? document.category ?? '-'),
      ),
    );
  }
}
