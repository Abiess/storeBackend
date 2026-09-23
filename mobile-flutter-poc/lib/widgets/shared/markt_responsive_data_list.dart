import 'package:flutter/material.dart';

import 'markt_breakpoints.dart';

/// Generische, responsive Listen-/Grid-Darstellung fuer markt.ma
/// Flutter-Clients (Documents, spaeter DHL, Loyalty, App Launcher, ...).
///
/// Kennt bewusst NICHTS ueber die Fachlichkeit von `T` (z.B. `DocumentDto`).
/// Die Darstellung eines einzelnen Elements liegt komplett beim Aufrufer
/// ueber [itemBuilder] - analog zur Trennung, die Angular mit
/// `app-responsive-data-list` (generische Infrastruktur) und fachlichen
/// Zell-Templates verfolgt, aber ohne dessen generische Column-/Table-
/// Logik: In Flutter bauen wir auf fachliche Cards statt auf generisches
/// Spalten-Rendering.
///
/// Verantwortlichkeiten dieser Komponente (v1, bewusst minimal):
/// - Responsives Layout ueber [MarktBreakpoints]
///   (Phone -> `ListView`, Tablet/Large -> `GridView`)
/// - Loading-/Error-/Empty-State mit sinnvollen Defaults, ueberschreibbar
/// - Optionales Pull-to-Refresh (`onRefresh`), das auch im Empty- und
///   Error-State funktioniert, statt dort kaputtzugehen
///
/// Bewusst NICHT enthalten (siehe Audit vom 22.09.): Suche, Sortierung,
/// Bulk-Select. Diese werden nur bei echtem Bedarf spaeter als gezielte
/// Erweiterung ergaenzt.
///
/// Seit dem DHL-UI-Pass (23.09.) zusaetzlich ein rein additiver,
/// optionaler [wideBuilder]-Slot: Auf echten Desktop-Breiten
/// (`MarktBreakpoints.isDesktop`, >= 1024px) kann ein Aufrufer damit eine
/// eigene, dichtere Darstellung (z.B. eine kompakte Tabelle statt einer
/// Card-Wand) fuer ALLE [items] liefern, statt der Standard-`GridView` aus
/// [itemBuilder]. Ohne [wideBuilder] (Default `null`, z.B. Documents/
/// Maritime) aendert sich am bisherigen Verhalten NICHTS - kein zweiter
/// Design-/Responsive-Layer, sondern derselbe [MarktBreakpoints]-Schwellwert,
/// nur mit einer zusaetzlichen, rein optionalen Darstellungsvariante.
/// Tablet-Breiten (600-1023px) bleiben unveraendert bei der bestehenden
/// 2-Spalten-`GridView` aus [itemBuilder].
class MarktResponsiveDataList<T> extends StatelessWidget {
  const MarktResponsiveDataList({
    super.key,
    required this.items,
    required this.itemBuilder,
    this.loading = false,
    this.error,
    this.onRefresh,
    this.emptyWidget,
    this.loadingWidget,
    this.errorBuilder,
    this.gridItemHeight = 88,
    this.wideBuilder,
  });

  /// Anzuzeigende Elemente. Fachlicher Typ, der Component unbekannt.
  final List<T> items;

  /// Baut die fachliche Darstellung eines einzelnen Elements
  /// (z.B. `DocumentCard`). Wird sowohl in der Liste als auch im Grid
  /// unveraendert wiederverwendet.
  final Widget Function(BuildContext context, T item) itemBuilder;

  /// Wenn `true`, wird [loadingWidget] (bzw. ein Default-Spinner) zentriert
  /// angezeigt, unabhaengig vom Inhalt von [items].
  final bool loading;

  /// Wenn gesetzt, wird [errorBuilder] (bzw. ein Default-Fehlertext)
  /// anstelle der Items angezeigt.
  final Object? error;

  /// Optionales Pull-to-Refresh. Wird ausgelassen, wenn `null`.
  final Future<void> Function()? onRefresh;

  final Widget? emptyWidget;
  final Widget? loadingWidget;
  final Widget Function(BuildContext context, Object error)? errorBuilder;

