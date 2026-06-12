import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@app/core/pipes/translate.pipe';
import { Product, Category } from '@app/core/models';

/**
 * RESTAURANT_WARM – Dediziertes mobiles Restaurant-/Riad-Template.
 *
 * Wiederverwendung der bestehenden Store/Product/Category-Struktur:
 *  - Produktname  → Gericht/Angebot
 *  - Kategorie    → Menü-Kategorie (Frühstück, Tajine, Getränke …)
 *  - basePrice    → Preis
 *  - description  → Zutaten/Details
 *  - media/imageUrl → Gerichtbild
 *
 * Eigenständig (keine Breaking Changes für bestehende Shop-Templates).
 */
@Component({
  selector: 'app-restaurant-warm-layout',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  template: `
  <div class="rw">

    <!-- ════ 1) HERO ════ -->
    <header class="rw-hero" [class.has-image]="heroImage"
            [style.background-image]="heroImage ? 'url(' + heroImage + ')' : null">
      <div class="rw-hero__overlay">
        <div class="rw-hero__content">
          <h1 class="rw-hero__title">{{ storeName }}</h1>
          <p class="rw-hero__subtitle" *ngIf="description">{{ description }}</p>

          <div class="rw-hero__actions">
            <a *ngIf="whatsappNumber"
               class="rw-btn rw-btn--wa"
               [href]="buildReservationLink()"
               target="_blank" rel="noopener">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
                <path d="M.057 24l1.687-6.163a11.867 11.867 0 0 1-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 0 1 8.413 3.488 11.824 11.824 0 0 1 3.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 0 1-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 0 0 1.51 5.26l-.999 3.648 3.978-1.115zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.71.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.247-.694.247-1.289.173-1.413z"/>
              </svg>
              {{ 'restaurant.reserveWhatsapp' | translate }}
            </a>

            <a *ngIf="googleMapsUrl"
               class="rw-btn rw-btn--ghost"
               [href]="googleMapsUrl"
               target="_blank" rel="noopener">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
              </svg>
              {{ 'restaurant.directions' | translate }}
            </a>
          </div>
        </div>
      </div>
    </header>

    <!-- ════ 2) INFO-LEISTE: Öffnungszeiten + Adresse ════ -->
    <section class="rw-info" *ngIf="openingHours || address">
      <div class="rw-info__card" *ngIf="openingHours">
        <span class="rw-info__icon">🕒</span>
        <div>
          <h3 class="rw-info__label">{{ 'restaurant.openingHours' | translate }}</h3>
          <p class="rw-info__value">{{ openingHours }}</p>
        </div>
      </div>
      <div class="rw-info__card" *ngIf="address">
        <span class="rw-info__icon">📍</span>
        <div>
          <h3 class="rw-info__label">{{ 'restaurant.address' | translate }}</h3>
          <p class="rw-info__value">{{ address }}</p>
        </div>
      </div>
    </section>

    <!-- ════ 3) KATEGORIE-CHIPS ════ -->
    <nav class="rw-chips" *ngIf="categories.length > 0" aria-label="Menü-Kategorien">
      <button class="rw-chip" [class.active]="!selectedCategoryId"
              (click)="selectCategory(null)">
        {{ 'common.all' | translate }}
      </button>
      <button *ngFor="let cat of categories"
              class="rw-chip" [class.active]="selectedCategoryId === cat.id"
              (click)="selectCategory(cat.id)">
        {{ cat.name }}
      </button>
    </nav>

    <!-- ════ 4) MENÜ ════ -->
    <main class="rw-menu">
      <h2 class="rw-menu__title">{{ 'restaurant.menu' | translate }}</h2>

      <div class="rw-empty" *ngIf="visibleProducts.length === 0">
        <span class="rw-empty__icon">🍽️</span>
        <p>{{ 'restaurant.emptyMenu' | translate }}</p>
      </div>

      <div class="rw-items">
        <article class="rw-item" *ngFor="let p of visibleProducts">
          <div class="rw-item__media" *ngIf="getImage(p) as img">
            <img [src]="img" [alt]="getName(p)" loading="lazy"
                 (error)="onImgError($event)" />
          </div>
          <div class="rw-item__media rw-item__media--placeholder" *ngIf="!getImage(p)">🍴</div>

          <div class="rw-item__body">
            <div class="rw-item__head">
              <h3 class="rw-item__name">{{ getName(p) }}</h3>
              <span class="rw-item__price">{{ p.basePrice | number:'1.2-2' }} {{ currency }}</span>
            </div>
            <p class="rw-item__desc" *ngIf="p.description">{{ p.description }}</p>

            <a *ngIf="whatsappNumber"
               class="rw-item__wa"
               [href]="buildItemLink(p)"
               target="_blank" rel="noopener">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
                <path d="M.057 24l1.687-6.163a11.867 11.867 0 0 1-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 0 1 8.413 3.488 11.824 11.824 0 0 1 3.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 0 1-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 0 0 1.51 5.26l-.999 3.648 3.978-1.115z"/>
              </svg>
              {{ 'restaurant.order' | translate }}
            </a>
          </div>
        </article>
      </div>
    </main>

    <!-- ════ 5) STICKY MOBILE CTA ════ -->
    <a *ngIf="whatsappNumber"
       class="rw-sticky-cta"
       [href]="buildReservationLink()"
       target="_blank" rel="noopener">
      <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
        <path d="M.057 24l1.687-6.163a11.867 11.867 0 0 1-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 0 1 8.413 3.488 11.824 11.824 0 0 1 3.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 0 1-5.688-1.448L.057 24z"/>
      </svg>
      {{ 'restaurant.reserve' | translate }}
    </a>

  </div>
  `,
  styles: [`
    :host { display: block; }

    .rw {
      --rw-primary: var(--theme-primary, #b45309);
      --rw-secondary: var(--theme-secondary, #78350f);
      --rw-accent: var(--theme-accent, #dc2626);
      --rw-bg: var(--theme-background, #fffbeb);
      --rw-surface: var(--theme-surface, #ffffff);
      --rw-text: var(--theme-text, #451a03);
      --rw-text-2: var(--theme-text-secondary, #78350f);
      --rw-border: var(--theme-border, #fde68a);
      --rw-wa: #25d366;
      background: var(--rw-bg);
      color: var(--rw-text);
      min-height: 100vh;
      padding-bottom: 96px; /* Platz für Sticky-CTA */
      font-family: 'Helvetica Neue', Arial, sans-serif;
    }

    /* ── HERO ── */
    .rw-hero {
      position: relative;
      background: linear-gradient(135deg, var(--rw-primary), var(--rw-secondary));
      background-size: cover;
      background-position: center;
    }
    .rw-hero.has-image .rw-hero__overlay {
      background: linear-gradient(180deg, rgba(69,26,3,.55), rgba(69,26,3,.78));
    }
    .rw-hero__overlay {
      background: linear-gradient(180deg, rgba(0,0,0,.05), rgba(0,0,0,.15));
      padding: 3.25rem 1.25rem 2.75rem;
    }
    .rw-hero__content { max-width: 720px; margin: 0 auto; text-align: center; }
    .rw-hero__title {
      margin: 0 0 .5rem;
      font-family: 'Playfair Display', Georgia, serif;
      font-size: clamp(2rem, 7vw, 3.25rem);
      font-weight: 800;
      color: #fff;
      text-shadow: 0 2px 14px rgba(0,0,0,.35);
      line-height: 1.1;
    }
    .rw-hero__subtitle {
      margin: 0 auto 1.5rem;
      max-width: 540px;
      font-size: clamp(.95rem, 3.5vw, 1.1rem);
      color: rgba(255,255,255,.92);
      text-shadow: 0 1px 8px rgba(0,0,0,.35);
    }
    .rw-hero__actions {
      display: flex; flex-wrap: wrap; gap: .75rem; justify-content: center;
    }

    /* ── Buttons ── */
    .rw-btn {
      display: inline-flex; align-items: center; gap: .5rem;
      padding: .8rem 1.4rem; border-radius: 999px;
      font-size: .95rem; font-weight: 700; text-decoration: none;
      cursor: pointer; border: none; transition: transform .15s ease, box-shadow .15s ease;
    }
    .rw-btn:active { transform: scale(.97); }
    .rw-btn--wa {
      background: var(--rw-wa); color: #fff;
      box-shadow: 0 6px 18px rgba(37,211,102,.4);
    }
    .rw-btn--ghost {
      background: rgba(255,255,255,.16); color: #fff;
      backdrop-filter: blur(4px);
      border: 1.5px solid rgba(255,255,255,.55);
    }

    /* ── INFO ── */
    .rw-info {
      display: grid; gap: .75rem;
      grid-template-columns: 1fr;
      max-width: 720px; margin: -1.25rem auto 0; padding: 0 1.25rem;
      position: relative; z-index: 2;
    }
    .rw-info__card {
      display: flex; gap: .75rem; align-items: flex-start;
      background: var(--rw-surface); border: 1px solid var(--rw-border);
      border-radius: 14px; padding: .9rem 1rem;
      box-shadow: 0 6px 20px rgba(120,53,15,.08);
    }
    .rw-info__icon { font-size: 1.5rem; line-height: 1; }
    .rw-info__label { margin: 0 0 .15rem; font-size: .72rem; text-transform: uppercase;
      letter-spacing: .04em; color: var(--rw-text-2); font-weight: 700; }
    .rw-info__value { margin: 0; font-size: .92rem; white-space: pre-line; color: var(--rw-text); }

    /* ── CHIPS ── */
    .rw-chips {
      display: flex; gap: .5rem; overflow-x: auto; -webkit-overflow-scrolling: touch;
      padding: 1.5rem 1.25rem .25rem; max-width: 960px; margin: 0 auto;
      scrollbar-width: none;
    }
    .rw-chips::-webkit-scrollbar { display: none; }
    .rw-chip {
      flex: 0 0 auto; padding: .55rem 1.1rem; border-radius: 999px;
      border: 1.5px solid var(--rw-border); background: var(--rw-surface);
      color: var(--rw-text-2); font-weight: 600; font-size: .9rem; cursor: pointer;
      white-space: nowrap; transition: all .15s ease;
    }
    .rw-chip.active {
      background: var(--rw-primary); border-color: var(--rw-primary); color: #fff;
      box-shadow: 0 4px 12px rgba(180,83,9,.3);
    }

    /* ── MENU ── */
    .rw-menu { max-width: 960px; margin: 0 auto; padding: 1.25rem; }
    .rw-menu__title {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 1.6rem; font-weight: 800; margin: .5rem 0 1.25rem; color: var(--rw-secondary);
    }
    .rw-items { display: grid; gap: 1rem; grid-template-columns: 1fr; }

    .rw-item {
      display: flex; gap: 1rem; align-items: stretch;
      background: var(--rw-surface); border: 1px solid var(--rw-border);
      border-radius: 16px; overflow: hidden;
      box-shadow: 0 4px 16px rgba(120,53,15,.07);
      transition: transform .15s ease, box-shadow .15s ease;
    }
    .rw-item:active { transform: translateY(1px); }
    .rw-item__media {
      flex: 0 0 110px; width: 110px;
      background: var(--rw-bg); overflow: hidden;
    }
    .rw-item__media img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .rw-item__media--placeholder {
      display: flex; align-items: center; justify-content: center;
      font-size: 2rem; color: var(--rw-border);
    }
    .rw-item__body { flex: 1; min-width: 0; padding: .9rem 1rem; display: flex; flex-direction: column; }
    .rw-item__head { display: flex; gap: .5rem; align-items: baseline; justify-content: space-between; }
    .rw-item__name {
      margin: 0; font-size: 1.05rem; font-weight: 700; color: var(--rw-text);
      overflow: hidden; text-overflow: ellipsis;
    }
    .rw-item__price {
      flex: 0 0 auto; font-weight: 800; color: var(--rw-primary); font-size: 1.02rem; white-space: nowrap;
    }
    .rw-item__desc {
      margin: .35rem 0 .75rem; font-size: .88rem; color: var(--rw-text-2); line-height: 1.4;
      display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
    }
    .rw-item__wa {
      align-self: flex-start; margin-top: auto;
      display: inline-flex; align-items: center; gap: .4rem;
      padding: .5rem .9rem; border-radius: 999px;
      background: var(--rw-wa); color: #fff; font-weight: 700; font-size: .82rem;
      text-decoration: none;
    }

    .rw-empty { text-align: center; padding: 3rem 1rem; color: var(--rw-text-2); }
    .rw-empty__icon { font-size: 2.5rem; display: block; margin-bottom: .5rem; }

    /* ── STICKY CTA ── */
    .rw-sticky-cta {
      position: fixed; left: 1rem; right: 1rem; bottom: 1rem; z-index: 50;
      display: flex; align-items: center; justify-content: center; gap: .6rem;
      padding: 1rem; border-radius: 16px;
      background: var(--rw-wa); color: #fff; font-weight: 800; font-size: 1.05rem;
      text-decoration: none; box-shadow: 0 8px 28px rgba(37,211,102,.45);
    }
    .rw-sticky-cta:active { transform: scale(.99); }

    /* ── Desktop / Tablet ── */
    @media (min-width: 640px) {
      .rw-info { grid-template-columns: 1fr 1fr; }
      .rw-items { grid-template-columns: 1fr 1fr; }
      .rw-item__media { flex-basis: 130px; width: 130px; }
    }
    @media (min-width: 900px) {
      .rw-sticky-cta {
        left: auto; right: 1.5rem; bottom: 1.5rem; width: auto; padding: 1rem 1.75rem;
      }
    }
  `]
})
export class RestaurantWarmLayoutComponent {
  @Input() storeName = '';
  @Input() description: string | null = null;
  @Input() heroImage: string | null = null;
  @Input() products: Product[] = [];
  @Input() categories: Category[] = [];
  @Input() whatsappNumber: string | null = null;
  @Input() reservationWhatsappText: string | null = null;
  @Input() openingHours: string | null = null;
  @Input() address: string | null = null;
  @Input() googleMapsUrl: string | null = null;
  /** SHOP | RESTAURANT | RIAD – steuert Default-Nachricht */
  @Input() businessType: string | null = null;
  /** Währungssymbol (MVP: Marokko = DH) */
  @Input() currency = 'DH';

