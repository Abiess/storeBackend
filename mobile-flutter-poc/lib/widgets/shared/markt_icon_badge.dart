import 'package:flutter/material.dart';

import '../../theme/markt_theme.dart';

/// Zentrales markt.ma Icon-Badge-Primitiv (Shared UI Primitive).
///
/// Abgerundeter Container fuer ein Icon mit halbtransparentem
/// Akzent-Hintergrund. Wird von allen Feature-Cards (`DocumentCard`,
/// spaeter `DhlParcelCard`, `LoyaltyAccountCard`, `AppCard`, ...)
/// wiederverwendet, damit Groesse, Eckenradius und Alpha-Werte fuer den
/// Akzent-Hintergrund nicht pro Feature dupliziert werden.
///
/// Inspiriert vom `UIIconBadge`-Widget aus dem MIT-lizenzierten
/// `vvk_ui_kit` (https://github.com/VVK027/vvk_ui_kit), als eigenes,
/// kleines markt.ma-Primitiv neu geschrieben.
///
/// [accentColor] wird vom Aufrufer i.d.R. aus `Theme.of(context).colorScheme`
/// befuellt - diese Komponente selbst enthaelt keine hartcodierten Farben.
///
/// [size]/[borderRadius] werden, sofern nicht explizit gesetzt, aus der
/// zentralen [MarktBadgeTheme]-Extension gelesen (`lib/theme/markt_theme.dart`)
/// - Flutter besitzt keine eingebaute `ThemeData`-Struktur, die zu diesem
/// Widget passt (siehe Doku dort), daher diese eine kleine `ThemeExtension`
/// statt hartcodierter Konstanten in diesem Widget.
class MarktIconBadge extends StatelessWidget {
  const MarktIconBadge({
    super.key,
    required this.icon,
    required this.accentColor,
    this.size,
    this.borderRadius,
  });

  final Widget icon;
  final Color accentColor;
  final double? size;
  final double? borderRadius;

  @override
  Widget build(BuildContext context) {
    final badgeTheme = Theme.of(context).extension<MarktBadgeTheme>() ?? MarktBadgeTheme.standard;
    final resolvedSize = size ?? badgeTheme.size;
    final resolvedRadius = borderRadius ?? badgeTheme.borderRadius;

    return Container(
      width: resolvedSize,
      height: resolvedSize,
      decoration: BoxDecoration(
        color: accentColor.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(resolvedRadius),
        border: Border.all(color: accentColor.withValues(alpha: 0.22)),
      ),
      alignment: Alignment.center,
      child: icon,
    );
  }
}
