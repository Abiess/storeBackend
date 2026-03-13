import { Injectable, Renderer2, RendererFactory2, Inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { DOCUMENT } from '@angular/common';

export interface PageMeta {
  title?: string;
  description?: string;
  canonical?: string;
  robots?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogUrl?: string;
  ogType?: string;
  twitterCard?: string;
  twitterSite?: string;
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string;
  hreflang?: Array<{ lang: string; url: string }>;
}

/**
 * Service for managing SEO meta tags, Open Graph, Twitter Cards, and JSON-LD.
 * Integrates with Angular's Title and Meta services + Renderer2 for JSON-LD injection.
 */
@Injectable({
  providedIn: 'root'
})
export class SeoMetaService {
  private renderer: Renderer2;
  private jsonLdScripts: Map<string, HTMLScriptElement> = new Map();

  constructor(
    private titleService: Title,
    private metaService: Meta,
    private rendererFactory: RendererFactory2,
    @Inject(DOCUMENT) private document: Document
  ) {
    this.renderer = rendererFactory.createRenderer(null, null);
  }

  /**
   * Apply page meta tags (title, description, canonical, robots).
   */
  applyPageMeta(meta: PageMeta): void {
    // Title
    if (meta.title) {
      this.titleService.setTitle(meta.title);
    }

    // Meta description
    if (meta.description) {
      this.metaService.updateTag({ name: 'description', content: meta.description });
    }

    // Robots
    if (meta.robots) {
      this.metaService.updateTag({ name: 'robots', content: meta.robots });
    } else {
      this.metaService.updateTag({ name: 'robots', content: 'index, follow' });
    }

    // Canonical link
    this.updateCanonical(meta.canonical);

    // Hreflang
    if (meta.hreflang) {
      this.updateHreflang(meta.hreflang);
    }
  }

  /**
   * Apply social meta tags (Open Graph + Twitter Cards).
   */
  applySocialMeta(meta: PageMeta): void {
    // Open Graph
    if (meta.ogTitle) {
      this.metaService.updateTag({ property: 'og:title', content: meta.ogTitle });
    }
    if (meta.ogDescription) {
      this.metaService.updateTag({ property: 'og:description', content: meta.ogDescription });
    }
    if (meta.ogImage) {
      this.metaService.updateTag({ property: 'og:image', content: meta.ogImage });
    }
    if (meta.ogUrl) {
      this.metaService.updateTag({ property: 'og:url', content: meta.ogUrl });
    }
    if (meta.ogType) {
      this.metaService.updateTag({ property: 'og:type', content: meta.ogType });
    } else {
      this.metaService.updateTag({ property: 'og:type', content: 'website' });
    }

    // Twitter Cards
    if (meta.twitterCard) {
      this.metaService.updateTag({ name: 'twitter:card', content: meta.twitterCard });
    } else {
      this.metaService.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    }
    if (meta.twitterSite) {
      this.metaService.updateTag({ name: 'twitter:site', content: meta.twitterSite });
    }
    if (meta.twitterTitle) {
      this.metaService.updateTag({ name: 'twitter:title', content: meta.twitterTitle });
    }
    if (meta.twitterDescription) {
      this.metaService.updateTag({ name: 'twitter:description', content: meta.twitterDescription });
    }
    if (meta.twitterImage) {
      this.metaService.updateTag({ name: 'twitter:image', content: meta.twitterImage });
    }
  }

  /**
   * Inject JSON-LD structured data into <head>.
   * Replaces existing script with same type to prevent duplicates on route changes.
   */
  injectJsonLd(type: string, data: object): void {
    // Remove existing script for this type
    if (this.jsonLdScripts.has(type)) {
      const oldScript = this.jsonLdScripts.get(type);
      this.renderer.removeChild(this.document.head, oldScript);
    }

    // Create new script element
    const script = this.renderer.createElement('script');
    this.renderer.setAttribute(script, 'type', 'application/ld+json');
    this.renderer.setAttribute(script, 'data-testid', `jsonld-${type}`);

    const jsonText = this.renderer.createText(JSON.stringify(data, null, 2));
    this.renderer.appendChild(script, jsonText);
    this.renderer.appendChild(this.document.head, script);

    // Store reference for future updates
    this.jsonLdScripts.set(type, script);
  }

  /**
   * Remove JSON-LD script by type.
   */
  removeJsonLd(type: string): void {
    if (this.jsonLdScripts.has(type)) {
      const script = this.jsonLdScripts.get(type);
      this.renderer.removeChild(this.document.head, script);
      this.jsonLdScripts.delete(type);
    }
  }

  /**
   * Clear all JSON-LD scripts.
   */
  clearAllJsonLd(): void {
    this.jsonLdScripts.forEach((script) => {
      this.renderer.removeChild(this.document.head, script);
    });
    this.jsonLdScripts.clear();
  }

  /**
   * Update or create canonical link tag.
   */
  private updateCanonical(url?: string): void {
    let link: HTMLLinkElement | null = this.document.querySelector('link[rel="canonical"]');

    if (url) {
      if (!link) {
        link = this.renderer.createElement('link');
        this.renderer.setAttribute(link, 'rel', 'canonical');
        this.renderer.appendChild(this.document.head, link);
      }
      this.renderer.setAttribute(link, 'href', url);
    } else if (link) {
      this.renderer.removeChild(this.document.head, link);
    }
  }

  /**
   * Update hreflang alternate links.
   */
  private updateHreflang(hreflang: Array<{ lang: string; url: string }>): void {
    // Remove existing hreflang links
    const existingLinks = this.document.querySelectorAll('link[rel="alternate"][hreflang]');
    existingLinks.forEach(link => this.renderer.removeChild(this.document.head, link));

    // Add new hreflang links
    hreflang.forEach(({ lang, url }) => {
      const link = this.renderer.createElement('link');
      this.renderer.setAttribute(link, 'rel', 'alternate');
      this.renderer.setAttribute(link, 'hreflang', lang);
      this.renderer.setAttribute(link, 'href', url);
      this.renderer.appendChild(this.document.head, link);
    });
  }

  /**
   * Build product JSON-LD from template.
   */
  buildProductJsonLd(product: any, storeSettings: any): object {
    return {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.title,
      description: product.description,
      image: [product.imageUrl],
      sku: product.sku,
      offers: {
        '@type': 'Offer',
        priceCurrency: product.currency || 'EUR',
        price: product.price,
        availability: `https://schema.org/${product.availability || 'InStock'}`,
        url: product.absoluteUrl
      },
      brand: {
        '@type': 'Brand',
        name: storeSettings.siteName
      }
    };
  }

  /**
   * Build breadcrumb JSON-LD.
   */
  buildBreadcrumbJsonLd(breadcrumbs: Array<{ name: string; url: string }>): object {
    return {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: breadcrumbs.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        item: item.url
      }))
    };
  }

  /**
   * Build organization JSON-LD.
   */
  buildOrganizationJsonLd(storeSettings: any): object {
    const social = [];
    if (storeSettings.facebookPageUrl) social.push(storeSettings.facebookPageUrl);
    if (storeSettings.instagramUrl) social.push(storeSettings.instagramUrl);
    if (storeSettings.twitterHandle) social.push(`https://twitter.com/${storeSettings.twitterHandle.replace('@', '')}`);

    return {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: storeSettings.siteName,
      url: storeSettings.canonicalBaseUrl,
      logo: storeSettings.ogDefaultImageUrl,
      sameAs: social
    };
  }
}
