import { Component, Input, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-video-player',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="video-player" [class.large]="size === 'large'">
      <video 
        #videoElement
        [poster]="poster"
        [controls]="showControls"
        [autoplay]="autoplay"
        [muted]="muted"
        [loop]="loop"
        playsinline
        preload="metadata"
        (loadedmetadata)="onVideoLoaded()"
        (play)="onPlay()"
        (pause)="onPause()"
        (error)="onVideoError()"
        class="video-element">
        
        <source [src]="videoUrl" type="video/webm" *ngIf="videoUrl?.endsWith('.webm')">
        <source [src]="videoUrl" type="video/mp4" *ngIf="videoUrl?.endsWith('.mp4')">
        
        <p class="video-fallback">
          {{ fallbackMessage }}
        </p>
      </video>
      
      <!-- Custom Play Button Overlay -->
      <div class="play-overlay" 
           *ngIf="!isPlaying && showPlayButton && !showControls"
           (click)="togglePlay()">
        <div class="play-button">
          <svg width="80" height="80" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="38" fill="rgba(255,255,255,0.9)" />
            <polygon points="32,25 32,55 55,40" fill="#667eea" />
          </svg>
        </div>
      </div>
      
      <!-- Loading Indicator -->
      <div class="video-loading" *ngIf="isLoading">
        <div class="spinner"></div>
        <p>Video wird geladen...</p>
      </div>
      
      <!-- Error State -->
      <div class="video-error" *ngIf="hasError">
        <div class="error-icon">⚠️</div>
        <p>{{ errorMessage }}</p>
        <small>Pfad: {{ videoUrl }}</small>
      </div>
    </div>
  `,
    styles: [`
    .video-player {
      position: relative;
      width: 100%;
      background: #000;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
    }
    
    .video-player.large {
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
    }
    
    .video-element {
      width: 100%;
      height: 100%;
      display: block;
      background: #000;
    }
    
    .play-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0, 0, 0, 0.3);
      cursor: pointer;
      transition: all 0.3s ease;
      z-index: 10;
    }
    
    .play-overlay:hover {
      background: rgba(0, 0, 0, 0.5);
    }
    
    .play-button {
      transition: transform 0.3s ease;
    }
    
    .play-overlay:hover .play-button {
      transform: scale(1.1);
    }
    
    .play-button svg {
      filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3));
    }
    
    .video-loading {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: rgba(0, 0, 0, 0.9);
      color: white;
      z-index: 20;
    }
    
    .spinner {
      width: 50px;
      height: 50px;
      border: 4px solid rgba(255, 255, 255, 0.3);
      border-top-color: #667eea;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-bottom: 1rem;
    }
    
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    
    .video-error {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: rgba(0, 0, 0, 0.95);
      color: white;
      padding: 2rem;
      text-align: center;
      z-index: 20;
    }
    
    .error-icon {
      font-size: 3rem;
      margin-bottom: 1rem;
    }
    
    .video-error p {
      margin: 0.5rem 0;
      font-size: 1rem;
    }
    
    .video-error small {
      color: #95a5a6;
      font-size: 0.8rem;
      margin-top: 0.5rem;
      word-break: break-all;
    }
    
    .video-fallback {
      color: white;
      padding: 2rem;
      text-align: center;
    }
  `]
})
export class VideoPlayerComponent implements AfterViewInit {
    @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;

    @Input() videoUrl: string = '';
    @Input() poster: string = '';
    @Input() size: 'small' | 'large' = 'small';
    @Input() showControls: boolean = true;
    @Input() autoplay: boolean = false;
    @Input() muted: boolean = false;
    @Input() loop: boolean = false;
    @Input() showPlayButton: boolean = false;
    @Input() fallbackMessage: string = 'Ihr Browser unterstützt das Video-Tag nicht.';
    @Input() errorMessage: string = 'Video konnte nicht geladen werden';

    isPlaying: boolean = false;
    isLoading: boolean = true;
    hasError: boolean = false;

    ngAfterViewInit() {
        // Check if video exists
        if (!this.videoUrl) {
            console.warn('No video URL provided');
            this.isLoading = false;
            this.hasError = true;
            this.errorMessage = 'Keine Video-URL angegeben';
        }
    }

    togglePlay(): void {
        const video = this.videoElement?.nativeElement;
        if (video) {
            if (video.paused) {
                video.play().catch(err => {
                    console.error('Error playing video:', err);
                    this.hasError = true;
                });
            } else {
                video.pause();
            }
        }
    }

    onPlay(): void {
        this.isPlaying = true;
    }

    onPause(): void {
        this.isPlaying = false;
    }

    onVideoLoaded(): void {
        this.isLoading = false;
        this.hasError = false;
        console.log('✅ Video loaded:', this.videoUrl);
    }

    onVideoError(): void {
        this.isLoading = false;
        this.hasError = true;
        console.error('❌ Video loading error:', this.videoUrl);
    }
}
