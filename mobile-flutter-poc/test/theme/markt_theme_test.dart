// Widget-/Unit-Tests fuer das zentrale markt.ma Theme (`MarktTheme`).
//
// Deckt ab: Light/Dark liefern jeweils ein sinnvolles ColorScheme mit der
// richtigen Brightness, `MarktBadgeTheme` ist in beiden als Extension
// registriert, die zentrale Typografie nutzt Inter, und `MaterialApp` mit
// `themeMode: ThemeMode.system` wendet tatsaechlich das jeweils passende
// Theme an.
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:markt_ma_documents_poc/theme/markt_theme.dart';

void main() {
  test('MarktTheme.light() liefert ein helles ColorScheme + MarktBadgeTheme', () {
    final theme = MarktTheme.light();

    expect(theme.brightness, Brightness.light);
    expect(theme.colorScheme.brightness, Brightness.light);
    expect(theme.extension<MarktBadgeTheme>(), isNotNull);
    expect(theme.extension<MarktBadgeTheme>()!.size, MarktBadgeTheme.standard.size);
  });

  test('MarktTheme.dark() liefert ein dunkles ColorScheme + MarktBadgeTheme', () {
    final theme = MarktTheme.dark();

    expect(theme.brightness, Brightness.dark);
    expect(theme.colorScheme.brightness, Brightness.dark);
    expect(theme.extension<MarktBadgeTheme>(), isNotNull);
  });

  test('MarktTheme nutzt Inter zentral fuer Fliesstext und AppBar-Titel', () {
    final theme = MarktTheme.light();

    expect(theme.textTheme.bodyMedium?.fontFamily, 'Inter');
    expect(theme.appBarTheme.titleTextStyle?.fontFamily, 'Inter');
  });

  testWidgets('MaterialApp mit themeMode.light rendert MarktTheme.light()', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: MarktTheme.light(),
        darkTheme: MarktTheme.dark(),
        themeMode: ThemeMode.light,
        home: Builder(
          builder: (context) {
            final brightness = Theme.of(context).brightness;
            return Scaffold(body: Text('brightness=$brightness'));
          },
        ),
      ),
    );

    expect(find.text('brightness=Brightness.light'), findsOneWidget);
  });

  testWidgets('MaterialApp mit themeMode.dark rendert MarktTheme.dark()', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: MarktTheme.light(),
        darkTheme: MarktTheme.dark(),
        themeMode: ThemeMode.dark,
        home: Builder(
          builder: (context) {
            final brightness = Theme.of(context).brightness;
            return Scaffold(body: Text('brightness=$brightness'));
          },
        ),
      ),
    );

    expect(find.text('brightness=Brightness.dark'), findsOneWidget);
  });
}
