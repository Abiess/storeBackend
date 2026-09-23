import 'package:flutter/material.dart';

import '../../services/auth_service.dart';
import '../../widgets/shared/markt_login_screen.dart';
import 'dhl_home_screen.dart';

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
/// kein neuer Endpoint) und an [DhlHomeScreen] weitergereicht. Ist kein
/// aktiviertes DHL-Entitlement vorhanden, ist `storeId` `null` -
/// `DhlHomeScreen` zeigt in diesem Fall selbst einen expliziten
/// Kein-Zugriff-Zustand (siehe dort), statt dass dieser Login-Screen den
/// Login selbst blockiert (Login bleibt generisch, Entitlement-Pruefung
/// bleibt Sache der jeweiligen App - identisch zum Backend-Modell).
class DhlLoginScreen extends StatelessWidget {
  const DhlLoginScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final authService = AuthService();

    return MarktLoginScreen(
      appName: 'DHL Paketshop',
      headline: 'Willkommen zurück',
      description: 'Pakete und Sendungen im Blick',
      icon: Icons.local_shipping,
      onLogin: (email, password) async {
        final authResponse = await authService.login(email: email, password: password);
        if (!context.mounted) return;
        final storeId = authResponse.user.storeIdForApp('DHL');
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (_) => DhlHomeScreen(storeId: storeId)),
        );
      },
    );
  }
}
