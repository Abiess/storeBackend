import 'package:flutter/material.dart';

import '../../models/dhl_parcel_dto.dart';
import '../../theme/markt_theme.dart';
import '../shared/markt_card.dart';
import '../shared/markt_icon_badge.dart';

/// Fachliche Darstellung eines einzelnen [DhlParcelDto] fuer die
/// "Pakete im Laden"-Liste (siehe DHL-Audit vom 23.09.).
///
/// Baut - analog zu `DocumentCard` - ausschliesslich auf den zentralen
/// Shared-Primitives `MarktCard`/`MarktIconBadge` auf; definiert selbst
/// keinen Radius/Elevation/Standardfarbe. Zeigt bewusst nur die in der
/// Aufgabenstellung geforderten Felder: Trackingnummer, Lagerplatz,
/// Eingelagert am, Sendungsstatus (falls vorhanden) - keine Aktionen
/// (Abholen/Stornieren/Scan) in diesem ersten Schritt.
class DhlParcelCard extends StatelessWidget {
  const DhlParcelCard({super.key, required this.parcel});

  final DhlParcelDto parcel;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;
    final accentColor = _accentColorForStatus(colorScheme, parcel.status);

    final shelfLabel = parcel.shelfLocation ?? '-';
    final receivedLabel = _formatReceivedAt(parcel.receivedAt);

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
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: MarktSpacing.sm, vertical: MarktSpacing.xs / 2),
                  decoration: BoxDecoration(
                    color: accentColor.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    _statusLabel(parcel),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: textTheme.labelMedium?.copyWith(color: accentColor, fontWeight: FontWeight.w600),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  /// Sendungsstatus-Anzeige: bevorzugt das DHL-Tracking-Metadatenfeld
  /// `standardEventCode` (falls vorhanden, siehe Audit), sonst der
  /// lokale Paket-Status (`STORED`/`PICKED_UP`/`CANCELLED`). Kein eigenes
  /// Mapping auf Klartext-Labels - reine, unveraenderte Anzeige der
  /// Backend-Werte (kein erfundenes i18n/Statuscode-Mapping in diesem
  /// ersten Schritt).
  String _statusLabel(DhlParcelDto parcel) {
    final eventCode = parcel.standardEventCode;
    if (eventCode != null && eventCode.isNotEmpty) {
      return '${parcel.status} ($eventCode)';
    }
    return parcel.status;
  }

  Color _accentColorForStatus(ColorScheme colorScheme, String status) {
    switch (status) {
      case 'PICKED_UP':
        return colorScheme.tertiary;
      case 'CANCELLED':
        return colorScheme.error;
      case 'STORED':
      default:
        return colorScheme.primary;
    }
  }

  /// `receivedAt` ist ein roher ISO-8601-String (siehe `DhlParcelDto`) -
  /// hier nur minimal auf Datum+Uhrzeit ohne Sekunden gekuerzt, falls
  /// parsebar; sonst wird der Rohwert unveraendert angezeigt statt einen
  /// Fehler zu werfen.
  String? _formatReceivedAt(String? raw) {
    if (raw == null || raw.isEmpty) return null;
    final parsed = DateTime.tryParse(raw);
    if (parsed == null) return raw;
    String twoDigits(int n) => n.toString().padLeft(2, '0');
    return '${parsed.year}-${twoDigits(parsed.month)}-${twoDigits(parsed.day)} '
        '${twoDigits(parsed.hour)}:${twoDigits(parsed.minute)}';
  }
}
