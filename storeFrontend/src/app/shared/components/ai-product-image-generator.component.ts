import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductService } from '@app/core/services/product.service';
import { AiProductSuggestionV2 } from '@app/core/models';
import { TranslatePipe } from '@app/core/pipes/translate.pipe';

export interface AiImageData {
  file: File;
  preview: string;
  suggestion: AiProductSuggestionV2 | null;
  generating: boolean;
  error: string;
  isSelected: boolean;
}

/**
 * Wiederverwendbare Komponente für KI-Produktbilder-Generierung
 * Features:
 * - Multi-Image Upload
 * - KI-Analyse für jedes Bild
 * - Multiselect mit Checkboxen
 * - "Alle auswählen" Funktion
 * - Vollständige Mehrsprachigkeit
 */
@Component({
  selector: 'app-ai-product-image-generator',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  template: `
    <div class="ai-generator-container">
      <!-- Einführung -->
      <div class="ai-intro">
        <p>✨ <strong>{{ 'aiGenerator.intro' | translate }}</strong></p>
        <ul>
          <li>{{ 'aiGenerator.step1' | translate }}</li>
          <li>{{ 'aiGenerator.step2' | translate }}</li>
          <li>{{ 'aiGenerator.step3' | translate }}</li>
          <li>{{ 'aiGenerator.step4' | translate }}</li>
        </ul>
      </div>

      <!-- Upload Section -->
      <div class="ai-upload-section">
        <h3>{{ 'aiGenerator.uploadTitle' | translate }}</h3>
        <div class="ai-upload-area">
          <input 
            type="file" 
            id="aiImagesInput" 
            accept="image/*"
            multiple
            (change)="onImagesSelect($event)"
            #fileInput
            style="display: none;"
          />
          
          <button type="button" class="btn-upload-images" (click)="fileInput.click()">
            <span class="upload-icon">📷</span>
            <span>{{ 'aiGenerator.selectImages' | translate }}</span>
          </button>

          <!-- Images Grid -->
          <div class="ai-images-grid" *ngIf="aiImages.length > 0">
            <div *ngFor="let imgData of aiImages; let i = index" 
                 class="ai-image-card" 
                 [class.selected]="selectedPreviewIndex === i"
                 [class.multiselected]="imgData.isSelected">
              <div class="ai-image-wrapper">
                <img [src]="imgData.preview" [alt]="imgData.file.name" />
                <button type="button" 
                        class="btn-remove-small" 
                        (click)="removeImageAt(i)" 
                        [title]="'common.remove' | translate">
                  ✖
                </button>
                
                <!-- Multiselect Checkbox -->
                <div class="multiselect-checkbox" *ngIf="imgData.suggestion">
                  <input 
                    type="checkbox" 
                    [id]="'select-img-' + i"
                    [(ngModel)]="imgData.isSelected"
                    (change)="onSelectionChange()"
                  />
                  <label [for]="'select-img-' + i">
                    <span class="checkmark">{{ imgData.isSelected ? '✓' : '' }}</span>
                  </label>
                </div>
                
                <!-- Status Indicators -->
                <div class="ai-status" *ngIf="imgData.generating">
                  <span class="spinner-small"></span>
                  <span>{{ 'aiGenerator.analyzing' | translate }}</span>
                </div>
                <div class="ai-status success" *ngIf="imgData.suggestion && !imgData.generating">
                  <span>✅ {{ 'aiGenerator.ready' | translate }}</span>
                </div>
                <div class="ai-status error" *ngIf="imgData.error && !imgData.generating">
                  <span>❌ {{ 'aiGenerator.error' | translate }}</span>
                </div>
              </div>
              
              <div class="ai-image-info">
                <span class="filename">{{ imgData.file.name }}</span>
                <span class="filesize">{{ (imgData.file.size / 1024 / 1024).toFixed(2) }} MB</span>
              </div>

              <!-- Suggestion Preview -->
              <div class="ai-suggestion-preview" *ngIf="imgData.suggestion">
                <button type="button" 
                        class="btn-select-preview" 
                        (click)="selectPreview(i)" 
                        [class.active]="selectedPreviewIndex === i">
                  <span *ngIf="selectedPreviewIndex === i">👁️ {{ 'aiGenerator.preview' | translate }}</span>
                  <span *ngIf="selectedPreviewIndex !== i">{{ 'aiGenerator.preview' | translate }}</span>
                </button>
                <div class="suggestion-preview-text">
                  <strong>{{ imgData.suggestion.title }}</strong>
                  <p class="truncate">{{ imgData.suggestion.description.substring(0, 80) }}...</p>
                </div>
              </div>

              <!-- Error Message -->
              <div class="ai-error-small" *ngIf="imgData.error">
                {{ imgData.error }}
              </div>
            </div>
          </div>
        </div>

        <!-- Selection Actions -->
        <div class="selection-actions" *ngIf="aiImages.length > 0 && hasGeneratedSuggestions()">
          <button 
            type="button" 
            class="btn-select-all"
            (click)="toggleSelectAll()">
            <span *ngIf="!areAllSelected()">☑️ {{ 'aiGenerator.selectAll' | translate }}</span>
            <span *ngIf="areAllSelected()">☐ {{ 'aiGenerator.deselectAll' | translate }}</span>
          </button>
          <span class="selection-count">
            {{ getSelectedCount() }} {{ 'aiGenerator.of' | translate }} {{ aiImages.length }} {{ 'aiGenerator.selected' | translate }}
          </span>
        </div>

        <!-- Generate Button -->
        <button 
          type="button" 
          class="btn-ai-generate"
          [disabled]="aiImages.length === 0 || isGenerating()"
          (click)="generateAll()">
          <span class="btn-content">
            <span class="btn-icon">🚀</span>
            <span class="btn-text">{{ 'aiGenerator.analyzeAll' | translate }}</span>
          </span>
        </button>
      </div>

      <!-- Error Message -->
      <div class="ai-error" *ngIf="error">
        ⚠️ {{ error }}
      </div>

      <!-- Selected Suggestion Details -->
      <div class="ai-result-section" *ngIf="aiImages.length > 0 && getPreviewSuggestion()">
        <h3>{{ 'aiGenerator.selectedSuggestion' | translate }}</h3>
        
        <div class="ai-result-card">
          <div class="ai-result-grid">
            <div class="ai-result-field">
              <label>📝 {{ 'aiGenerator.productTitle' | translate }}</label>
              <div class="ai-result-value">{{ getPreviewSuggestion()?.title }}</div>
            </div>

            <div class="ai-result-field">
              <label>🏷️ {{ 'aiGenerator.category' | translate }}</label>
              <div class="ai-result-value">{{ getPreviewSuggestion()?.category || ('aiGenerator.none' | translate) }}</div>
            </div>

            <div class="ai-result-field">
              <label>💰 {{ 'aiGenerator.suggestedPrice' | translate }}</label>
              <div class="ai-result-value ai-price">
                {{ getPreviewSuggestion()?.suggestedPrice ? (getPreviewSuggestion()!.suggestedPrice | number:'1.2-2') + ' €' : ('aiGenerator.none' | translate) }}
              </div>
            </div>

            <div class="ai-result-field full-width">
              <label>📄 {{ 'aiGenerator.description' | translate }}</label>
              <div class="ai-result-value ai-description">{{ getPreviewSuggestion()?.description }}</div>
            </div>

            <div class="ai-result-field">
              <label>🏷️ {{ 'aiGenerator.tags' | translate }}</label>
              <div class="ai-result-value ai-tags">
                <span class="tag" *ngFor="let tag of getPreviewSuggestion()?.tags">{{ tag }}</span>
                <span *ngIf="!getPreviewSuggestion()?.tags || getPreviewSuggestion()!.tags.length === 0" class="no-data">
                  {{ 'aiGenerator.noTags' | translate }}
                </span>
              </div>
            </div>

            <div class="ai-result-field">
              <label>🔗 {{ 'aiGenerator.slug' | translate }}</label>
              <div class="ai-result-value ai-slug">{{ getPreviewSuggestion()?.slug || ('aiGenerator.noSlug' | translate) }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Info Note -->
      <div class="ai-info-note" *ngIf="aiImages.length > 0">
        💡 <strong>{{ 'aiGenerator.hint' | translate }}</strong> {{ 'aiGenerator.hintText' | translate }}
      </div>
    </div>
  `,
  styles: [`
    .ai-generator-container {
      width: 100%;
    }

    .ai-intro {
      background: white;
      border-radius: 8px;
      padding: 1.5rem;
      margin-bottom: 2rem;
      border-left: 4px solid #667eea;
    }

    .ai-intro p {
      margin: 0 0 1rem;
      color: #555;
      font-size: 1rem;
    }

    .ai-intro ul {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .ai-intro li {
      padding: 0.5rem 0;
      color: #666;
    }

    .ai-upload-section {
      background: white;
      border-radius: 12px;
      padding: 2rem;
      margin-bottom: 1.5rem;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    }

    .ai-upload-section h3 {
      margin: 0 0 1.5rem;
      font-size: 1.1rem;
      color: #333;
      font-weight: 600;
    }

    .ai-upload-area {
      background: #f8f9ff;
      padding: 2rem;
      border-radius: 12px;
      margin-bottom: 2rem;
    }

    .btn-upload-images {
      width: 100%;
      padding: 1.5rem;
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
      border: none;
      border-radius: 12px;
      cursor: pointer;
      font-size: 1.1rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      transition: all 0.3s;
      margin-bottom: 2rem;
    }

    .btn-upload-images:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
    }

    .upload-icon {
      font-size: 2rem;
    }

    .ai-images-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }

    .ai-image-card {
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      transition: all 0.3s;
      border: 3px solid transparent;
    }

    .ai-image-card.selected {
      border-color: #28a745;
      box-shadow: 0 4px 16px rgba(40, 167, 69, 0.3);
    }

    .ai-image-card.multiselected {
      border-color: #667eea;
      box-shadow: 0 4px 16px rgba(102, 126, 234, 0.4);
      transform: scale(1.02);
    }

    .ai-image-wrapper {
      position: relative;
      width: 100%;
      padding-top: 100%;
      overflow: hidden;
    }

    .ai-image-wrapper img {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .btn-remove-small {
      position: absolute;
      top: 0.5rem;
      right: 0.5rem;
      background: rgba(220, 53, 69, 0.9);
      color: white;
      border: none;
      border-radius: 50%;
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 1rem;
      line-height: 1;
      z-index: 10;
      transition: all 0.3s;
    }

    .btn-remove-small:hover {
      background: #c82333;
      transform: scale(1.1);
    }

    .multiselect-checkbox {
      position: absolute;
      top: 0.5rem;
      left: 0.5rem;
      z-index: 15;
    }

    .multiselect-checkbox input[type="checkbox"] {
      display: none;
    }

    .multiselect-checkbox label {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      background: white;
      border: 2px solid #667eea;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.3s;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    }

    .multiselect-checkbox label:hover {
      transform: scale(1.1);
      border-color: #5568d3;
    }

    .multiselect-checkbox input[type="checkbox"]:checked + label {
      background: linear-gradient(135deg, #667eea, #764ba2);
      border-color: #667eea;
    }

    .checkmark {
      color: white;
      font-weight: bold;
      font-size: 1.1rem;
      line-height: 1;
    }

    .ai-status {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 0.4rem;
      font-size: 0.8rem;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.4rem;
    }

    .ai-status.success {
      background: rgba(40, 167, 69, 0.9);
    }

    .ai-status.error {
      background: rgba(220, 53, 69, 0.9);
    }

    .spinner-small {
      width: 14px;
      height: 14px;
      border: 2px solid #ffffff40;
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .ai-image-info {
      padding: 0.6rem;
      border-bottom: 1px solid #f0f0f0;
    }

    .filename {
      display: block;
      font-size: 0.8rem;
      font-weight: 500;
      color: #333;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-bottom: 0.2rem;
    }

    .filesize {
      display: block;
      font-size: 0.7rem;
      color: #999;
    }

    .ai-suggestion-preview {
      padding: 0.8rem;
    }

    .btn-select-preview {
      width: 100%;
      padding: 0.6rem;
      background: white;
      color: #667eea;
      border: 2px solid #667eea;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 600;
      font-size: 0.85rem;
      transition: all 0.3s;
      margin-bottom: 0.6rem;
    }

    .btn-select-preview:hover {
      background: #f8f9ff;
    }

    .btn-select-preview.active {
      background: #28a745;
      color: white;
      border-color: #28a745;
    }

    .suggestion-preview-text {
      font-size: 0.8rem;
    }

    .suggestion-preview-text strong {
      display: block;
      color: #333;
      margin-bottom: 0.4rem;
    }

    .suggestion-preview-text p {
      color: #666;
      line-height: 1.3;
      margin: 0;
    }

    .truncate {
      overflow: hidden;
      text-overflow: ellipsis;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }

    .ai-error-small {
      padding: 0.6rem;
      background: #fff3cd;
      color: #856404;
      font-size: 0.8rem;
    }

    .selection-actions {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 1rem 1.5rem;
      background: white;
      border-radius: 8px;
      margin-bottom: 1rem;
      border: 2px solid #e0e0e0;
    }

    .btn-select-all {
      padding: 0.75rem 1.5rem;
      background: white;
      color: #667eea;
      border: 2px solid #667eea;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
      transition: all 0.3s;
      font-size: 0.9rem;
    }

    .btn-select-all:hover {
      background: #f8f9ff;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
    }

    .selection-count {
      color: #667eea;
      font-weight: 600;
      font-size: 0.9rem;
    }

    .btn-ai-generate {
      width: 100%;
      padding: 1rem 2rem;
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
    }

    .btn-ai-generate:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
    }

    .btn-ai-generate:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .btn-content {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .btn-icon {
      font-size: 1.2rem;
    }

    .ai-error {
      background: #fee;
      border-left: 4px solid #dc3545;
      color: #721c24;
      padding: 1rem 1.5rem;
      border-radius: 8px;
      margin-bottom: 1.5rem;
      font-weight: 500;
    }

    .ai-result-section {
      background: white;
      border-radius: 12px;
      padding: 2rem;
      margin-bottom: 1.5rem;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    }

    .ai-result-section h3 {
      margin: 0 0 1.5rem;
      font-size: 1.1rem;
      color: #333;
      font-weight: 600;
    }

    .ai-result-card {
      background: #f8f9ff;
      border-radius: 12px;
      padding: 1.5rem;
    }

    .ai-result-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
    }

    .ai-result-field {
      margin-bottom: 1rem;
    }

    .ai-result-field:last-child {
      margin-bottom: 0;
    }

    .ai-result-field.full-width {
      grid-column: 1 / -1;
    }

    .ai-result-field label {
      display: block;
      font-weight: 600;
      color: #333;
      margin-bottom: 0.5rem;
      font-size: 0.9rem;
    }

    .ai-result-value {
      background: white;
      padding: 1rem;
      border-radius: 8px;
      border: 2px solid #e0e0e0;
      color: #333;
      line-height: 1.6;
    }

    .ai-result-value.ai-description {
      white-space: pre-wrap;
      min-height: 80px;
      font-size: 0.9rem;
    }

    .ai-result-value.ai-price {
      font-size: 1.2rem;
      font-weight: 700;
      color: #10b981;
    }

    .ai-result-value.ai-slug {
      font-family: 'Courier New', monospace;
      color: #6366f1;
      font-size: 0.85rem;
    }

    .ai-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
    }

    .tag {
      display: inline-block;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 0.3rem 0.8rem;
      border-radius: 20px;
      font-size: 0.8rem;
      font-weight: 500;
      box-shadow: 0 2px 6px rgba(102, 126, 234, 0.25);
    }

    .no-data {
      color: #94a3b8;
      font-style: italic;
      font-size: 0.9rem;
    }

    .ai-info-note {
      background: #e3f2fd;
      border-left: 4px solid #2196f3;
      padding: 1rem 1.5rem;
      border-radius: 8px;
      color: #1565c0;
      line-height: 1.6;
      font-size: 0.95rem;
    }

    .ai-info-note strong {
      color: #0d47a1;
    }

    @media (max-width: 768px) {
      .ai-images-grid {
        grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
      }

      .ai-result-grid {
        grid-template-columns: 1fr;
      }

      .selection-actions {
        flex-direction: column;
        align-items: stretch;
      }

      .btn-select-all {
        width: 100%;
      }
    }
  `]
})
export class AiProductImageGeneratorComponent implements OnInit {
  @Input() storeId!: number;
  @Input() autoSelectFirst = true; // Auto-select erste generierte Suggestion
  @Output() imagesGenerated = new EventEmitter<AiImageData[]>();
  @Output() selectionChanged = new EventEmitter<AiImageData[]>();

