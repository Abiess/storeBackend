import 'package:flutter/material.dart';

import '../../models/dhl_parcel_dto.dart';
import '../../theme/markt_theme.dart';
import 'dhl_parcel_format.dart';

/// Sauberer, wiederverwendbarer Status-Badge fuer einen [DhlParcelDto] -
/// dieselbe Darstellung in `DhlParcelCard` (Mobile/Tablet) UND
/// `DhlParcelTable` (Desktop), damit Statusfarben/-labels nur an EINER
/// Stelle gepflegt werden (siehe `DhlParcelFormat`).
class DhlParcelStatusBadge extends StatelessWidget {
  const DhlParcelStatusBadge({super.key, required this.parcel});

  final DhlParcelDto parcel;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;
    final accentColor = DhlParcelFormat.accentColorForStatus(colorScheme, parcel.status);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: MarktSpacing.sm, vertical: MarktSpacing.xs / 2),
      decoration: BoxDecoration(
        color: accentColor.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        DhlParcelFormat.statusLabel(parcel),
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: textTheme.labelMedium?.copyWith(color: accentColor, fontWeight: FontWeight.w600),
      ),
    );
  }
}
