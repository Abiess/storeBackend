import {
  Component, Input, Output, EventEmitter, OnInit, OnChanges,
  SimpleChanges, signal, computed
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { UnsplashService, UnsplashImage } from '@app/core/services/unsplash.service';

/**
 * Bildauswahl-Komponente mit Unsplash-Integration.
 *
 * Unsplash-Guidelines:
 * - Attribution "Photo by {name} on Unsplash" ist PFLICHT und wird im Template angezeigt.
 * - Der API-Key fließt NIEMALS ins Frontend – alle Calls gehen über /api/assets/suggestions.
 *
 * Verwendung:
 * <app-unsplash-image-picker
 *   [businessType]="selectedBusinessType"
 *   [category]="selectedCategory"
 *   (selectionChanged)="onImagesSelected($event)">
 * </app-unsplash-image-picker>
 *
 * @Input businessType - SHOP | RESTAURANT | RIAD (bestimmt Default-Query)
 * @Input category - Optional: z.B. 'fashion', 'electronics', 'food' (verfeinert die Suche)
 */
@Component({
  selector: 'app-unsplash-image-picker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="unsplash-picker">

      <!-- Nicht konfiguriert / nicht verfügbar -->
      @if (!configured() && !loading()) {
        <div class="picker-unavailable">
          <span class="picker-unavailable__icon">🖼️</span>
          <p>Bildvorschläge nicht verfügbar (API nicht konfiguriert).</p>
        </div>
      }

      <!-- Suchleiste -->
      @if (configured() || loading()) {
        <div class="picker-search">
          <span class="picker-search__icon">🔍</span>
          <input
            type="text"
            class="picker-search__input"
            [placeholder]="getSearchPlaceholder()"
            [(ngModel)]="searchQuery"
            (ngModelChange)="onSearchChange($event)"
          />
          @if (loading()) {
            <span class="picker-search__spinner"></span>
          }
        </div>
      }

      <!-- Bildgitter -->
      <div class="picker-grid" [class.picker-grid--loading]="loading()">
        @for (img of images(); track img.id) {
          <div
            class="picker-item"
            [class.picker-item--selected]="isSelected(img)"
            (click)="toggleSelection(img)">

            <img
              [src]="img.thumbUrl"
              [alt]="img.description || 'Unsplash photo'"
              class="picker-item__img"
              loading="lazy"
            />

            <!-- Ausgewählt-Indikator -->
            @if (isSelected(img)) {
              <div class="picker-item__check">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
            }

            <!-- Pflicht: Attribution (Unsplash-Guidelines) -->
            <div class="picker-item__attribution">
              <a [href]="img.authorUrl + '?utm_source=markt_ma&utm_medium=referral'"
                target="_blank" rel="noopener noreferrer"
                (click)="$event.stopPropagation()">
                📷 {{ img.authorName }}
              </a>
            </div>
          </div>
        }

        <!-- Skeleton-Loader -->
        @if (loading()) {
          @for (n of skeletons; track n) {
            <div class="picker-skeleton"></div>
          }
        }
      </div>

      <!-- Leer-Zustand -->
      @if (!loading() && images().length === 0 && configured()) {
        <div class="picker-empty">
          <p>Keine Bilder gefunden. Versuche einen anderen Suchbegriff.</p>
        </div>
      }

      <!-- Mehr laden -->
      @if (!loading() && images().length > 0 && configured()) {
        <div class="picker-footer">
          <button class="picker-load-more" (click)="loadMore()" type="button">
            Mehr laden
          </button>
          <p class="picker-attribution-note">
            Fotos von
            <a href="https://unsplash.com?utm_source=markt_ma&utm_medium=referral"
              target="_blank" rel="noopener noreferrer">Unsplash</a>
          </p>
        </div>
      }

      <!-- Auswahl-Zusammenfassung -->
      @if (selectedImages().length > 0) {
        <div class="picker-selection-summary">
          <span class="picker-selection-summary__badge">{{ selectedImages().length }}</span>
          Bild(er) ausgewählt
        </div>
      }
    </div>
  `,
  styles: [`
    .unsplash-picker {
      margin-top: 1.25rem;
    }

    /* Suchleiste */
    .picker-search {
      position: relative;
      display: flex;
      align-items: center;
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      padding: 0.625rem 1rem;
      margin-bottom: 1rem;
      gap: 0.5rem;
    }
    .picker-search__input {
      flex: 1;
      border: none;
      background: transparent;
      outline: none;
      font-size: 0.9rem;
      color: #1f2937;
    }
    .picker-search__spinner {
      width: 16px; height: 16px;
      border: 2px solid #e5e7eb;
      border-top-color: #667eea;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
      flex-shrink: 0;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* Grid */
    .picker-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.75rem;
      transition: opacity 0.2s;
    }
    .picker-grid--loading { opacity: 0.6; pointer-events: none; }

    @media (max-width: 640px) {
      .picker-grid { grid-template-columns: repeat(2, 1fr); }
    }

    /* Item */
    .picker-item {
      position: relative;
      aspect-ratio: 16/9;
      border-radius: 10px;
      overflow: hidden;
      cursor: pointer;
      border: 3px solid transparent;
      transition: border-color 0.2s, transform 0.15s;
    }
    .picker-item:hover { transform: scale(1.02); border-color: #667eea; }
    .picker-item--selected { border-color: #667eea; }

    .picker-item__img {
      width: 100%; height: 100%;
      object-fit: cover;
      display: block;
    }

    /* Ausgewählt-Badge */
    .picker-item__check {
      position: absolute;
      top: 0.4rem; right: 0.4rem;
      width: 28px; height: 28px;
      background: #667eea;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      animation: scaleIn 0.2s ease;
    }
    @keyframes scaleIn { from { transform: scale(0); } to { transform: scale(1); } }

    /* Attribution – Unsplash-Pflicht */
    .picker-item__attribution {
      position: absolute;
      bottom: 0; left: 0; right: 0;
      padding: 0.3rem 0.5rem;
      background: linear-gradient(transparent, rgba(0,0,0,0.65));
      font-size: 0.65rem;
    }
    .picker-item__attribution a {
      color: rgba(255,255,255,0.9);
      text-decoration: none;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      display: block;
    }
    .picker-item__attribution a:hover { text-decoration: underline; }

    /* Skeleton */
    .picker-skeleton {
      aspect-ratio: 16/9;
      background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
      background-size: 200% 100%;
      animation: shimmer 1.4s infinite;
      border-radius: 10px;
    }
    @keyframes shimmer { to { background-position: -200% 0; } }

    /* Footer */
    .picker-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: 1rem;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
    .picker-load-more {
      background: transparent;
      border: 1.5px solid #667eea;
      color: #667eea;
      border-radius: 8px;
      padding: 0.4rem 1rem;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }
    .picker-load-more:hover { background: rgba(102,126,234,0.08); }

    .picker-attribution-note {
      font-size: 0.75rem;
      color: #9ca3af;
      margin: 0;
    }
    .picker-attribution-note a { color: #6b7280; }

    /* Selection summary */
    .picker-selection-summary {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-top: 0.75rem;
      font-size: 0.875rem;
      color: #374151;
      font-weight: 500;
    }
    .picker-selection-summary__badge {
      background: #667eea;
      color: white;
      border-radius: 999px;
      padding: 0.15rem 0.6rem;
      font-size: 0.8rem;
      font-weight: 700;
    }

    /* Leer & nicht verfügbar */
    .picker-empty, .picker-unavailable {
      text-align: center;
      padding: 2rem;
      color: #9ca3af;
      font-size: 0.875rem;
    }
    .picker-unavailable__icon { font-size: 2rem; display: block; margin-bottom: 0.5rem; }
  `]
})
export class UnsplashImagePickerComponent implements OnInit, OnChanges {

  @Input() businessType = 'SHOP';
  @Input() category?: string; // z.B. 'fashion', 'electronics', 'food', etc.
  @Output() selectionChanged = new EventEmitter<UnsplashImage[]>();

  images = signal<UnsplashImage[]>([]);
  selectedImages = signal<UnsplashImage[]>([]);
  loading = signal(false);
  configured = signal(true);

  searchQuery = '';
  skeletons = [1, 2, 3, 4, 5, 6];

  private currentPage = 1;
  private searchSubject = new Subject<string>();

  constructor(private unsplashService: UnsplashService) {}

  ngOnInit(): void {
    this.searchSubject.pipe(
      debounceTime(500),
      distinctUntilChanged()
    ).subscribe(q => {
      this.currentPage = 1;
      this.images.set([]);
      this.loadImages(q);
    });

    this.loadImages();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['businessType'] && !changes['businessType'].firstChange) ||
        (changes['category'] && !changes['category'].firstChange)) {
      this.currentPage = 1;
      this.images.set([]);
      this.selectedImages.set([]);
      this.loadImages(this.searchQuery);
    }
  }

  onSearchChange(query: string): void {
    this.searchSubject.next(query);
  }

  toggleSelection(img: UnsplashImage): void {
    const current = this.selectedImages();
    const idx = current.findIndex(s => s.id === img.id);
    if (idx >= 0) {
      this.selectedImages.set(current.filter(s => s.id !== img.id));
    } else {
      this.selectedImages.set([...current, img]);
    }
    this.selectionChanged.emit(this.selectedImages());
  }

  isSelected(img: UnsplashImage): boolean {
    return this.selectedImages().some(s => s.id === img.id);
  }

  loadMore(): void {
    this.currentPage++;
    this.loadImages(this.searchQuery, true);
  }

  getSearchPlaceholder(): string {
    const map: Record<string, string> = {
      RIAD: 'z.B. "riad patio" oder "marrakech architecture"',
      RESTAURANT: 'z.B. "tagine" oder "moroccan food"',
      SHOP: 'z.B. "boutique" oder "retail interior"',
    };
    return map[this.businessType] ?? 'Bilder suchen…';
  }

  private loadImages(query?: string, append = false): void {
    this.loading.set(true);
    // Kategorie als Suchbegriff verwenden, falls vorhanden und kein custom query
    const searchQuery = query || this.category;
    this.unsplashService.getSuggestions(this.businessType, searchQuery, this.currentPage)
      .subscribe({
        next: (res) => {
          this.configured.set(res.configured);
          if (append) {
            this.images.update(prev => [...prev, ...res.images]);
          } else {
            this.images.set(res.images);
          }
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
        }
      });
  }
}
