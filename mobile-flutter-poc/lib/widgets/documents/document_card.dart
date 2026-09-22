import 'package:flutter/material.dart';

import '../../models/document_dto.dart';
import '../../theme/markt_theme.dart';
import '../shared/markt_card.dart';
import '../shared/markt_icon_badge.dart';

/// Fachliche Darstellung eines einzelnen [DocumentDto].
///
/// Bewusst kein Eigen-Design: liefert dieselben Informationen, die vorher
/// direkt als `ListTile` in `documents_screen.dart` gerendert wurden
/// (Icon je nach `hasFile`, Titel, Dateiname/Kategorie als Subtitle),
/// baut sie aber ausschliesslich aus den zentralen markt.ma Shared-
/// Primitives `MarktCard` + `MarktIconBadge` zusammen. Diese Card definiert
/// daher selbst KEINEN Radius, Standard-Padding, Standard-Card-Farbe oder
/// Elevation - das ist Aufgabe von `MarktCard`.
///
/// Diese Card ist app-spezifisch (Documents) und lebt bewusst NICHT unter
/// `widgets/shared/`, da `MarktResponsiveDataList`/`MarktCard` nichts von
/// `DocumentDto` wissen sollen. Analog dazu werden spaeter
/// `DhlParcelCard`, `LoyaltyAccountCard`, `AppCard` ebenfalls auf
/// `MarktCard` + `MarktIconBadge` aufbauen, ohne deren Code zu duplizieren.
class DocumentCard extends StatelessWidget {
  const DocumentCard({super.key, required this.document});

  final DocumentDto document;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;
    // Keine hartcodierte markt.ma-Farbe: Akzent kommt aus dem Theme.
    final accentColor = document.hasFile ? colorScheme.primary : colorScheme.outline;

    return MarktCard(
      padding: const EdgeInsets.symmetric(horizontal: MarktSpacing.md, vertical: MarktSpacing.sm),
      child: Row(
        children: [
          MarktIconBadge(
            icon: Icon(
              document.hasFile ? Icons.description : Icons.article_outlined,
              color: accentColor,
            ),
            accentColor: accentColor,
          ),
          const SizedBox(width: MarktSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  document.title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: MarktSpacing.xs),
                Text(
                  document.originalFilename ?? document.category ?? '-',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: textTheme.bodySmall?.copyWith(color: colorScheme.onSurfaceVariant),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
