// Widget-Tests fuer die generische `MarktResponsiveDataList<T>`.
//
// Bewusst mit einem einfachen `String`-Typ getestet, um zu demonstrieren,
// dass die Komponente wirklich generisch ist und nichts ueber `DocumentDto`
// oder andere Fachlichkeit weiss.
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:markt_ma_documents_poc/widgets/shared/markt_responsive_data_list.dart';

void main() {
  Widget wrap(Widget child, {Size size = const Size(400, 800)}) {
    return MaterialApp(
      home: MediaQuery(
        data: MediaQueryData(size: size),
        child: Scaffold(body: SizedBox(width: size.width, height: size.height, child: child)),
      ),
    );
  }

  testWidgets('rendert alle Items ueber itemBuilder (Phone -> Liste)', (tester) async {
    await tester.pumpWidget(
      wrap(
        MarktResponsiveDataList<String>(
          items: const ['Alpha', 'Beta', 'Gamma'],
          itemBuilder: (context, item) => Text(item),
        ),
        size: const Size(400, 800), // < 600 -> Phone/ListView
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Alpha'), findsOneWidget);
    expect(find.text('Beta'), findsOneWidget);
    expect(find.text('Gamma'), findsOneWidget);
    expect(find.byType(ListView), findsOneWidget);
    expect(find.byType(GridView), findsNothing);
  });

  testWidgets('zeigt Grid ab Tablet-Breite (>= 600px)', (tester) async {
    await tester.pumpWidget(
      wrap(
        MarktResponsiveDataList<String>(
          items: const ['Alpha', 'Beta'],
          itemBuilder: (context, item) => Text(item),
        ),
        size: const Size(800, 800), // Tablet -> Grid
      ),
    );
    await tester.pumpAndSettle();

    expect(find.byType(GridView), findsOneWidget);
    expect(find.text('Alpha'), findsOneWidget);
    expect(find.text('Beta'), findsOneWidget);
  });

  testWidgets('zeigt Default-Loading-Widget, wenn loading=true', (tester) async {
    await tester.pumpWidget(
      wrap(
        MarktResponsiveDataList<String>(
          items: const [],
          loading: true,
          itemBuilder: (context, item) => Text(item),
        ),
      ),
    );

    expect(find.byType(CircularProgressIndicator), findsOneWidget);
    expect(find.byType(ListView), findsNothing);
  });

  testWidgets('zeigt custom loadingWidget statt Default', (tester) async {
    await tester.pumpWidget(
      wrap(
        MarktResponsiveDataList<String>(
          items: const [],
          loading: true,
          loadingWidget: const Text('Lade Eintraege...'),
          itemBuilder: (context, item) => Text(item),
        ),
      ),
    );

    expect(find.text('Lade Eintraege...'), findsOneWidget);
    expect(find.byType(CircularProgressIndicator), findsNothing);
  });

  testWidgets('zeigt Default-Empty-State, wenn items leer', (tester) async {
    await tester.pumpWidget(
      wrap(
        MarktResponsiveDataList<String>(
          items: const [],
          itemBuilder: (context, item) => Text(item),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Keine Eintraege vorhanden'), findsOneWidget);
  });

  testWidgets('zeigt custom emptyWidget statt Default', (tester) async {
    await tester.pumpWidget(
      wrap(
        MarktResponsiveDataList<String>(
          items: const [],
          emptyWidget: const Text('Noch keine Dokumente'),
          itemBuilder: (context, item) => Text(item),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Noch keine Dokumente'), findsOneWidget);
  });

  testWidgets('zeigt Default-Error-State, wenn error gesetzt', (tester) async {
    await tester.pumpWidget(
      wrap(
        MarktResponsiveDataList<String>(
          items: const [],
          error: 'Netzwerkfehler',
          itemBuilder: (context, item) => Text(item),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.textContaining('Netzwerkfehler'), findsOneWidget);
  });

  testWidgets('zeigt custom errorBuilder statt Default', (tester) async {
    await tester.pumpWidget(
      wrap(
        MarktResponsiveDataList<String>(
          items: const [],
          error: 'Netzwerkfehler',
          errorBuilder: (context, error) => Text('Custom: $error'),
          itemBuilder: (context, item) => Text(item),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Custom: Netzwerkfehler'), findsOneWidget);
  });

  testWidgets('Grid-Zellhoehe ist fix (mainAxisExtent), nicht von der Spaltenbreite abgeleitet', (
    tester,
  ) async {
    // Regressionstest fuer den Desktop-Bug: `childAspectRatio` haette die
    // Zellhoehe aus der (bei 3 Spalten sehr grossen) Spaltenbreite
    // abgeleitet und dadurch viel zu hohe Cards mit Leerraum erzeugt.
    // `mainAxisExtent` muss stattdessen unabhaengig von der verfuegbaren
    // Breite konstant bleiben.
    Future<double> gridCellHeight(Size size) async {
      await tester.pumpWidget(
        wrap(
          MarktResponsiveDataList<String>(
            items: const ['Alpha', 'Beta', 'Gamma'],
            itemBuilder: (context, item) => Text(item),
          ),
          size: size,
        ),
      );
      await tester.pumpAndSettle();

      final delegate =
          tester.widget<GridView>(find.byType(GridView)).gridDelegate
              as SliverGridDelegateWithFixedCrossAxisCount;
      return delegate.mainAxisExtent!;
    }

    final tabletHeight = await gridCellHeight(const Size(800, 800)); // 2 Spalten
    final desktopHeight = await gridCellHeight(const Size(1600, 800)); // 3 Spalten, sehr breit

    expect(tabletHeight, desktopHeight);
  });

  testWidgets('Pull-to-Refresh funktioniert auch im Empty-State', (tester) async {
    var refreshCalled = false;

    await tester.pumpWidget(
      wrap(
        MarktResponsiveDataList<String>(
          items: const [],
          onRefresh: () async => refreshCalled = true,
          itemBuilder: (context, item) => Text(item),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.byType(RefreshIndicator), findsOneWidget);

    await tester.fling(find.byType(ListView), const Offset(0, 300), 1000);
    await tester.pumpAndSettle();

    expect(refreshCalled, isTrue);
  });
}
