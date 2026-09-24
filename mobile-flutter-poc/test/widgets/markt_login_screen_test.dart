// Widget-Tests fuer den generischen `MarktLoginScreen` (Shared Layout).
// Bewusst mit generischem Branding (kein "Documents"), um zu zeigen, dass
// der Screen wirklich wiederverwendbar/fachlich neutral ist.
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:markt_ma_documents_poc/theme/markt_theme.dart';
import 'package:markt_ma_documents_poc/widgets/shared/markt_login_screen.dart';

void main() {
  // Siehe `markt_app_shell_test.dart`: der Standard-Testviewport ist
  // 800x600 - fuer Desktop-Breiten (>= 1024) muss `tester.view` direkt
  // vergroessert werden, ein `SizedBox`/`MediaQuery` allein reicht nicht.
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

  MarktLoginScreen buildScreen({
    Future<void> Function(String email, String password)? onLogin,
  }) {
    return MarktLoginScreen(
      appName: 'Testapp',
      headline: 'Willkommen zurück',
      description: 'Kurzbeschreibung',
      icon: Icons.widgets,
      onLogin: onLogin ?? (_, __) async {},
    );
  }

  testWidgets('Desktop (>= 1024px): Branding-Panel (appName/description) sichtbar', (
    tester,
  ) async {
    await setSurfaceSize(tester, const Size(1400, 900));
    await tester.pumpWidget(wrap(buildScreen(), size: const Size(1400, 900)));
    await tester.pumpAndSettle();

    expect(find.text('Testapp'), findsOneWidget);
    expect(find.text('Kurzbeschreibung'), findsOneWidget);
    expect(find.text('markt.ma'), findsOneWidget);
    expect(find.text('Willkommen zurück'), findsOneWidget);
  });

  testWidgets('Mobile (< 1024px): kein Desktop-Branding-Panel, appName weiterhin sichtbar (kompakter Header)', (
    tester,
  ) async {
    await setSurfaceSize(tester, const Size(400, 800));
    await tester.pumpWidget(wrap(buildScreen(), size: const Size(400, 800)));
    await tester.pumpAndSettle();

    // Der kompakte Header zeigt appName weiterhin, aber "markt.ma" +
    // description (nur Teil der Desktop-_BrandingPane) fehlen.
    expect(find.text('Testapp'), findsOneWidget);
    expect(find.text('markt.ma'), findsNothing);
    expect(find.text('Kurzbeschreibung'), findsNothing);
    expect(find.text('Willkommen zurück'), findsOneWidget);
  });

  testWidgets('Login-Callback erhaelt eingegebene E-Mail + Passwort', (tester) async {
    String? capturedEmail;
    String? capturedPassword;

    await setSurfaceSize(tester, const Size(1400, 900));
    await tester.pumpWidget(
      wrap(
        buildScreen(
          onLogin: (email, password) async {
            capturedEmail = email;
            capturedPassword = password;
          },
        ),
        size: const Size(1400, 900),
      ),
    );
    await tester.pumpAndSettle();

    await tester.enterText(find.widgetWithText(TextField, 'E-Mail'), 'user@markt.ma');
    await tester.enterText(find.widgetWithText(TextField, 'Passwort'), 'secret123');
    await tester.tap(find.widgetWithText(FilledButton, 'Anmelden'));
    await tester.pumpAndSettle();

    expect(capturedEmail, 'user@markt.ma');
    expect(capturedPassword, 'secret123');
  });

  testWidgets('Loading-Zustand verhindert mehrfaches Submit', (tester) async {
    var callCount = 0;

    await setSurfaceSize(tester, const Size(1400, 900));
    await tester.pumpWidget(
      wrap(
        buildScreen(
          onLogin: (_, __) async {
            callCount++;
            await Future<void>.delayed(const Duration(milliseconds: 200));
          },
        ),
        size: const Size(1400, 900),
      ),
    );
    await tester.pumpAndSettle();

    final submitButton = find.widgetWithText(FilledButton, 'Anmelden');
    await tester.tap(submitButton);
    await tester.pump(); // Loading-Zustand rendern, ohne die Future abzuwarten

    // Waehrend des Ladens zeigt der Button einen Spinner statt Text -
    // ein erneuter Tap ueber denselben Button-Typ darf keinen zweiten aufruf ausloesen.
    expect(find.byType(CircularProgressIndicator), findsOneWidget);
    await tester.tap(find.byType(FilledButton));
    await tester.pump(const Duration(milliseconds: 250));
    await tester.pumpAndSettle();

    expect(callCount, 1);
  });

  testWidgets('Fehlerzustand wird ueber errorContainer/onErrorContainer dargestellt', (
    tester,
  ) async {
    await setSurfaceSize(tester, const Size(1400, 900));
    final theme = MarktTheme.light();
    await tester.pumpWidget(
      wrap(
        buildScreen(
          onLogin: (_, __) async {
            throw Exception('Login fehlgeschlagen');
          },
        ),
        size: const Size(1400, 900),
        theme: theme,
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.widgetWithText(FilledButton, 'Anmelden'));
    await tester.pumpAndSettle();

    expect(find.textContaining('Login fehlgeschlagen'), findsOneWidget);
  });

  testWidgets('Passwort Show/Hide-Toggle funktioniert', (tester) async {
    await setSurfaceSize(tester, const Size(1400, 900));
    await tester.pumpWidget(wrap(buildScreen(), size: const Size(1400, 900)));
    await tester.pumpAndSettle();

    final passwordField = tester.widget<TextField>(find.widgetWithText(TextField, 'Passwort'));
    expect(passwordField.obscureText, isTrue);

    await tester.tap(find.byIcon(Icons.visibility_outlined));
    await tester.pumpAndSettle();

    final toggledField = tester.widget<TextField>(find.widgetWithText(TextField, 'Passwort'));
    expect(toggledField.obscureText, isFalse);
    expect(find.byIcon(Icons.visibility_off_outlined), findsOneWidget);
  });

  testWidgets('rendert fehlerfrei unter Light- und Dark-Theme', (tester) async {
    await setSurfaceSize(tester, const Size(1400, 900));
    await tester.pumpWidget(wrap(buildScreen(), theme: MarktTheme.light()));
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);

    await tester.pumpWidget(wrap(buildScreen(), theme: MarktTheme.dark()));
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
  });
}
