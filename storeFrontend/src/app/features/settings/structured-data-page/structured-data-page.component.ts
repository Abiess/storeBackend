import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatExpansionModule } from '@angular/material/expansion';
import { ActivatedRoute } from '@angular/router';
import { SeoApiService, StructuredDataTemplateDTO } from '../../../core/services/seo-api.service';

@Component({
  selector: 'app-structured-data-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTabsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatExpansionModule
  ],
  templateUrl: './structured-data-page.component.html',
  styleUrls: ['./structured-data-page.component.scss']
})
export class StructuredDataPageComponent implements OnInit {
  storeId!: number;
  templates: Map<string, StructuredDataTemplateDTO> = new Map();
  types = ['PRODUCT', 'ORGANIZATION', 'BREADCRUMB', 'ARTICLE', 'COLLECTION'];
  activeType = 'PRODUCT';
  previewResult = '';
  saving = false;

  // Variable helpers per type
  variableHelpers = {
    PRODUCT: [
      '{{product.title}} - Produktname',
      '{{product.description}} - Beschreibung',
      '{{product.sku}} - SKU',
      '{{product.imageUrl}} - Bild-URL',
      '{{price}} - Preis',
      '{{currency}} - Währung (z.B. EUR)',
      '{{availability}} - Verfügbarkeit (InStock, OutOfStock)',
      '{{absoluteUrl}} - Absolute Produkt-URL',
      '{{store.siteName}} - Shop-Name'
    ],
    ORGANIZATION: [
      '{{store.siteName}} - Shop-Name',
      '{{store.url}} - Shop-URL',
      '{{store.logoUrl}} - Logo-URL',
      '{{social.facebook}} - Facebook URL',
      '{{social.instagram}} - Instagram URL',
      '{{social.twitter}} - Twitter URL'
    ],
    BREADCRUMB: [
      '{{#breadcrumbs}} - Start der Breadcrumb-Liste',
      '{{position}} - Position (1, 2, 3...)',
      '{{name}} - Name des Elements',
      '{{url}} - URL des Elements',
      '{{/breadcrumbs}} - Ende der Liste'
    ],
    ARTICLE: [
      '{{article.title}} - Artikel-Titel',
      '{{article.description}} - Beschreibung',
      '{{article.author}} - Autor',
      '{{article.publishedDate}} - Datum',
      '{{article.imageUrl}} - Bild',
      '{{absoluteUrl}} - Artikel-URL'
    ],
    COLLECTION: [
      '{{collection.title}} - Kollektion-Name',
      '{{collection.description}} - Beschreibung',
      '{{collection.imageUrl}} - Bild',
      '{{absoluteUrl}} - Kollektion-URL'
    ]
  };

  constructor(
    private route: ActivatedRoute,
    private seoApi: SeoApiService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.storeId = Number(this.route.snapshot.paramMap.get('storeId'));
    this.loadTemplates();
  }

  loadTemplates(): void {
    this.seoApi.getStructuredDataTemplates(this.storeId).subscribe({
      next: (templates) => {
        this.templates.clear();
        templates.forEach(t => this.templates.set(t.type, t));
      },
      error: (err: any) => {
        console.error('Failed to load templates', err);
        this.snackBar.open('Fehler beim Laden', 'OK', { duration: 3000 });
      }
    });
  }

  getTemplate(type: string): StructuredDataTemplateDTO {
    return this.templates.get(type) || {
      storeId: this.storeId,
      type: type as any,
      templateJson: '',
      isActive: true
    };
  }

  onSave(type: string): void {
    const template = this.templates.get(type);
    if (!template) return;

    this.saving = true;
    const request = template.id
      ? this.seoApi.updateStructuredDataTemplate(this.storeId, template)
      : this.seoApi.createStructuredDataTemplate(this.storeId, template);

    request.subscribe({
      next: () => {
        this.snackBar.open('✅ Template gespeichert', 'OK', { duration: 2000 });
        this.loadTemplates();
        this.saving = false;
      },
      error: (err: any) => {
        console.error('Failed to save template', err);
        this.snackBar.open('❌ Fehler beim Speichern', 'OK', { duration: 3000 });
        this.saving = false;
      }
    });
  }

