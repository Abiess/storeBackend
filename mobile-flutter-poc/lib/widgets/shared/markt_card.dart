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
///
/// Die visuellen Defaults (Radius/Elevation/Farbe/Margin/Clip) werden NICHT
/// mehr literal in diesem Widget festgelegt, sondern - sofern der Aufrufer
/// sie nicht explizit ueberschreibt - aus dem zentralen
/// `Theme.of(context).cardTheme` (`CardThemeData`, gesetzt in
/// `lib/theme/markt_theme.dart`) gelesen. Ein einziger Ort steuert damit das
/// Karten-Design app-weit; die oeffentliche API bleibt dabei unveraendert
/// nutzbar (alle Parameter weiterhin optional, bestehende Aufrufstellen wie
/// `DocumentCard` benoetigen keine Anpassung).
class MarktCard extends StatelessWidget {
  const MarktCard({
    super.key,
    required this.child,
    this.color,
    this.borderRadius,
    this.elevation,
    this.clipBehavior,
    this.margin,
    this.padding,
    this.onTap,
  });

  /// Inhalt der Karte.
  final Widget child;

  /// Optionale Hintergrundfarbe. Default: `Theme.of(context).cardTheme.color`.
  final Color? color;

  /// Eckenradius. Default: aus `Theme.of(context).cardTheme.shape`
  /// (Fallback 16), damit Feature-Cards ihn nicht wiederholen muessen.
  final double? borderRadius;

  /// Default: `Theme.of(context).cardTheme.elevation` (Fallback 1).
  final double? elevation;

  /// Default: `Theme.of(context).cardTheme.clipBehavior` (Fallback antiAlias).
  final Clip? clipBehavior;

  /// Default: `Theme.of(context).cardTheme.margin`.
  final EdgeInsetsGeometry? margin;

  final EdgeInsetsGeometry? padding;

  /// Optionaler Tap-Handler. Wenn gesetzt, wird die Karte per `InkWell`
  /// klickbar (z.B. fuer spaeter rowClickable-Feature-Cards).
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final cardTheme = Theme.of(context).cardTheme;
    final content = padding == null ? child : Padding(padding: padding!, child: child);

    final resolvedShape = borderRadius != null
        ? RoundedRectangleBorder(borderRadius: BorderRadius.circular(borderRadius!))
        : cardTheme.shape ??
            const RoundedRectangleBorder(borderRadius: BorderRadius.all(Radius.circular(16)));

    return Card(
      margin: margin ?? cardTheme.margin ?? const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      color: color ?? cardTheme.color,
      elevation: elevation ?? cardTheme.elevation ?? 1,
      clipBehavior: clipBehavior ?? cardTheme.clipBehavior ?? Clip.antiAlias,
      shape: resolvedShape,
      child: onTap == null ? content : InkWell(onTap: onTap, child: content),
    );
  }
}
