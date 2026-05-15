export const environment = {
  production: false,
  useMockData: false,
  apiUrl: 'http://localhost:8080/api',
  publicApiUrl: 'http://localhost:8080/api/public',
  whatsappNumber: '+49123456789',

  /**
   * Meta/Facebook Pixel ID.
   * Leer ('') = Pixel komplett deaktiviert (no-op), kein Script wird geladen.
   * TODO: Consent-Gate davor schalten bevor in Prod aktiviert wird (DSGVO/RGPD).
   */
  metaPixelId: ''
};
