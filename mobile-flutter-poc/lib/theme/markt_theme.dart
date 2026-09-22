import 'dart:ui' show lerpDouble;

import 'package:flutter/material.dart';

/// Zentrale markt.ma Spacing-Tokens (Shared UI Primitive).
///
/// Bewusst nur 5 feste Werte, keine grosse Skala/Infrastruktur (siehe
/// Theme-Audit vom 22.09.). Ersetzt verstreute literale `EdgeInsets`-/
/// `SizedBox`-Werte in Feature-Widgets (`DocumentCard`,
/// `documents_screen.dart`) durch einen gemeinsamen Rhythmus, den auch
/// kuenftige Feature-Cards (DHL, Loyalty, App Launcher) wiederverwenden
/// koennen, ohne ihn erneut zu erfinden.
class MarktSpacing {
  const MarktSpacing._();

  static const double xs = 4;
  static const double sm = 8;
  static const double md = 12;
  static const double lg = 16;
  static const double xl = 24;
}

/// markt.ma Icon-Badge-Groesse/-Radius als zentrales Theme-Merkmal.
///
/// Flutter besitzt kein eingebautes `ThemeData`-Feld fuer einen
/// eigenstaendigen "Icon-Badge-Container" (das eingebaute `BadgeThemeData`
/// beschreibt das kleine Material-Notification-Badge, nicht diesen
/// groesseren Icon-Container). Fuer diesen einen, klar abgegrenzten Fall ist
/// daher ausnahmsweise eine eigene, minimale `ThemeExtension` gerechtfertigt
/// - bewusst nur DIESE EINE, kein Extension-pro-Komponente-System wie im
/// inspirierenden `vvk_ui_kit` (https://github.com/VVK027/vvk_ui_kit).
@immutable
class MarktBadgeTheme extends ThemeExtension<MarktBadgeTheme> {
  const MarktBadgeTheme({required this.size, required this.borderRadius});

  final double size;
  final double borderRadius;

  /// Deckt sich mit den bisherigen `MarktIconBadge`-Defaults (48/14).
  static const standard = MarktBadgeTheme(size: 48, borderRadius: 14);

  @override
  MarktBadgeTheme copyWith({double? size, double? borderRadius}) {
    return MarktBadgeTheme(
      size: size ?? this.size,
      borderRadius: borderRadius ?? this.borderRadius,
    );
  }

  @override
  MarktBadgeTheme lerp(ThemeExtension<MarktBadgeTheme>? other, double t) {
    if (other is! MarktBadgeTheme) return this;
    return MarktBadgeTheme(
      size: lerpDouble(size, other.size, t) ?? size,
      borderRadius: lerpDouble(borderRadius, other.borderRadius, t) ?? borderRadius,
    );
  }
}

/// Zentrales markt.ma Theme (Shared UI Primitive).
///
/// Einziger Ort, an dem der markt.ma-Farbton (gleicher Lila-Gradient-Startwert
/// wie im Angular-Frontend, `#667eea`), Card-/AppBar-/FAB-Stil und die
/// Typografie-Hierarchie fuer die gesamte zukuenftige Flutter App Factory
/// definiert werden. Feature-Widgets (`DocumentCard`, `documents_screen.dart`,
/// spaeter DHL/Loyalty/App Launcher) duerfen deshalb KEINE eigenen Farben
/// mehr hartcodieren, sondern ausschliesslich aus `Theme.of(context)` lesen.
///
/// Nutzt bewusst zuerst Flutters eingebaute `ThemeData`-Felder
/// (`ColorScheme`, `CardThemeData`, `AppBarTheme`,
/// `FloatingActionButtonThemeData`, `TextTheme`) statt eigener
/// Theme-Strukturen. Nur fuer `MarktIconBadge` (siehe [MarktBadgeTheme])
/// gibt es keine passende eingebaute Struktur - dort kommt eine einzelne,
/// bewusst kleine `ThemeExtension` zum Einsatz.
///
/// Inspiriert von der Extension-basierten Theme-Architektur des
/// MIT-lizenzierten `vvk_ui_kit`, aber deutlich minimaler: kein
/// Extension-pro-Komponente-System, kein Glassmorphism, keine
/// Feature-spezifischen Farben.
class MarktTheme {
  const MarktTheme._();

  static const _seedColor = Color(0xFF667EEA);

  static ThemeData light() => _build(Brightness.light);
  static ThemeData dark() => _build(Brightness.dark);

  static ThemeData _build(Brightness brightness) {
    final colorScheme = ColorScheme.fromSeed(seedColor: _seedColor, brightness: brightness);

    return ThemeData(
      useMaterial3: true,
      brightness: brightness,
      colorScheme: colorScheme,
      // Dezent getoente Oberflaeche statt reinem Weiss/Schwarz, damit sich
      // Cards sichtbar vom Hintergrund abheben, ohne eine eigene Farbe zu
      // erfinden (`surfaceContainerLowest` kommt direkt aus dem ColorScheme).
      scaffoldBackgroundColor: colorScheme.surfaceContainerLowest,
      textTheme: _textTheme(ThemeData(brightness: brightness).textTheme),
      appBarTheme: AppBarTheme(
        backgroundColor: colorScheme.surface,
        foregroundColor: colorScheme.onSurface,
        elevation: 0,
        scrolledUnderElevation: 2,
        surfaceTintColor: colorScheme.surfaceTint,
        centerTitle: false,
        titleTextStyle: TextStyle(
          fontSize: 20,
          fontWeight: FontWeight.w600,
          color: colorScheme.onSurface,
        ),
      ),
      cardTheme: CardThemeData(
        elevation: 1,
        margin: const EdgeInsets.symmetric(horizontal: MarktSpacing.sm, vertical: MarktSpacing.xs),
        clipBehavior: Clip.antiAlias,
        color: colorScheme.surfaceContainerLow,
        shape: const RoundedRectangleBorder(borderRadius: BorderRadius.all(Radius.circular(16))),
      ),
      floatingActionButtonTheme: FloatingActionButtonThemeData(
        backgroundColor: colorScheme.primary,
        foregroundColor: colorScheme.onPrimary,
      ),
      extensions: const [MarktBadgeTheme.standard],
    );
  }

  static TextTheme _textTheme(TextTheme base) {
    return base.copyWith(
      titleLarge: base.titleLarge?.copyWith(fontWeight: FontWeight.w700),
      titleMedium: base.titleMedium?.copyWith(fontWeight: FontWeight.w600),
      titleSmall: base.titleSmall?.copyWith(fontWeight: FontWeight.w600),
      bodyMedium: base.bodyMedium?.copyWith(height: 1.3),
    );
  }
}
