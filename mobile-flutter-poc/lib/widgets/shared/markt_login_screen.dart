import 'package:flutter/material.dart';

import '../../theme/markt_theme.dart';
import 'markt_breakpoints.dart';
import 'markt_card.dart';
import 'markt_icon_badge.dart';

/// Zentraler, generischer markt.ma Login-Screen (Shared Layout).
///
/// Analog zu [MarktResponsiveDataList]/[MarktAppShell] kennt dieser Screen
/// KEINE Fachlichkeit - weder "Documents" noch eine Navigationsentscheidung
/// nach erfolgreichem Login. Er ist nur fuer die VISUELLE Praesentation des
/// bestehenden Login-Vertrags zustaendig:
///
///  - [appName]/[headline]/[description]/[icon] sind reines Branding, vom
///    Aufrufer befuellt (z.B. Documents, spaeter Maritime/DHL/Loyalty) -
///    ohne dass diese Datei kopiert werden muesste.
///  - [onLogin] fuehrt den TATSAECHLICHEN Login durch (bestehender
///    `AuthService.login`). Dieser Screen ruft ihn lediglich mit
///    E-Mail/Passwort auf, zeigt Lade-/Fehlerzustand waehrenddessen an und
///    verhindert Doppel-Submits - er speichert selbst kein Token, kennt
///    kein JWT und navigiert nach Erfolg NICHT selbst weiter. Das bleibt
///    Aufgabe des Consumers (i.d.R. via `Navigator.pushReplacement` in der
///    `onLogin`-Callback-Kette, siehe `login_screen.dart`), analog zum
///    bestehenden `AuthGate`.
///
/// Layout-Pattern (Audit vom 22.09., inspiriert von den MIT-lizenzierten
/// `bahricanyesil/flutter-animated-login` und
/// `AmirBayat0/Responsive_login_signup_screens_flutter` - nur das
/// Slot-/Split-Konzept uebernommen, kein Code/State-Management daraus):
///
///  - Desktop (`MarktBreakpoints.isDesktop`, >= 1024px): Split-Layout mit
///    Branding-Flaeche links (eigene Oberflaeche, siehe [_BrandingPane])
///    und zentriertem Formular rechts, das NICHT die volle Haelfte
///    ausfuellt (max. Breite ueber `_maxFormWidth`).
///  - Mobile/Tablet (< 1024px): kein Split, kompakter Branding-Kopfbereich
///    oben, Formular darunter - keine `AppBar`.
///
/// Verwendet ausschliesslich [MarktTheme]/[MarktSpacing]/[MarktCard]/
/// [MarktIconBadge]/`ColorScheme`/`TextTheme` - keine hartcodierten
/// Feature-Farben, keine neue Dependency.
class MarktLoginScreen extends StatefulWidget {
  const MarktLoginScreen({
    super.key,
    required this.appName,
    required this.headline,
    required this.description,
    required this.icon,
    required this.onLogin,
  });

  /// Name der Anwendung im Branding-Bereich (z.B. "Documents").
  final String appName;

  /// Ueberschrift im Formularbereich (z.B. "Willkommen zurueck").
  final String headline;

  /// Kurzbeschreibung unterhalb von [appName] im Branding-Bereich.
  final String description;

  /// Icon im Branding-Bereich (ueber [MarktIconBadge] dargestellt).
  final IconData icon;

  /// Fuehrt den eigentlichen Login durch (bestehender `AuthService`).
  /// Wirft bei Fehlern eine Exception, deren `toString()` als Fehlertext
  /// angezeigt wird (siehe bestehendes `ApiException` in `token_storage.dart`).
  /// Navigation nach Erfolg ist NICHT Aufgabe dieses Callbacks/Screens.
  final Future<void> Function(String email, String password) onLogin;

  /// Formular soll auf Desktop nicht ueber die komplette rechte Haelfte
  /// gestreckt werden, siehe Klassendoku.
  static const double _maxFormWidth = 400;

  @override
  State<MarktLoginScreen> createState() => _MarktLoginScreenState();
}

class _MarktLoginScreenState extends State<MarktLoginScreen> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();

  bool _obscurePassword = true;
  bool _loading = false;
  String? _error;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_loading) return; // verhindert Doppel-Submit waehrend ein Login laeuft
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      await widget.onLogin(_emailController.text.trim(), _passwordController.text);
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Scaffold(
      backgroundColor: colorScheme.surfaceContainerLowest,
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) {
            final isDesktop = MarktBreakpoints.isDesktop(constraints.maxWidth);

            if (isDesktop) {
              return Row(
                children: [
                  Expanded(
                    child: _BrandingPane(
                      appName: widget.appName,
                      description: widget.description,
                      icon: widget.icon,
                    ),
                  ),
                  Expanded(
                    child: Center(
                      child: ConstrainedBox(
                        constraints: const BoxConstraints(maxWidth: MarktLoginScreen._maxFormWidth),
                        child: SingleChildScrollView(
                          padding: const EdgeInsets.all(MarktSpacing.xl),
                          child: _LoginForm(
                            headline: widget.headline,
                            emailController: _emailController,
                            passwordController: _passwordController,
                            obscurePassword: _obscurePassword,
                            onToggleObscurePassword: () => setState(() => _obscurePassword = !_obscurePassword),
                            loading: _loading,
                            error: _error,
                            onSubmit: _submit,
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              );
            }

            // Mobile/Tablet: kein Split-Panel, kompakter Branding-Kopf +
            // Formular untereinander, alles scrollbar (kleine Bildschirme/
            // aufgeklappte Tastatur).
            return SingleChildScrollView(
              padding: const EdgeInsets.all(MarktSpacing.xl),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const SizedBox(height: MarktSpacing.xl),
                  _CompactBrandingHeader(appName: widget.appName, icon: widget.icon),
                  const SizedBox(height: MarktSpacing.xl),
                  _LoginForm(
                    headline: widget.headline,
                    emailController: _emailController,
                    passwordController: _passwordController,
                    obscurePassword: _obscurePassword,
                    onToggleObscurePassword: () => setState(() => _obscurePassword = !_obscurePassword),
                    loading: _loading,
                    error: _error,
                    onSubmit: _submit,
                  ),
                ],
              ),
            );
          },
        ),
      ),
    );
  }
}

