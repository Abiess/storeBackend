import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor-Konfiguration für den Android Pilot (Mobile Factory M2).
 *
 * App-Identitäts-Entscheidung (siehe ARCHITECTURE_APP_FACTORY.md §7h):
 * Für den Pilot wird eine NEUTRALE markt.ma "Container-App" konfiguriert
 * (appId "ma.markt.app", appName "markt.ma"), NICHT eine DHL-spezifische
 * App-ID. Begründung: Ob langfristig eine einzige markt.ma-Container-App
 * (Web-App-Factory-Prinzip: 1 Client, viele Apps per Entitlement) oder
 * separate Store-Einträge pro Fach-App (DHL, MARITIME, ...) veröffentlicht
 * werden, ist eine Produkt-/Store-Entscheidung, die noch nicht getroffen
 * wurde. Eine DHL-spezifische Bundle-ID jetzt hart zu verdrahten würde
 * genau die Parallelarchitektur erzeugen, die die App Factory vermeiden
 * soll. Der App-Factory-Flow (Login → Entitlements → 1 App? direkt /
 * mehrere Apps? /apps) entscheidet zur Laufzeit, welche App angezeigt
 * wird - unabhängig von der nativen App-Identität.
 */
const config: CapacitorConfig = {
  appId: 'ma.markt.app',
  appName: 'markt.ma',
  webDir: 'dist/markt-ma-frontend',
  server: {
    // Kein "url" gesetzt -> Capacitor lädt die App aus den gebundelten
    // Web-Assets (webDir). Alle API-Aufrufe laufen über HttpClient gegen
    // environment.apiUrl (https://api.markt.ma/api), NICHT gegen den
    // Capacitor-eigenen Origin. Siehe CORS-Analyse in §7h.
    androidScheme: 'https'
  }
};

export default config;
