/// Zentrale API-Konfiguration fuer den PoC.
///
/// WICHTIG: markt.ma hat keinen `server.servlet.context-path` (siehe Audit),
/// alle Endpunkte liegen direkt unter `/api/...`. Es gibt keine
/// Flutter-spezifischen Endpunkte - dies ruft exakt dieselben Pfade wie
/// Angular auf (`/api/auth/login`, `/api/documents/upload`, ...).
///
/// [baseUrl] enthaelt bereits das `/api`-Praefix; die einzelnen `*Path`-
/// Konstanten sind relativ dazu (z.B. `/auth/login`). So bleibt `/api`
/// an genau einer Stelle definiert und wird nicht pro Pfad dupliziert.
class ApiConfig {
  ApiConfig._();

  /// Basis-URL des bestehenden Spring-Boot-Backends.
  ///
  /// `10.0.2.2` ist eine spezielle Alias-IP, die NUR im Android-Emulator auf
  /// den Localhost des Host-Rechners zeigt. Auf einem echten Android-/iOS-
  /// Geraet (und in Produktion) ist diese Adresse nicht erreichbar
  /// (`SocketException: Connection timed out`).
  ///
  /// Deshalb ist der Default hier bewusst die echte Produktions-Domain -
  /// das ist der Fall, der "einfach funktionieren" soll, wenn der PoC auf
  /// einem physischen Geraet installiert wird. Fuer lokale Entwicklung im
  /// Android-Emulator gegen ein lokal laufendes Backend muss die Emulator-
  /// Alias-IP explizit ueberschrieben werden:
  ///
  /// ```powershell
  /// flutter run --dart-define=MARKT_MA_API_BASE_URL=http://10.0.2.2:8080/api
  /// ```
  ///
  /// Alle Services (`AuthService`, `DocumentsService`, ...) verwenden
  /// ausschliesslich diese Konstante - keine URL wird an anderer Stelle
  /// dupliziert. Bewusst als einfache Konstante gehalten (kein .env/Flavor-
  /// System) - das ist ein PoC, kein Produkt-Client.
  static const String baseUrl = String.fromEnvironment(
    'MARKT_MA_API_BASE_URL',
    defaultValue: 'https://api.markt.ma/api',
  );

  static const String loginPath = '/auth/login';
  static const String documentsUploadPath = '/documents/upload';
  static const String documentsListPath = '/documents';

  /// Bestehender, unveraenderter Endpoint `GET /api/stores/{storeId}/dhl/parcels/stored`
  /// (siehe DHL-Audit vom 23.09., `DhlController.listStoredParcels`). Liest
  /// ausschliesslich bereits in der DB gespeicherte Pakete - kein DHL-API-Call.
  static String dhlStoredParcelsPath(int storeId) => '/stores/$storeId/dhl/parcels/stored';
}
