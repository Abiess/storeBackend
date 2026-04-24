import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ThemeService } from '@app/core/services/theme.service';
import { ThemePreset } from '@app/core/models';

/**
 * Store-Onboarding: nach dem Anlegen eines neuen Stores wählt der Owner hier
 * ein Branchen-Template aus. Optional werden direkt branchenpassende
 * Demo-Kategorien & -Produkte angelegt, sodass der Store sofort lebendig wirkt.
 *
 * Reuse: Verwendet die gleichen Template-Karten und -API wie der Theme-Editor
 * ({@link ThemeService.getTemplatesFromBackend}). Anwenden geschieht über den
 * neuen Endpoint {@link ThemeService.onboardStoreWithTemplate}, der Theme +
 * Demo-Daten in einem Rutsch in die DB schreibt.
 */
@Component({
  selector: 'app-store-onboarding',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="onboarding">
      <header class="onboarding__head">
        <h1>🎨 Wähle ein Template für deinen Shop</h1>
        <p>
          Pro Branche haben wir fertige, professionelle Layouts vorbereitet.
          Mit einem Klick übernimmst du Farben, Typografie und Layout –
          und auf Wunsch auch direkt passende Beispiel-Kategorien & -Produkte,
          damit dein Shop nicht leer wirkt.
        </p>

        <label class="demo-toggle">
          <input type="checkbox" [(ngModel)]="withDemoData" />
          <span>Demo-Kategorien &amp; -Produkte mit anlegen (idempotent – wird nicht angelegt, wenn Store schon Inhalte hat)</span>
        </label>
      </header>

      <div *ngIf="loading" class="state">⏳ Lade Templates…</div>

      <div *ngIf="!loading && !templates.length" class="state state--empty">
        Keine Templates verfügbar. Bitte später erneut versuchen.
      </div>

      <div class="grid" *ngIf="!loading && templates.length">
        <article *ngFor="let t of templates" class="card">
          <div class="card__preview"
               [style.background]="'linear-gradient(135deg, ' + t.colors.primary + ', ' + t.colors.secondary + ')'">
            <img *ngIf="getPreviewUrl(t) as src" [src]="src" [alt]="t.name + ' Preview'" loading="lazy" />
            <span class="badge-free" *ngIf="isFree(t)">FREE</span>
          </div>
          <div class="card__body">
            <h3>{{ t.name }}</h3>
            <p>{{ t.description }}</p>
            <div class="palette">
              <span class="dot" [style.background]="t.colors.primary"></span>
              <span class="dot" [style.background]="t.colors.secondary"></span>
              <span class="dot" [style.background]="t.colors.accent"></span>
            </div>
            <button class="btn"
                    (click)="apply(t)"
                    [disabled]="applying === getCode(t)">
              {{ applying === getCode(t) ? '⏳ Richte ein…' : '⚡ Mit diesem Template starten' }}
            </button>
          </div>
        </article>
      </div>

      <div class="footer-skip">
        <button class="btn-link" (click)="skip()">Später entscheiden →</button>
      </div>

      <div *ngIf="successMessage" class="toast" (click)="successMessage = null">
        ✅ {{ successMessage }}
      </div>
      <div *ngIf="error" class="toast toast--error" (click)="error = null">
        ⚠️ {{ error }}
      </div>
    </div>
  `,
  styles: [`
    .onboarding {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
    }
    .onboarding__head h1 {
      margin: 0 0 .5rem;
      font-size: 1.75rem;
    }
    .onboarding__head p {
      color: #475569;
      margin: 0 0 1rem;
      max-width: 800px;
    }
    .demo-toggle {
      display: inline-flex;
      gap: .5rem;
      align-items: center;
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: .5rem .75rem;
      font-size: .9rem;
      cursor: pointer;
      margin-bottom: 1.5rem;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 1.25rem;
    }
    .card {
      background: #fff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(15,23,42,.06);
      border: 1px solid #f1f5f9;
      transition: transform .15s ease, box-shadow .15s ease;
      display: flex;
      flex-direction: column;
    }
    .card:hover {
      transform: translateY(-3px);
      box-shadow: 0 6px 20px rgba(15,23,42,.10);
    }
    .card__preview {
      position: relative;
      height: 160px;
      overflow: hidden;
    }
    .card__preview img {
      position: absolute; inset: 0;
      width: 100%; height: 100%;
      object-fit: cover;
      display: block;
    }
    .badge-free {
      position: absolute; top: .5rem; right: .5rem;
      background: #16a34a; color: #fff;
      font-size: .7rem; font-weight: 700;
      padding: .2rem .5rem; border-radius: 4px;
      letter-spacing: .04em;
    }
    .card__body {
      padding: 1rem 1.25rem 1.25rem;
      display: flex; flex-direction: column; gap: .5rem;
      flex: 1;
    }
    .card__body h3 { margin: 0; font-size: 1.05rem; }
    .card__body p { margin: 0; color: #64748b; font-size: .88rem; flex: 1; }
    .palette { display: flex; gap: .35rem; margin: .25rem 0 .5rem; }
    .dot {
      width: 18px; height: 18px; border-radius: 50%;
      border: 2px solid #fff; box-shadow: 0 1px 3px rgba(0,0,0,.15);
    }
    .btn {
      background: #2563eb; color: #fff;
      border: none; border-radius: 6px;
      padding: .65rem 1rem; font-weight: 600;
      cursor: pointer;
      transition: background .15s ease;
    }
    .btn:hover:not([disabled]) { background: #1d4ed8; }
    .btn[disabled] { opacity: .65; cursor: not-allowed; }
    .footer-skip { text-align: center; margin: 2rem 0 1rem; }
    .btn-link {
      background: none; border: none; color: #64748b;
      font-size: .9rem; cursor: pointer; text-decoration: underline;
    }
    .state {
      text-align: center; padding: 3rem; color: #64748b;
    }
    .toast {
      position: fixed; top: 1.5rem; right: 1.5rem;
      background: #16a34a; color: #fff;
      padding: .85rem 1.25rem; border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,.18);
      cursor: pointer;
      z-index: 9999;
      font-weight: 500;
      max-width: 380px;
    }
    .toast--error { background: #dc2626; }
  `]
})
export class StoreOnboardingComponent implements OnInit {
  storeId!: number;
  templates: ThemePreset[] = [];
  loading = false;
  applying: string | null = null;
  withDemoData = true;
  successMessage: string | null = null;
  error: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private themeService: ThemeService
  ) {}

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id') || this.route.snapshot.paramMap.get('storeId');
    this.storeId = Number(idParam);
    if (!this.storeId || isNaN(this.storeId)) {
      console.error('❌ Ungültige Store-ID für Onboarding:', idParam);
      this.router.navigate(['/dashboard']);
      return;
    }
    this.load();
  }

  load(): void {
    this.loading = true;
    this.themeService.getTemplatesFromBackend(true).subscribe({
      next: (list) => { this.templates = list; this.loading = false; },
      error: (err) => {
        console.error('Templates konnten nicht geladen werden:', err);
        this.error = 'Templates konnten nicht geladen werden.';
        this.loading = false;
      }
    });
  }

  getCode(t: ThemePreset): string {
    return ((t as any).code || (t as any).template || t.type || '').toString().toUpperCase();
  }

  isFree(t: ThemePreset): boolean {
    const v = (t as any).isFree;
    return v === undefined ? true : v;
  }

  getPreviewUrl(t: ThemePreset): string | null {
    const url = (t as any).preview;
    if (!url || typeof url !== 'string' || url.endsWith('/default-preview.jpg')) return null;
    return url;
  }

  apply(t: ThemePreset): void {
    const code = this.getCode(t);
    if (!code) return;
    this.applying = code;
    this.error = null;

    this.themeService.onboardStoreWithTemplate(this.storeId, code, this.withDemoData).subscribe({
      next: (res) => {
        this.applying = null;
        const created = res.demoProductsCreated;
        this.successMessage = created > 0
          ? `Shop ist startklar – Template "${res.templateName}" angewendet und ${created} Demo-Produkte angelegt.`
          : `Template "${res.templateName}" angewendet. (Keine Demo-Daten – Store enthält bereits Inhalte.)`;
        // Nach kurzer Pause zum Store-Dashboard navigieren
        setTimeout(() => this.router.navigate(['/stores', this.storeId]), 1800);
      },
      error: (err) => {
        console.error('Onboarding fehlgeschlagen:', err);
        this.applying = null;
        this.error = err?.error?.message || 'Template konnte nicht angewendet werden.';
      }
    });
  }

  skip(): void {
    this.router.navigate(['/stores', this.storeId]);
  }
}

