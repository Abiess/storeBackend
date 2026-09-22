import 'package:flutter/material.dart';

/// Zentrales markt.ma Karten-Primitiv (Shared UI Primitive).
///
/// Buendelt die App-weiten Standards fuer Card-Darstellung (Eckenradius,
/// Elevation, Clip-Verhalten, Standard-Aussenabstand), damit einzelne
/// Feature-Cards (`DocumentCard`, spaeter `DhlParcelCard`,
/// `LoyaltyAccountCard`, `AppCard`, ...) diese Werte NICHT jeweils selbst
/// definieren/duplizieren muessen.
///
/// Inspiriert vom `UICard`-Widget aus dem MIT-lizenzierten `vvk_ui_kit`
/// (https://github.com/VVK027/vvk_ui_kit), aber als eigenes, bewusst
/// kleines markt.ma-Primitiv neu geschrieben - ohne dessen breitere
/// `UICardProps`-Konfigurationsschicht, um minimal zu bleiben.
///
/// Verwendet ausschliesslich `Theme.of(context)` fuer Farben/Elevation-
/// Defaults - keine hartcodierten markt.ma-Farben in dieser oder in
/// Feature-Widgets, die `MarktCard` nutzen.
class MarktCard extends StatelessWidget {
  const MarktCard({
    super.key,
    required this.child,
    this.color,
    this.borderRadius = 16,
    this.elevation = 1,
    this.clipBehavior = Clip.antiAlias,
    this.margin,
    this.padding,
    this.onTap,
  });

  /// Inhalt der Karte.
  final Widget child;

  /// Optionale Hintergrundfarbe. Default: Theme-Kartenfarbe
  /// (`Theme.of(context).cardColor` ueber das zugrunde liegende `Card`).
  final Color? color;

  /// Eckenradius. Zentral definiert, damit Feature-Cards ihn nicht
  /// wiederholen muessen.
  final double borderRadius;

  final double elevation;
  final Clip clipBehavior;
  final EdgeInsetsGeometry? margin;
  final EdgeInsetsGeometry? padding;

  /// Optionaler Tap-Handler. Wenn gesetzt, wird die Karte per `InkWell`
  /// klickbar (z.B. fuer spaeter rowClickable-Feature-Cards).
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final content = padding == null ? child : Padding(padding: padding!, child: child);

    return Card(
      margin: margin ?? const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      color: color,
      elevation: elevation,
      clipBehavior: clipBehavior,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(borderRadius)),
      child: onTap == null ? content : InkWell(onTap: onTap, child: content),
    );
  }
}
