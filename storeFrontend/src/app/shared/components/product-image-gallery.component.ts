import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Professional Product Image Gallery Component
 * Features:
 * - Main image display with zoom on hover
 * - Thumbnail navigation
 * - Image counter
 * - Lightbox for fullscreen view
 * - Responsive design
 */
@Component({
  selector: 'app-product-image-gallery',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="product-gallery">
      <!-- Main Image Display -->
      <div class="main-image-container">
        <div class="image-wrapper"
             (mousemove)="onMouseMove($event)"
             (mouseleave)="disableZoom()">

          <img *ngIf="getCurrentImage() && !imageError"
               [src]="getCurrentImage()"
               [alt]="productTitle"
               class="main-image"
               [class.zoomed]="isZoomed"
               [style.transform-origin]="zoomOrigin"
               (error)="onImageError($event)">

          <!-- Fallback wenn kein Bild -->
          <div *ngIf="!getCurrentImage() || imageError" class="no-image-placeholder">
            <span class="placeholder-icon">📷</span>
            <p>Kein Bild verfügbar</p>
          </div>

          <!-- Zoom Toggle Button -->
          <button *ngIf="hasImages() && !imageError"
                  class="zoom-btn"
                  [title]="isZoomed ? 'Zoom deaktivieren' : 'Zoom aktivieren'"
                  (click)="toggleZoom()">
            {{ isZoomed ? '🔍−' : '🔍+' }}
          </button>

          <!-- Lightbox-Button -->
          <button *ngIf="hasImages() && !imageError"
                  class="lightbox-btn"
                  title="Vollbild"
                  (click)="openLightbox()">
            ⛶
          </button>

          <!-- Image Counter Badge -->
          <div *ngIf="hasMultipleImages()" class="image-counter">
            {{ currentImageIndex + 1 }} / {{ getTotalImages() }}
          </div>

          <!-- Navigation Arrows -->
          <button *ngIf="hasMultipleImages() && currentImageIndex > 0"
                  class="nav-arrow prev"
                  (click)="previousImage()">
            ‹
          </button>
          <button *ngIf="hasMultipleImages() && currentImageIndex < getTotalImages() - 1"
                  class="nav-arrow next"
                  (click)="nextImage()">
            ›
          </button>
        </div>
      </div>

      <!-- Thumbnail Navigation -->
      <div *ngIf="hasMultipleImages()" class="thumbnails">
        <div *ngFor="let image of _displayImages; let i = index"
             class="thumbnail"
             [class.active]="i === currentImageIndex"
             (click)="selectImage(i)">
          <img [src]="image"
               [alt]="productTitle + ' - Bild ' + (i + 1)"
               (error)="onThumbnailError($event)">
        </div>
      </div>

      <!-- Lightbox Modal -->
      <div *ngIf="lightboxOpen" class="lightbox" (click)="closeLightbox()">
        <button class="lightbox-close" (click)="closeLightbox()">✕</button>
        <div class="lightbox-content" (click)="$event.stopPropagation()">
          <img [src]="getCurrentImage()" [alt]="productTitle">

          <button *ngIf="hasMultipleImages() && currentImageIndex > 0"
                  class="lightbox-nav prev"
                  (click)="previousImage(); $event.stopPropagation()">
            ‹
          </button>
          <button *ngIf="hasMultipleImages() && currentImageIndex < getTotalImages() - 1"
                  class="lightbox-nav next"
                  (click)="nextImage(); $event.stopPropagation()">
            ›
          </button>

          <div class="lightbox-counter">
            {{ currentImageIndex + 1 }} / {{ getTotalImages() }}
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .product-gallery { width: 100%; }

    .main-image-container {
      width: 100%;
      margin-bottom: 1rem;
      position: relative;
      background: #f8f9fa;
      border-radius: 12px;
      overflow: hidden;
    }

    .image-wrapper {
      position: relative;
      padding-top: 100%;
      overflow: hidden;
    }

    .main-image {
      position: absolute;
      top: 0; left: 0;
      width: 100%; height: 100%;
      object-fit: contain;
      transition: transform 0.2s ease;
      cursor: default;
    }

    .main-image.zoomed {
      transform: scale(2);
      cursor: zoom-out;
    }

    /* No Image Placeholder */
    .no-image-placeholder {
      position: absolute;
      top: 0; left: 0;
      width: 100%; height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #f0f0f0, #e0e0e0);
    }
    .placeholder-icon { font-size: 4rem; opacity: 0.5; margin-bottom: 1rem; }
    .no-image-placeholder p { color: #999; font-size: 1rem; }

    /* Zoom & Lightbox Buttons – oben links/rechts, immer klickbar */
    .zoom-btn, .lightbox-btn {
      position: absolute;
      top: 0.75rem;
      background: rgba(0,0,0,0.55);
      color: white;
      border: none;
      border-radius: 8px;
      padding: 0.4rem 0.7rem;
      font-size: 1rem;
      cursor: pointer;
      z-index: 10;
      transition: background 0.2s;
      line-height: 1;
    }
    .zoom-btn { left: 0.75rem; }
    .lightbox-btn { left: 4rem; font-size: 1.2rem; }
    .zoom-btn:hover, .lightbox-btn:hover { background: rgba(0,0,0,0.8); }

    /* Image Counter Badge */
    .image-counter {
      position: absolute;
      top: 0.75rem;
      right: 0.75rem;
      background: rgba(0,0,0,0.6);
      color: white;
      padding: 0.35rem 0.8rem;
      border-radius: 20px;
      font-size: 0.85rem;
      font-weight: 600;
      z-index: 10;
    }

    /* Navigation Arrows */
    .nav-arrow {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      background: rgba(255,255,255,0.92);
      border: none;
      width: 48px; height: 48px;
      border-radius: 50%;
      font-size: 2rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10;
      transition: all 0.2s;
      box-shadow: 0 2px 8px rgba(0,0,0,0.25);
    }
    .nav-arrow:hover {
      background: white;
      transform: translateY(-50%) scale(1.1);
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    }
    .nav-arrow.prev { left: 0.75rem; }
    .nav-arrow.next { right: 0.75rem; }

    /* Thumbnails */
    .thumbnails {
      display: flex;
      gap: 0.5rem;
      overflow-x: auto;
      padding: 0.5rem 0;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: thin;
      scrollbar-color: #ccc transparent;
    }
    .thumbnails::-webkit-scrollbar { height: 6px; }
    .thumbnails::-webkit-scrollbar-thumb { background: #ccc; border-radius: 3px; }

    .thumbnail {
      flex-shrink: 0;
      width: 80px; height: 80px;
      border-radius: 8px;
      overflow: hidden;
      cursor: pointer;
      border: 2px solid transparent;
      transition: all 0.2s;
      background: #f0f0f0;
    }
    .thumbnail:hover { border-color: #667eea; transform: translateY(-2px); }
    .thumbnail.active {
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102,126,234,0.3);
    }
    .thumbnail img { width: 100%; height: 100%; object-fit: cover; }

    /* Lightbox */
    .lightbox {
      position: fixed;
      top: 0; left: 0;
      width: 100vw; height: 100vh;
      background: rgba(0,0,0,0.95);
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: fadeIn 0.25s;
    }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

    .lightbox-close {
      position: absolute;
      top: 1.5rem; right: 1.5rem;
      background: rgba(255,255,255,0.2);
      border: none; color: white;
      font-size: 1.5rem;
      width: 44px; height: 44px;
      border-radius: 50%;
      cursor: pointer;
      transition: all 0.2s;
      z-index: 10001;
    }
    .lightbox-close:hover { background: rgba(255,255,255,0.35); transform: rotate(90deg); }

    .lightbox-content {
      position: relative;
      max-width: 90vw;
      max-height: 90vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .lightbox-content img {
      max-width: 100%;
      max-height: 90vh;
      object-fit: contain;
      border-radius: 8px;
    }

    .lightbox-nav {
      position: absolute;
      top: 50%; transform: translateY(-50%);
      background: rgba(255,255,255,0.9);
      border: none;
      width: 56px; height: 56px;
      border-radius: 50%;
      font-size: 2.5rem;
      cursor: pointer;
      transition: all 0.2s;
      display: flex; align-items: center; justify-content: center;
    }
    .lightbox-nav:hover { background: white; transform: translateY(-50%) scale(1.1); }
    .lightbox-nav.prev { left: -72px; }
    .lightbox-nav.next { right: -72px; }

    .lightbox-counter {
      position: absolute;
      bottom: -2.5rem;
      left: 50%; transform: translateX(-50%);
      color: white;
      font-size: 1rem;
      font-weight: 600;
    }

    @media (max-width: 768px) {
      .nav-arrow { width: 40px; height: 40px; font-size: 1.5rem; }
      .thumbnail { width: 60px; height: 60px; }
      .lightbox-nav { width: 44px; height: 44px; font-size: 2rem; }
      .lightbox-nav.prev { left: 0.5rem; }
      .lightbox-nav.next { right: 0.5rem; }
    }
  `]
})
export class ProductImageGalleryComponent implements OnInit, OnChanges {
  @Input() images: string[] = [];
  @Input() primaryImageUrl?: string;
  @Input() productTitle: string = 'Produkt';

  /** ✅ FIX: Interne Liste – überschreibt NICHT den @Input() images-Property.
   *  Der @Input wird nur gelesen, nie verändert. So feuert ngOnChanges nicht endlos. */
  _displayImages: string[] = [];

  currentImageIndex = 0;
  isZoomed = false;
  zoomOrigin = '50% 50%';
  lightboxOpen = false;
  imageError = false;

  ngOnInit(): void {
    this.buildImageArray();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['images'] || changes['primaryImageUrl']) {
      this.buildImageArray();
      this.currentImageIndex = 0;
      this.imageError = false;
    }
  }

  private buildImageArray(): void {
    const imageList: string[] = [];

    if (this.primaryImageUrl) {
      imageList.push(this.primaryImageUrl);
    }

    if (this.images && this.images.length > 0) {
      this.images.forEach(img => {
        if (img && img !== this.primaryImageUrl) {
          imageList.push(img);
        }
      });
    }

    // ✅ FIX: Interne Variable befüllen, NICHT this.images überschreiben
    this._displayImages = imageList;
  }

  getCurrentImage(): string | null {
    return this._displayImages.length > 0
      ? this._displayImages[this.currentImageIndex]
      : null;
  }

  hasImages(): boolean {
    return this._displayImages.length > 0;
  }

  hasMultipleImages(): boolean {
    return this._displayImages.length > 1;
  }

  getTotalImages(): number {
    return this._displayImages.length;
  }

  selectImage(index: number): void {
    this.currentImageIndex = index;
    this.imageError = false;
    this.isZoomed = false;
  }

  previousImage(): void {
    if (this.currentImageIndex > 0) {
      this.currentImageIndex--;
      this.imageError = false;
      this.isZoomed = false;
    }
  }

  nextImage(): void {
    if (this.currentImageIndex < this.getTotalImages() - 1) {
      this.currentImageIndex++;
      this.imageError = false;
      this.isZoomed = false;
    }
  }

  /** ✅ FIX: Zoom nur per Button-Klick aktivieren, nicht auf mouseenter
   *  Das verhindert, dass das vergrößerte Bild die Navigationspfeile überdeckt */
  toggleZoom(): void {
    if (this.hasImages() && !this.imageError) {
      this.isZoomed = !this.isZoomed;
    }
  }

  disableZoom(): void {
    this.isZoomed = false;
  }

  onMouseMove(event: MouseEvent): void {
    if (!this.isZoomed) return;
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    this.zoomOrigin = `${x}% ${y}%`;
  }

  openLightbox(): void {
    if (this.hasImages() && !this.imageError) {
      this.lightboxOpen = true;
      this.isZoomed = false;
      document.body.style.overflow = 'hidden';
    }
  }

  closeLightbox(): void {
    this.lightboxOpen = false;
    document.body.style.overflow = '';
  }

  onImageError(event: Event): void {
    this.imageError = true;
    (event.target as HTMLImageElement).style.display = 'none';
    console.warn('❌ Fehler beim Laden des Produktbilds:', this.getCurrentImage());
  }

  onThumbnailError(event: Event): void {
    (event.target as HTMLImageElement).style.opacity = '0.3';
  }
}
