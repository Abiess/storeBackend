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

    final subtitle = document.originalFilename ?? document.category ?? '-';

    return MarktCard(
      padding: const EdgeInsets.symmetric(horizontal: MarktSpacing.lg, vertical: MarktSpacing.lg),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          MarktIconBadge(
            icon: Icon(
              document.hasFile ? Icons.description : Icons.article_outlined,
              color: accentColor,
            ),
            accentColor: accentColor,
            // Groessere Badge-Variante als Standard-Default: gibt der Card
            // mehr visuelle Praesenz statt wie eine reine Tabellenzeile zu
            // wirken (Visual Pass, siehe Klassendoku).
            size: 48,
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
                  style: textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: MarktSpacing.xs),
                // Dateiname/Kategorie als kleiner, dezent getoenter "Chip"
                // statt reinem Fliesstext - liest sich als Metadaten-Badge,
                // nicht als zweite Tabellenspalte.
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: MarktSpacing.sm, vertical: MarktSpacing.xs / 2),
                  decoration: BoxDecoration(
                    color: colorScheme.surfaceContainerHighest,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    subtitle,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: textTheme.labelMedium?.copyWith(color: colorScheme.onSurfaceVariant),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
