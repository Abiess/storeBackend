export const environment = {
  production: true,
  useMockData: false,
  apiUrl: 'https://api.markt.ma/api',
  publicApiUrl: 'https://api.markt.ma/api/public',
  whatsappNumber: '+212675522961',

  /**
   * Meta Pixel ID für Production.
   * Leer ('') = kein Pixel, kein Script wird geladen.
   * TODO: Erst nach DSGVO/RGPD-Consent-Implementation befüllen.
   * Beispiel: metaPixelId: '1234567890123456'
   */
  metaPixelId: ''
};
