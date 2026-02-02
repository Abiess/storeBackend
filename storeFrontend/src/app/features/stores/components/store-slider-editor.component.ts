import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StoreSliderService, StoreSliderImage, StoreSliderSettings, StoreSlider } from '../../../core/services/store-slider.service';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';

@Component({
  selector: 'app-store-slider-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule],
  template: `
    <div class="slider-editor">
      <h2>Slider Verwaltung</h2>

      <!-- Settings Section -->
      <div class="settings-section card">
        <h3>Slider Einstellungen</h3>
        
        <div class="form-group">
          <label>Anzeigemodus:</label>
          <select [(ngModel)]="settings.overrideMode" (change)="saveSettings()">
            <option value="DEFAULT_ONLY">Nur Standard-Bilder</option>
            <option value="OWNER_ONLY">Nur eigene Bilder</option>
            <option value="MIXED">Gemischt</option>
          </select>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>
              <input type="checkbox" [(ngModel)]="settings.autoplay" (change)="saveSettings()">
              Autoplay
            </label>
          </div>

          <div class="form-group">
            <label>
              <input type="checkbox" [(ngModel)]="settings.loopEnabled" (change)="saveSettings()">
              Endlosschleife
            </label>
          </div>

          <div class="form-group">
            <label>
              <input type="checkbox" [(ngModel)]="settings.showDots" (change)="saveSettings()">
              Punkte anzeigen
            </label>
          </div>

          <div class="form-group">
            <label>
              <input type="checkbox" [(ngModel)]="settings.showArrows" (change)="saveSettings()">
              Pfeile anzeigen
            </label>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Slide-Dauer (ms):</label>
            <input type="number" [(ngModel)]="settings.durationMs" (change)="saveSettings()" min="1000" max="30000" step="500">
          </div>

          <div class="form-group">
            <label>Übergang (ms):</label>
            <input type="number" [(ngModel)]="settings.transitionMs" (change)="saveSettings()" min="100" max="3000" step="100">
          </div>
        </div>

        <div class="save-indicator" *ngIf="isSaving">Speichern...</div>
        <div class="save-indicator success" *ngIf="saveSuccess">✓ Gespeichert</div>
      </div>

      <!-- Upload Section -->
      <div class="upload-section card">
        <h3>Neues Bild hochladen</h3>
        <div class="upload-form">
          <input type="file" #fileInput accept="image/*" (change)="onFileSelected($event)">
          <input type="text" [(ngModel)]="newImageAltText" placeholder="Alternativer Text (optional)">
          <button (click)="uploadImage()" [disabled]="!selectedFile || isUploading">
            {{ isUploading ? 'Wird hochgeladen...' : 'Hochladen' }}
          </button>
        </div>
      </div>

      <!-- Images Section -->
      <div class="images-section card">
        <h3>Slider-Bilder ({{ images.length }})</h3>
        
        <div class="images-info">
          <p>Ziehen Sie Bilder, um die Reihenfolge zu ändern</p>
        </div>

        <div 
          cdkDropList 
          class="images-list" 
          (cdkDropListDropped)="onDrop($event)">
          <div 
            *ngFor="let image of images; let i = index" 
            class="image-item"
            [class.inactive]="!image.isActive"
            cdkDrag>
            
            <div class="drag-handle" cdkDragHandle>☰</div>
            
            <img [src]="image.imageUrl" [alt]="image.altText || 'Slider Image'">
            
            <div class="image-info">
              <div class="image-type">
                <span class="badge" [class.default]="image.imageType === 'DEFAULT'" [class.owner]="image.imageType === 'OWNER_UPLOAD'">
                  {{ image.imageType === 'DEFAULT' ? 'Standard' : 'Eigenes Bild' }}
                </span>
              </div>
              <div class="image-order">Reihenfolge: {{ image.displayOrder + 1 }}</div>
              <input 
                type="text" 
                [(ngModel)]="image.altText" 
                (change)="updateImage(image)"
                placeholder="Alt-Text"
                class="alt-text-input">
            </div>

            <div class="image-actions">
              <button 
                class="btn-toggle" 
                (click)="toggleActive(image)"
                [title]="image.isActive ? 'Deaktivieren' : 'Aktivieren'">
                {{ image.isActive ? '👁️' : '🚫' }}
              </button>
              <button 
                class="btn-delete" 
                (click)="deleteImage(image)"
                *ngIf="image.imageType === 'OWNER_UPLOAD'"
                title="Löschen">
                🗑️
              </button>
            </div>
          </div>
        </div>

        <div class="no-images" *ngIf="images.length === 0">
          <p>Keine Bilder vorhanden. Laden Sie eigene Bilder hoch!</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .slider-editor {
      padding: 2rem;
      max-width: 1200px;
      margin: 0 auto;
    }

    .card {
      background: white;
      border-radius: 8px;
      padding: 1.5rem;
      margin-bottom: 2rem;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    h2, h3 {
      margin-top: 0;
      color: #333;
    }

    .form-group {
      margin-bottom: 1rem;
    }

    .form-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
    }

    label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 500;
      color: #555;
    }

    input[type="text"], input[type="number"], select {
      width: 100%;
      padding: 0.5rem;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 1rem;
    }

    input[type="checkbox"] {
      margin-right: 0.5rem;
    }

    .save-indicator {
      margin-top: 1rem;
      padding: 0.5rem;
      background: #f0f0f0;
      border-radius: 4px;
      text-align: center;
      color: #666;
    }

    .save-indicator.success {
      background: #d4edda;
      color: #155724;
    }

    .upload-form {
      display: flex;
      gap: 1rem;
      align-items: center;
      flex-wrap: wrap;
    }

    .upload-form input[type="file"] {
      flex: 1;
      min-width: 200px;
    }

    .upload-form input[type="text"] {
      flex: 1;
      min-width: 200px;
    }

    button {
      padding: 0.5rem 1rem;
      background: #007bff;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 1rem;
      transition: background 0.3s;
    }

    button:hover:not(:disabled) {
      background: #0056b3;
    }

    button:disabled {
      background: #ccc;
      cursor: not-allowed;
    }

    .images-info {
      margin-bottom: 1rem;
      color: #666;
      font-size: 0.9rem;
    }

    .images-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .image-item {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem;
      background: #f9f9f9;
      border: 1px solid #ddd;
      border-radius: 4px;
      transition: all 0.3s;
    }

    .image-item.inactive {
      opacity: 0.5;
    }

    .image-item.cdk-drag-preview {
      box-shadow: 0 5px 10px rgba(0,0,0,0.3);
    }

    .drag-handle {
      cursor: move;
      font-size: 1.5rem;
      color: #666;
      padding: 0.5rem;
    }

    .image-item img {
      width: 120px;
      height: 80px;
      object-fit: cover;
      border-radius: 4px;
    }

    .image-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .badge {
      display: inline-block;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.85rem;
      font-weight: 500;
    }

    .badge.default {
      background: #e3f2fd;
      color: #1976d2;
    }

    .badge.owner {
      background: #f3e5f5;
      color: #7b1fa2;
    }

    .image-order {
      font-size: 0.9rem;
      color: #666;
    }

    .alt-text-input {
      font-size: 0.9rem;
    }

    .image-actions {
      display: flex;
      gap: 0.5rem;
    }

    .btn-toggle, .btn-delete {
      padding: 0.5rem;
      background: transparent;
      border: 1px solid #ddd;
      border-radius: 4px;
      cursor: pointer;
      font-size: 1.2rem;
    }

    .btn-delete:hover {
      background: #dc3545;
      border-color: #dc3545;
    }

    .no-images {
      text-align: center;
      padding: 2rem;
      color: #666;
    }

    @media (max-width: 768px) {
      .image-item {
        flex-direction: column;
        align-items: flex-start;
      }

      .image-item img {
        width: 100%;
        height: auto;
      }
    }
  `]
})
export class StoreSliderEditorComponent implements OnInit {
  @Input() storeId!: number;

