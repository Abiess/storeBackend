// Utility-Funktion für Placeholder-Bilder
// Generiert SVG-basierte Placeholder ohne externe Services

export class PlaceholderImageUtil {

  /**
   * Generiert ein Data-URL SVG-Placeholder-Bild
   * @param width Breite in Pixel
   * @param height Höhe in Pixel
   * @param text Optional: Text im Bild
   * @param bgColor Hintergrundfarbe (hex)
   * @param textColor Textfarbe (hex)
   */
  static generate(
    width: number = 200,
    height: number = 200,
    text: string = '?',
    bgColor: string = '#e5e7eb',
    textColor: string = '#9ca3af'
  ): string {
    const svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="${bgColor}"/>
        <text 
          x="50%" 
          y="50%" 
          dominant-baseline="middle" 
          text-anchor="middle" 
          font-family="system-ui, -apple-system, sans-serif" 
          font-size="${Math.min(width, height) / 4}" 
          fill="${textColor}"
          font-weight="300"
        >${text}</text>
      </svg>
    `;

    // Konvertiere SVG zu Data-URL
    const encoded = encodeURIComponent(svg)
      .replace(/'/g, '%27')
      .replace(/"/g, '%22');

    return `data:image/svg+xml,${encoded}`;
  }

  /**
   * Standard-Placeholder für Produktbilder
   */
  static getProductPlaceholder(size: number = 200): string {
    return this.generate(size, size, '📦', '#f3f4f6', '#6b7280');
  }

  /**
   * Standard-Placeholder für Logos
   */
  static getLogoPlaceholder(size: number = 200): string {
    return this.generate(size, size, 'LOGO', '#3b82f6', '#ffffff');
  }

  /**
   * Standard-Placeholder für Hero-Bilder
   */
  static getHeroPlaceholder(width: number = 1920, height: number = 1080): string {
    return this.generate(width, height, 'Hero Banner', '#1e40af', '#93c5fd');
  }

  /**
   * Standard-Placeholder für Avatar/User-Bilder
   */
  static getAvatarPlaceholder(size: number = 100): string {
    return this.generate(size, size, '👤', '#d1d5db', '#6b7280');
  }
}
