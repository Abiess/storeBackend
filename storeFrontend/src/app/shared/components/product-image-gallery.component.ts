import { Component, Input, OnInit } from '@angular/core';
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
             (mouseenter)="enableZoom()"
             (mouseleave)="disableZoom()"
             (mousemove)="onMouseMove($event)">
          
          <img *ngIf="getCurrentImage()" 
               [src]="getCurrentImage()"
               [alt]="productTitle"
               class="main-image"
               [class.zoomed]="isZoomed"
               [style.transform-origin]="zoomOrigin"
               (click)="openLightbox()"
               (error)="onImageError($event)">
          
          <!-- Fallback wenn kein Bild -->
          <div *ngIf="!getCurrentImage() || imageError" class="no-image-placeholder">
            <span class="placeholder-icon">📷</span>
            <p>Kein Bild verfügbar</p>
          </div>

          <!-- Zoom Indicator -->
          <div *ngIf="hasImages() && !isZoomed" class="zoom-hint">
            🔍 Hover zum Zoomen
          </div>

          <!-- Image Counter Badge -->
          <div *ngIf="hasMultipleImages()" class="image-counter">
            {{ currentImageIndex + 1 }} / {{ getTotalImages() }}
          </div>

          <!-- Navigation Arrows (bei mehreren Bildern) -->
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
        <div *ngFor="let image of images; let i = index" 
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
    .product-gallery {
      width: 100%;
    }

    /* Main Image Container */
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
      padding-top: 100%; /* 1:1 Aspect Ratio */
      cursor: zoom-in;
      overflow: hidden;
    }

    .main-image {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      object-fit: contain;
      transition: transform 0.3s ease;
    }

    .main-image.zoomed {
      transform: scale(2);
      cursor: zoom-out;
    }

    /* No Image Placeholder */
    .no-image-placeholder {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #f0f0f0, #e0e0e0);
    }

    .placeholder-icon {
      font-size: 4rem;
      opacity: 0.5;
      margin-bottom: 1rem;
    }

    .no-image-placeholder p {
      color: #999;
      font-size: 1rem;
    }

    /* Zoom Hint */
    .zoom-hint {
      position: absolute;
      bottom: 1rem;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.7);
      color: white;
      padding: 0.5rem 1rem;
      border-radius: 20px;
      font-size: 0.875rem;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.3s;
    }

    .image-wrapper:hover .zoom-hint {
      opacity: 1;
    }

    /* Image Counter Badge */
    .image-counter {
      position: absolute;
      top: 1rem;
      right: 1rem;
      background: rgba(0, 0, 0, 0.7);
      color: white;
      padding: 0.5rem 1rem;
      border-radius: 20px;
      font-size: 0.875rem;
      font-weight: 600;
      z-index: 2;
    }

    /* Navigation Arrows */
    .nav-arrow {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      background: rgba(255, 255, 255, 0.9);
      border: none;
      width: 48px;
      height: 48px;
      border-radius: 50%;
      font-size: 2rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2;
      transition: all 0.3s;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    }

    .nav-arrow:hover {
      background: white;
      transform: translateY(-50%) scale(1.1);
    }

    .nav-arrow.prev {
      left: 1rem;
    }

    .nav-arrow.next {
      right: 1rem;
    }

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

    .thumbnails::-webkit-scrollbar {
      height: 6px;
    }

    .thumbnails::-webkit-scrollbar-thumb {
      background: #ccc;
      border-radius: 3px;
    }

    .thumbnail {
      flex-shrink: 0;
      width: 80px;
      height: 80px;
      border-radius: 8px;
      overflow: hidden;
      cursor: pointer;
      border: 2px solid transparent;
      transition: all 0.3s;
      background: #f8f9fa;
    }

    .thumbnail:hover {
      border-color: #667eea;
      transform: translateY(-2px);
    }

    .thumbnail.active {
      border-color: #667eea;
      box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.2);
    }

    .thumbnail img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    /* Lightbox */
    .lightbox {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.95);
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: fadeIn 0.3s;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .lightbox-close {
      position: absolute;
      top: 2rem;
      right: 2rem;
      background: rgba(255, 255, 255, 0.2);
      border: none;
      color: white;
      font-size: 2rem;
      width: 48px;
      height: 48px;
      border-radius: 50%;
      cursor: pointer;
      transition: all 0.3s;
      z-index: 10001;
    }

    .lightbox-close:hover {
      background: rgba(255, 255, 255, 0.3);
      transform: rotate(90deg);
    }

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
      top: 50%;
      transform: translateY(-50%);
      background: rgba(255, 255, 255, 0.9);
      border: none;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      font-size: 2.5rem;
      cursor: pointer;
      transition: all 0.3s;
    }

    .lightbox-nav:hover {
      background: white;
      transform: translateY(-50%) scale(1.1);
    }

    .lightbox-nav.prev {
      left: -80px;
    }

    .lightbox-nav.next {
      right: -80px;
    }

    .lightbox-counter {
      position: absolute;
      bottom: -3rem;
      left: 50%;
      transform: translateX(-50%);
      color: white;
      font-size: 1.125rem;
      font-weight: 600;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .nav-arrow {
        width: 40px;
        height: 40px;
        font-size: 1.5rem;
      }

      .thumbnail {
        width: 60px;
        height: 60px;
      }

      .lightbox-nav {
        width: 48px;
        height: 48px;
        font-size: 2rem;
      }

      .lightbox-nav.prev {
        left: 1rem;
      }

      .lightbox-nav.next {
        right: 1rem;
      }
    }
  `]
})
export class ProductImageGalleryComponent implements OnInit {
  @Input() images: string[] = [];
  @Input() primaryImageUrl?: string;
  @Input() productTitle: string = 'Produkt';

  currentImageIndex = 0;
  isZoomed = false;
  zoomOrigin = '50% 50%';
  lightboxOpen = false;
  imageError = false;

  ngOnInit(): void {
    // Baue Image-Array auf
    this.buildImageArray();
  }

  private buildImageArray(): void {
    const imageList: string[] = [];

    // 1. Primary Image zuerst
    if (this.primaryImageUrl) {
      imageList.push(this.primaryImageUrl);
    }

    // 2. Restliche Bilder (ohne Primary Image wenn es schon drin ist)
    if (this.images && this.images.length > 0) {
      this.images.forEach(img => {
        if (img && img !== this.primaryImageUrl) {
          imageList.push(img);
        }
      });
    }

    this.images = imageList;
  }

  getCurrentImage(): string | null {
    if (this.images && this.images.length > 0) {
      return this.images[this.currentImageIndex];
    }
    return null;
  }

  hasImages(): boolean {
    return this.images && this.images.length > 0;
  }

  hasMultipleImages(): boolean {
    return this.images && this.images.length > 1;
  }

  getTotalImages(): number {
    return this.images?.length || 0;
  }

  selectImage(index: number): void {
    this.currentImageIndex = index;
    this.imageError = false;
  }

  previousImage(): void {
    if (this.currentImageIndex > 0) {
      this.currentImageIndex--;
      this.imageError = false;
    }
  }

  nextImage(): void {
    if (this.currentImageIndex < this.getTotalImages() - 1) {
      this.currentImageIndex++;
      this.imageError = false;
    }
  }

  enableZoom(): void {
    if (this.hasImages() && !this.imageError) {
      this.isZoomed = true;
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
      document.body.style.overflow = 'hidden';
    }
  }

  closeLightbox(): void {
    this.lightboxOpen = false;
    document.body.style.overflow = '';
  }

  onImageError(event: Event): void {
    this.imageError = true;
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
    console.warn('❌ Fehler beim Laden des Produktbilds:', this.getCurrentImage());
  }

  onThumbnailError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.style.opacity = '0.3';
  }
}