  aiImages: AiImageData[] = [];
  selectedPreviewIndex = 0;
  error = '';

  constructor(private productService: ProductService) {}

  ngOnInit(): void {
    console.log('🤖 AI Product Image Generator initialized for storeId:', this.storeId);
  }

  onImagesSelect(event: any): void {
    const files: FileList = event.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      if (!file.type.startsWith('image/')) {
        console.warn(`❌ Skipping non-image file: ${file.name}`);
        continue;
      }

      if (file.size > 10 * 1024 * 1024) {
        console.warn(`❌ Skipping large file: ${file.name} (${file.size} bytes)`);
        continue;
      }

      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.aiImages.push({
          file: file,
          preview: e.target.result,
          suggestion: null,
          generating: false,
          error: '',
          isSelected: false
        });
        console.log(`✅ Added AI image: ${file.name}`);
      };
      reader.readAsDataURL(file);
    }
  }

  removeImageAt(index: number): void {
    this.aiImages.splice(index, 1);
    if (this.selectedPreviewIndex >= this.aiImages.length) {
      this.selectedPreviewIndex = Math.max(0, this.aiImages.length - 1);
    }
    this.emitSelectionChanged();
  }

  generateAll(): void {
    if (this.aiImages.length === 0 || !this.storeId) {
      this.error = 'Bitte wählen Sie zuerst mindestens ein Bild aus.';
      return;
    }

    this.error = '';
    console.log(`🤖 Starting AI generation for ${this.aiImages.length} images...`);

    this.aiImages.forEach((imgData, index) => {
      this.generateForImage(index);
    });
  }

  private generateForImage(index: number): void {
    const imgData = this.aiImages[index];
    imgData.generating = true;
    imgData.error = '';
    imgData.suggestion = null;

    console.log(`🤖 Generating AI suggestion for image ${index + 1}/${this.aiImages.length}: ${imgData.file.name}`);

    this.productService.generateAiProductSuggestionV2(this.storeId, imgData.file).subscribe({
      next: (suggestion: AiProductSuggestionV2) => {
        console.log(`✅ AI suggestion received for image ${index + 1}:`, suggestion);
        imgData.suggestion = suggestion;
        imgData.generating = false;

        // Auto-select first generated suggestion
        if (this.autoSelectFirst && index === 0) {
          this.selectedPreviewIndex = 0;
          imgData.isSelected = true;
        }

        this.imagesGenerated.emit(this.aiImages);
        this.emitSelectionChanged();
      },
      error: (error: any) => {
        console.error(`❌ AI generation failed for image ${index + 1}:`, error);
        imgData.generating = false;

        let errorMsg = 'Fehler beim Generieren des KI-Vorschlags.';
        if (error.error?.error) {
          errorMsg = error.error.error;
        } else if (error.message) {
          errorMsg = error.message;
        }

        imgData.error = errorMsg;
      }
    });
  }

  selectPreview(index: number): void {
    this.selectedPreviewIndex = index;
  }

  getPreviewSuggestion(): AiProductSuggestionV2 | null {
    if (this.aiImages.length === 0 || !this.aiImages[this.selectedPreviewIndex]) {
      return null;
    }
    return this.aiImages[this.selectedPreviewIndex].suggestion;
  }

  isGenerating(): boolean {
    return this.aiImages.some(img => img.generating);
  }

  hasGeneratedSuggestions(): boolean {
    return this.aiImages.some(img => img.suggestion !== null);
  }

  getSelectedCount(): number {
    return this.aiImages.filter(img => img.isSelected).length;
  }

  areAllSelected(): boolean {
    const imagesWithSuggestions = this.aiImages.filter(img => img.suggestion !== null);
    if (imagesWithSuggestions.length === 0) return false;
    return imagesWithSuggestions.every(img => img.isSelected);
  }

  toggleSelectAll(): void {
    const allSelected = this.areAllSelected();
    this.aiImages.forEach(img => {
      if (img.suggestion) {
        img.isSelected = !allSelected;
      }
    });
    this.emitSelectionChanged();
  }

  onSelectionChange(): void {
    this.emitSelectionChanged();
  }

  private emitSelectionChanged(): void {
    const selectedImages = this.aiImages.filter(img => img.isSelected);
    this.selectionChanged.emit(selectedImages);
  }

  /**
   * Public API: Hole alle ausgewählten Bilder
   */
  getSelectedImages(): AiImageData[] {
    return this.aiImages.filter(img => img.isSelected);
  }

  /**
   * Public API: Hole alle Bilder (ausgewählt oder nicht)
   */
  getAllImages(): AiImageData[] {
    return this.aiImages;
  }

  /**
   * Public API: Reset Component
   */
  reset(): void {
    this.aiImages = [];
    this.selectedPreviewIndex = 0;
    this.error = '';
  }
}

