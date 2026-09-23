import 'package:flutter/material.dart';

import '../models/auth_response.dart';
import '../services/auth_service.dart';
import '../services/token_storage.dart';

/// Baut den Home-Screen der jeweiligen App mit dem aktuell eingeloggten
/// [AuthUser] (oder `null`, wenn aus irgendeinem Grund kein User geladen
/// werden konnte - siehe Klassendoku [AuthGate]).
///
/// Bewusst weiterhin ein einfacher `typedef` (kein neues Context-/State-
/// Management-Konzept): jede App entscheidet selbst, was sie mit `user`
/// macht - Documents/Maritime koennen ihn schlicht ignorieren, DHL loest
/// darueber `user?.storeIdForApp('DHL')` auf (siehe `main_dhl.dart`).
typedef AuthUserWidgetBuilder = Widget Function(BuildContext context, AuthUser? user);

/// Generisches Auth-Gate (Core/Shared) - kennt KEINE konkrete App
/// (kein "Documents", kein "Maritime", kein "DHL").
///
/// Verhalten (siehe Auth-Persistenz-Audit + -Korrektur vom 23.09.):
///
/// 1. Kein JWT in [TokenStorage] -> [loginBuilder].
/// 2. JWT vorhanden -> `GET /api/auth/me` (ueber [AuthService.getCurrentUser],
///    BESTEHENDER Endpoint, liefert seit der Korrektur denselben Contract
///    wie `/login`, inkl. `appAccessMode`/`apps[]`) wird genau EINMAL beim
///    Start abgefragt:
///    - Erfolgreich -> [homeBuilder] wird mit dem geladenen [AuthUser]
///      aufgerufen (App-spezifische Entitlement-Aufloesung, z.B. DHL-
///      `storeId`, bleibt Sache des jeweiligen `homeBuilder`s/Screens -
///      KEINE neue Store-Context-Architektur hier).
///    - 401 (Token ungueltig/abgelaufen) -> Token wird geloescht,
///      [loginBuilder] wird angezeigt (fail closed). Kein Redirect-Loop:
///      die Token-Pruefung laeuft nur einmal beim Erstellen dieses State
///      (nicht bei jedem Rebuild), und der Login-Screen navigiert nach
///      erfolgreichem Login selbst per `pushReplacement` zum jeweiligen
///      Home-Screen (siehe `screens/login_screen.dart` etc.) - NICHT
///      zurueck durch dieses Gate.
///    - Netzwerk-/Serverfehler (kein 401) -> wird explizit als Fehler
///      angezeigt (mit "Erneut versuchen"), NIEMALS faelschlich wie ein
///      erfolgreicher Login behandelt und NIEMALS automatisch das Token
///      geloescht (ein voruebergehender Netzwerkfehler soll keine gueltige
///      Sitzung zerstoeren).
class AuthGate extends StatefulWidget {
  const AuthGate({
    super.key,
    required this.loginBuilder,
    required this.homeBuilder,
    AuthService? authService,
  }) : _authService = authService;

  /// Baut den Login-Screen, wenn (noch) kein JWT gespeichert ist, oder
  /// wenn ein gespeichertes JWT vom Backend als ungueltig (401) abgelehnt
  /// wurde.
  final WidgetBuilder loginBuilder;

  /// Baut den Home-Screen der jeweiligen App, sobald der aktuelle User
  /// erfolgreich geladen wurde.
  final AuthUserWidgetBuilder homeBuilder;

  /// Nur fuer Tests: erlaubt das Einschleusen eines Fake-`AuthService`
  /// (analog zum bestehenden `dhlService`-Injection-Muster in
  /// `DhlHomeScreen`), ohne dass Consumer-Code diesen Parameter im
  /// Normalbetrieb setzen muss.
  final AuthService? _authService;

  @override
  State<AuthGate> createState() => _AuthGateState();
}

enum _AuthGateStatus { noToken, user, error }

class _AuthGateResult {
  const _AuthGateResult.noToken()
      : status = _AuthGateStatus.noToken,
        user = null,
        errorMessage = null;

  const _AuthGateResult.user(AuthUser this.user)
      : status = _AuthGateStatus.user,
        errorMessage = null;

  const _AuthGateResult.error(String this.errorMessage)
      : status = _AuthGateStatus.error,
        user = null;

  final _AuthGateStatus status;
  final AuthUser? user;
  final String? errorMessage;
}

class _AuthGateState extends State<AuthGate> {
  late final AuthService _authService = widget._authService ?? AuthService();
  late Future<_AuthGateResult> _future;

  @override
  void initState() {
    super.initState();
    _future = _resolve();
  }

  /// Genau EINMAL pro State ausgefuehrt (siehe `initState`/`_retry`) - kein
  /// automatisches Neu-Abfragen bei jedem Rebuild, damit weder ein
  /// Redirect-Loop noch wiederholte `/me`-Aufrufe waehrend des Renderns
  /// entstehen.
  Future<_AuthGateResult> _resolve() async {
    final token = await TokenStorage.instance.readToken();
    if (token == null || token.isEmpty) {
      return const _AuthGateResult.noToken();
    }

    try {
      final user = await _authService.getCurrentUser(token);
      return _AuthGateResult.user(user);
    } on ApiException catch (e) {
      if (e.statusCode == 401) {
        // Token vom Backend explizit als ungueltig/abgelaufen abgelehnt:
        // fail closed - loeschen und zum Login (kein Loop, siehe Klassendoku).
        await TokenStorage.instance.clearToken();
        return const _AuthGateResult.noToken();
      }
      // Anderer HTTP-Fehlerstatus (z.B. 500) - KEIN Token-Loeschen, KEIN
      // impliziter "erfolgreicher Login" - explizit als Fehler behandeln.
      return _AuthGateResult.error(e.message);
    } catch (e) {
      // Netzwerkfehler (z.B. keine Verbindung) - ebenfalls explizit als
      // Fehler, Token bleibt erhalten (koennte bei naechstem Versuch/mit
      // Netzwerk wieder gueltig sein).
      return _AuthGateResult.error(e.toString());
    }
  }

  void _retry() {
    setState(() {
      _future = _resolve();
    });
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<_AuthGateResult>(
      future: _future,
      builder: (context, snapshot) {
        if (snapshot.connectionState != ConnectionState.done) {
          return const Scaffold(body: Center(child: CircularProgressIndicator()));
        }

        final result = snapshot.data;
        if (result == null || result.status == _AuthGateStatus.noToken) {
          return widget.loginBuilder(context);
        }
        if (result.status == _AuthGateStatus.error) {
          return _AuthGateErrorScreen(message: result.errorMessage!, onRetry: _retry);
        }
        return widget.homeBuilder(context, result.user);
      },
    );
  }
}

/// Expliziter Fehlerzustand fuer `/me`-Netzwerk-/Serverfehler (siehe
/// Klassendoku [AuthGate]) - bewusst generisch/undramatisch gehalten (kein
/// App-spezifisches Branding), da dieser Screen app-uebergreifend
/// (Documents/Maritime/DHL) verwendet wird.
class _AuthGateErrorScreen extends StatelessWidget {
  const _AuthGateErrorScreen({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.cloud_off, size: 48),
              const SizedBox(height: 16),
              const Text(
                'Sitzung konnte nicht geladen werden',
                style: TextStyle(fontWeight: FontWeight.w700, fontSize: 18),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              Text(message, textAlign: TextAlign.center),
              const SizedBox(height: 16),
              ElevatedButton(onPressed: onRetry, child: const Text('Erneut versuchen')),
            ],
          ),
        ),
      ),
    );
  }
}
