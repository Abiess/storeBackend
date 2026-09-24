import { Injectable } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import { HttpClient } from '@angular/common/http';

export interface SeoSettingsDTO {
  id?: number;
  storeId: number;
  domainId?: number;
  siteName?: string;
  defaultTitleTemplate?: string;
  defaultMetaDescription?: string;
  canonicalBaseUrl?: string;
  robotsIndex?: boolean;
  ogDefaultImagePath?: string;
  ogDefaultImageUrl?: string;
  twitterHandle?: string;
  facebookPageUrl?: string;
  instagramUrl?: string;
  youtubeUrl?: string;
  linkedinUrl?: string;
  hreflangConfig?: HreflangEntry[];
  version?: number;
}

export interface HreflangEntry {
  langCode: string;
  absoluteUrlBase: string;
}

export interface RedirectRuleDTO {
  id?: number;
  storeId: number;
  domainId?: number;
  sourcePath: string;
  targetUrl: string;
  httpCode: number;
  isRegex: boolean;
  priority: number;
  isActive: boolean;
  comment?: string;
  tag?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface StructuredDataTemplateDTO {
  id?: number;
  storeId: number;
  type: 'PRODUCT' | 'ORGANIZATION' | 'BREADCRUMB' | 'ARTICLE' | 'COLLECTION';
  templateJson: string;
  isActive: boolean;
}

export interface AssetUploadResponse {
  id: number;
  path: string;
  publicUrl: string;
  sizeBytes: number;
}

/**
 * Mock implementation of SEO API Service for testing without backend.
 * Simulates all SEO-related operations with in-memory data.
 */
@Injectable({
  providedIn: 'root'
})
export class MockSeoApiService {
  private mockSettings: Map<number, SeoSettingsDTO> = new Map();
  private mockRedirects: Map<number, RedirectRuleDTO[]> = new Map();
  private mockTemplates: Map<number, StructuredDataTemplateDTO[]> = new Map();
  private redirectIdCounter = 1;
  private templateIdCounter = 1;

  constructor() {
    this.initializeMockData();
  }

