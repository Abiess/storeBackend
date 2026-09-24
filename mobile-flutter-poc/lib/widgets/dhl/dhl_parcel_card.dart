import 'package:flutter/material.dart';

import '../../models/dhl_parcel_dto.dart';
import '../../theme/markt_theme.dart';
import '../shared/markt_card.dart';
import '../shared/markt_icon_badge.dart';
import 'dhl_parcel_format.dart';
import 'dhl_parcel_status_badge.dart';

/// Fachliche Darstellung eines einzelnen [DhlParcelDto] fuer die
/// "Pakete im Laden"-Liste (siehe DHL-Audit vom 23.09.) - Mobile/Tablet
/// (Desktop nutzt seit dem DHL-UI-Pass vom 23.09. die kompaktere
/// `DhlParcelTable`, siehe dort).
///
/// Baut - analog zu `DocumentCard` - ausschliesslich auf den zentralen
/// Shared-Primitives `MarktCard`/`MarktIconBadge` auf; definiert selbst
/// keinen Radius/Elevation/Standardfarbe. Zeigt bewusst nur die in der
/// Aufgabenstellung geforderten Felder: Trackingnummer, Lagerplatz,
/// Eingelagert am, Sendungsstatus (falls vorhanden) - keine Aktionen
/// (Abholen/Stornieren/Scan) in diesem ersten Schritt.
///
/// Status-Farbe/-Label/Datumsformat kommen aus [DhlParcelFormat]/
/// [DhlParcelStatusBadge] (geteilt mit `DhlParcelTable`, keine doppelte
/// Logik).
class DhlParcelCard extends StatelessWidget {
  const DhlParcelCard({super.key, required this.parcel});

  final DhlParcelDto parcel;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;
    final accentColor = DhlParcelFormat.accentColorForStatus(colorScheme, parcel.status);

    final shelfLabel = parcel.shelfLocation ?? '-';
    final receivedLabel = DhlParcelFormat.formatReceivedAt(parcel.receivedAt);

    return MarktCard(
      padding: const EdgeInsets.symmetric(horizontal: MarktSpacing.lg, vertical: MarktSpacing.lg),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          MarktIconBadge(
            icon: Icon(Icons.local_shipping, color: accentColor),
            accentColor: accentColor,
            size: 48,
          ),
          const SizedBox(width: MarktSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  parcel.trackingCode,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: MarktSpacing.xs),
                Text(
                  'Lagerplatz: $shelfLabel${receivedLabel != null ? ' · Eingelagert: $receivedLabel' : ''}',
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: textTheme.bodySmall?.copyWith(color: colorScheme.onSurfaceVariant),
                ),
                const SizedBox(height: MarktSpacing.xs),
                DhlParcelStatusBadge(parcel: parcel),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

