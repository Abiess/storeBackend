export const environment = {
  production: false,
  useMockData: false,  // ✅ Verwende echtes Backend für Themes
  apiUrl: 'http://localhost:8080/api',
  publicApiUrl: 'http://localhost:8080/api/public',

  /**
   * Plattform-weiter WhatsApp-Fallback (dev/demo).
   * Leer lassen ('') = Widget wird ausgeblendet.
   * TODO: Später pro Store aus Store-Settings überschreiben.
   */
  whatsappNumber: '+49123456789'
};