  private initializeMockData(): void {
    // Mock SEO Settings for Store 1
    this.mockSettings.set(1, {
      id: 1,
      storeId: 1,
      siteName: 'Demo Shop',
      defaultTitleTemplate: '{{page.title}} | {{store.siteName}}',
      defaultMetaDescription: 'Willkommen in unserem Demo Shop - Die besten Produkte für Sie',
      canonicalBaseUrl: 'https://demo-shop.markt.ma',
      robotsIndex: true,
      ogDefaultImagePath: 'store-1/seo/og-image.jpg',
      ogDefaultImageUrl: 'https://via.placeholder.com/1200x630?text=Demo+Shop',
      twitterHandle: '@demoshop',
      facebookPageUrl: 'https://facebook.com/demoshop',
      instagramUrl: 'https://instagram.com/demoshop',
      youtubeUrl: 'https://youtube.com/@demoshop',
      linkedinUrl: 'https://linkedin.com/company/demoshop',
      hreflangConfig: [
        { langCode: 'de', absoluteUrlBase: 'https://demo-shop.de' },
        { langCode: 'en', absoluteUrlBase: 'https://demo-shop.com' }
      ],
      version: 1
    });

    // Mock Redirects for Store 1
    this.mockRedirects.set(1, [
      {
        id: 1,
        storeId: 1,
        sourcePath: '/old-hoodie',
        targetUrl: '/products/new-hoodie',
        httpCode: 301,
        isRegex: false,
        priority: 100,
        isActive: true,
        comment: 'Product renamed',
        tag: 'product',
        createdAt: '2025-01-10T10:00:00',
        updatedAt: '2025-01-10T10:00:00'
      },
      {
        id: 2,
        storeId: 1,
        sourcePath: '/products/(\\d+).*',
        targetUrl: '/p/$1',
        httpCode: 302,
        isRegex: true,
        priority: 50,
        isActive: true,
        comment: 'Short product URLs',
        tag: 'optimization',
        createdAt: '2025-01-11T14:30:00',
        updatedAt: '2025-01-11T14:30:00'
      },
      {
        id: 3,
        storeId: 1,
        sourcePath: '/sale',
        targetUrl: '/clearance',
        httpCode: 301,
        isRegex: false,
        priority: 200,
        isActive: false,
        comment: 'Seasonal redirect',
        tag: 'seasonal',
        createdAt: '2025-01-05T09:00:00',
        updatedAt: '2025-01-12T16:00:00'
      }
    ]);

    // Mock Structured Data Templates for Store 1
    this.mockTemplates.set(1, [
      {
        id: 1,
        storeId: 1,
        type: 'PRODUCT',
        templateJson: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Product',
          'name': '{{product.title}}',
          'description': '{{product.description}}',
          'image': ['{{product.imageUrl}}'],
          'sku': '{{product.sku}}',
          'offers': {
            '@type': 'Offer',
            'priceCurrency': '{{currency}}',
            'price': '{{price}}',
            'availability': 'https://schema.org/{{availability}}',
            'url': '{{absoluteUrl}}'
          },
          'brand': {
            '@type': 'Brand',
            'name': '{{store.siteName}}'
          }
        }, null, 2),
        isActive: true
      },
      {
        id: 2,
        storeId: 1,
        type: 'ORGANIZATION',
        templateJson: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Organization',
          'name': '{{store.siteName}}',
          'url': '{{store.url}}',
          'logo': '{{store.logoUrl}}',
          'sameAs': [
            '{{social.facebook}}',
            '{{social.instagram}}',
            '{{social.twitter}}'
          ]
        }, null, 2),
        isActive: true
      },
      {
        id: 3,
        storeId: 1,
        type: 'BREADCRUMB',
        templateJson: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          'itemListElement': [
            '{{#breadcrumbs}}',
            {
              '@type': 'ListItem',
              'position': '{{position}}',
              'name': '{{name}}',
              'item': '{{url}}'
            },
            '{{/breadcrumbs}}'
          ]
        }, null, 2),
        isActive: true
      }
    ]);
  }

  // SEO Settings
  getSeoSettings(storeId: number, domainId?: number): Observable<SeoSettingsDTO> {
    const settings = this.mockSettings.get(storeId);
    if (!settings) {
      return of({
        storeId,
        siteName: 'New Store',
        defaultTitleTemplate: '{{page.title}} | {{store.siteName}}',
        defaultMetaDescription: '',
        canonicalBaseUrl: `https://store-${storeId}.markt.ma`,
        robotsIndex: true,
        hreflangConfig: [],
        version: 0
      } as SeoSettingsDTO).pipe(delay(300));
    }
    return of(settings).pipe(delay(300));
  }

  updateSeoSettings(storeId: number, settings: SeoSettingsDTO): Observable<SeoSettingsDTO> {
    settings.version = (settings.version || 0) + 1;
    this.mockSettings.set(storeId, settings);
    console.log('[MOCK] SEO Settings updated:', settings);
    return of(settings).pipe(delay(500));
  }

  uploadSeoAsset(storeId: number, type: string, file: File): Observable<AssetUploadResponse> {
    const path = `store-${storeId}/seo/${type.toLowerCase()}/${file.name}`;
    const response: AssetUploadResponse = {
      id: Date.now(),
      path,
      publicUrl: `https://cdn.markt.ma/${path}`,
      sizeBytes: file.size
    };
    console.log('[MOCK] Asset uploaded:', response);
    return of(response).pipe(delay(800));
  }

  // Redirects
  getRedirects(storeId: number, params?: any): Observable<any> {
    let redirects = this.mockRedirects.get(storeId) || [];

    if (params?.query) {
      const query = params.query.toLowerCase();
      redirects = redirects.filter(r =>
        r.sourcePath.toLowerCase().includes(query) ||
        r.targetUrl.toLowerCase().includes(query)
      );
    }

    if (params?.domainId) {
      redirects = redirects.filter(r => !r.domainId || r.domainId === params.domainId);
    }

    return of({
      content: redirects,
      totalElements: redirects.length,
      totalPages: 1,
      size: redirects.length,
      number: 0
    }).pipe(delay(300));
  }

  createRedirect(storeId: number, redirect: RedirectRuleDTO): Observable<RedirectRuleDTO> {
    const newRedirect = {
      ...redirect,
      id: this.redirectIdCounter++,
      storeId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const redirects = this.mockRedirects.get(storeId) || [];
    redirects.push(newRedirect);
    this.mockRedirects.set(storeId, redirects);

    console.log('[MOCK] Redirect created:', newRedirect);
    return of(newRedirect).pipe(delay(500));
  }

  updateRedirect(storeId: number, id: number, redirect: RedirectRuleDTO): Observable<RedirectRuleDTO> {
    const redirects = this.mockRedirects.get(storeId) || [];
    const index = redirects.findIndex(r => r.id === id);

    if (index !== -1) {
      redirects[index] = {
        ...redirect,
        id,
        storeId,
        updatedAt: new Date().toISOString()
      };
      this.mockRedirects.set(storeId, redirects);
      console.log('[MOCK] Redirect updated:', redirects[index]);
      return of(redirects[index]).pipe(delay(500));
    }

    throw new Error('Redirect not found');
  }

  deleteRedirect(storeId: number, id: number): Observable<void> {
    const redirects = this.mockRedirects.get(storeId) || [];
    const filtered = redirects.filter(r => r.id !== id);
    this.mockRedirects.set(storeId, filtered);
    console.log('[MOCK] Redirect deleted:', id);
    return of(void 0).pipe(delay(500));
  }

  importRedirects(storeId: number, file: File, domainId?: number): Observable<any> {
    console.log('[MOCK] Importing redirects from file:', file.name);
    return of({
      imported: 5,
      errors: ['Line 3: Invalid format']
    }).pipe(delay(1000));
  }

  exportRedirects(storeId: number, domainId?: number): Observable<Blob> {
    const redirects = this.mockRedirects.get(storeId) || [];
    const csv = [
      'sourcePath,httpCode,targetUrl,isRegex,priority,comment',
      ...redirects.map(r =>
        `${r.sourcePath},${r.httpCode},${r.targetUrl},${r.isRegex},${r.priority},${r.comment || ''}`
      )
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    console.log('[MOCK] Exporting redirects:', redirects.length);
    return of(blob).pipe(delay(500));
  }

  refreshRedirectCache(storeId: number): Observable<void> {
    console.log('[MOCK] Redirect cache refreshed for store:', storeId);
    return of(void 0).pipe(delay(300));
  }

  // Structured Data
  getStructuredDataTemplates(storeId: number): Observable<StructuredDataTemplateDTO[]> {
    const templates = this.mockTemplates.get(storeId) || [];
    return of(templates).pipe(delay(300));
  }

  createStructuredDataTemplate(storeId: number, template: StructuredDataTemplateDTO): Observable<StructuredDataTemplateDTO> {
    const newTemplate = {
      ...template,
      id: this.templateIdCounter++,
      storeId
    };

    const templates = this.mockTemplates.get(storeId) || [];
    templates.push(newTemplate);
    this.mockTemplates.set(storeId, templates);

    console.log('[MOCK] Template created:', newTemplate);
    return of(newTemplate).pipe(delay(500));
  }

  updateStructuredDataTemplate(storeId: number, id: number, template: StructuredDataTemplateDTO): Observable<StructuredDataTemplateDTO> {
    const templates = this.mockTemplates.get(storeId) || [];
    const index = templates.findIndex(t => t.id === id);

    if (index !== -1) {
      templates[index] = { ...template, id, storeId };
      this.mockTemplates.set(storeId, templates);
      console.log('[MOCK] Template updated:', templates[index]);
      return of(templates[index]).pipe(delay(500));
    }

    throw new Error('Template not found');
  }

  deleteStructuredDataTemplate(storeId: number, id: number): Observable<void> {
    const templates = this.mockTemplates.get(storeId) || [];
    const filtered = templates.filter(t => t.id !== id);
    this.mockTemplates.set(storeId, filtered);
    console.log('[MOCK] Template deleted:', id);
    return of(void 0).pipe(delay(500));
  }

  renderStructuredData(storeId: number, templateJson: string, context: any): Observable<string> {
    console.log('[MOCK] Rendering template with context:', context);

    let rendered = templateJson;
    const flatContext = this.flattenObject(context);

    Object.entries(flatContext).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      rendered = rendered.replace(regex, String(value));
    });

    return of(rendered).pipe(delay(500));
  }

  private flattenObject(obj: any, prefix = ''): any {
    const flattened: any = {};

    Object.entries(obj).forEach(([key, value]) => {
      const newKey = prefix ? `${prefix}.${key}` : key;

      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        Object.assign(flattened, this.flattenObject(value, newKey));
      } else {
        flattened[newKey] = value;
      }
    });

    return flattened;
  }

  resolveRedirect(host: string, path: string): Observable<any> {
    console.log('[MOCK] Resolving redirect:', { host, path });

    const allRedirects = Array.from(this.mockRedirects.values()).flat();
    const match = allRedirects.find(r =>
      r.isActive && (r.sourcePath === path ||
      (r.isRegex && new RegExp(r.sourcePath).test(path)))
    );

    if (match) {
      return of({
        targetUrl: match.targetUrl,
        httpCode: match.httpCode,
        found: true
      }).pipe(delay(200));
    }

    return of({ found: false }).pipe(delay(200));
  }
}

