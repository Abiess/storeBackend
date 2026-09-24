// Widget-Tests fuer die generische Dashboard-Shell (`MarktAppShell` +
// `MarktSideNav` + `MarktTopBar` + `MarktFooter`). Bewusst ohne
// Fachlichkeit (keine `DocumentDto`), um zu zeigen, dass die Shell wirklich
// generisch und wiederverwendbar ist.
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:markt_ma_documents_poc/theme/markt_theme.dart';
import 'package:markt_ma_documents_poc/widgets/shared/markt_app_shell.dart';
import 'package:markt_ma_documents_poc/widgets/shared/markt_footer.dart';
import 'package:markt_ma_documents_poc/widgets/shared/markt_side_nav.dart';

void main() {
  // `MediaQuery`/`SizedBox` allein reichen nicht aus, um Breiten > 800px zu
  // erzwingen: Der Standard-Testviewport von `flutter_test` ist 800x600 und
  // ein SizedBox kann seine Kind-Constraints nicht ueber die tatsaechliche
  // Fenstergroesse hinaus vergroessern (`BoxConstraints.enforce` clamped auf
  // das Maximum des Vorfahren). Deshalb muss fuer Desktop-Breiten (>= 1024)
  // zusaetzlich `tester.view` direkt vergroessert werden - siehe
  // https://api.flutter.dev/flutter/flutter_test/TestFlutterView-class.html.
  Future<void> setSurfaceSize(WidgetTester tester, Size size) async {
    tester.view.physicalSize = size;
    tester.view.devicePixelRatio = 1.0;
    addTearDown(() {
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    });
  }

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
    await setSurfaceSize(tester, const Size(1400, 900));
    await tester.pumpWidget(wrap(buildShell(), size: const Size(1400, 900)));
    await tester.pumpAndSettle();

    expect(find.text('Documents Dashboard'), findsOneWidget);
    expect(find.text('Documents-Inhalt'), findsOneWidget);
    // Sidebar-Nav-Eintrag direkt sichtbar, ohne Drawer oeffnen zu muessen.
    expect(find.text('Documents'), findsOneWidget);
    expect(find.byType(Drawer), findsNothing);
    expect(find.byIcon(Icons.menu), findsNothing);
    // Footer auf Desktop sichtbar (siehe Klassendoku von MarktAppShell).
    expect(find.byType(MarktFooter), findsOneWidget);
  });

  testWidgets('Tablet (600-1023px): Hamburger vorhanden, Drawer oeffnet MarktSideNav, Footer sichtbar', (
    tester,
  ) async {
    await setSurfaceSize(tester, const Size(800, 900));
    await tester.pumpWidget(wrap(buildShell(), size: const Size(800, 900)));
    await tester.pumpAndSettle();

    expect(find.text('Documents-Inhalt'), findsOneWidget);
    expect(find.byIcon(Icons.menu), findsOneWidget);
    expect(find.byType(MarktFooter), findsOneWidget);

    await tester.tap(find.byIcon(Icons.menu));
    await tester.pumpAndSettle();

    expect(find.byType(Drawer), findsOneWidget);
    expect(find.byType(MarktSideNav), findsOneWidget);
  });

  testWidgets(
    'Phone (< 600px) mit genau einem NavItem: kein Hamburger/Drawer, keine BottomNav, kein Footer',
    (tester) async {
      await setSurfaceSize(tester, const Size(400, 800));
      await tester.pumpWidget(wrap(buildShell(), size: const Size(400, 800)));
      await tester.pumpAndSettle();

      expect(find.text('Documents-Inhalt'), findsOneWidget);
      expect(find.byIcon(Icons.menu), findsNothing);
      expect(find.byType(Drawer), findsNothing);
      expect(find.byType(NavigationBar), findsNothing);
      expect(find.byType(MarktFooter), findsNothing);
    },
  );

  testWidgets(
    'Phone (< 600px) mit mehreren NavItems: kompakte NavigationBar statt Drawer/Hamburger',
    (tester) async {
      await setSurfaceSize(tester, const Size(400, 800));
      await tester.pumpWidget(
        wrap(
          const MarktAppShell(
            title: 'Documents Dashboard',
            navItems: [
              MarktNavItem(icon: Icons.description, label: 'Documents', selected: true),
              MarktNavItem(icon: Icons.settings, label: 'Settings'),
            ],
            body: Center(child: Text('Documents-Inhalt')),
          ),
          size: const Size(400, 800),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.byIcon(Icons.menu), findsNothing);
      expect(find.byType(Drawer), findsNothing);
      expect(find.byType(NavigationBar), findsOneWidget);
      expect(find.text('Settings'), findsOneWidget);
    },
  );

  testWidgets('rendert fehlerfrei unter Light- und Dark-Theme', (tester) async {
    await setSurfaceSize(tester, const Size(1400, 900));
    await tester.pumpWidget(wrap(buildShell(), theme: MarktTheme.light()));
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);

    await tester.pumpWidget(wrap(buildShell(), theme: MarktTheme.dark()));
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
  });

  testWidgets('floatingActionButton wird durchgereicht', (tester) async {
    await setSurfaceSize(tester, const Size(1400, 900));
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
