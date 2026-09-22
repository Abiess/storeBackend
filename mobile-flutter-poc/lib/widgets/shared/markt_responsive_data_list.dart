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
/// Bulk-Select, Table-Mode. Diese werden nur bei echtem Bedarf spaeter als
/// gezielte Erweiterung ergaenzt.
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
        final columns = MarktBreakpoints.columnsForWidth(constraints.maxWidth);

        if (columns <= 1) {
          return ListView.builder(
            physics: const AlwaysScrollableScrollPhysics(),
            itemCount: items.length,
            itemBuilder: (context, index) => itemBuilder(context, items[index]),
          );
        }

        return GridView.builder(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(8),
          gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: columns,
            mainAxisSpacing: 8,
            crossAxisSpacing: 8,
            childAspectRatio: 2.4,
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
