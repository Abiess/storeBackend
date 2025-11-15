# Brand Kit Generator - Zero-LLM Solution

## Overview
Der Brand Kit Generator erstellt deterministisch Marken-Assets aus Formular-Eingaben ohne externe APIs oder LLM-Abhängigkeiten.

## ⚡ UI Safety Guarantees

**All UI safety rules enforced:**

1. ✅ **Scoped Decorations**: All decorative elements confined to `.brand-preview .brand-decor`
2. ✅ **Safe Stacking**: `isolation: isolate` + explicit z-index hierarchy (decor=0, content=1, buttons=2)
3. ✅ **No Interaction Blocking**: `pointer-events: none` on all decorative layers
4. ✅ **Color Safety**: Backend clamps S≤0.7, L≤0.85; blocks neon green with indigo fallback
5. ✅ **No Global Leaks**: All styles scoped to `.brand-onboarding-container`

See [UI_SAFETY_CHECKLIST.md](./UI_SAFETY_CHECKLIST.md) for complete verification.

## Features

### Backend (Spring Boot 3 + Java 21)

#### Generierte Assets
- **Logo**: SVG + PNG Varianten (transparent background)
- **Farbpalette**: JSON mit CSS-Variablen
- **Hero Banner**: 1920x1080 JPG mit Gradient + Shapes
- **Favicons**: 16, 32, 180, 192, 512px PNG
- **OG Image**: 1200x630 JPG für Social Media

#### Services
- `PaletteService`: Deterministisches Farbpaletten-Generator mit WCAG-Kontrast
- `LogoService`: SVG Monogramm-Generator + PNG Rasterizer
- `HeroService`: Gradient + Shape Overlay Generator
- `IconService`: Multi-Size Icon Generator
- `OgService`: Social Media Image Generator
- `BrandKitService`: Orchestrator für alle Asset-Generatoren

#### Endpoints
```
POST /api/stores/{id}/brand/generate
GET  /api/stores/{id}/brand/assets
PUT  /api/stores/{id}/brand/palette
```

### Frontend (Angular 17 Standalone + Material)

#### Komponenten
- **BrandOnboardingComponent**: `/admin/store/:storeId/brand`
  - Formular für Eingaben (shopName, slogan, industry, style)
  - Preferred/Forbidden Colors Management
  - Live Preview mit CSS-Variablen
  - Generate/Regenerate/Save/Download Funktionen

- **BrandService**: HTTP Client für API-Kommunikation

## Verwendung

### Backend Setup

1. **Dependencies hinzufügen** (pom.xml):
```xml
<!-- Apache Batik für SVG -->
<dependency>
    <groupId>org.apache.xmlgraphics</groupId>
    <artifactId>batik-transcoder</artifactId>
    <version>1.17</version>
</dependency>
<dependency>
    <groupId>org.apache.xmlgraphics</groupId>
    <artifactId>batik-codec</artifactId>
    <version>1.17</version>
</dependency>

<!-- TwelveMonkeys für erweiterte Image-Operationen -->
<dependency>
    <groupId>com.twelvemonkeys.imageio</groupId>
    <artifactId>imageio-core</artifactId>
    <version>3.10.1</version>
</dependency>
```

2. **MinIO Konfiguration** (application.yml):
```yaml
minio:
  url: ${MINIO_URL:http://localhost:9000}
  access-key: ${MINIO_ACCESS_KEY}
  secret-key: ${MINIO_SECRET_KEY}
  bucket-name: store-assets
```

### Frontend Setup

1. Route ist bereits in `app.routes.ts` konfiguriert:
   - `/admin/store/:storeId/brand`

2. Navigation zum Brand Kit Generator:
```typescript
this.router.navigate(['/admin/store', storeId, 'brand']);
```

## API Beispiel

### Request
```json
POST /api/stores/1/brand/generate
{
  "shopName": "My Amazing Store",
  "slogan": "Quality products for everyone",
  "industry": "Fashion",
  "style": "minimal",
  "preferredColors": ["#FF5733"],
  "forbiddenColors": ["#000000"],
  "salt": "optional-for-regeneration"
}
```

### Response
```json
{
  "assets": {
    "logo-svg": "https://minio.../store-1/brand/logo/primary.svg?...",
    "logo-png": "https://minio.../store-1/brand/logo/primary.png?...",
    "hero-1920x1080": "https://minio.../store-1/brand/hero/hero-1920x1080.jpg?...",
    "favicon-16": "https://minio.../store-1/brand/favicon/icon-16.png?...",
    "og-1200x630": "https://minio.../store-1/brand/og/og-1200x630.jpg?...",
    "palette-json": "https://minio.../store-1/brand/palette.json?..."
  },
  "paletteTokens": {
    "--color-primary": "#FF5733",
    "--color-secondary": "#C44327",
    "--color-accent": "#FF9D33",
    "--color-background": "#FAFAFA",
    "--color-surface": "#FFFFFF",
    "--color-text": "#212121",
    "--color-text-secondary": "#757575"
  },
  "initials": "MAS"
}
```

## Design-Regeln

### Farbpalette
- **Determinismus**: Hash(shopName + salt) → HSL-Seed
- **Preferred Colors**: Erste Farbe als Primary verwenden
- **Forbidden Colors**: DeltaE-basierte Vermeidung
- **Kontrast**: WCAG-Mindestkontrast (4.5:1) zwischen Text/Background

### Logo-Stile
- **minimal**: Kreis/Rounded-Rect + Sans-Serif
- **geometric**: Hexagon/Triangle Grid
- **playful**: Blob-Shape (Bezier-Kurven)
- **organic**: Blatt/Tropfen-Form

### Hero Banner
- Linear/Radial Gradient aus Palette
- Style-basierte Shape-Overlays (Dreiecke, Kreise, Linien)
- Safe Text Area links

## Tests

Alle Services haben Unit-Tests:
- `PaletteServiceTest`: Determinismus, Kontrast, Forbidden Colors
- `LogoServiceTest`: Initials-Extraktion, SVG-Generierung
- `HeroServiceTest`: Image-Generierung, Determinismus
- `IconServiceTest`: Multi-Size Resizing
- `OgServiceTest`: Social Media Image Generation

Tests ausführen:
```bash
cd storeBackend
mvnw test
```

## Production Considerations

### Performance
- Assets werden nur bei Bedarf generiert (nicht bei jedem Request)
- MinIO presigned URLs (7 Tage Cache)
- Async Asset-Generierung möglich

### Skalierung
- Stateless Design (keine Server-Side State)
- MinIO als distributed Object Storage
- Multi-Tenant isolation via `store-{id}/` Prefix

### Erweiterungen
- **Batik Integration**: Für vollständige SVG → PNG Konvertierung
- **ZIP Download**: Backend-Endpoint zum Streamen aller Assets
- **Asset Versionierung**: Timestamp-basierte Versionen
- **Custom Fonts**: Web-Font Integration für Logo-Text

## Data Testid Attribute

Alle interaktiven Elemente haben `data-testid` für E2E-Tests:
- `shop-name-input`
- `slogan-input`
- `industry-input`
- `style-select`
- `preferred-color-input`
- `add-preferred-color-btn`
- `forbidden-color-input`
- `add-forbidden-color-btn`
- `generate-btn`
- `regenerate-btn`
- `save-palette-btn`
- `download-zip-btn`

## Kosten
**€0 pro Generierung** - Keine externen API-Calls, keine LLM-Kosten!

Nur Infrastructure-Kosten:
- Spring Boot Server
- MinIO Storage
- Postgres (für Store-Metadaten)
