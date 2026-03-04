import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface SliderImage {
  id: number;
  imageUrl: string;
  altText?: string;
}

@Component({
  selector: 'app-image-slider',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="slider-container" *ngIf="images && images.length > 0">
      <div class="slider-wrapper">
        <!-- Slides -->
        <div class="slides" [style.transform]="'translateX(-' + (currentIndex * 100) + '%)'">
          <div *ngFor="let image of images" class="slide">
            <img [src]="image.imageUrl" [alt]="image.altText || 'Slider Image'" />
          </div>
        </div>

        <!-- Navigation Arrows -->
        <button *ngIf="images.length > 1" class="nav-btn prev" (click)="prev()" aria-label="Previous">
          ‹
        </button>
        <button *ngIf="images.length > 1" class="nav-btn next" (click)="next()" aria-label="Next">
          ›
        </button>

        <!-- Dots -->
        <div *ngIf="images.length > 1" class="dots">
          <button
            *ngFor="let image of images; let i = index"
            class="dot"
            [class.active]="i === currentIndex"
            (click)="goTo(i)"
            [attr.aria-label]="'Go to slide ' + (i + 1)">
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .slider-container {
      width: 100%;
      position: relative;
      overflow: hidden;
      background: #f5f5f5;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .slider-wrapper {
      position: relative;
      width: 100%;
      height: 400px;
      overflow: hidden;
    }

    .slides {
      display: flex;
      height: 100%;
      transition: transform 0.5s ease-in-out;
    }

    .slide {
      flex: 0 0 100%;
      width: 100%;
      height: 100%;
    }

    .slide img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .nav-btn {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      background: rgba(255,255,255,0.9);
      border: none;
      font-size: 3rem;
      padding: 0.5rem 1rem;
      cursor: pointer;
      z-index: 10;
      transition: all 0.3s;
      border-radius: 50%;
      width: 50px;
      height: 50px;
      display: flex;
      align-items: center;
      justify-content: center;
      line-height: 1;
    }

    .nav-btn:hover {
      background: white;
      box-shadow: 0 2px 12px rgba(0,0,0,0.2);
    }

    .nav-btn.prev {
      left: 20px;
    }

    .nav-btn.next {
      right: 20px;
    }

    .dots {
      position: absolute;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: 10px;
      z-index: 10;
    }

    .dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      border: 2px solid white;
      background: rgba(255,255,255,0.5);
      cursor: pointer;
      transition: all 0.3s;
      padding: 0;
    }

    .dot.active {
      background: white;
      transform: scale(1.2);
    }

    .dot:hover {
      background: rgba(255,255,255,0.8);
    }

    @media (max-width: 768px) {
      .slider-wrapper {
        height: 250px;
      }

      .nav-btn {
        font-size: 2rem;
        width: 40px;
        height: 40px;
        padding: 0.3rem 0.7rem;
      }

      .nav-btn.prev {
        left: 10px;
      }

      .nav-btn.next {
        right: 10px;
      }
    }
  `]
})
export class ImageSliderComponent implements OnInit, OnDestroy {
  @Input() images: SliderImage[] = [];
  @Input() autoplay: boolean = true;
  @Input() interval: number = 5000; // 5 seconds

  currentIndex = 0;
  private autoplayTimer: any;

  ngOnInit(): void {
    if (this.autoplay && this.images.length > 1) {
      this.startAutoplay();
    }
  }

  ngOnDestroy(): void {
    this.stopAutoplay();
  }

  next(): void {
    this.currentIndex = (this.currentIndex + 1) % this.images.length;
    this.resetAutoplay();
  }

  prev(): void {
    this.currentIndex = (this.currentIndex - 1 + this.images.length) % this.images.length;
    this.resetAutoplay();
  }

  goTo(index: number): void {
    this.currentIndex = index;
    this.resetAutoplay();
  }

  private startAutoplay(): void {
    this.autoplayTimer = setInterval(() => {
      this.next();
    }, this.interval);
  }

  private stopAutoplay(): void {
    if (this.autoplayTimer) {
      clearInterval(this.autoplayTimer);
    }
  }

  private resetAutoplay(): void {
    if (this.autoplay && this.images.length > 1) {
      this.stopAutoplay();
      this.startAutoplay();
    }
  }
}

