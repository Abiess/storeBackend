import 'package:flutter/material.dart';

import '../../theme/markt_theme.dart';
import '../shared/markt_card.dart';
import '../shared/markt_icon_badge.dart';

/// Kompakte Kennzahl-Karte fuer den DHL-Dashboard-Header (DHL-UI-Pass,
/// 23.09.) - inspiriert von der Summary-Card-Reihe aus
/// `abuanwar072/Flutter-Responsive-Admin-Panel-or-Dashboard`
/// (`components/*.dart`, MIT), hier als eigenes schlankes Widget auf Basis
/// der zentralen `MarktCard`/`MarktIconBadge`-Primitive.
///
/// Zeigt ausschliesslich bereits aus geladenen Daten abgeleitete Werte
/// (siehe `DhlHomeScreen`) - keine erfundenen Fortschrittsbalken/Trends.
class DhlStatCard extends StatelessWidget {
  const DhlStatCard({
    super.key,
    required this.icon,
    required this.label,
    required this.value,
    required this.accentColor,
  });

  final IconData icon;
  final String label;
  final String value;
  final Color accentColor;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final colorScheme = Theme.of(context).colorScheme;

    return MarktCard(
      padding: const EdgeInsets.all(MarktSpacing.lg),
      margin: EdgeInsets.zero,
      child: Row(
        children: [
          MarktIconBadge(icon: Icon(icon, color: accentColor), accentColor: accentColor, size: 48),
          const SizedBox(width: MarktSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  value,
                  style: textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 2),
                Text(
                  label,
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