  /// Feste Zeilenhoehe (in logischen Pixeln) einer Grid-Zelle
  /// (Tablet/Large, ab 2 Spalten).
  ///
  /// Bewusst eine feste Hoehe statt `childAspectRatio`: Ein Aspect-Ratio
  /// leitet die Zellhoehe aus der Spaltenbreite ab - bei 3 Spalten auf
  /// grossen Desktop-Bildschirmen wird die Zelle dadurch sehr breit UND
  /// (proportional) sehr hoch, obwohl kompakte Row-Cards (Icon + 1-2
  /// Textzeilen, z.B. `DocumentCard`) diese Hoehe gar nicht ausfuellen -
  /// das erzeugt genau den grossen Leerraum, den `childAspectRatio` bei
  /// breiten Spalten verursacht. Eine feste, von der Spaltenbreite
  /// unabhaengige Hoehe verhindert das grundsaetzlich, unabhaengig davon,
  /// wie breit eine einzelne Spalte gerade ist.
  ///
  /// Der Default (88) passt zur aktuellen `DocumentCard` (48px Icon-Badge +
  /// Padding/Margin + zwei kurze Textzeilen). Zukuenftige Feature-Cards mit
  /// abweichendem Platzbedarf (z.B. `DhlParcelCard`, `LoyaltyAccountCard`)
  /// koennen diesen Wert pro Aufruf ueberschreiben, ohne dass diese
  /// Shared-Komponente selbst irgendetwas ueber die jeweilige Fachlichkeit
  /// wissen muss.
  final double gridItemHeight;

  /// Optionale, dichtere Darstellung ALLER [items] auf echten
  /// Desktop-Breiten (siehe Klassendoku). `null` (Default) aendert nichts
  /// am bisherigen Verhalten. Muss selbst scrollbar sein (z.B. `ListView`
  /// intern), damit [onRefresh] (Pull-to-Refresh) weiterhin funktioniert.
  final Widget Function(BuildContext context, List<T> items)? wideBuilder;

  @override
  Widget build(BuildContext context) {
    if (loading) {
      return Center(child: loadingWidget ?? const CircularProgressIndicator());
    }

    if (error != null) {
      return _refreshable(_buildCenteredScrollable(_buildError(context)));
    }

    if (items.isEmpty) {
      return _refreshable(_buildCenteredScrollable(_buildEmpty(context)));
    }

    return _refreshable(_buildResponsiveContent(context));
  }

  Widget _buildError(BuildContext context) {
    if (errorBuilder != null) return errorBuilder!(context, error!);
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Text(
        'Fehler: $error',
        textAlign: TextAlign.center,
        style: TextStyle(color: Theme.of(context).colorScheme.error),
      ),
    );
  }

  Widget _buildEmpty(BuildContext context) {
    return emptyWidget ??
        const Padding(
          padding: EdgeInsets.all(24),
          child: Text('Keine Eintraege vorhanden', textAlign: TextAlign.center),
        );
  }

  /// Bettet ein einzelnes zentriertes Widget (Empty-/Error-State) in eine
  /// scrollbare Liste ein. `RefreshIndicator` benoetigt einen Scrollable,
  /// um per Pull-to-Refresh ausgeloest werden zu koennen - ohne diesen
  /// Wrapper wuerde Pull-to-Refresh auf einem leeren/fehlerhaften Screen
  /// nicht funktionieren.
  Widget _buildCenteredScrollable(Widget child) {
    return LayoutBuilder(
      builder: (context, constraints) {
        return ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          children: [
            SizedBox(
              height: constraints.maxHeight,
              child: Center(child: child),
            ),
          ],
        );
      },
    );
  }

  Widget _buildResponsiveContent(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final width = constraints.maxWidth;
        final columns = MarktBreakpoints.columnsForWidth(width);

        if (columns <= 1) {
          return ListView.builder(
            physics: const AlwaysScrollableScrollPhysics(),
            itemCount: items.length,
            itemBuilder: (context, index) => itemBuilder(context, items[index]),
          );
        }

        if (wideBuilder != null && MarktBreakpoints.isDesktop(width)) {
          return wideBuilder!(context, items);
        }

        return GridView.builder(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(8),
          gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: columns,
            mainAxisSpacing: 8,
            crossAxisSpacing: 8,
            mainAxisExtent: gridItemHeight,
          ),
          itemCount: items.length,
          itemBuilder: (context, index) => itemBuilder(context, items[index]),
        );
      },
    );
  }

  Widget _refreshable(Widget child) {
    if (onRefresh == null) return child;
    return RefreshIndicator(onRefresh: onRefresh!, child: child);
  }
}
