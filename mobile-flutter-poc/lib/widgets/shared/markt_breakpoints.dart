/// Zentrale Breakpoint-Definition fuer alle markt.ma Flutter-Screens.
///
/// Wird von [MarktResponsiveDataList] genutzt, damit Documents, DHL,
/// Loyalty usw. NICHT jeweils eigene Breakpoints/Spaltenlogik definieren.
///
/// Regel (v1, bewusst simpel):
///   < 600px        -> Phone -> 1 Spalte (Liste)
///   600px - 1023px -> Tablet -> 2 Spalten (Grid)
///   >= 1024px      -> Large -> 3 Spalten (Grid)
class MarktBreakpoints {
  const MarktBreakpoints._();

  static const double tabletMin = 600;
  static const double largeMin = 1024;

  /// Liefert die Anzahl der Grid-Spalten fuer eine gegebene verfuegbare
  /// Breite (z.B. `constraints.maxWidth` aus einem `LayoutBuilder`).
  /// `1` bedeutet: keine Grid-Darstellung, sondern eine einfache Liste.
  static int columnsForWidth(double width) {
    if (width >= largeMin) return 3;
    if (width >= tabletMin) return 2;
    return 1;
  }

  /// Liefert `true`, wenn eine gegebene verfuegbare Breite als "Desktop"
  /// gilt. Nutzt denselben [largeMin]-Schwellwert wie [columnsForWidth] -
  /// KEIN neuer/zusaetzlicher Breakpoint, nur eine semantische Abfrage
  /// darauf. Wird von [MarktAppShell] genutzt, um zwischen permanenter
  /// Sidebar (Desktop) und Drawer (Mobile/Tablet) umzuschalten.
  static bool isDesktop(double width) => width >= largeMin;
}