  selectedCategoryId: number | null = null;

  /** Default-Nachricht (Darija), wenn kein reservationWhatsappText gesetzt ist. */
  private get defaultPrefix(): string {
    return 'Salam, bghit nreserver / commander';
  }

  get visibleProducts(): Product[] {
    if (this.selectedCategoryId == null) return this.products;
    return this.products.filter(p => p.categoryId === this.selectedCategoryId);
  }

  selectCategory(id: number | null): void {
    this.selectedCategoryId = id;
  }

  getName(p: Product): string {
    return p.title || p.name || p.description || '—';
  }

  /** Bild-Auflösung analog zur bestehenden product-card-Logik. */
  getImage(p: Product): string | null {
    if (p.media && p.media.length > 0) {
      const primary = p.media.find((m: any) => m.isPrimary);
      if (primary?.url) return primary.url;
      if (p.media[0]?.url) return p.media[0].url ?? null;
    }
    if (p.primaryImageUrl) return p.primaryImageUrl;
    if (p.imageUrl) return p.imageUrl;
    return null;
  }

  onImgError(event: Event): void {
    (event.target as HTMLImageElement).style.display = 'none';
  }

  /** wa.me Reservierungs-/Bestell-Link (allgemein). */
  buildReservationLink(): string {
    const prefix = (this.reservationWhatsappText?.trim()) || this.defaultPrefix;
    const text = `${prefix} – ${this.storeName}`;
    return this.waLink(text);
  }

  /** wa.me Link mit konkretem Menü-Item. */
  buildItemLink(p: Product): string {
    const prefix = (this.reservationWhatsappText?.trim()) || this.defaultPrefix;
    const price = `${p.basePrice?.toFixed(2)} ${this.currency}`;
    const text = `${prefix}: ${this.getName(p)} (${price}) – ${this.storeName}`;
    return this.waLink(text);
  }

  private waLink(text: string): string {
    const num = (this.whatsappNumber || '').replace(/[^0-9]/g, '');
    return `https://wa.me/${num}?text=${encodeURIComponent(text)}`;
  }
}

