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
}
