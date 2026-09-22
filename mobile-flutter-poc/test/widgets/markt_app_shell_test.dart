// Widget-Tests fuer die generische Dashboard-Shell (`MarktAppShell` +
// `MarktSideNav`). Bewusst ohne Fachlichkeit (keine `DocumentDto`), um zu
// zeigen, dass die Shell wirklich generisch und wiederverwendbar ist.
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:markt_ma_documents_poc/theme/markt_theme.dart';
import 'package:markt_ma_documents_poc/widgets/shared/markt_app_shell.dart';
import 'package:markt_ma_documents_poc/widgets/shared/markt_side_nav.dart';

void main() {
  Widget wrap(
    Widget child, {
    Size size = const Size(1400, 900),
    ThemeData? theme,
  }) {
    return MaterialApp(
      theme: theme ?? MarktTheme.light(),
      home: MediaQuery(
        data: MediaQueryData(size: size),
        child: SizedBox(width: size.width, height: size.height, child: child),
      ),
    );
  }

  MarktAppShell buildShell() {
    return MarktAppShell(
      title: 'Documents Dashboard',
      navItems: const [MarktNavItem(icon: Icons.description, label: 'Documents', selected: true)],
      actions: [IconButton(onPressed: () {}, icon: const Icon(Icons.refresh))],
      profile: IconButton(onPressed: () {}, icon: const Icon(Icons.logout)),
      body: const Center(child: Text('Documents-Inhalt')),
    );
  }

  testWidgets('Desktop (>= 1024px): permanente Sidebar sichtbar, kein Drawer/Hamburger', (
    tester,
  ) async {
    await tester.pumpWidget(wrap(buildShell(), size: const Size(1400, 900)));
    await tester.pumpAndSettle();

    expect(find.text('Documents Dashboard'), findsOneWidget);
    expect(find.text('Documents-Inhalt'), findsOneWidget);
    // Sidebar-Nav-Eintrag direkt sichtbar, ohne Drawer oeffnen zu muessen.
    expect(find.text('Documents'), findsOneWidget);
    expect(find.byType(Drawer), findsNothing);
    expect(find.byIcon(Icons.menu), findsNothing);
  });

  testWidgets('Mobile (< 1024px): Hamburger vorhanden, Drawer oeffnet MarktSideNav', (
    tester,
  ) async {
    await tester.pumpWidget(wrap(buildShell(), size: const Size(400, 800)));
    await tester.pumpAndSettle();

    expect(find.text('Documents-Inhalt'), findsOneWidget);
    expect(find.byIcon(Icons.menu), findsOneWidget);

    await tester.tap(find.byIcon(Icons.menu));
    await tester.pumpAndSettle();

    expect(find.byType(Drawer), findsOneWidget);
    expect(find.byType(MarktSideNav), findsOneWidget);
  });

  testWidgets('rendert fehlerfrei unter Light- und Dark-Theme', (tester) async {
    await tester.pumpWidget(wrap(buildShell(), theme: MarktTheme.light()));
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);

    await tester.pumpWidget(wrap(buildShell(), theme: MarktTheme.dark()));
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
  });

  testWidgets('floatingActionButton wird durchgereicht', (tester) async {
    await tester.pumpWidget(
      wrap(
        MarktAppShell(
          title: 'Documents',
          navItems: const [MarktNavItem(icon: Icons.description, label: 'Documents')],
          body: const SizedBox.shrink(),
          floatingActionButton: FloatingActionButton(onPressed: () {}, child: const Icon(Icons.add)),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.byType(FloatingActionButton), findsOneWidget);
  });
}
