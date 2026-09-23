// Widget-Tests fuer das generische Profil-/Logout-Menue (Shared UI
// Primitive, Phase 1). Bewusst ohne Fachlichkeit.
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:markt_ma_documents_poc/theme/markt_theme.dart';
import 'package:markt_ma_documents_poc/widgets/shared/markt_profile_menu.dart';

void main() {
  Widget wrap(Widget child) {
    return MaterialApp(
      theme: MarktTheme.light(),
      home: Scaffold(body: Center(child: child)),
    );
  }

  testWidgets('zeigt Avatar-Chip und oeffnet Menue mit Abmelden-Eintrag', (tester) async {
    var loggedOut = false;
    await tester.pumpWidget(wrap(MarktProfileMenu(onLogout: () => loggedOut = true)));

    expect(find.byIcon(Icons.person_outline), findsOneWidget);
    expect(find.text('Abmelden'), findsNothing);

    await tester.tap(find.byType(CircleAvatar));
    await tester.pumpAndSettle();

    expect(find.text('Abmelden'), findsOneWidget);

    await tester.tap(find.text('Abmelden'));
    await tester.pumpAndSettle();

    expect(loggedOut, isTrue);
  });

  testWidgets('zeigt optionales userLabel im Menue-Header', (tester) async {
    await tester.pumpWidget(
      wrap(MarktProfileMenu(userLabel: 'demo@markt.ma', onLogout: () {})),
    );

    await tester.tap(find.byType(CircleAvatar));
    await tester.pumpAndSettle();

    expect(find.text('demo@markt.ma'), findsOneWidget);
  });

  testWidgets('zeigt Name/E-Mail direkt im Trigger auf Desktop-Breiten (>= 1024px), inkl. Initialen',
      (tester) async {
    // Bug 23.09.: nach frischem Login (dhl-dev) blieb der Trigger auf
    // Desktop-Breiten ein generisches Icon, obwohl Name/E-Mail vorlagen -
    // dieser Test verifiziert direkt den SICHTBAREN Trigger (kein Tap
    // noetig), nicht nur den geoeffneten Popup-Inhalt.
    tester.view.physicalSize = const Size(1280, 900);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(
      wrap(MarktProfileMenu(userLabel: 'essoudati', userSubLabel: 'essoudati@hotmail.de', onLogout: () {})),
    );
    await tester.pumpAndSettle();

    // Initialen aus einem einzelnen Wort: erster Buchstabe, Grossschreibung.
    expect(find.text('E'), findsOneWidget);
    expect(find.text('essoudati'), findsOneWidget);
    expect(find.text('essoudati@hotmail.de'), findsOneWidget);
    // Generisches Icon darf NICHT mehr erscheinen, sobald Initialen
    // ermittelt werden konnten.
    expect(find.byIcon(Icons.person_outline), findsNothing);
  });

  testWidgets('bleibt auf kompakten Breiten (< 1024px) ohne Tap generisch/kompakt', (tester) async {
    tester.view.physicalSize = const Size(800, 600);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(
      wrap(MarktProfileMenu(userLabel: 'essoudati', userSubLabel: 'essoudati@hotmail.de', onLogout: () {})),
    );
    await tester.pumpAndSettle();

    // Auf kompakten Breiten erscheinen Name/E-Mail NICHT direkt im Trigger
    // (Platzgruende) - aber die Initialen ersetzen weiterhin das
    // generische Icon.
    expect(find.text('essoudati'), findsNothing);
    expect(find.text('essoudati@hotmail.de'), findsNothing);
    expect(find.text('E'), findsOneWidget);

    await tester.tap(find.byType(CircleAvatar));
    await tester.pumpAndSettle();

    expect(find.text('essoudati'), findsOneWidget);
    expect(find.text('essoudati@hotmail.de'), findsOneWidget);
  });
}
