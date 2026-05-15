export const environment = {
  production: true,
  useMockData: false,
  apiUrl: 'https://api.markt.ma/api',
  publicApiUrl: 'https://api.markt.ma/api/public',

  /**
   * Produktion: leer = Widget versteckt, bis Store-Settings gesetzt werden.
   * TODO: Später per Store-Settings-API befüllen.
   */
  whatsappNumber: ''
};
