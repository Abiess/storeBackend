import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { StoreSliderService, StoreSliderImage, StoreSliderSettings, StoreSlider } from '../../../core/services/store-slider.service';
import { StoreContextService } from '../../../core/services/store-context.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-store-slider-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule],
  templateUrl: './store-slider-editor.component.html',
  styleUrls: ['./store-slider-editor.component.scss'],
})
export class StoreSliderEditorComponent implements OnInit, OnDestroy {
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

  private storeId: number | null = null;
  private storeIdSubscription?: Subscription;

  constructor(
    private sliderService: StoreSliderService,
    private storeContext: StoreContextService
  ) {}

  ngOnInit(): void {
    this.storeIdSubscription = this.storeContext.storeId$.subscribe(id => {
      if (id !== null) {
        this.storeId = id;
        this.loadSlider();
      }
    });
  }

  ngOnDestroy(): void {
    this.storeIdSubscription?.unsubscribe();
  }

  loadSlider(): void {
    if (this.storeId === null) return;

    this.sliderService.getSlider(this.storeId).subscribe({
      next: (data: StoreSlider) => {
        this.settings = data.settings;
        this.images = data.images.sort((a, b) => a.displayOrder - b.displayOrder);
      },
      error: (err: any) => {
        console.error('Failed to load slider:', err);
        alert('Fehler beim Laden des Sliders');
      }
    });
  }

  saveSettings(): void {
    if (this.storeId === null) return;

    this.isSaving = true;
    this.saveSuccess = false;
    this.sliderService.updateSettings(this.storeId, this.settings).subscribe({
      next: () => {
        this.isSaving = false;
        this.saveSuccess = true;
        setTimeout(() => this.saveSuccess = false, 2000);
      },
      error: (err: any) => {
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

  /** Drag & Drop auf die Upload-Zone */
  onDropFile(event: DragEvent): void {
    event.preventDefault();
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.selectedFile = files[0];
    }
  }

  clearSelection(): void {
    this.selectedFile = null;
    this.newImageAltText = '';
  }

  uploadSliderImage(): void {
    if (!this.selectedFile || this.storeId === null) return;

    this.isUploading = true;
    this.sliderService.uploadImage(this.storeId, this.selectedFile, this.newImageAltText).subscribe({
      next: () => {
        this.isUploading = false;
        this.clearSelection();
        this.loadSlider();
      },
      error: (err: any) => {
        this.isUploading = false;
        console.error('Failed to upload image:', err);
        alert('Fehler beim Hochladen des Bildes');
      }
    });
  }

  updateImage(image: StoreSliderImage): void {
    if (!image.id || this.storeId === null) return;

    this.sliderService.updateImage(this.storeId, image.id, {
      altText: image.altText,
      isActive: image.isActive
    }).subscribe({
      error: (err: any) => {
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
    if (!image.id || this.storeId === null) return;
    if (!confirm('Möchten Sie dieses Bild wirklich löschen?')) return;

    this.sliderService.deleteImage(this.storeId, image.id).subscribe({
      next: () => this.loadSlider(),
      error: (err: any) => {
        console.error('Failed to delete image:', err);
        alert('Fehler beim Löschen des Bildes');
      }
    });
  }

  onDrop(event: CdkDragDrop<StoreSliderImage[]>): void {
    if (this.storeId === null) return;

    moveItemInArray(this.images, event.previousIndex, event.currentIndex);
    this.images.forEach((img, index) => img.displayOrder = index);
    const imageIds = this.images.map(img => img.id!).filter(id => id !== undefined);
    
    this.sliderService.reorderImages(this.storeId, imageIds).subscribe({
      error: (err: any) => {
        console.error('Failed to reorder images:', err);
        alert('Fehler beim Neuanordnen der Bilder');
        this.loadSlider();
      }
    });
  }
}

