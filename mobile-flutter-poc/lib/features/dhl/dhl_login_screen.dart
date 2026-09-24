import 'package:flutter/material.dart';

import '../../services/auth_service.dart';
import '../../services/dhl_service.dart';
import '../../widgets/shared/markt_login_screen.dart';
import 'dhl_dashboard_screen.dart';

/// Duenner Consumer des zentralen [MarktLoginScreen] fuer die DHL/
/// Paketshop-App - analog zu `screens/login_screen.dart` (Documents) und
/// `features/maritime/maritime_login_screen.dart` (siehe Multi-App-Beweis
/// vom 22.09.). Keine eigene Login-UI, kein eigener Auth-Flow: nur
/// DHL-Branding (appName/headline/description/icon) + der bestehende
/// `AuthService.login`.
///
/// Nach erfolgreichem Login wird die `storeId` fuer das DHL-Entitlement
/// FAIL CLOSED aus der bestehenden Login-Response aufgeloest (siehe
/// DHL-Audit vom 23.09.: `AuthResponse.user.apps[]` = `AppEntitlementDTO`
/// mit `{app, storeId, enabled}`, keine neue Store-Context-Architektur,
/// kein neuer Endpoint) und an [DhlDashboardScreen] weitergereicht. Ist
/// kein aktiviertes DHL-Entitlement vorhanden, ist `storeId` `null` -
/// `DhlDashboardScreen` zeigt in diesem Fall selbst einen expliziten
/// Kein-Zugriff-Zustand (siehe dort), statt dass dieser Login-Screen den
/// Login selbst blockiert (Login bleibt generisch, Entitlement-Pruefung
/// bleibt Sache der jeweiligen App - identisch zum Backend-Modell).
///
/// WICHTIG (Bugfix 23.09., zentrale Current-User-Anzeige): dieser
/// Frisch-Login-Pfad laeuft NICHT durch `AuthGate` (der navigiert selbst
/// direkt per `pushReplacement`, siehe Klassendoku), daher muss
/// `authResponse.user` HIER zusaetzlich zur `storeId` explizit an
/// [DhlDashboardScreen] durchgereicht werden - sonst bleibt die
/// Namens-/Rollenanzeige im Dashboard-Header nach einem frischen Login
/// leer, obwohl `AuthGate` nach einem App-/Browser-Neustart denselben
/// User korrekt anzeigen wuerde.
class DhlLoginScreen extends StatelessWidget {
  const DhlLoginScreen({super.key, this.authService, this.dhlService});

  /// Nur fuer Tests: erlaubt das Einschleusen eines Fake-`AuthService`
  /// (analog zum bestehenden `dhlService`/`documentsService`-Injection-
  /// Muster), ohne dass Consumer-Code diesen Parameter im Normalbetrieb
  /// setzen muss.
  final AuthService? authService;

  /// Nur fuer Tests: wird 1:1 an das nach dem Login erzeugte
  /// [DhlDashboardScreen] durchgereicht, damit dessen eigener Pakete-Abruf
  /// in Tests ueber einen `MockClient` gestubbt werden kann statt einen
  /// echten Netzwerk-Request auszuloesen. Im Normalbetrieb `null`
  /// (`DhlDashboardScreen` nutzt dann seinen eigenen Standard-`DhlService`).
  final DhlService? dhlService;

  @override
  Widget build(BuildContext context) {
    final effectiveAuthService = authService ?? AuthService();

    return MarktLoginScreen(
      appName: 'DHL Paketshop',
      headline: 'Willkommen zurück',
      description: 'Pakete und Sendungen im Blick',
      icon: Icons.local_shipping,
      onLogin: (email, password) async {
        final authResponse = await effectiveAuthService.login(email: email, password: password);
        if (!context.mounted) return;
        final storeId = authResponse.user.storeIdForApp('DHL');
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(
            builder: (_) => DhlDashboardScreen(storeId: storeId, user: authResponse.user, dhlService: dhlService),
          ),
        );
      },
    );
  }
}
