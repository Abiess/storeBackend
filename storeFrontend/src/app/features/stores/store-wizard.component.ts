import { Component, OnInit, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { StoreService } from '@app/core/services/store.service';
import { WizardProgressService, WizardProgress } from '@app/core/services/wizard-progress.service';
import { TranslatePipe } from '@app/core/pipes/translate.pipe';
import { AiProductImageGeneratorComponent, AiImageData } from '@app/shared/components/ai-product-image-generator.component';

interface WizardStep {
  id: number;
  title: string;
  subtitle: string;
  icon: string;
  completed: boolean;
}

@Component({
  selector: 'app-store-wizard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslatePipe, AiProductImageGeneratorComponent],
  template: `
    <div class="wizard-container">
      <!-- Skip Button -->
      <button class="skip-btn" (click)="skip()" *ngIf="!hasStore()">
        {{ 'wizard.skip' | translate }} →
      </button>

      <!-- Progress Header -->
      <div class="wizard-header">
        <h1 class="wizard-title">{{ 'wizard.createStore' | translate }}</h1>
        <p class="wizard-subtitle">{{ 'wizard.createStoreSubtitle' | translate }}</p>
        
        <!-- Progress Steps -->
        <div class="progress-steps">
          <div 
            *ngFor="let step of steps; let i = index"
            class="progress-step"
            [class.active]="currentStep() === step.id"
            [class.completed]="step.completed"
            (click)="goToStep(step.id)">
            <div class="step-circle">
              <span *ngIf="!step.completed" class="step-number">{{ step.id }}</span>
              <svg *ngIf="step.completed" class="step-check" width="20" height="20" viewBox="0 0 20 20">
                <path d="M7 10l2 2 4-4" stroke="white" stroke-width="2" fill="none"/>
              </svg>
            </div>
            <div class="step-info">
              <span class="step-title">{{ step.title | translate }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Wizard Content -->
      <div class="wizard-content">
        <form [formGroup]="wizardForm" class="wizard-form">
          
          <!-- Step 1: Basis-Informationen -->
          <div class="wizard-step" *ngIf="currentStep() === 1">
            <div class="step-header">
              <span class="step-icon">{{ steps[0].icon }}</span>
              <h2>{{ steps[0].title | translate }}</h2>
              <p>{{ steps[0].subtitle | translate }}</p>
            </div>

            <div class="form-group">
              <label for="storeName">
                {{ 'wizard.storeName' | translate }} *
              </label>
              <input
                id="storeName"
                type="text"
                formControlName="storeName"
                [placeholder]="'wizard.storeNamePlaceholder' | translate"
                class="form-control"
                [class.error]="wizardForm.get('storeName')?.invalid && wizardForm.get('storeName')?.touched"
              />
              <div class="hint">{{ 'wizard.storeNameHint' | translate }}</div>
              <div class="error-message" *ngIf="wizardForm.get('storeName')?.invalid && wizardForm.get('storeName')?.touched">
                {{ 'wizard.storeNameRequired' | translate }}
              </div>
            </div>

            <div class="form-group">
              <label for="storeSlug">
                {{ 'wizard.storeSlug' | translate }} *
              </label>
              <div class="input-with-prefix">
                <input
                  id="storeSlug"
                  type="text"
                  formControlName="storeSlug"
                  [placeholder]="'wizard.storeSlugPlaceholder' | translate"
                  class="form-control"
                  [class.error]="wizardForm.get('storeSlug')?.invalid && wizardForm.get('storeSlug')?.touched"
                />
                <span class="input-suffix">.markt.ma</span>
              </div>
              <div class="hint">{{ 'wizard.storeSlugHint' | translate }}</div>
              <div class="error-message" *ngIf="wizardForm.get('storeSlug')?.invalid && wizardForm.get('storeSlug')?.touched">
                {{ 'wizard.storeSlugRequired' | translate }}
              </div>
            </div>

            <div class="form-group">
              <label for="description">
                {{ 'wizard.description' | translate }}
              </label>
              <textarea
                id="description"
                formControlName="description"
                rows="4"
                [placeholder]="'wizard.descriptionPlaceholder' | translate"
                class="form-control"
              ></textarea>
              <div class="hint">{{ 'wizard.descriptionHint' | translate }}</div>
            </div>
          </div>

          <!-- Step 2: Kategorien & Bereiche -->
          <div class="wizard-step" *ngIf="currentStep() === 2">
            <div class="step-header">
              <span class="step-icon">{{ steps[1].icon }}</span>
              <h2>{{ steps[1].title | translate }}</h2>
              <p>{{ steps[1].subtitle | translate }}</p>
            </div>

            <div class="categories-grid">
              <div 
                *ngFor="let category of categories"
                class="category-card"
                [class.selected]="selectedCategories().includes(category.id)"
                (click)="toggleCategory(category.id)">
                <span class="category-icon">{{ category.icon }}</span>
                <h3>{{ category.name | translate }}</h3>
                <p>{{ category.description | translate }}</p>
                <div class="category-check" *ngIf="selectedCategories().includes(category.id)">
                  <svg width="24" height="24" viewBox="0 0 24 24">
                    <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z" fill="white"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <!-- Step 3: Kontakt & Adresse -->
          <div class="wizard-step" *ngIf="currentStep() === 3">
            <div class="step-header">
              <span class="step-icon">{{ steps[2].icon }}</span>
              <h2>{{ steps[2].title | translate }}</h2>
              <p>{{ steps[2].subtitle | translate }}</p>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="email">
                  {{ 'wizard.email' | translate }}
                </label>
                <input
                  id="email"
                  type="email"
                  formControlName="email"
                  [placeholder]="'wizard.emailPlaceholder' | translate"
                  class="form-control"
                />
              </div>

              <div class="form-group">
                <label for="phone">
                  {{ 'wizard.phone' | translate }}
                </label>
                <input
                  id="phone"
                  type="tel"
                  formControlName="phone"
                  [placeholder]="'wizard.phonePlaceholder' | translate"
                  class="form-control"
                />
              </div>
            </div>

            <div class="form-group">
              <label for="address">
                {{ 'wizard.address' | translate }}
              </label>
              <input
                id="address"
                type="text"
                formControlName="address"
                [placeholder]="'wizard.addressPlaceholder' | translate"
                class="form-control"
              />
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="city">
                  {{ 'wizard.city' | translate }}
                </label>
                <input
                  id="city"
                  type="text"
                  formControlName="city"
                  [placeholder]="'wizard.cityPlaceholder' | translate"
                  class="form-control"
                />
              </div>

              <div class="form-group">
                <label for="postalCode">
                  {{ 'wizard.postalCode' | translate }}
                </label>
                <input
                  id="postalCode"
                  type="text"
                  formControlName="postalCode"
                  [placeholder]="'wizard.postalCodePlaceholder' | translate"
                  class="form-control"
                />
              </div>
            </div>
          </div>

          <!-- Step 4: KI-Produktbilder (Optional) -->
          <div class="wizard-step" *ngIf="currentStep() === 4">
            <div class="step-header">
              <span class="step-icon">{{ steps[3].icon }}</span>
              <h2>{{ steps[3].title | translate }}</h2>
              <p>{{ steps[3].subtitle | translate }}</p>
            </div>

            <app-ai-product-image-generator
              #aiGenerator
              [storeId]="createdStoreId || 0"
              [autoSelectFirst]="true"
              (imagesGenerated)="onAiImagesGenerated($event)"
              (selectionChanged)="onAiSelectionChanged($event)">
            </app-ai-product-image-generator>

            <div class="optional-note">
              <span class="note-icon">ℹ️</span>
              <span>{{ 'wizard.aiImagesOptional' | translate }}</span>
            </div>
          </div>

          <!-- Step 5: Zusammenfassung -->
          <div class="wizard-step" *ngIf="currentStep() === 5">
            <div class="step-header">
              <span class="step-icon">{{ steps[4].icon }}</span>
              <h2>{{ steps[4].title | translate }}</h2>
              <p>{{ steps[4].subtitle | translate }}</p>
            </div>

            <div class="summary-card">
              <h3>{{ 'wizard.summaryBasic' | translate }}</h3>
              <div class="summary-item">
                <span class="summary-label">{{ 'wizard.storeName' | translate }}:</span>
                <span class="summary-value">{{ wizardForm.get('storeName')?.value }}</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">{{ 'wizard.storeUrl' | translate }}:</span>
                <span class="summary-value">{{ wizardForm.get('storeSlug')?.value }}.markt.ma</span>
              </div>
              <div class="summary-item" *ngIf="wizardForm.get('description')?.value">
                <span class="summary-label">{{ 'wizard.description' | translate }}:</span>
                <span class="summary-value">{{ wizardForm.get('description')?.value }}</span>
              </div>
            </div>

            <div class="summary-card" *ngIf="selectedCategories().length > 0">
              <h3>{{ 'wizard.summaryCategories' | translate }}</h3>
              <div class="category-chips">
                <span *ngFor="let catId of selectedCategories()" class="category-chip">
                  {{ getCategoryName(catId) | translate }}
                </span>
              </div>
            </div>

            <div class="summary-card" *ngIf="wizardForm.get('email')?.value || wizardForm.get('phone')?.value">
              <h3>{{ 'wizard.summaryContact' | translate }}</h3>
              <div class="summary-item" *ngIf="wizardForm.get('email')?.value">
                <span class="summary-label">{{ 'wizard.email' | translate }}:</span>
                <span class="summary-value">{{ wizardForm.get('email')?.value }}</span>
              </div>
              <div class="summary-item" *ngIf="wizardForm.get('phone')?.value">
                <span class="summary-label">{{ 'wizard.phone' | translate }}:</span>
                <span class="summary-value">{{ wizardForm.get('phone')?.value }}</span>
              </div>
            </div>

            <div class="summary-card" *ngIf="aiProductImages.length > 0">
              <h3>{{ 'wizard.summaryAiImages' | translate }}</h3>
              <div class="summary-item">
                <span class="summary-label">{{ 'wizard.aiImagesCount' | translate }}:</span>
                <span class="summary-value">{{ aiProductImages.length }} {{ 'wizard.images' | translate }}</span>
              </div>
              <div class="ai-images-preview">
                <img *ngFor="let img of aiProductImages.slice(0, 5)" 
                     [src]="img.preview" 
                     [alt]="img.file.name"
                     class="preview-thumbnail">
                <span *ngIf="aiProductImages.length > 5" class="more-images">
                  +{{ aiProductImages.length - 5 }} {{ 'wizard.moreImages' | translate }}
                </span>
              </div>
            </div>

            @if (error()) {
              <div class="error-banner">
                {{ error() }}
              </div>
            }
          </div>

        </form>
      </div>

      <!-- Wizard Footer -->
      <div class="wizard-footer">
        <button 
          type="button"
          class="btn-secondary"
          (click)="previousStep()"
          *ngIf="currentStep() > 1"
          [disabled]="loading()">
          ← {{ 'wizard.back' | translate }}
        </button>

        <button 
          type="button"
          class="btn-primary"
          (click)="nextStep()"
          *ngIf="currentStep() < 5"
          [disabled]="!canProceed() || loading()">
          {{ 'wizard.next' | translate }} →
        </button>

        <button 
          type="button"
          class="btn-primary btn-create"
          (click)="createStore()"
          *ngIf="currentStep() === 5"
          [disabled]="loading()">
          @if (loading()) {
            <svg class="spinner" width="20" height="20" viewBox="0 0 20 20">
              <circle cx="10" cy="10" r="8" stroke="white" stroke-width="2" fill="none" opacity="0.3"/>
              <path d="M10 2a8 8 0 018 8" stroke="white" stroke-width="2" fill="none"/>
            </svg>
            {{ 'wizard.creating' | translate }}
          } @else {
            🚀 {{ 'wizard.createStore' | translate }}
          }
        </button>
      </div>
    </div>
  `,
  styles: [`
    .wizard-container {
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 2rem;
      position: relative;
    }

    .skip-btn {
      position: absolute;
      top: 2rem;
      right: 2rem;
      background: rgba(255, 255, 255, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.3);
      color: white;
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 500;
      transition: all 0.3s;
      z-index: 100;
    }

    .skip-btn:hover {
      background: rgba(255, 255, 255, 0.3);
      transform: translateX(4px);
    }

    .wizard-header {
      max-width: 900px;
      margin: 0 auto 3rem;
      text-align: center;
      color: white;
    }

    .wizard-title {
      font-size: 2.5rem;
      font-weight: 800;
      margin: 0 0 0.5rem;
      text-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
    }

    .wizard-subtitle {
      font-size: 1.125rem;
      opacity: 0.9;
      margin: 0 0 3rem;
    }

    .progress-steps {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      max-width: 700px;
      margin: 0 auto;
      position: relative;
    }

    .progress-steps::before {
      content: '';
      position: absolute;
      top: 20px;
      left: 10%;
      right: 10%;
      height: 2px;
      background: rgba(255, 255, 255, 0.3);
      z-index: 0;
    }

    .progress-step {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.75rem;
      cursor: pointer;
      transition: all 0.3s;
      position: relative;
      z-index: 1;
    }

    .step-circle {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.2);
      border: 2px solid rgba(255, 255, 255, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      color: white;
      transition: all 0.3s;
    }

    .progress-step.active .step-circle {
      background: white;
      color: #667eea;
      border-color: white;
      transform: scale(1.1);
      box-shadow: 0 4px 12px rgba(255, 255, 255, 0.4);
    }

    .progress-step.completed .step-circle {
      background: #10b981;
      border-color: #10b981;
    }

    .step-info {
      text-align: center;
    }

    .step-title {
      font-size: 0.875rem;
      font-weight: 600;
      opacity: 0.9;
    }

    .wizard-content {
      max-width: 700px;
      margin: 0 auto;
      background: white;
      border-radius: 16px;
      padding: 3rem;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      min-height: 500px;
    }

    .wizard-step {
      animation: fadeIn 0.4s ease;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .step-header {
      text-align: center;
      margin-bottom: 2rem;
    }

    .step-icon {
      font-size: 3rem;
      display: block;
      margin-bottom: 1rem;
    }

    .step-header h2 {
      font-size: 1.75rem;
      font-weight: 700;
      color: #1f2937;
      margin: 0 0 0.5rem;
    }

    .step-header p {
      color: #6b7280;
      font-size: 1rem;
      margin: 0;
    }

    .form-group {
      margin-bottom: 1.5rem;
    }

    .form-group label {
      display: block;
      font-weight: 600;
      color: #374151;
      margin-bottom: 0.5rem;
      font-size: 0.9375rem;
    }

    .form-control {
      width: 100%;
      padding: 0.875rem 1rem;
      border: 2px solid #e5e7eb;
      border-radius: 10px;
      font-size: 1rem;
      transition: all 0.3s;
    }

    .form-control:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    .form-control.error {
      border-color: #ef4444;
    }

    .input-with-prefix {
      position: relative;
      display: flex;
      align-items: center;
    }

    .input-with-prefix input {
      flex: 1;
      padding-right: 120px;
    }

    .input-suffix {
      position: absolute;
      right: 1rem;
      color: #6b7280;
      font-weight: 500;
      pointer-events: none;
    }

    .hint {
      font-size: 0.875rem;
      color: #6b7280;
      margin-top: 0.5rem;
    }

    .error-message {
      font-size: 0.875rem;
      color: #ef4444;
      margin-top: 0.5rem;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
    }

    /* Categories Grid */
    .categories-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-top: 2rem;
    }

    .category-card {
      border: 2px solid #e5e7eb;
      border-radius: 12px;
      padding: 1.5rem;
      cursor: pointer;
      transition: all 0.3s;
      position: relative;
      text-align: center;
    }

    .category-card:hover {
      border-color: #667eea;
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(102, 126, 234, 0.15);
    }

    .category-card.selected {
      border-color: #667eea;
      background: linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.1));
    }

    .category-icon {
      font-size: 2.5rem;
      display: block;
      margin-bottom: 0.75rem;
    }

    .category-card h3 {
      font-size: 1rem;
      font-weight: 600;
      color: #1f2937;
      margin: 0 0 0.5rem;
    }

    .category-card p {
      font-size: 0.875rem;
      color: #6b7280;
      margin: 0;
    }

    .category-check {
      position: absolute;
      top: 0.75rem;
      right: 0.75rem;
      width: 32px;
      height: 32px;
      background: #667eea;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: scaleIn 0.3s ease;
    }

    @keyframes scaleIn {
      from {
        transform: scale(0);
      }
      to {
        transform: scale(1);
      }
    }

    /* Summary */
    .summary-card {
      background: #f9fafb;
      border-radius: 12px;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
    }

    .summary-card h3 {
      font-size: 1.125rem;
      font-weight: 600;
      color: #1f2937;
      margin: 0 0 1rem;
    }

    .summary-item {
      display: flex;
      justify-content: space-between;
      padding: 0.75rem 0;
      border-bottom: 1px solid #e5e7eb;
    }

    .summary-item:last-child {
      border-bottom: none;
    }

    .summary-label {
      font-weight: 600;
      color: #6b7280;
    }

    .summary-value {
      color: #1f2937;
      text-align: right;
    }

    .category-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
    }

    .category-chip {
      background: #667eea;
      color: white;
      padding: 0.5rem 1rem;
      border-radius: 20px;
      font-size: 0.875rem;
      font-weight: 500;
    }

    /* Footer */
    .wizard-footer {
      max-width: 700px;
      margin: 2rem auto 0;
      display: flex;
      justify-content: space-between;
      gap: 1rem;
    }

    .btn-secondary,
    .btn-primary {
      padding: 1rem 2rem;
      border-radius: 10px;
      font-weight: 600;
      font-size: 1rem;
      cursor: pointer;
      transition: all 0.3s;
      border: none;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .btn-secondary {
      background: white;
      color: #667eea;
      border: 2px solid white;
    }

    .btn-secondary:hover:not(:disabled) {
      transform: translateX(-4px);
      box-shadow: 0 4px 12px rgba(255, 255, 255, 0.3);
    }

    .btn-primary {
      background: white;
      color: #667eea;
      border: 2px solid white;
      margin-left: auto;
    }

    .btn-primary:hover:not(:disabled) {
      transform: translateX(4px);
      box-shadow: 0 4px 12px rgba(255, 255, 255, 0.3);
    }

    .btn-create {
      background: linear-gradient(135deg, #10b981, #059669);
      color: white;
      border-color: transparent;
    }

    .btn-create:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(16, 185, 129, 0.4);
    }

    .btn-secondary:disabled,
    .btn-primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .spinner {
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .error-banner {
      background: #fee2e2;
      border: 1px solid #fecaca;
      color: #991b1b;
      padding: 1rem;
      border-radius: 8px;
      margin-top: 1rem;
    }

    /* Optional Note */
    .optional-note {
      background: #e0f2fe;
      border-left: 4px solid #0284c7;
      padding: 1rem 1.5rem;
      border-radius: 8px;
      margin-top: 2rem;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      color: #075985;
      font-size: 0.95rem;
    }

    .note-icon {
      font-size: 1.25rem;
    }

    /* AI Images Preview in Summary */
    .ai-images-preview {
      display: flex;
      gap: 0.5rem;
      margin-top: 1rem;
      flex-wrap: wrap;
      align-items: center;
    }

    .preview-thumbnail {
      width: 60px;
      height: 60px;
      object-fit: cover;
      border-radius: 8px;
      border: 2px solid #e5e7eb;
      transition: all 0.3s;
    }

    .preview-thumbnail:hover {
      transform: scale(1.1);
      border-color: #667eea;
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
    }

    .more-images {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 60px;
      height: 60px;
      background: #f3f4f6;
      border-radius: 8px;
      font-size: 0.8rem;
      font-weight: 600;
      color: #6b7280;
      border: 2px dashed #d1d5db;
    }

    @media (max-width: 768px) {
      .wizard-container {
        padding: 1rem;
      }

      .wizard-content {
        padding: 2rem 1.5rem;
      }

      .form-row {
        grid-template-columns: 1fr;
      }

      .categories-grid {
        grid-template-columns: 1fr;
      }

      .progress-steps {
        flex-wrap: wrap;
      }

      .wizard-footer {
        flex-direction: column;
      }

      .btn-primary {
        margin-left: 0;
      }
    }
  `]
})
export class StoreWizardComponent implements OnInit {
  currentStep = signal(1);
  selectedCategories = signal<string[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  wizardForm: FormGroup;

  steps: WizardStep[] = [
    { id: 1, title: 'wizard.step1Title', subtitle: 'wizard.step1Subtitle', icon: '🏪', completed: false },
    { id: 2, title: 'wizard.step2Title', subtitle: 'wizard.step2Subtitle', icon: '🎯', completed: false },
    { id: 3, title: 'wizard.step3Title', subtitle: 'wizard.step3Subtitle', icon: '📞', completed: false },
    { id: 4, title: 'wizard.step4Title', subtitle: 'wizard.step4Subtitle', icon: '🤖', completed: false },
    { id: 5, title: 'wizard.step5Title', subtitle: 'wizard.step5Subtitle', icon: '✅', completed: false }
  ];

  categories = [
    { id: 'fashion', name: 'wizard.categoryFashion', description: 'wizard.categoryFashionDesc', icon: '👗' },
    { id: 'electronics', name: 'wizard.categoryElectronics', description: 'wizard.categoryElectronicsDesc', icon: '📱' },
    { id: 'food', name: 'wizard.categoryFood', description: 'wizard.categoryFoodDesc', icon: '🍔' },
    { id: 'beauty', name: 'wizard.categoryBeauty', description: 'wizard.categoryBeautyDesc', icon: '💄' },
    { id: 'home', name: 'wizard.categoryHome', description: 'wizard.categoryHomeDesc', icon: '🏠' },
    { id: 'sports', name: 'wizard.categorySports', description: 'wizard.categorySportsDesc', icon: '⚽' },
    { id: 'books', name: 'wizard.categoryBooks', description: 'wizard.categoryBooksDesc', icon: '📚' },
    { id: 'toys', name: 'wizard.categoryToys', description: 'wizard.categoryToysDesc', icon: '🧸' }
  ];

  createdStoreId: number | null = null;
  aiProductImages: AiImageData[] = [];

  constructor(
    private fb: FormBuilder,
    private storeService: StoreService,
    private wizardProgressService: WizardProgressService,
    private router: Router
  ) {
    this.wizardForm = this.fb.group({
      storeName: ['', Validators.required],
      storeSlug: ['', [Validators.required, Validators.pattern(/^[a-z0-9-]+$/)]],
      description: [''],
      email: [''],
      phone: [''],
      address: [''],
      city: [''],
      postalCode: ['']
    });

    // Auto-generate slug from store name
    this.wizardForm.get('storeName')?.valueChanges.subscribe(name => {
      if (name && !this.wizardForm.get('storeSlug')?.dirty) {
        const slug = name
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .trim();
        this.wizardForm.get('storeSlug')?.setValue(slug, { emitEvent: false });
      }
    });
  }

  ngOnInit(): void {
    // Check if user already has a store
    if (this.hasStore()) {
      this.router.navigate(['/dashboard']);
      return;
    }

    // Lade gespeicherten Fortschritt
    this.loadSavedProgress();
  }

  hasStore(): boolean {
    // TODO: Check from AuthService or StoreService
    return false;
  }

  /**
   * Lade gespeicherten Wizard-Fortschritt aus DB
   */
  private loadSavedProgress(): void {
    this.wizardProgressService.loadProgress().subscribe({
      next: (progress) => {
        if (progress && progress.status === 'IN_PROGRESS') {
          console.log('📂 Fortschritt geladen - Setze Wizard fort ab Schritt', progress.currentStep);
          
          // Setze aktuellen Schritt
          this.currentStep.set(progress.currentStep);
          
          // Markiere abgeschlossene Schritte
          if (progress.completedSteps) {
            progress.completedSteps.forEach(stepNum => {
              if (stepNum > 0 && stepNum <= this.steps.length) {
                this.steps[stepNum - 1].completed = true;
              }
            });
          }
          
          // Fülle Formular mit gespeicherten Daten
          if (progress.data) {
            this.wizardForm.patchValue({
              storeName: progress.data.storeName || '',
              storeSlug: progress.data.storeSlug || '',
              description: progress.data.description || '',
              email: progress.data.contactInfo?.email || '',
              phone: progress.data.contactInfo?.phone || '',
              address: progress.data.contactInfo?.address || '',
              city: progress.data.contactInfo?.city || '',
              postalCode: progress.data.contactInfo?.postalCode || ''
            });

            // Setze ausgewählte Kategorien
            if (progress.data.selectedCategories) {
              this.selectedCategories.set(progress.data.selectedCategories);
            }
          }
        }
      },
      error: (err) => {
        // Kein gespeicherter Fortschritt = Start bei Schritt 1
        console.log('ℹ️ Kein gespeicherter Fortschritt gefunden. Starte neu.');
      }
    });
  }

  /**
   * Speichere aktuellen Wizard-Fortschritt in DB
   */
  private saveCurrentProgress(): void {
    const progress: WizardProgress = {
      currentStep: this.currentStep(),
      status: 'IN_PROGRESS',
      data: {
        storeName: this.wizardForm.get('storeName')?.value,
        storeSlug: this.wizardForm.get('storeSlug')?.value,
        description: this.wizardForm.get('description')?.value,
        selectedCategories: this.selectedCategories(),
        contactInfo: {
          email: this.wizardForm.get('email')?.value,
          phone: this.wizardForm.get('phone')?.value,
          address: this.wizardForm.get('address')?.value,
          city: this.wizardForm.get('city')?.value,
          postalCode: this.wizardForm.get('postalCode')?.value
        }
      },
      completedSteps: this.steps
        .filter(s => s.completed)
        .map(s => s.id)
    };

    this.wizardProgressService.saveProgress(progress).subscribe({
      next: () => console.log('✅ Fortschritt gespeichert'),
      error: (err) => console.error('❌ Fehler beim Speichern:', err)
    });
  }

  canProceed(): boolean {
    switch (this.currentStep()) {
      case 1:
        return !!(this.wizardForm.get('storeName')?.valid && this.wizardForm.get('storeSlug')?.valid);
      case 2:
        return true; // Categories are optional
      case 3:
        return true; // Contact info is optional
      case 4:
        return true; // AI images step is optional
      default:
        return true;
    }
  }

  nextStep(): void {
    if (!this.canProceed()) return;

    const current = this.currentStep();

    // Bei Schritt 3 -> 4: Store erstellen, damit storeId für KI-Feature verfügbar ist
    if (current === 3 && !this.createdStoreId) {
      this.createStoreForAiStep();
      return; // nextStep wird nach erfolgreicher Erstellung aufgerufen
    }

    this.steps[current - 1].completed = true;
    this.currentStep.set(current + 1);
    
    // Speichere Fortschritt in DB
    this.saveCurrentProgress();
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /**
   * Erstelle Store für KI-Step (wird vor Step 4 aufgerufen)
   */
  private async createStoreForAiStep(): Promise<void> {
    if (this.wizardForm.invalid) {
      this.error.set('Bitte füllen Sie alle Pflichtfelder aus.');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    try {
      const formValue = this.wizardForm.value;
      const storeData = {
        name: formValue.storeName,
        slug: formValue.storeSlug,
        description: formValue.description || null,
        categories: this.selectedCategories(),
        contactInfo: {
          email: formValue.email || null,
          phone: formValue.phone || null,
          address: formValue.address || null,
          city: formValue.city || null,
          postalCode: formValue.postalCode || null
        }
      };

      const result = await this.storeService.createStore(storeData).toPromise();

      if (!result || !result.id) {
        throw new Error('Store konnte nicht erstellt werden');
      }

      this.createdStoreId = result.id;
      console.log('✅ Store erstellt für KI-Step:', result.id);

      // Markiere Schritt 3 als abgeschlossen und gehe zu Schritt 4
      this.steps[2].completed = true;
      this.currentStep.set(4);
      this.loading.set(false);

      // Speichere Fortschritt
      this.saveCurrentProgress();

      window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (err: any) {
      this.error.set(err.error?.message || 'Fehler beim Erstellen des Stores. Bitte versuchen Sie es erneut.');
      this.loading.set(false);
    }
  }

  previousStep(): void {
    const current = this.currentStep();
    if (current > 1) {
      this.currentStep.set(current - 1);
      
      // Speichere Fortschritt in DB
      this.saveCurrentProgress();
      
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  goToStep(stepId: number): void {
    // Only allow going back or to completed steps
    if (stepId < this.currentStep() || this.steps[stepId - 1].completed) {
      this.currentStep.set(stepId);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  toggleCategory(categoryId: string): void {
    const current = this.selectedCategories();
    if (current.includes(categoryId)) {
      this.selectedCategories.set(current.filter(id => id !== categoryId));
    } else {
      this.selectedCategories.set([...current, categoryId]);
    }
  }

  getCategoryName(categoryId: string): string {
    return this.categories.find(c => c.id === categoryId)?.name || categoryId;
  }

  skip(): void {
    // Markiere als übersprungen in DB
    this.wizardProgressService.skipWizard().subscribe({
      next: () => {
        console.log('⏭️ Wizard übersprungen');
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        console.error('❌ Fehler beim Überspringen:', err);
        // Navigiere trotzdem zum Dashboard
        this.router.navigate(['/dashboard']);
      }
    });
  }

  async createStore(): Promise<void> {
    // Store wurde bereits bei Step 3->4 erstellt
    if (this.createdStoreId) {
      // Markiere Wizard als completed in DB
      this.wizardProgressService.completeWizard(this.createdStoreId).subscribe({
        next: () => console.log('✅ Wizard als abgeschlossen markiert'),
        error: (err) => console.warn('⚠️ Fehler beim Markieren:', err)
      });

      // Navigate to dashboard with store
      this.router.navigate(['/dashboard'], {
        queryParams: { newStore: 'true', storeId: this.createdStoreId }
      });
      return;
    }

    // Fallback: Erstelle Store wenn noch nicht geschehen (sollte nicht auftreten)
    if (this.wizardForm.invalid) return;

    this.loading.set(true);
    this.error.set(null);

    try {
      const formValue = this.wizardForm.value;
      const storeData = {
        name: formValue.storeName,
        slug: formValue.storeSlug,
        description: formValue.description || null,
        categories: this.selectedCategories(),
        contactInfo: {
          email: formValue.email || null,
          phone: formValue.phone || null,
          address: formValue.address || null,
          city: formValue.city || null,
          postalCode: formValue.postalCode || null
        }
      };

      const result = await this.storeService.createStore(storeData).toPromise();
      
      if (!result || !result.id) {
        throw new Error('Store konnte nicht erstellt werden');
      }
      
      this.createdStoreId = result.id;

      // Markiere Wizard als completed in DB
      this.wizardProgressService.completeWizard(result.id).subscribe({
        next: () => console.log('✅ Wizard als abgeschlossen markiert'),
        error: (err) => console.warn('⚠️ Fehler beim Markieren:', err)
      });
      
      // Success! Navigate to dashboard
      setTimeout(() => {
        this.router.navigate(['/dashboard'], {
          queryParams: { newStore: 'true', storeId: result.id }
        });
      }, 1000);

    } catch (err: any) {
      this.error.set(err.error?.message || 'Fehler beim Erstellen des Stores. Bitte versuchen Sie es erneut.');
      this.loading.set(false);
    }
  }

  onAiImagesGenerated(images: AiImageData[]): void {
    this.aiProductImages = images;
  }

  onAiSelectionChanged(selected: AiImageData[]): void {
    // Handle AI image selection change if needed
  }
}

