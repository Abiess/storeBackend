import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StoreSliderService, StoreSliderImage, StoreSliderSettings } from '../../../core/services/store-slider.service';

@Component({
  selector: 'app-store-slider-viewer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="slider-container" *ngIf="images.length > 0">
      <div class="slider-wrapper">
        <!-- Slides -->
        <div class="slides" [style.transform]="'translateX(-' + currentIndex * 100 + '%)'">
          <div class="slide" *ngFor="let image of images">
            <img [src]="image.imageUrl" [alt]="image.altText || 'Slider Image'" />
          </div>
        </div>

        <!-- Navigation Arrows -->
        <button 
          *ngIf="settings?.showArrows && images.length > 1" 
          class="nav-arrow prev" 
          (click)="prevSlide()"
          aria-label="Previous slide">
          ‹
        </button>
        <button 
          *ngIf="settings?.showArrows && images.length > 1" 
          class="nav-arrow next" 
          (click)="nextSlide()"
          aria-label="Next slide">
          ›
        </button>

        <!-- Dots Navigation -->
        <div class="dots" *ngIf="settings?.showDots && images.length > 1">
          <button 
            *ngFor="let image of images; let i = index" 
            class="dot" 
            [class.active]="i === currentIndex"
            (click)="goToSlide(i)"
            [attr.aria-label]="'Go to slide ' + (i + 1)">
          </button>
        </div>
      </div>
    </div>

    <div class="no-slider" *ngIf="images.length === 0">
      <p>Keine Slider-Bilder verfügbar</p>
    </div>
  `,
  styles: [`
    .slider-container {
      width: 100%;
      max-width: 1200px;
      margin: 0 auto;
      overflow: hidden;
    }

    .slider-wrapper {
      position: relative;
      width: 100%;
      aspect-ratio: 3 / 1;
      background: #f5f5f5;
      overflow: hidden;
    }

    .slides {
      display: flex;
      transition: transform 0.5s ease-in-out;
      height: 100%;
    }

    .slide {
      min-width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .slide img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .nav-arrow {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      background: rgba(0, 0, 0, 0.5);
      color: white;
      border: none;
      font-size: 3rem;
      padding: 0.5rem 1rem;
      cursor: pointer;
      transition: background 0.3s;
      z-index: 10;
    }

    .nav-arrow:hover {
      background: rgba(0, 0, 0, 0.8);
    }

    .nav-arrow.prev {
      left: 1rem;
    }

    .nav-arrow.next {
      right: 1rem;
    }

    .dots {
      position: absolute;
      bottom: 1rem;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: 0.5rem;
      z-index: 10;
    }

    .dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.5);
      border: none;
      cursor: pointer;
      transition: background 0.3s;
    }

    .dot.active {
      background: white;
      transform: scale(1.2);
    }

    .dot:hover {
      background: rgba(255, 255, 255, 0.8);
    }

    .no-slider {
      text-align: center;
      padding: 3rem;
      background: #f5f5f5;
      color: #666;
    }

    @media (max-width: 768px) {
      .nav-arrow {
        font-size: 2rem;
        padding: 0.3rem 0.6rem;
      }

      .nav-arrow.prev {
        left: 0.5rem;
      }

      .nav-arrow.next {
        right: 0.5rem;
      }
    }
  `]
})
export class StoreSliderViewerComponent implements OnInit, OnDestroy {
  @Input() storeId!: number;

  images: StoreSliderImage[] = [];
  settings: StoreSliderSettings | null = null;
  currentIndex = 0;
  private autoplayInterval: any;

  constructor(private sliderService: StoreSliderService) {}

  ngOnInit(): void {
    if (!this.storeId) {
      console.error('StoreSliderViewer: storeId is required');
      return;
    }
    this.loadSlider();
  }

  ngOnDestroy(): void {
    this.stopAutoplay();
  }

  loadSlider(): void {
    this.sliderService.getSlider(this.storeId).subscribe({
      next: (data) => {
        this.settings = data.settings;
        this.images = data.images.filter(img => img.isActive);

        if (this.settings?.autoplay && this.images.length > 1) {
          this.startAutoplay();
        }
      },
      error: (err) => {
        console.error('Failed to load slider:', err);
      }
    });
  }

  startAutoplay(): void {
    if (!this.settings) return;

    this.autoplayInterval = setInterval(() => {
      this.nextSlide();
    }, this.settings.durationMs);
  }

  stopAutoplay(): void {
    if (this.autoplayInterval) {
      clearInterval(this.autoplayInterval);
      this.autoplayInterval = null;
    }
  }

  nextSlide(): void {
    if (this.images.length === 0) return;

    this.currentIndex = (this.currentIndex + 1) % this.images.length;

    if (!this.settings?.loopEnabled && this.currentIndex === 0) {
      this.stopAutoplay();
    }
  }

  prevSlide(): void {
    if (this.images.length === 0) return;

    this.currentIndex = this.currentIndex === 0
      ? this.images.length - 1
      : this.currentIndex - 1;
  }

  goToSlide(index: number): void {
    this.currentIndex = index;

    // Reset autoplay
    if (this.settings?.autoplay) {
      this.stopAutoplay();
      this.startAutoplay();
    }
  }
}