  settings: StoreSliderSettings = {
    storeId: 0,
    overrideMode: 'DEFAULT_ONLY',
    autoplay: true,
    durationMs: 5000,
    transitionMs: 500,
    loopEnabled: true,
    showDots: true,
    showArrows: true
  };

  images: StoreSliderImage[] = [];
  selectedFile: File | null = null;
  newImageAltText = '';
  isSaving = false;
  saveSuccess = false;
  isUploading = false;

  constructor(private sliderService: StoreSliderService) {}

  ngOnInit(): void {
    if (!this.storeId) {
      console.error('StoreSliderEditor: storeId is required');
      return;
    }
    this.loadSlider();
  }

  loadSlider(): void {
    this.sliderService.getSlider(this.storeId).subscribe({
      next: (data: StoreSlider) => {
        this.settings = data.settings;
        this.images = data.images.sort((a, b) => a.displayOrder - b.displayOrder);
      },
      error: (err) => {
        console.error('Failed to load slider:', err);
        alert('Fehler beim Laden des Sliders');
      }
    });
  }

  saveSettings(): void {
    this.isSaving = true;
    this.saveSuccess = false;

    this.sliderService.updateSettings(this.storeId, this.settings).subscribe({
      next: () => {
        this.isSaving = false;
        this.saveSuccess = true;
        setTimeout(() => this.saveSuccess = false, 2000);
      },
      error: (err) => {
        this.isSaving = false;
        console.error('Failed to save settings:', err);
        alert('Fehler beim Speichern der Einstellungen');
      }
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
    }
  }

  uploadImage(): void {
    if (!this.selectedFile) return;

    this.isUploading = true;

    this.sliderService.uploadImage(this.storeId, this.selectedFile, this.newImageAltText).subscribe({
      next: (newImage) => {
        this.isUploading = false;
        this.selectedFile = null;
        this.newImageAltText = '';
        this.loadSlider(); // Reload to get updated list
        alert('Bild erfolgreich hochgeladen!');
      },
      error: (err) => {
        this.isUploading = false;
        console.error('Failed to upload image:', err);
        alert('Fehler beim Hochladen des Bildes');
      }
    });
  }

  updateImage(image: StoreSliderImage): void {
    if (!image.id) return;

    this.sliderService.updateImage(this.storeId, image.id, {
      altText: image.altText,
      isActive: image.isActive
    }).subscribe({
      error: (err) => {
        console.error('Failed to update image:', err);
        alert('Fehler beim Aktualisieren des Bildes');
      }
    });
  }

  toggleActive(image: StoreSliderImage): void {
    if (!image.id) return;

    image.isActive = !image.isActive;
    this.updateImage(image);
  }

  deleteImage(image: StoreSliderImage): void {
    if (!image.id) return;
    if (!confirm('Möchten Sie dieses Bild wirklich löschen?')) return;

    this.sliderService.deleteImage(this.storeId, image.id).subscribe({
      next: () => {
        this.loadSlider();
      },
      error: (err) => {
        console.error('Failed to delete image:', err);
        alert('Fehler beim Löschen des Bildes');
      }
    });
  }

  onDrop(event: CdkDragDrop<StoreSliderImage[]>): void {
    moveItemInArray(this.images, event.previousIndex, event.currentIndex);

    // Update display order
    this.images.forEach((img, index) => {
      img.displayOrder = index;
    });

    // Send new order to backend
    const imageIds = this.images.map(img => img.id!).filter(id => id !== undefined);
    this.sliderService.reorderImages(this.storeId, imageIds).subscribe({
      error: (err) => {
        console.error('Failed to reorder images:', err);
        alert('Fehler beim Neuanordnen der Bilder');
        this.loadSlider(); // Reload on error
      }
    });
  }
}
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface StoreSliderSettings {
  id?: number;
  storeId: number;
  overrideMode: 'DEFAULT_ONLY' | 'OWNER_ONLY' | 'MIXED';
  autoplay: boolean;
  durationMs: number;
  transitionMs: number;
  loopEnabled: boolean;
  showDots: boolean;
  showArrows: boolean;
}

export interface StoreSliderImage {
  id?: number;
  storeId: number;
  mediaId?: number;
  imageUrl: string;
  imageType: 'DEFAULT' | 'OWNER_UPLOAD';
  displayOrder: number;
  isActive: boolean;
  altText?: string;
}

export interface StoreSlider {
  settings: StoreSliderSettings;
  images: StoreSliderImage[];
}

@Injectable({
  providedIn: 'root'
})
export class StoreSliderService {
  private apiUrl = `${environment.apiUrl}/api/stores`;

