/// Zentrale API-Konfiguration fuer den PoC.
///
/// WICHTIG: markt.ma hat keinen `server.servlet.context-path` (siehe Audit),
/// alle Endpunkte liegen direkt unter `/api/...`. Es gibt keine
/// Flutter-spezifischen Endpunkte - dies ruft exakt dieselben Pfade wie
/// Angular auf (`/api/auth/login`, `/api/documents/upload`, ...).
class ApiConfig {
  ApiConfig._();

  /// Basis-URL des bestehenden Spring-Boot-Backends.
  ///
  /// - Android-Emulator: 10.0.2.2 zeigt auf den Localhost des Host-Rechners.
  /// - iOS-Simulator / physisches Geraet im selben WLAN: echte IP/Domain
  ///   des Backends verwenden (z.B. https://api.markt.ma in Produktion).
  ///
  /// Bewusst als einfache Konstante gehalten (kein .env/Flavor-System) -
  /// das ist ein PoC, kein Produkt-Client.
  static const String baseUrl = String.fromEnvironment(
    'MARKT_MA_API_BASE_URL',
    defaultValue: 'http://10.0.2.2:8080',
  );

  static const String loginPath = '/api/auth/login';
  static const String documentsUploadPath = '/api/documents/upload';
  static const String documentsListPath = '/api/documents';
}
