export const environment = {
  production: false,
  useMockData: false,
  apiUrl: 'http://localhost:8080/api',
  publicApiUrl: 'http://localhost:8080/api/public',
  whatsappNumber: '+212675522961',

  /**
   * Meta/Facebook Pixel ID.
   * Leer ('') = Pixel komplett deaktiviert (no-op), kein Script wird geladen.
   * TODO: Consent-Gate davor schalten bevor in Prod aktiviert wird (DSGVO/RGPD).
   */
  metaPixelId: '',

  /**
   * Microsoft Clarity Projekt-ID.
   * Leer ('') = Clarity komplett deaktiviert – kein Script, kein Tracking.
   * DEV: Bewusst leer gelassen – Tracking NUR in Production aktiv.
   * PROD: ID aus https://clarity.microsoft.com → Einstellungen → Projekt-ID eintragen.
   * Beispiel: clarityId: 'abc123xyz'
   */
  clarityId: ''
};