  constructor(private http: HttpClient) {}

  /**
   * Holt kompletten Slider (Settings + Images) für einen Store
   */
  getSlider(storeId: number): Observable<StoreSlider> {
    return this.http.get<StoreSlider>(`${this.apiUrl}/${storeId}/slider`);
  }

  /**
   * Holt nur aktive Slider-Images für Frontend-Darstellung
   */
  getActiveSliderImages(storeId: number): Observable<StoreSliderImage[]> {
    return this.http.get<StoreSliderImage[]>(`${this.apiUrl}/${storeId}/slider/active`);
  }

  /**
   * Aktualisiert Slider Settings
   */
  updateSettings(storeId: number, settings: Partial<StoreSliderSettings>): Observable<StoreSliderSettings> {
    return this.http.put<StoreSliderSettings>(`${this.apiUrl}/${storeId}/slider/settings`, settings);
  }

  /**
   * Lädt ein neues Owner-Bild hoch
   */
  uploadImage(storeId: number, file: File, altText?: string): Observable<StoreSliderImage> {
    const formData = new FormData();
    formData.append('file', file);
    if (altText) {
      formData.append('altText', altText);
    }
    return this.http.post<StoreSliderImage>(`${this.apiUrl}/${storeId}/slider/images`, formData);
  }

  /**
   * Aktualisiert ein Slider Image
   */
  updateImage(storeId: number, imageId: number, data: Partial<StoreSliderImage>): Observable<StoreSliderImage> {
    return this.http.put<StoreSliderImage>(`${this.apiUrl}/${storeId}/slider/images/${imageId}`, data);
  }

  /**
   * Aktualisiert die Reihenfolge mehrerer Images
   */
  reorderImages(storeId: number, imageIds: number[]): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${storeId}/slider/images/reorder`, { imageIds });
  }

  /**
   * Löscht ein Slider Image
   */
  deleteImage(storeId: number, imageId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${storeId}/slider/images/${imageId}`);
  }
}