  onPreview(type: string): void {
    const template = this.templates.get(type);
    if (!template?.templateJson) {
      this.snackBar.open('Kein Template zum Vorschauen', 'OK', { duration: 2000 });
      return;
    }

    const context = this.getSampleContext(type);
    this.seoApi.renderStructuredData(this.storeId, template.templateJson, context).subscribe({
      next: (result: any) => {
        this.previewResult = this.formatJson(result);
        this.snackBar.open('✅ Vorschau generiert', 'OK', { duration: 2000 });
      },
      error: (err: any) => {
        console.error('Preview failed', err);
        this.snackBar.open('❌ Vorschau fehlgeschlagen: ' + err.error, 'OK', { duration: 4000 });
      }
    });
  }

  private getSampleContext(type: string): any {
    switch (type) {
      case 'PRODUCT':
        return {
          product: {
            title: 'Cool Hoodie',
            description: 'Ein super bequemer Hoodie',
            sku: 'HOO-001',
            imageUrl: 'https://example.com/hoodie.jpg'
          },
          price: '49.99',
          currency: 'EUR',
          availability: 'InStock',
          absoluteUrl: 'https://myshop.markt.ma/products/cool-hoodie',
          store: { siteName: 'Mein Shop' }
        };
      case 'ORGANIZATION':
        return {
          store: {
            siteName: 'Mein Shop',
            url: 'https://myshop.markt.ma',
            logoUrl: 'https://myshop.markt.ma/logo.png'
          },
          social: {
            facebook: 'https://facebook.com/myshop',
            instagram: 'https://instagram.com/myshop',
            twitter: 'https://twitter.com/myshop'
          }
        };
      case 'BREADCRUMB':
        return {
          breadcrumbs: [
            { position: 1, name: 'Home', url: 'https://myshop.markt.ma', last: false },
            { position: 2, name: 'Kategorie', url: 'https://myshop.markt.ma/category', last: false },
            { position: 3, name: 'Produkt', url: 'https://myshop.markt.ma/product', last: true }
          ]
        };
      default:
        return {};
    }
  }

  private formatJson(json: string): string {
    try {
      return JSON.stringify(JSON.parse(json), null, 2);
    } catch {
      return json;
    }
  }

  updateTemplateJson(type: string, value: string): void {
    const template = this.templates.get(type);
    if (template) {
      template.templateJson = value;
      this.templates.set(type, template);
    } else {
      this.templates.set(type, {
        storeId: this.storeId,
        type: type as any,
        templateJson: value,
        isActive: true
      });
    }
  }

  getVariables(type: string): string[] {
    return (this.variableHelpers as any)[type] || [];
  }

  getExampleTemplate(type: string): string {
    const examples: { [key: string]: string } = {
      PRODUCT: `{
  "@context": "https://schema.org/",
  "@type": "Product",
  "name": "{{product.title}}",
  "description": "{{product.description}}",
  "sku": "{{product.sku}}",
  "image": "{{product.imageUrl}}",
  "offers": {
    "@type": "Offer",
    "price": "{{price}}",
    "priceCurrency": "{{currency}}",
    "availability": "https://schema.org/{{availability}}",
    "url": "{{absoluteUrl}}"
  },
  "brand": {
    "@type": "Brand",
    "name": "{{store.siteName}}"
  }
}`,
      ORGANIZATION: `{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "{{store.siteName}}",
  "url": "{{store.url}}",
  "logo": "{{store.logoUrl}}",
  "sameAs": [
    "{{social.facebook}}",
    "{{social.instagram}}",
    "{{social.twitter}}"
  ]
}`,
      BREADCRUMB: `{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {{#breadcrumbs}}
    {
      "@type": "ListItem",
      "position": {{position}},
      "name": "{{name}}",
      "item": "{{url}}"
    }{{^last}},{{/last}}
    {{/breadcrumbs}}
  ]
}`,
      ARTICLE: `{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "{{article.title}}",
  "description": "{{article.description}}",
  "author": {
    "@type": "Person",
    "name": "{{article.author}}"
  },
  "datePublished": "{{article.publishedDate}}",
  "image": "{{article.imageUrl}}",
  "url": "{{absoluteUrl}}"
}`,
      COLLECTION: `{
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  "name": "{{collection.title}}",
  "description": "{{collection.description}}",
  "image": "{{collection.imageUrl}}",
  "url": "{{absoluteUrl}}"
}`
    };
    return examples[type] || '{}';
  }
}

