import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MediaService } from '@app/core/services/media.service';
import { StoreContextService } from '@app/core/services/store-context.service';
import { Subscription } from 'rxjs';

export interface UploadedImage {
  mediaId: number;
  url: string;
  filename: string;
  file?: File;
  preview?: string;
  uploadProgress?: number;
  isPrimary: boolean;
  // NEU: AI-spezifische Properties
  aiSuggestion?: any;
  aiGenerating?: boolean;
  aiError?: string;
  isSelected?: boolean;
}

@Component({
  selector: 'app-image-upload',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './image-upload.component.html',
  styleUrls: ['./image-upload.component.scss'],
})
export class ImageUploadComponent implements OnInit, OnDestroy {
  /** Medien-Typ, der an den Server übergeben wird */
  @Input() mediaType: string = 'PRODUCT_IMAGE';

  /** Erlaube Mehrfachauswahl */
  @Input() multiple: boolean = true;

  /** Zeige Primär-Bild Auswahl */
  @Input() showPrimary: boolean = true;

  /** Max. Dateigröße in MB */
  @Input() maxSizeMb: number = 10; // Erhöht für AI-Uploads

  /** Beschriftung des Upload-Buttons */
  @Input() uploadLabel: string = 'Bilder hochladen';

  /** Text, wenn keine Bilder vorhanden */
  @Input() emptyLabel: string = 'Noch keine Bilder hochgeladen.';

  /** NEU: AI-Modus - deaktiviert automatischen Upload, ermöglicht AI-Generation */
  @Input() aiMode: boolean = false;

  /** NEU: Zeige AI-Generation Button */
  @Input() showAiGenerate: boolean = false;

  /** NEU: Zeige Multiselect-Checkboxen */
  @Input() showSelection: boolean = false;

  /** Aktuell angezeigte Bilder (Two-Way Binding) */
  @Input() images: UploadedImage[] = [];
  @Output() imagesChange = new EventEmitter<UploadedImage[]>();

  /** Fehler-Event */
  @Output() uploadError = new EventEmitter<string>();

  /** NEU: Event für AI-Generation Anfrage */
  @Output() aiGenerateRequest = new EventEmitter<{ file: File; index: number }>();

  /** NEU: Event für Auswahl-Änderung */
  @Output() selectionChanged = new EventEmitter<UploadedImage[]>();

  uploading = false;
  private storeId: number | null = null;
  private storeIdSubscription?: Subscription;

  constructor(
    private mediaService: MediaService,
    private storeContext: StoreContextService
  ) {}

  ngOnInit(): void {
    // storeId aus Context abonnieren
    this.storeIdSubscription = this.storeContext.storeId$.subscribe(id => {
      this.storeId = id;
    });
  }

  ngOnDestroy(): void {
    this.storeIdSubscription?.unsubscribe();
  }

