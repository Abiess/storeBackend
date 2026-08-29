import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ThemeService } from '../../core/services/theme.service';
import { MediaService } from '../../core/services/media.service';
import { StoreContextService } from '../../core/services/store-context.service';
import { StoreService } from '../../core/services/store.service';
import { StoreSliderImage, StoreSliderService } from '../../core/services/store-slider.service';
import { BusinessType, Store, StoreTheme, ThemeColors } from '../../core/models';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-branding-editor',
    imports: [CommonModule, ReactiveFormsModule, TranslateModule, DragDropModule],
    template: `
    <div class="branding-editor">
      <div class="editor-layout">
        <!-- Left: Settings -->
        <div class="settings-panel">
          <h2>{{ 'brandingEditor.title' | translate }}</h2>
          <p class="subtitle">{{ 'brandingEditor.subtitle' | translate }}</p>

          <form [formGroup]="brandingForm">
            <!-- Logo Upload -->
            <div class="form-section">
              <h3>{{ 'brandingEditor.logo.section' | translate }}</h3>
              <div class="form-group">
                <label>{{ 'brandingEditor.logo.label' | translate }}</label>

                <!-- Upload Error -->
                <div class="upload-error" *ngIf="uploadError">
                  <span class="error-icon">⚠️</span>
                  <span>{{ uploadError }}</span>
                  <button type="button" class="btn-retry" (click)="retryUpload('logoUploadInput')">
                    {{ 'brandingEditor.logo.retry' | translate }}
                  </button>
                </div>

                <!-- Upload Area -->
                <div class="upload-area" (click)="fileInput.click()" [class.uploading]="uploading">
                  <input
                    #fileInput
                    id="logoUploadInput"
                    type="file"
                    accept="image/*"
                    (change)="onFileSelected($event, 'logo')"
                    style="display: none">

                  <!-- Uploading State -->
                  <div class="upload-progress" *ngIf="uploading">
                    <div class="progress-bar">
                      <div class="progress-fill" [style.width.%]="uploadProgress"></div>
                    </div>
                    <p>{{ 'brandingEditor.logo.uploading' | translate: { progress: uploadProgress } }}</p>
                  </div>

                  <!-- No Logo State -->
                  <div class="upload-content" *ngIf="!logoPreview && !uploading">
                    <span class="upload-icon">📁</span>
                    <p>{{ 'brandingEditor.logo.clickToUpload' | translate }}</p>
                    <small>{{ 'brandingEditor.logo.hint' | translate }}</small>
                  </div>

                  <!-- Logo Preview -->
                  <div class="logo-preview" *ngIf="logoPreview && !uploading">
                    <img [src]="logoPreview" alt="Logo">
                    <button type="button" class="btn-remove" (click)="removeLogo($event)">✕</button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Colors -->
            <div class="form-section">
              <h3>{{ 'brandingEditor.colors.section' | translate }}</h3>

              <div class="color-grid">
                <div class="color-input">
                  <label>{{ 'brandingEditor.colors.primary' | translate }}</label>
                  <div class="color-picker-wrapper">
                    <input
                      type="color"
                      formControlName="primaryColor"
                      class="color-picker">
                    <input
                      type="text"
                      [value]="brandingForm.get('primaryColor')?.value"
                      (input)="updateColor('primaryColor', $event)"
                      class="color-hex"
                      placeholder="#667eea">
                  </div>
                  <small>{{ 'brandingEditor.colors.primaryHint' | translate }}</small>
                </div>

                <div class="color-input">
                  <label>{{ 'brandingEditor.colors.secondary' | translate }}</label>
                  <div class="color-picker-wrapper">
                    <input
                      type="color"
                      formControlName="secondaryColor"
                      class="color-picker">
                    <input
                      type="text"
                      [value]="brandingForm.get('secondaryColor')?.value"
                      (input)="updateColor('secondaryColor', $event)"
                      class="color-hex"
                      placeholder="#764ba2">
                  </div>
                  <small>{{ 'brandingEditor.colors.secondaryHint' | translate }}</small>
                </div>

                <div class="color-input">
                  <label>{{ 'brandingEditor.colors.accent' | translate }}</label>
                  <div class="color-picker-wrapper">
                    <input
                      type="color"
                      formControlName="accentColor"
                      class="color-picker">
                    <input
                      type="text"
                      [value]="brandingForm.get('accentColor')?.value"
                      (input)="updateColor('accentColor', $event)"
                      class="color-hex"
                      placeholder="#f093fb">
                  </div>
                  <small>{{ 'brandingEditor.colors.accentHint' | translate }}</small>
                </div>
              </div>
            </div>

            <!-- Typography -->
            <div class="form-section">
              <h3>{{ 'brandingEditor.typography.section' | translate }}</h3>
              <div class="form-group">
                <label>{{ 'brandingEditor.typography.font' | translate }}</label>
                <select formControlName="fontFamily" class="form-control">
                  <option value="'Inter', sans-serif">Inter (Modern &amp; Clean)</option>
                  <option value="'Roboto', sans-serif">Roboto (Google Standard)</option>
                  <option value="'Poppins', sans-serif">Poppins (Friendly &amp; Round)</option>
                  <option value="'Playfair Display', serif">Playfair Display (Elegant)</option>
                  <option value="'Georgia', serif">Georgia (Classic)</option>
                  <option value="'Helvetica Neue', sans-serif">Helvetica (Minimal)</option>
                </select>
              </div>
            </div>

            <!-- Quick Presets -->
            <div class="form-section">
              <h3>{{ 'brandingEditor.presets.section' | translate }}</h3>
              <div class="preset-buttons">
                <button
                  type="button"
                  *ngFor="let preset of quickPresets"
                  class="preset-button"
                  [style.background]="preset.colors.primary"
                  (click)="applyPreset(preset)">
                  {{ preset.name }}
                </button>
              </div>
            </div>

            <div class="form-actions">
              <button type="button" class="btn btn-secondary" (click)="reset()">
                {{ 'brandingEditor.actions.reset' | translate }}
              </button>
              <button type="button" class="btn btn-primary" (click)="save()" [disabled]="saving">
                {{ saving ? ('brandingEditor.actions.saving' | translate) : ('brandingEditor.actions.save' | translate) }}
              </button>
            </div>
          </form>

          <div class="website-content-panel" *ngIf="isServiceStore">
            <div class="panel-header">
              <h2>{{ 'brandingEditor.websiteContent.title' | translate }}</h2>
            </div>

            <div class="website-tabs">
              <button
                type="button"
                class="website-tab"
                [class.active]="activeWebsiteSection === 'about'"
                (click)="activeWebsiteSection = 'about'">
                {{ 'brandingEditor.websiteContent.about.title' | translate }}
              </button>
              <button
                type="button"
                class="website-tab"
                [class.active]="activeWebsiteSection === 'gallery'"
                (click)="activeWebsiteSection = 'gallery'">
                {{ 'brandingEditor.websiteContent.gallery.title' | translate }}
              </button>
              <button
                type="button"
                class="website-tab"
                [class.active]="activeWebsiteSection === 'contact'"
                (click)="activeWebsiteSection = 'contact'">
                {{ 'brandingEditor.websiteContent.contact.title' | translate }}
              </button>
            </div>

            <form [formGroup]="websiteContentForm" class="website-content-form">
              <div class="website-section" *ngIf="activeWebsiteSection === 'about'">
                <div class="form-section">
                  <h3>{{ 'brandingEditor.websiteContent.about.title' | translate }}</h3>
                  <p class="section-hint">{{ 'brandingEditor.websiteContent.about.hint' | translate }}</p>

                  <div class="form-group">
                    <label>{{ 'brandingEditor.websiteContent.about.titleLabel' | translate }}</label>
                    <input type="text" class="form-control" formControlName="aboutTitle">
                  </div>

                  <div class="form-group">
                    <label>{{ 'brandingEditor.websiteContent.about.subtitle' | translate }}</label>
                    <input type="text" class="form-control" formControlName="aboutSubtitle">
                  </div>

                  <div class="form-group">
                    <label>{{ 'brandingEditor.websiteContent.about.text' | translate }}</label>
                    <textarea class="form-control textarea-control" formControlName="aboutText" rows="5"></textarea>
                  </div>

                  <div class="form-group">
                    <label>{{ 'brandingEditor.websiteContent.about.image' | translate }}</label>

                    <div class="upload-error" *ngIf="aboutImageUploadError">
                      <span class="error-icon">⚠️</span>
                      <span>{{ aboutImageUploadError }}</span>
                      <button type="button" class="btn-retry" (click)="retryUpload('aboutImageUploadInput')">
                        {{ 'brandingEditor.logo.retry' | translate }}
                      </button>
                    </div>

                    <div class="upload-area" (click)="triggerFileInput('aboutImageUploadInput')" [class.uploading]="aboutImageUploading">
                      <input
                        id="aboutImageUploadInput"
                        type="file"
                        accept="image/*"
                        (change)="onAboutImageSelected($event)"
                        style="display: none">

                      <div class="upload-progress" *ngIf="aboutImageUploading">
                        <div class="progress-bar">
                          <div class="progress-fill" [style.width.%]="aboutImageUploadProgress"></div>
                        </div>
                        <p>{{ 'brandingEditor.logo.uploading' | translate: { progress: aboutImageUploadProgress } }}</p>
                      </div>

                      <div class="upload-content" *ngIf="!aboutImagePreview && !aboutImageUploading">
                        <span class="upload-icon">🖼️</span>
                        <p>{{ 'brandingEditor.logo.clickToUpload' | translate }}</p>
                        <small>{{ 'brandingEditor.logo.hint' | translate }}</small>
                      </div>

                      <div class="logo-preview content-image-preview" *ngIf="aboutImagePreview && !aboutImageUploading">
                        <img [src]="aboutImagePreview" alt="About image">
                        <button type="button" class="btn-remove" (click)="removeAboutImage($event)">✕</button>
                      </div>
                    </div>
                  </div>

                  <div class="form-actions single-action">
                    <button
                      type="button"
                      class="btn btn-primary"
                      (click)="saveWebsiteContent()"
                      [disabled]="websiteSaving || aboutImageUploading || galleryUploading">
                      {{ websiteSaving ? ('brandingEditor.actions.saving' | translate) : ('brandingEditor.actions.save' | translate) }}
                    </button>
                  </div>
                </div>
              </div>

              <div class="website-section" *ngIf="activeWebsiteSection === 'gallery'">
                <div class="form-section">
                  <h3>{{ 'brandingEditor.websiteContent.gallery.title' | translate }}</h3>
                  <p class="section-hint">{{ 'brandingEditor.websiteContent.gallery.hint' | translate }}</p>

                  <div class="gallery-toolbar">
                    <input
                      type="text"
                      class="form-control"
                      [value]="galleryUploadCaption"
                      (input)="updateGalleryUploadCaption($event)"
                      [placeholder]="'brandingEditor.websiteContent.gallery.captionPlaceholder' | translate">
                    <button
                      type="button"
                      class="btn btn-primary add-gallery-button"
                      (click)="triggerFileInput('galleryImageUploadInput')"
                      [disabled]="galleryUploading">
                      {{ 'brandingEditor.websiteContent.gallery.uploadButton' | translate }}
                    </button>
                    <input
                      id="galleryImageUploadInput"
                      type="file"
                      accept="image/*"
                      (change)="onGalleryImageSelected($event)"
                      style="display: none">
                  </div>

                  <div class="upload-error" *ngIf="galleryUploadError">
                    <span class="error-icon">⚠️</span>
                    <span>{{ galleryUploadError }}</span>
                    <button type="button" class="btn-retry" (click)="retryUpload('galleryImageUploadInput')">
                      {{ 'brandingEditor.logo.retry' | translate }}
                    </button>
                  </div>

                  <div class="upload-progress inline-progress" *ngIf="galleryUploading">
                    <div class="progress-bar">
                      <div class="progress-fill" [style.width.%]="galleryUploadProgress"></div>
                    </div>
                    <p>{{ 'brandingEditor.logo.uploading' | translate: { progress: galleryUploadProgress } }}</p>
                  </div>

                  <div class="gallery-empty" *ngIf="!galleryUploading && galleryImages.length === 0">
                    {{ 'brandingEditor.websiteContent.gallery.hint' | translate }}
                  </div>

                  <div
                    class="gallery-grid"
                    *ngIf="galleryImages.length > 0"
                    cdkDropList
                    (cdkDropListDropped)="reorderGallery($event)">
                    <div class="gallery-card" *ngFor="let image of galleryImages; trackBy: trackGalleryImage" cdkDrag>
                      <div class="gallery-card-image">
                        <img [src]="image.imageUrl" [alt]="getGalleryCaption(image) || 'Gallery image'">
                      </div>
                      <div class="gallery-card-body">
                        <input
                          type="text"
                          class="form-control"
                          [value]="getGalleryCaptionDraft(image)"
                          (input)="setGalleryCaptionDraft(image, $event)"
                          [placeholder]="'brandingEditor.websiteContent.gallery.captionPlaceholder' | translate">
                        <div class="gallery-card-actions">
                          <button type="button" class="btn btn-secondary gallery-action" (click)="updateGalleryCaption(image)">
                            {{ 'brandingEditor.actions.save' | translate }}
                          </button>
                          <button type="button" class="btn btn-secondary gallery-action danger" (click)="removeGalleryImage(image)">
                            ✕
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="website-section" *ngIf="activeWebsiteSection === 'contact'">
                <div class="form-section">
                  <h3>{{ 'brandingEditor.websiteContent.contact.title' | translate }}</h3>
                  <div class="contact-hint">
                    <p>{{ 'brandingEditor.websiteContent.contact.hint' | translate }}</p>
                    <button type="button" class="contact-link" (click)="navigateToStoreSettings()">
                      {{ 'brandingEditor.websiteContent.contact.editLink' | translate }}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>

        <!-- Right: Live Preview -->
        <div class="preview-panel">
          <div class="preview-header">
            <h3>{{ 'brandingEditor.preview.title' | translate }}</h3>
            <div class="preview-device-toggle">
              <button
                [class.active]="previewDevice === 'desktop'"
                (click)="previewDevice = 'desktop'">
                🖥️
              </button>
              <button
                [class.active]="previewDevice === 'mobile'"
                (click)="previewDevice = 'mobile'">
                📱
              </button>
            </div>
          </div>

          <div class="preview-container" [class.mobile]="previewDevice === 'mobile'">
            <div class="storefront-preview" [ngStyle]="previewStyles">
              <!-- Header Preview -->
              <div class="preview-store-header">
                <div class="preview-logo">
                  <img *ngIf="logoPreview" [src]="logoPreview" alt="Logo">
                  <span *ngIf="!logoPreview" class="logo-placeholder">LOGO</span>
                </div>
                <div class="preview-nav">
                  <a href="javascript:void(0)">{{ 'brandingEditor.preview.products' | translate }}</a>
                  <a href="javascript:void(0)">{{ 'brandingEditor.preview.categories' | translate }}</a>
                  <a href="javascript:void(0)">{{ 'brandingEditor.preview.contact' | translate }}</a>
                </div>
                <button class="preview-cart-button">
                  {{ 'brandingEditor.preview.cart' | translate }}
                </button>
              </div>

              <!-- Content Preview -->
              <div class="preview-content">
                <h1>{{ 'brandingEditor.preview.welcome' | translate }}</h1>
                <p>{{ 'brandingEditor.preview.welcomeDesc' | translate }}</p>

                <!-- Buttons Preview -->
                <div class="preview-buttons">
                  <button class="preview-btn preview-btn-primary">
                    {{ 'brandingEditor.preview.primaryBtn' | translate }}
                  </button>
                  <button class="preview-btn preview-btn-secondary">
                    {{ 'brandingEditor.preview.secondaryBtn' | translate }}
                  </button>
                </div>

                <!-- Product Card Preview -->
                <div class="preview-products">
                  <div class="preview-product-card">
                    <div class="preview-product-image">
                      <span>🖼️</span>
                    </div>
                    <h4>{{ 'brandingEditor.preview.sampleProduct1' | translate }}</h4>
                    <p class="preview-product-desc">{{ 'brandingEditor.preview.sampleProductDesc' | translate }}</p>
                    <div class="preview-product-footer">
                      <span class="preview-price">€99.99</span>
                      <button class="preview-add-to-cart">{{ 'brandingEditor.preview.addToCart' | translate }}</button>
                    </div>
                  </div>
                  <div class="preview-product-card">
                    <div class="preview-product-image">
                      <span>🖼️</span>
                    </div>
                    <h4>{{ 'brandingEditor.preview.sampleProduct2' | translate }}</h4>
                    <p class="preview-product-desc">{{ 'brandingEditor.preview.sampleProductDesc' | translate }}</p>
                    <div class="preview-product-footer">
                      <span class="preview-price">€149.99</span>
                      <button class="preview-add-to-cart">{{ 'brandingEditor.preview.addToCart' | translate }}</button>
                    </div>
                  </div>
                </div>

                <!-- Badge Preview -->
                <div class="preview-badges">
                  <span class="preview-badge">{{ 'brandingEditor.preview.badgeNew' | translate }}</span>
                  <span class="preview-badge preview-badge-accent">{{ 'brandingEditor.preview.badgeSale' | translate }}</span>
                  <span class="preview-badge">{{ 'brandingEditor.preview.badgeTopSeller' | translate }}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="preview-info">
            <small>{{ 'brandingEditor.preview.hint' | translate }}</small>
          </div>
        </div>
      </div>
    </div>
  `,
    styles: [`
    .branding-editor {
      background: #f8f9fa;
      min-height: 100vh;
      padding: 2rem;
    }

    .editor-layout {
      display: grid;
      grid-template-columns: 400px 1fr;
      gap: 2rem;
      max-width: 1600px;
      margin: 0 auto;
    }

    /* Settings Panel */
    .settings-panel {
      background: white;
      border-radius: 12px;
      padding: 2rem;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      height: fit-content;
      position: sticky;
      top: 2rem;
    }

    .settings-panel h2 {
      margin: 0 0 0.5rem;
      font-size: 1.5rem;
      color: #333;
    }

    .subtitle {
      color: #666;
      margin: 0 0 2rem;
      font-size: 0.9375rem;
    }

    .form-section {
      margin-bottom: 2rem;
      padding-bottom: 2rem;
      border-bottom: 1px solid #e0e0e0;
    }

    .form-section:last-child {
      border-bottom: none;
      padding-bottom: 0;
    }

    .form-section h3 {
      margin: 0 0 1rem;
      font-size: 1.125rem;
      color: #333;
    }

    .form-group {
      margin-bottom: 1.5rem;
    }

    .form-group label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 600;
      color: #333;
      font-size: 0.9375rem;
    }

    .form-control {
      width: 100%;
      padding: 0.75rem;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      font-size: 1rem;
      transition: all 0.3s;
    }

    .form-control:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    /* Upload Area */
    .upload-error {
      background: #fee;
      border: 2px solid #f56565;
      border-radius: 8px;
      padding: 1rem;
      margin-bottom: 1rem;
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .upload-error .error-icon {
      font-size: 1.5rem;
    }

    .upload-error span:not(.error-icon) {
      flex: 1;
      color: #c53030;
      font-weight: 500;
    }

    .btn-retry {
      padding: 0.5rem 1rem;
      background: #f56565;
      color: white;
      border: none;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
      font-size: 0.875rem;
    }

    .btn-retry:hover {
      background: #e53e3e;
    }

    .upload-area {
      border: 2px dashed #e0e0e0;
      border-radius: 12px;
      padding: 2rem;
      text-align: center;
      cursor: pointer;
      transition: all 0.3s;
      background: #fafafa;
    }

    .upload-area:hover:not(.uploading) {
      border-color: #667eea;
      background: #f5f7ff;
    }

    .upload-area.uploading {
      cursor: wait;
      border-color: #667eea;
      background: #f5f7ff;
    }

    .upload-progress {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
    }

    .progress-bar {
      width: 100%;
      max-width: 300px;
      height: 8px;
      background: #e0e0e0;
      border-radius: 4px;
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #667eea, #764ba2);
      transition: width 0.3s ease;
    }

    .upload-progress p {
      margin: 0;
      color: #667eea;
      font-weight: 600;
      font-size: 0.9375rem;
    }

    .upload-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
    }

    .upload-icon {
      font-size: 2rem;
    }

    .logo-preview {
      position: relative;
      display: inline-block;
    }

    .logo-preview img {
      max-width: 200px;
      max-height: 100px;
      border-radius: 8px;
    }

    .btn-remove {
      position: absolute;
      top: -8px;
      right: -8px;
      background: #dc3545;
      color: white;
      border: none;
      border-radius: 50%;
      width: 24px;
      height: 24px;
      cursor: pointer;
      font-size: 0.75rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    /* Color Inputs */
    .color-grid {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .color-input {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .color-input label {
      font-weight: 600;
      color: #333;
      font-size: 0.9375rem;
    }

    .color-picker-wrapper {
      display: flex;
      gap: 0.75rem;
      align-items: center;
    }

    .color-picker {
      width: 60px;
      height: 44px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      cursor: pointer;
    }

    .color-hex {
      flex: 1;
      padding: 0.75rem;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      font-family: monospace;
      font-size: 0.9375rem;
    }

    .color-input small {
      color: #666;
      font-size: 0.8125rem;
    }

    /* Preset Buttons */
    .preset-buttons {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 0.75rem;
    }

    .preset-button {
      padding: 0.75rem;
      border: none;
      border-radius: 8px;
      color: white;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s;
      font-size: 0.9375rem;
    }

    .preset-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    }

    /* Form Actions */
    .form-actions {
      display: flex;
      gap: 1rem;
      padding-top: 1.5rem;
    }

    .btn {
      flex: 1;
      padding: 0.875rem 1.5rem;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s;
      font-size: 1rem;
    }

    .btn-primary {
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
    }

    .btn-primary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .btn-secondary {
      background: white;
      color: #333;
      border: 2px solid #e0e0e0;
    }

    .btn-secondary:hover {
      background: #f8f9fa;
      border-color: #667eea;
    }

    .website-content-panel {
      margin-top: 2rem;
      padding-top: 2rem;
      border-top: 1px solid #e0e0e0;
    }

    .panel-header h2 {
      margin: 0 0 1rem;
      font-size: 1.5rem;
      color: #333;
    }

    .website-tabs {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.75rem;
      margin-bottom: 1.5rem;
    }

    .website-tab {
      border: 2px solid #e0e0e0;
      background: white;
      border-radius: 10px;
      padding: 0.875rem 0.75rem;
      font-weight: 600;
      color: #333;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .website-tab.active,
    .website-tab:hover {
      border-color: #667eea;
      background: #f5f7ff;
      color: #667eea;
    }

    .website-content-form {
      display: block;
    }

    .website-section .form-section:last-child {
      margin-bottom: 0;
    }

    .section-hint {
      margin: 0 0 1rem;
      color: #666;
      font-size: 0.9375rem;
      line-height: 1.5;
    }

    .textarea-control {
      min-height: 140px;
      resize: vertical;
    }

    .content-image-preview img {
      max-width: 100%;
      width: 100%;
      max-height: 220px;
      object-fit: cover;
    }

    .single-action {
      justify-content: flex-end;
    }

    .single-action .btn {
      flex: 0 0 auto;
      min-width: 180px;
    }

    .gallery-toolbar {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 0.75rem;
      align-items: center;
      margin-bottom: 1rem;
    }

    .add-gallery-button {
      min-width: 180px;
    }

    .inline-progress {
      align-items: flex-start;
      margin-bottom: 1rem;
    }

    .gallery-empty {
      border: 2px dashed #d7defa;
      border-radius: 12px;
      padding: 1rem;
      background: #f8faff;
      color: #667eea;
      font-size: 0.9375rem;
    }

    .gallery-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 1rem;
    }

    .gallery-card {
      background: #fff;
      border: 1px solid #e7e7e7;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    }

    .gallery-card-image {
      background: #f5f5f5;
      aspect-ratio: 4 / 3;
      overflow: hidden;
    }

    .gallery-card-image img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .gallery-card-body {
      padding: 0.875rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .gallery-card-actions {
      display: flex;
      gap: 0.5rem;
      justify-content: space-between;
    }

    .gallery-action {
      flex: 1;
      padding: 0.65rem 0.875rem;
      font-size: 0.875rem;
    }

    .gallery-action.danger {
      flex: 0 0 52px;
      color: #dc3545;
      border-color: #f1b8bf;
    }

    .contact-hint {
      border: 1px solid #e0e7ff;
      border-radius: 12px;
      padding: 1rem;
      background: #f8faff;
    }

    .contact-hint p {
      margin: 0 0 0.75rem;
      color: #4a5568;
      line-height: 1.5;
    }

    .contact-link {
      padding: 0;
      background: transparent;
      border: none;
      color: #667eea;
      font-weight: 700;
      cursor: pointer;
    }

    /* Preview Panel */
    .preview-panel {
      background: white;
      border-radius: 12px;
      padding: 2rem;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .preview-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
    }

    .preview-header h3 {
      margin: 0;
      font-size: 1.25rem;
      color: #333;
    }

    .preview-device-toggle {
      display: flex;
      gap: 0.5rem;
    }

    .preview-device-toggle button {
      padding: 0.5rem 1rem;
      border: 2px solid #e0e0e0;
      background: white;
      border-radius: 8px;
      cursor: pointer;
      font-size: 1.25rem;
      transition: all 0.3s;
    }

    .preview-device-toggle button.active {
      border-color: #667eea;
      background: #f5f7ff;
    }

    .preview-container {
      background: #f0f0f0;
      border-radius: 12px;
      padding: 2rem;
      min-height: 600px;
      transition: all 0.3s;
    }

    .preview-container.mobile {
      max-width: 375px;
      margin: 0 auto;
    }

    .storefront-preview {
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }

    /* Preview Store Header */
    .preview-store-header {
      padding: 1rem 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 2rem;
      border-bottom: 1px solid rgba(0,0,0,0.1);
    }

    .preview-logo {
      display: flex;
      align-items: center;
    }

    .preview-logo img {
      max-height: 40px;
      max-width: 150px;
    }

    .logo-placeholder {
      font-weight: 700;
      font-size: 1.5rem;
      color: #333;
    }

    .preview-nav {
      display: flex;
      gap: 1.5rem;
      flex: 1;
    }

    .preview-nav a {
      color: inherit;
      text-decoration: none;
      font-weight: 500;
      transition: all 0.3s;
    }

    .preview-nav a:hover {
      opacity: 0.7;
    }

    .preview-cart-button {
      padding: 0.5rem 1rem;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
    }

    /* Preview Content */
    .preview-content {
      padding: 2rem;
    }

    .preview-content h1 {
      margin: 0 0 0.5rem;
      font-size: 2rem;
    }

    .preview-content > p {
      color: #666;
      margin: 0 0 2rem;
    }

    .preview-buttons {
      display: flex;
      gap: 1rem;
      margin-bottom: 2rem;
    }

    .preview-btn {
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      color: white;
    }

    .preview-products {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2rem;
    }

    .preview-product-card {
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 1rem;
      transition: all 0.3s;
    }

    .preview-product-card:hover {
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }

    .preview-product-image {
      background: #f0f0f0;
      border-radius: 8px;
      height: 150px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 3rem;
      margin-bottom: 1rem;
    }

    .preview-product-card h4 {
      margin: 0 0 0.5rem;
      font-size: 1rem;
    }

    .preview-product-desc {
      color: #666;
      font-size: 0.875rem;
      margin: 0 0 1rem;
    }

    .preview-product-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .preview-price {
      font-weight: 700;
      font-size: 1.125rem;
    }

    .preview-add-to-cart {
      padding: 0.5rem 1rem;
      border: none;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
      font-size: 0.875rem;
    }

    .preview-badges {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .preview-badge {
      padding: 0.375rem 0.875rem;
      border-radius: 20px;
      font-weight: 600;
      font-size: 0.8125rem;
    }

    .preview-info {
      margin-top: 1rem;
      text-align: center;
      color: #666;
    }

    /* Mobile Responsive */
    @media (max-width: 1200px) {
      .editor-layout {
        grid-template-columns: 1fr;
      }

      .settings-panel {
        position: static;
      }
    }

    @media (max-width: 768px) {
      .branding-editor {
        padding: 1rem;
      }

      .settings-panel,
      .preview-panel {
        padding: 1.5rem;
      }

      .website-tabs,
      .gallery-toolbar {
        grid-template-columns: 1fr;
      }

      .preview-nav {
        display: none;
      }

      .preview-store-header {
        padding: 1rem;
      }

      .preview-content {
        padding: 1.5rem;
      }

      .preview-products {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class BrandingEditorComponent implements OnInit, OnDestroy {
  private storeId: number | null = null;
  private storeIdSubscription?: Subscription;
  private currentTheme: StoreTheme | null = null;  // Store existing theme

  currentStore: Store | null = null;
  brandingForm: FormGroup;
  websiteContentForm: FormGroup;
  logoPreview: string | null = null;
  uploadedLogoUrl: string | null = null;
  aboutImagePreview: string | null = null;
  aboutImageUrl: string | null = null;
  previewDevice: 'desktop' | 'mobile' = 'desktop';
  saving = false;
  uploading = false;
  uploadProgress = 0;
  uploadError: string | null = null;
  websiteSaving = false;
  aboutImageUploading = false;
  aboutImageUploadProgress = 0;
  aboutImageUploadError: string | null = null;
  galleryImages: StoreSliderImage[] = [];
  galleryUploadCaption = '';
  galleryUploading = false;
  galleryUploadProgress = 0;
  galleryUploadError: string | null = null;
  activeWebsiteSection: 'about' | 'gallery' | 'contact' = 'about';
  galleryCaptionDrafts: Record<number, string> = {};

  quickPresets = [
    {
      name: 'Modern',
      colors: {
        primary: '#667eea',
        secondary: '#764ba2',
        accent: '#f093fb'
      }
    },
    {
      name: 'Ocean',
      colors: {
        primary: '#0ea5e9',
        secondary: '#0284c7',
        accent: '#06b6d4'
      }
    },
    {
      name: 'Forest',
      colors: {
        primary: '#10b981',
        secondary: '#059669',
        accent: '#34d399'
      }
    },
    {
      name: 'Sunset',
      colors: {
        primary: '#f59e0b',
        secondary: '#ea580c',
        accent: '#fb923c'
      }
    }
  ];

  constructor(
    private fb: FormBuilder,
    private themeService: ThemeService,
    private mediaService: MediaService,
    private storeContext: StoreContextService,
    private storeService: StoreService,
    private storeSliderService: StoreSliderService,
    private router: Router,
    private translate: TranslateService
  ) {
    this.brandingForm = this.fb.group({
      primaryColor: ['#667eea', Validators.required],
      secondaryColor: ['#764ba2', Validators.required],
      accentColor: ['#f093fb', Validators.required],
      fontFamily: ["'Inter', sans-serif", Validators.required]
    });
    this.websiteContentForm = this.fb.group({
      aboutTitle: [''],
      aboutSubtitle: [''],
      aboutText: [''],
      aboutImageMediaId: [null]
    });
  }

  ngOnInit(): void {
    this.storeIdSubscription = this.storeContext.storeId$.subscribe(id => {
      if (id !== null) {
        this.storeId = id;
        this.loadCurrentTheme();
        this.loadCurrentStore();
      }
    });
  }

  ngOnDestroy(): void {
    this.storeIdSubscription?.unsubscribe();
  }

  get previewStyles() {
    const primary = this.brandingForm.get('primaryColor')?.value;
    const secondary = this.brandingForm.get('secondaryColor')?.value;
    const accent = this.brandingForm.get('accentColor')?.value;
    const font = this.brandingForm.get('fontFamily')?.value;

    return {
      '--preview-primary': primary,
      '--preview-secondary': secondary,
      '--preview-accent': accent,
      '--preview-font': font,
      'font-family': font
    };
  }

  get isServiceStore(): boolean {
    return (this.currentStore?.businessType ?? '').toString().toUpperCase() === BusinessType.SERVICE;
  }

  private loadCurrentStore(): void {
    if (this.storeId === null) return;

    this.storeService.getStoreById(this.storeId).subscribe({
      next: (store) => {
        this.currentStore = store;
        this.storeContext.setBusinessType((store.businessType as BusinessType) ?? null);
        this.websiteContentForm.patchValue({
          aboutTitle: store.aboutTitle ?? '',
          aboutSubtitle: store.aboutSubtitle ?? '',
          aboutText: store.aboutText ?? '',
          aboutImageMediaId: store.aboutImageMediaId ?? null
        });
        this.aboutImageUrl = store.aboutImageUrl ?? null;
        this.aboutImagePreview = store.aboutImageUrl ?? null;

        if (this.isServiceStore) {
          this.loadGalleryImages();
        } else {
          this.galleryImages = [];
          this.galleryCaptionDrafts = {};
          this.aboutImageUrl = null;
          this.aboutImagePreview = null;
        }
      },
      error: (err) => console.error('Error loading store:', err)
    });
  }

  loadCurrentTheme(): void {
    if (this.storeId === null) return;

    // Load active theme from API
    this.themeService.getActiveTheme(this.storeId).subscribe({
      next: (theme) => {
        if (theme) {
          // Store existing theme (preserves template, type, etc.)
          this.currentTheme = theme;

          this.brandingForm.patchValue({
            primaryColor: theme.colors.primary,
            secondaryColor: theme.colors.secondary,
            accentColor: theme.colors.accent,
            fontFamily: theme.typography.fontFamily
          });

          // Load existing logo
          if (theme.logoUrl) {
            this.uploadedLogoUrl = theme.logoUrl;
            this.logoPreview = theme.logoUrl;
          }
        }
      },
      error: (err) => console.error('Error loading theme:', err)
    });
  }

  onFileSelected(event: any, type: 'logo' | 'banner'): void {
    const file = event.target.files[0];
    if (!file) return;

    // Reset errors
    this.uploadError = null;

    const validationError = this.validateImageFile(file);
    if (validationError) {
      this.uploadError = validationError;
      return;
    }

    // Show local preview immediately
    this.setImagePreview(file, (preview) => this.logoPreview = preview);

    // Upload to server
    this.uploadLogo(file);
  }

  uploadLogo(file: File): void {
    if (this.storeId === null) {
      this.uploadError = this.translate.instant('brandingEditor.logo.errorNoStore');
      return;
    }

    this.uploading = true;
    this.uploadProgress = 0;
    this.uploadError = null;

    this.mediaService.uploadMediaWithProgress(this.storeId, file, 'LOGO').subscribe({
      next: (event) => {
        if (event.progress !== undefined) {
          this.uploadProgress = event.progress;
        }
        if (event.response) {
          // Upload complete
          this.uploadedLogoUrl = event.response.url;
          this.uploading = false;
          this.uploadProgress = 100;
          console.log('✅ Logo uploaded:', event.response);
        }
      },
      error: (err) => {
        console.error('❌ Upload error:', err);
        this.uploading = false;
        this.uploadProgress = 0;
        this.uploadError = err.error?.message || this.translate.instant('brandingEditor.logo.errorUpload');
        this.logoPreview = null;
        this.uploadedLogoUrl = null;
      }
    });
  }

  retryUpload(inputId: string = 'logoUploadInput'): void {
    this.triggerFileInput(inputId);
  }

  triggerFileInput(inputId: string): void {
    const fileInput = document.getElementById(inputId) as HTMLInputElement | null;
    fileInput?.click();
  }

  removeLogo(event: Event): void {
    event.stopPropagation();
    this.logoPreview = null;
    this.uploadedLogoUrl = null;
    this.uploadError = null;
    this.uploadProgress = 0;
  }

  onAboutImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.aboutImageUploadError = null;
    const validationError = this.validateImageFile(file);
    if (validationError) {
      this.aboutImageUploadError = validationError;
      input.value = '';
      return;
    }

    this.setImagePreview(file, (preview) => this.aboutImagePreview = preview);
    this.uploadAboutImage(file);
    input.value = '';
  }

  uploadAboutImage(file: File): void {
    if (this.storeId === null) {
      this.aboutImageUploadError = this.translate.instant('brandingEditor.logo.errorNoStore');
      return;
    }

    this.aboutImageUploading = true;
    this.aboutImageUploadProgress = 0;
    this.aboutImageUploadError = null;

    this.mediaService.uploadMediaWithProgress(this.storeId, file, 'IMAGE').subscribe({
      next: (event) => {
        if (event.progress !== undefined) {
          this.aboutImageUploadProgress = event.progress;
        }
        if (event.response) {
          this.aboutImageUploading = false;
          this.aboutImageUploadProgress = 100;
          this.aboutImageUrl = event.response.url;
          this.aboutImagePreview = event.response.url;
          this.websiteContentForm.patchValue({ aboutImageMediaId: event.response.mediaId });
        }
      },
      error: (err) => {
        console.error('❌ About image upload error:', err);
        this.aboutImageUploading = false;
        this.aboutImageUploadProgress = 0;
        this.aboutImageUploadError = err.error?.message || this.translate.instant('brandingEditor.logo.errorUpload');
        this.aboutImagePreview = this.aboutImageUrl;
      }
    });
  }

  removeAboutImage(event?: Event): void {
    event?.stopPropagation();
    this.aboutImagePreview = null;
    this.aboutImageUrl = null;
    this.aboutImageUploadError = null;
    this.aboutImageUploadProgress = 0;
    this.websiteContentForm.patchValue({ aboutImageMediaId: null });
  }

  onGalleryImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.galleryUploadError = null;
    const validationError = this.validateImageFile(file);
    if (validationError) {
      this.galleryUploadError = validationError;
      input.value = '';
      return;
    }

    this.uploadGalleryImage(file);
    input.value = '';
  }

  uploadGalleryImage(file: File): void {
    if (this.storeId === null) {
      this.galleryUploadError = this.translate.instant('brandingEditor.logo.errorNoStore');
      return;
    }

    this.galleryUploading = true;
    this.galleryUploadProgress = 0;
    this.galleryUploadError = null;

    this.mediaService.uploadMediaWithProgress(this.storeId, file, 'IMAGE').subscribe({
      next: (event) => {
        if (event.progress !== undefined) {
          this.galleryUploadProgress = event.progress;
        }
        if (event.response) {
          this.storeSliderService.addToGallery(this.storeId!, event.response.mediaId, this.galleryUploadCaption.trim()).subscribe({
            next: (image) => {
              this.galleryUploading = false;
              this.galleryUploadProgress = 100;
              this.galleryUploadCaption = '';
              this.galleryImages = [...this.galleryImages, image].sort((a, b) => a.displayOrder - b.displayOrder);
              if (image.id) {
                this.galleryCaptionDrafts[image.id] = this.getGalleryCaption(image);
              }
            },
            error: (err) => {
              console.error('❌ Gallery add error:', err);
              this.galleryUploading = false;
              this.galleryUploadProgress = 0;
              this.galleryUploadError = err.error?.message || this.translate.instant('brandingEditor.logo.errorUpload');
            }
          });
        }
      },
      error: (err) => {
        console.error('❌ Gallery upload error:', err);
        this.galleryUploading = false;
        this.galleryUploadProgress = 0;
        this.galleryUploadError = err.error?.message || this.translate.instant('brandingEditor.logo.errorUpload');
      }
    });
  }

  private loadGalleryImages(): void {
    if (this.storeId === null) return;

    this.storeSliderService.getGalleryImages(this.storeId).subscribe({
      next: (images) => {
        this.galleryImages = [...images].sort((a, b) => a.displayOrder - b.displayOrder);
        this.galleryCaptionDrafts = {};
        this.galleryImages.forEach((image) => {
          if (image.id) {
            this.galleryCaptionDrafts[image.id] = this.getGalleryCaption(image);
          }
        });
      },
      error: (err) => {
        console.error('Error loading gallery images:', err);
        this.galleryUploadError = err.error?.message || this.translate.instant('brandingEditor.logo.errorUpload');
      }
    });
  }

  removeGalleryImage(image: StoreSliderImage): void {
    if (!image.id || this.storeId === null) return;
    if (!confirm('Möchten Sie dieses Bild wirklich löschen?')) return;

    this.storeSliderService.removeFromGallery(this.storeId, image.id).subscribe({
      next: () => {
        this.galleryImages = this.galleryImages.filter(item => item.id !== image.id);
        delete this.galleryCaptionDrafts[image.id!];
      },
      error: (err) => {
        console.error('Error removing gallery image:', err);
        this.galleryUploadError = err.error?.message || this.translate.instant('brandingEditor.logo.errorUpload');
      }
    });
  }

  updateGalleryCaption(image: StoreSliderImage): void {
    if (!image.id || this.storeId === null) return;

    const caption = (this.galleryCaptionDrafts[image.id] ?? '').trim();
    if (caption === this.getGalleryCaption(image)) {
      return;
    }

    this.storeSliderService.updateGalleryCaption(this.storeId, image.id, caption).subscribe({
      next: () => {
        (image as StoreSliderImage & { caption?: string }).altText = caption;
        (image as StoreSliderImage & { caption?: string }).caption = caption;
        this.galleryCaptionDrafts[image.id!] = caption;
      },
      error: (err) => {
        console.error('Error updating gallery caption:', err);
        this.galleryUploadError = err.error?.message || this.translate.instant('brandingEditor.logo.errorUpload');
      }
    });
  }

  reorderGallery(event: CdkDragDrop<StoreSliderImage[]>): void {
    if (this.storeId === null || event.previousIndex === event.currentIndex) return;

    moveItemInArray(this.galleryImages, event.previousIndex, event.currentIndex);
    const imageIds = this.galleryImages.map(image => image.id).filter((id): id is number => typeof id === 'number');

    this.storeSliderService.reorderGallery(this.storeId, imageIds).subscribe({
      error: (err) => {
        console.error('Error reordering gallery:', err);
        this.galleryUploadError = err.error?.message || this.translate.instant('brandingEditor.logo.errorUpload');
        this.loadGalleryImages();
      }
    });
  }

  saveWebsiteContent(): void {
    if (this.storeId === null) {
      alert(this.translate.instant('brandingEditor.actions.noStore'));
      return;
    }

    if (this.aboutImageUploading || this.galleryUploading) {
      alert(this.translate.instant('brandingEditor.actions.waitUpload'));
      return;
    }

    this.websiteSaving = true;
    const payload = {
      aboutTitle: this.websiteContentForm.get('aboutTitle')?.value?.trim() || '',
      aboutSubtitle: this.websiteContentForm.get('aboutSubtitle')?.value?.trim() || '',
      aboutText: this.websiteContentForm.get('aboutText')?.value?.trim() || '',
      aboutImageMediaId: this.websiteContentForm.get('aboutImageMediaId')?.value ?? null
    };

    this.storeService.updateStore(this.storeId, payload as any).subscribe({
      next: (store) => {
        this.websiteSaving = false;
        this.currentStore = store;
        this.aboutImageUrl = store.aboutImageUrl ?? this.aboutImageUrl;
        this.aboutImagePreview = this.aboutImageUrl;
        this.websiteContentForm.patchValue({
          aboutTitle: store.aboutTitle ?? payload.aboutTitle,
          aboutSubtitle: store.aboutSubtitle ?? payload.aboutSubtitle,
          aboutText: store.aboutText ?? payload.aboutText,
          aboutImageMediaId: store.aboutImageMediaId ?? payload.aboutImageMediaId
        });
        alert(this.translate.instant('brandingEditor.actions.saveSuccess'));
      },
      error: (err) => {
        console.error('Error saving website content:', err);
        this.websiteSaving = false;
        alert(this.translate.instant('brandingEditor.actions.saveError'));
      }
    });
  }

  navigateToStoreSettings(): void {
    if (this.storeId === null) return;
    this.router.navigate(['/stores', this.storeId, 'settings']);
  }

  updateGalleryUploadCaption(event: Event): void {
    this.galleryUploadCaption = (event.target as HTMLInputElement).value;
  }

  getGalleryCaption(image: StoreSliderImage): string {
    return ((image as StoreSliderImage & { caption?: string }).caption ?? image.altText ?? '').trim();
  }

  getGalleryCaptionDraft(image: StoreSliderImage): string {
    if (!image.id) {
      return this.getGalleryCaption(image);
    }
    return this.galleryCaptionDrafts[image.id] ?? this.getGalleryCaption(image);
  }

  setGalleryCaptionDraft(image: StoreSliderImage, event: Event): void {
    if (!image.id) return;
    this.galleryCaptionDrafts[image.id] = (event.target as HTMLInputElement).value;
  }

  trackGalleryImage(index: number, image: StoreSliderImage): number | string {
    return image.id ?? index;
  }

  private validateImageFile(file: File): string | null {
    if (!file.type.startsWith('image/')) {
      return this.translate.instant('brandingEditor.logo.errorImageOnly');
    }

    const maxSize = 4 * 1024 * 1024;
    if (file.size > maxSize) {
      return this.translate.instant('brandingEditor.logo.errorTooLarge', {
        size: (file.size / 1024 / 1024).toFixed(2)
      });
    }

    return null;
  }

  private setImagePreview(file: File, callback: (preview: string | null) => void): void {
    const reader = new FileReader();
    reader.onload = (loadEvent: ProgressEvent<FileReader>) => {
      callback((loadEvent.target?.result as string) ?? null);
    };
    reader.readAsDataURL(file);
  }

  updateColor(control: string, event: any): void {
    const value = event.target.value;
    if (/^#[0-9A-F]{6}$/i.test(value)) {
      this.brandingForm.get(control)?.setValue(value);
    }
  }

  applyPreset(preset: any): void {
    this.brandingForm.patchValue({
      primaryColor: preset.colors.primary,
      secondaryColor: preset.colors.secondary,
      accentColor: preset.colors.accent
    });
  }

  reset(): void {
    this.brandingForm.reset({
      primaryColor: '#667eea',
      secondaryColor: '#764ba2',
      accentColor: '#f093fb',
      fontFamily: "'Inter', sans-serif"
    });
    this.logoPreview = null;
  }

  save(): void {
    if (this.brandingForm.invalid) return;

    if (this.storeId === null) {
      alert(this.translate.instant('brandingEditor.actions.noStore'));
      return;
    }

    // Check if upload is still in progress
    if (this.uploading) {
      alert(this.translate.instant('brandingEditor.actions.waitUpload'));
      return;
    }

    this.saving = true;

    // Build updated colors/typography/logo
    const updatedColors = {
      primary: this.brandingForm.get('primaryColor')?.value,
      secondary: this.brandingForm.get('secondaryColor')?.value,
      accent: this.brandingForm.get('accentColor')?.value,
      background: this.currentTheme?.colors.background || '#ffffff',
      text: this.currentTheme?.colors.text || '#1a202c',
      textSecondary: this.currentTheme?.colors.textSecondary || '#718096',
      border: this.currentTheme?.colors.border || '#e2e8f0',
      success: this.currentTheme?.colors.success || '#48bb78',
      warning: this.currentTheme?.colors.warning || '#ed8936',
      error: this.currentTheme?.colors.error || '#f56565'
    };

    const updatedTypography = {
      fontFamily: this.brandingForm.get('fontFamily')?.value,
      headingFontFamily: this.brandingForm.get('fontFamily')?.value,
      fontSize: this.currentTheme?.typography.fontSize || {
        small: '0.875rem',
        base: '1rem',
        large: '1.125rem',
        xl: '1.5rem',
        xxl: '2.25rem'
      }
    };

    if (this.currentTheme && this.currentTheme.id) {
      // UPDATE existing theme - preserve template and type
      const updates: Partial<StoreTheme> = {
        colors: updatedColors,
        typography: updatedTypography,
        logoUrl: this.uploadedLogoUrl || this.currentTheme.logoUrl
        // DO NOT SET template or type - preserve existing values
      };

      this.themeService.updateTheme(this.currentTheme.id, updates).subscribe({
        next: (theme) => {
          console.log('✅ Theme updated (template preserved):', theme);
          this.currentTheme = theme;  // Update local copy
          this.saving = false;
          alert(this.translate.instant('brandingEditor.actions.saveSuccess'));
        },
        error: (err) => {
          console.error('❌ Error updating theme:', err);
          this.saving = false;
          alert(this.translate.instant('brandingEditor.actions.saveError'));
        }
      });
    } else {
      // CREATE new theme (first time setup)
      const themeRequest = {
        storeId: this.storeId,
        name: 'Custom Theme',
        type: 'MODERN' as any,
        template: 'CUSTOM' as any,  // Only set CUSTOM when creating new theme
        colors: updatedColors,
        typography: updatedTypography,
        layout: {
          headerStyle: 'fixed' as any,
          footerStyle: 'full' as any,
          productGridColumns: 3 as any,
          borderRadius: 'medium' as any,
          spacing: 'normal' as any
        },
        logoUrl: this.uploadedLogoUrl || undefined
      };

      this.themeService.createTheme(themeRequest).subscribe({
        next: (theme) => {
          console.log('✅ Theme created:', theme);
          this.currentTheme = theme;  // Store new theme
          this.saving = false;
          alert(this.translate.instant('brandingEditor.actions.saveSuccess'));
        },
        error: (err) => {
          console.error('❌ Error creating theme:', err);
          this.saving = false;
          alert(this.translate.instant('brandingEditor.actions.saveError'));
        }
      });
    }
  }
}