/// Linke Branding-Flaeche im Desktop-Split-Layout. Eigene, vom Formular
/// abgesetzte Oberflaeche (`surfaceContainerHigh`, analog zu
/// `MarktSideNav`), damit die Trennung zwischen Branding und Workspace
/// (hier: Formular) klar sichtbar bleibt - kein Feature-Farbwert.
class _BrandingPane extends StatelessWidget {
  const _BrandingPane({required this.appName, required this.description, required this.icon});

  final String appName;
  final String description;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;

    return Container(
      color: colorScheme.surfaceContainerHigh,
      alignment: Alignment.center,
      padding: const EdgeInsets.all(MarktSpacing.xl),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 360),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              'markt.ma',
              style: textTheme.labelLarge?.copyWith(
                color: colorScheme.onSurfaceVariant,
                letterSpacing: 1.2,
              ),
            ),
            const SizedBox(height: MarktSpacing.xl),
            MarktIconBadge(
              icon: Icon(icon, color: colorScheme.primary, size: 36),
              accentColor: colorScheme.primary,
              size: 88,
              borderRadius: 24,
            ),
            const SizedBox(height: MarktSpacing.lg),
            Text(
              appName,
              textAlign: TextAlign.center,
              style: textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: MarktSpacing.sm),
            Text(
              description,
              textAlign: TextAlign.center,
              style: textTheme.bodyMedium?.copyWith(color: colorScheme.onSurfaceVariant),
            ),
          ],
        ),
      ),
    );
  }
}

/// Kompakter Branding-Kopfbereich fuer Mobile/Tablet - dieselben
/// Informationen wie [_BrandingPane] (Icon + [appName]), aber ohne
/// eigene Flaechenfarbe/Split, da auf kleinen Screens kein Platz fuer ein
/// zweites Panel ist.
class _CompactBrandingHeader extends StatelessWidget {
  const _CompactBrandingHeader({required this.appName, required this.icon});

  final String appName;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;

    return Column(
      children: [
        MarktIconBadge(
          icon: Icon(icon, color: colorScheme.primary, size: 28),
          accentColor: colorScheme.primary,
          size: 64,
          borderRadius: 20,
        ),
        const SizedBox(height: MarktSpacing.md),
        Text(
          appName,
          style: textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
        ),
      ],
    );
  }
}

/// Das eigentliche Formular (E-Mail/Passwort/Submit/Fehler), identisch auf
/// Desktop und Mobile eingebettet - nur der umgebende Layout-Container
/// unterscheidet sich (siehe [MarktLoginScreen.build]).
class _LoginForm extends StatelessWidget {
  const _LoginForm({
    required this.headline,
    required this.emailController,
    required this.passwordController,
    required this.obscurePassword,
    required this.onToggleObscurePassword,
    required this.loading,
    required this.error,
    required this.onSubmit,
  });

  final String headline;
  final TextEditingController emailController;
  final TextEditingController passwordController;
  final bool obscurePassword;
  final VoidCallback onToggleObscurePassword;
  final bool loading;
  final String? error;
  final VoidCallback onSubmit;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          headline,
          style: textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.w700),
        ),
        const SizedBox(height: MarktSpacing.xl),
        if (error != null) ...[
          MarktCard(
            color: colorScheme.errorContainer,
            padding: const EdgeInsets.all(MarktSpacing.md),
            margin: EdgeInsets.zero,
            child: Text(error!, style: TextStyle(color: colorScheme.onErrorContainer)),
          ),
          const SizedBox(height: MarktSpacing.lg),
        ],
        TextField(
          controller: emailController,
          keyboardType: TextInputType.emailAddress,
          textInputAction: TextInputAction.next,
          enabled: !loading,
          decoration: const InputDecoration(
            labelText: 'E-Mail',
            border: OutlineInputBorder(borderRadius: BorderRadius.all(Radius.circular(12))),
          ),
        ),
        const SizedBox(height: MarktSpacing.lg),
        TextField(
          controller: passwordController,
          obscureText: obscurePassword,
          textInputAction: TextInputAction.done,
          enabled: !loading,
          onSubmitted: (_) => onSubmit(),
          decoration: InputDecoration(
            labelText: 'Passwort',
            border: const OutlineInputBorder(borderRadius: BorderRadius.all(Radius.circular(12))),
            suffixIcon: IconButton(
              // Show/Hide-Toggle - rein visuell, aendert nichts am Auth-Flow.
              icon: Icon(obscurePassword ? Icons.visibility_outlined : Icons.visibility_off_outlined),
              tooltip: obscurePassword ? 'Passwort anzeigen' : 'Passwort verbergen',
              onPressed: onToggleObscurePassword,
            ),
          ),
        ),
        const SizedBox(height: MarktSpacing.xl),
        FilledButton(
          onPressed: loading ? null : onSubmit,
          style: FilledButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: MarktSpacing.md)),
          child: loading
              ? SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(strokeWidth: 2, color: colorScheme.onPrimary),
                )
              : const Text('Anmelden'),
        ),
      ],
    );
  }
}