  // ── Drag & Drop ──────────────────────────────────────────────
  onDrop(event: DragEvent): void {
    event.preventDefault();
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.processFiles(Array.from(files));
    }
  }

  // ── Datei-Auswahl über Input ─────────────────────────────────
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    this.processFiles(Array.from(input.files));
    input.value = ''; // Reset, damit dieselbe Datei erneut gewählt werden kann
  }

  // ── Gemeinsame Verarbeitungslogik ─────────────────────────────
  private processFiles(files: File[]): void {
    files.forEach((file, index) => {
      if (!file.type.startsWith('image/')) {
        this.uploadError.emit('Nur Bilddateien sind erlaubt.');
        return;
      }
      if (file.size > this.maxSizeMb * 1024 * 1024) {
        this.uploadError.emit(`Maximale Dateigröße: ${this.maxSizeMb} MB`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (e: any) => {
        const tempImage: UploadedImage = {
          mediaId: 0,
          url: '',
          filename: file.name,
          file,
          preview: e.target.result,
          uploadProgress: 0,
          isPrimary: this.images.length === 0 && index === 0,
          // NEU: AI-spezifische Initialisierung
          aiSuggestion: null,
          aiGenerating: false,
          aiError: '',
          isSelected: false
        };

        const newImages = [...this.images, tempImage];
        this.images = newImages;
        this.imagesChange.emit(newImages);

        // NEU: Im AI-Modus KEIN automatischer Upload
        if (!this.aiMode) {
          this.doUpload(file, newImages.length - 1);
        }
      };
      reader.readAsDataURL(file);
    });
  }

  // ── Upload ───────────────────────────────────────────────────
  private doUpload(file: File, index: number): void {
    if (this.storeId === null) {
      this.uploadError.emit('Fehler: Store-Kontext nicht verfügbar');
      console.error('ImageUploadComponent: storeId not available');
      return;
    }

    this.uploading = true;

    this.mediaService
      .uploadMediaWithProgress(this.storeId, file, this.mediaType)
      .subscribe({
        next: (event: { progress: number; response?: any }) => {
          if (event.progress !== undefined) {
            this.images[index] = {
              ...this.images[index],
              uploadProgress: event.progress,
            };
            this.imagesChange.emit([...this.images]);
          }
          if (event.response) {
            this.images[index] = {
              ...this.images[index],
              mediaId: event.response.mediaId,
              url: event.response.url,
              uploadProgress: 100,
            };
            this.imagesChange.emit([...this.images]);
          }
        },
        error: (err: any) => {
          console.error('Upload-Fehler:', err);
          this.uploadError.emit('Fehler beim Hochladen: ' + file.name);
          const newImages = this.images.filter((_: UploadedImage, i: number) => i !== index);
          this.images = newImages;
          this.imagesChange.emit(newImages);
          this.uploading = false;
        },
        complete: () => {
          this.uploading = false;
        },
      });
  }

  // ── Primär-Bild ──────────────────────────────────────────────
  setPrimary(index: number): void {
    const newImages = this.images.map((img, i) => ({
      ...img,
      isPrimary: i === index,
    }));
    this.images = newImages;
    this.imagesChange.emit(newImages);
  }

  // ── Entfernen ────────────────────────────────────────────────
  remove(index: number): void {
    if (!confirm('Bild wirklich entfernen?')) return;

    const removed = this.images[index];
    let newImages = this.images.filter((_, i) => i !== index);

    // Wenn Hauptbild entfernt → erstes Bild wird Hauptbild
    if (removed.isPrimary && newImages.length > 0) {
      newImages[0] = { ...newImages[0], isPrimary: true };
    }

    this.images = newImages;
    this.imagesChange.emit(newImages);
  }

  // ── NEU: AI-Mode Methoden ────────────────────────────────────

  /** Fordert AI-Generation für ein Bild an */
  requestAiGeneration(index: number): void {
    const image = this.images[index];
    if (!image.file) return;

    this.aiGenerateRequest.emit({ file: image.file, index });
  }

  /** Toggled die Auswahl eines Bildes (für Multiselect) */
  toggleSelection(index: number): void {
    const newImages = this.images.map((img, i) => ({
      ...img,
      isSelected: i === index ? !img.isSelected : img.isSelected
    }));
    this.images = newImages;
    this.imagesChange.emit(newImages);
    this.selectionChanged.emit(this.getSelectedImages());
  }

  /** Wählt alle Bilder aus/ab */
  toggleSelectAll(): void {
    const allSelected = this.areAllSelected();
    const newImages = this.images.map(img => ({
      ...img,
      isSelected: !allSelected
    }));
    this.images = newImages;
    this.imagesChange.emit(newImages);
    this.selectionChanged.emit(this.getSelectedImages());
  }

  /** Gibt zurück, ob alle Bilder ausgewählt sind */
  areAllSelected(): boolean {
    return this.images.length > 0 && this.images.every(img => img.isSelected);
  }

  /** Gibt die ausgewählten Bilder zurück */
  getSelectedImages(): UploadedImage[] {
    return this.images.filter(img => img.isSelected);
  }

  /** Gibt die Anzahl ausgewählter Bilder zurück */
  getSelectedCount(): number {
    return this.images.filter(img => img.isSelected).length;
  }

  /** Prüft ob irgendein Bild gerade generiert wird */
  isAnyGenerating(): boolean {
    return this.images.some(img => img.aiGenerating);
  }
}
