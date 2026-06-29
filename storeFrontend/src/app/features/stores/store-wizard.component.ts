import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { StoreService } from '@app/core/services/store.service';
import { WizardProgressService, WizardProgress } from '@app/core/services/wizard-progress.service';
import { TranslatePipe } from '@app/core/pipes/translate.pipe';
import { AiProductImageGeneratorComponent, AiImageData } from '@app/shared/components/ai-product-image-generator.component';
import { UnsplashService, UnsplashImage } from '@app/core/services/unsplash.service';
import { StoreCreationShellComponent } from '@app/shared/components/store-creation-shell.component';

interface WizardStep {
  id: number;
  title: string;
  subtitle: string;
  icon: string;
  completed: boolean;
  visible?: boolean;
}

@Component({
  selector: 'app-store-wizard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslatePipe, AiProductImageGeneratorComponent, StoreCreationShellComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-store-creation-shell>
      @if (!hasStore()) {
        <button type="button" slot="header-right" class="sc-header-btn" (click)="skip()">
          {{ 'wizard.skip' | translate }}
        </button>
      }

      <div class="sc-stepper">
        @for (step of steps; track step.id; let last = $last) {
          <div class="sc-stepper__step" [class.active]="currentStep() === step.id" [class.done]="step.completed" (click)="goToStep(step.id)">
            <div class="sc-stepper__dot">
              @if (step.completed) {
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
              } @else {
                {{ step.id }}
              }
            </div>
            <span class="sc-stepper__label">{{ step.title | translate }}</span>
          </div>
          @if (!last) {
            <div class="sc-stepper__line" [class.done]="step.completed"></div>
          }
        }
      </div>

      <div class="sc-card animate-in">
        <div class="sc-card__eyebrow">Experten-Setup · Schritt {{ currentStep() }}/{{ steps.length }}</div>
        <h1 class="sc-card__title">{{ 'wizard.createStore' | translate }}</h1>
        <p class="sc-card__sub">{{ steps[currentStep() - 1].subtitle | translate }}</p>

        <form [formGroup]="wizardForm" class="wizard-form">
          @if (currentStep() === 1) {
            <div class="wizard-step animate-fade-in">
              <div class="step-header">
                <span class="step-icon">{{ steps[0].icon }}</span>
                <h2>{{ steps[0].title | translate }}</h2>
                <p>{{ steps[0].subtitle | translate }}</p>
              </div>

              <div class="sc-field">
                <label for="storeName" class="sc-label">{{ 'wizard.storeName' | translate }} *</label>
                <input
                  id="storeName"
                  type="text"
                  formControlName="storeName"
                  [placeholder]="'wizard.storeNamePlaceholder' | translate"
                  class="sc-input"
                  [class.error]="wizardForm.get('storeName')?.invalid && wizardForm.get('storeName')?.touched"
                  (input)="onStoreNameInput($any($event.target).value)"
                />
                <div class="sc-hint">{{ 'wizard.storeNameHint' | translate }}</div>
                @if (wizardForm.get('storeName')?.invalid && wizardForm.get('storeName')?.touched) {
                  <div class="sc-field-error">{{ 'wizard.storeNameRequired' | translate }}</div>
                }
              </div>

              @if (carouselImages().length > 0 || carouselLoading()) {
                <div class="sc-carousel-wrap animate-fade-in">
                  <div class="sc-carousel-header">
                    <span class="sc-carousel-label">📸 Titelbild wählen</span>
                    @if (carouselLoading()) {
                      <span class="sc-carousel-spinner"></span>
                    }
                  </div>
                  <div class="sc-carousel">
                    @for (img of carouselImages(); track img.id) {
                      <button
                        type="button"
                        class="sc-carousel__item"
                        [class.selected]="selectedBannerImage()?.id === img.id"
                        (click)="selectBannerImage(img)">
                        <img [src]="img.thumbUrl" [alt]="img.description || 'Store Titelbild'" loading="lazy" />
                        @if (selectedBannerImage()?.id === img.id) {
                          <div class="sc-carousel__check">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
                          </div>
                        }
                      </button>
                    }
                  </div>
                  @if (selectedBannerImage()) {
                    <p class="sc-attribution">
                      Foto:
                      <a [href]="selectedBannerImage()?.authorUrl" target="_blank" rel="noreferrer">{{ selectedBannerImage()?.authorName }}</a>
                      · Unsplash
                    </p>
                  }
                </div>
              }

              <div class="sc-field">
                <label for="storeSlug" class="sc-label">{{ 'wizard.storeSlug' | translate }} *</label>
                <div class="input-with-prefix">
                  <input
                    id="storeSlug"
                    type="text"
                    formControlName="storeSlug"
                    [placeholder]="'wizard.storeSlugPlaceholder' | translate"
                    class="sc-input"
                    [class.error]="wizardForm.get('storeSlug')?.invalid && wizardForm.get('storeSlug')?.touched"
                  />
                  <span class="input-suffix">.markt.ma</span>
                </div>
                <div class="sc-hint">{{ 'wizard.storeSlugHint' | translate }}</div>
                @if (wizardForm.get('storeSlug')?.invalid && wizardForm.get('storeSlug')?.touched) {
                  <div class="sc-field-error">{{ 'wizard.storeSlugRequired' | translate }}</div>
                }
              </div>

              <div class="sc-field">
                <label for="description" class="sc-label">{{ 'wizard.description' | translate }}</label>
                <textarea
                  id="description"
                  formControlName="description"
                  rows="4"
                  [placeholder]="'wizard.descriptionPlaceholder' | translate"
                  class="sc-input sc-textarea"></textarea>
                <div class="sc-hint">{{ 'wizard.descriptionHint' | translate }}</div>
              </div>
            </div>
          }

          @if (currentStep() === 2) {
            <div class="wizard-step animate-fade-in">
              <div class="step-header">
                <span class="step-icon">{{ steps[1].icon }}</span>
                <h2>{{ steps[1].title | translate }}</h2>
                <p>{{ steps[1].subtitle | translate }}</p>
              </div>

              <div class="sc-field">
                <label class="sc-label">{{ 'settings.business.type' | translate }}</label>
                <div class="sc-cat-grid">
                  @for (bt of businessTypes; track bt.id) {
                    <button
                      type="button"
                      class="sc-cat-btn"
                      [class.active]="selectedBusinessType() === bt.id"
                      (click)="selectBusinessType(bt.id)">
                      {{ bt.icon }} {{ bt.name }}
                    </button>
                  }
                </div>
              </div>

              <div class="business-type-copy">
                @for (bt of businessTypes; track bt.id) {
                  @if (selectedBusinessType() === bt.id) {
                    <div class="business-type-copy__card">
                      <h3>{{ bt.name }}</h3>
                      <p>{{ bt.description }}</p>
                    </div>
                  }
                }
              </div>
            </div>
          }

          @if (currentStep() === 3) {
            <div class="wizard-step animate-fade-in">
              <div class="step-header">
                <span class="step-icon">{{ steps[2].icon }}</span>
                <h2>{{ steps[2].title | translate }}</h2>
                <p>{{ steps[2].subtitle | translate }}</p>
              </div>

              <div class="form-row">
                <div class="sc-field">
                  <label for="email" class="sc-label">{{ 'wizard.email' | translate }}</label>
                  <input id="email" type="email" formControlName="email" [placeholder]="'wizard.emailPlaceholder' | translate" class="sc-input" />
                </div>

                <div class="sc-field">
                  <label for="phone" class="sc-label">{{ 'wizard.phone' | translate }}</label>
                  <input id="phone" type="tel" formControlName="phone" [placeholder]="'wizard.phonePlaceholder' | translate" class="sc-input" />
                </div>
              </div>

              <div class="sc-panel">
                <div class="sc-panel__header">
                  <span class="step-icon step-icon--small">💬</span>
                  <div>
                    <h4>{{ 'wizard.whatsappNumber' | translate }}</h4>
                    <p>{{ 'wizard.whatsappNumberHint' | translate }}</p>
                  </div>
                </div>
                <div class="sc-field">
                  <input
                    id="whatsappNumber"
                    type="tel"
                    formControlName="whatsappNumber"
                    [placeholder]="'wizard.whatsappNumberPlaceholder' | translate"
                    class="sc-input"
                  />
                </div>
                <label class="wa-toggle">
                  <input type="checkbox" formControlName="whatsappNotificationsEnabled" />
                  <span class="wa-toggle-label">{{ 'wizard.whatsappNotifications' | translate }}</span>
                </label>
                <p class="sc-hint">{{ 'wizard.whatsappNotificationsHint' | translate }}</p>
              </div>

              <div class="sc-field">
                <label for="address" class="sc-label">{{ 'wizard.address' | translate }}</label>
                <input id="address" type="text" formControlName="address" [placeholder]="'wizard.addressPlaceholder' | translate" class="sc-input" />
              </div>

              <div class="form-row">
                <div class="sc-field">
                  <label for="city" class="sc-label">{{ 'wizard.city' | translate }}</label>
                  <input id="city" type="text" formControlName="city" [placeholder]="'wizard.cityPlaceholder' | translate" class="sc-input" />
                </div>

                <div class="sc-field">
                  <label for="postalCode" class="sc-label">{{ 'wizard.postalCode' | translate }}</label>
                  <input id="postalCode" type="text" formControlName="postalCode" [placeholder]="'wizard.postalCodePlaceholder' | translate" class="sc-input" />
                </div>
              </div>

              <div class="sc-panel">
                <div class="sc-panel__header">
                  <span class="step-icon step-icon--small">📱</span>
                  <div>
                    <h4>
                      {{ 'wizard.socialSectionTitle' | translate }}
                      <span class="optional-tag">{{ 'wizard.socialOptional' | translate }}</span>
                    </h4>
                    <p>{{ 'wizard.socialSectionHint' | translate }}</p>
                  </div>
                </div>
                <div class="form-row">
                  <div class="sc-field">
                    <label for="telegramUrl" class="sc-label">✈ {{ 'wizard.socialTelegram' | translate }}</label>
                    <input id="telegramUrl" type="url" formControlName="telegramUrl" class="sc-input" [placeholder]="'wizard.socialTelegramPlaceholder' | translate" />
                  </div>
                  <div class="sc-field">
                    <label for="facebookUrl" class="sc-label">f {{ 'wizard.socialFacebook' | translate }}</label>
                    <input id="facebookUrl" type="url" formControlName="facebookUrl" class="sc-input" [placeholder]="'wizard.socialFacebookPlaceholder' | translate" />
                  </div>
                </div>
                <div class="form-row">
                  <div class="sc-field">
                    <label for="instagramUrl" class="sc-label">◉ {{ 'wizard.socialInstagram' | translate }}</label>
                    <input id="instagramUrl" type="url" formControlName="instagramUrl" class="sc-input" [placeholder]="'wizard.socialInstagramPlaceholder' | translate" />
                  </div>
                  <div class="sc-field">
                    <label for="tiktokUrl" class="sc-label">♪ {{ 'wizard.socialTiktok' | translate }}</label>
                    <input id="tiktokUrl" type="url" formControlName="tiktokUrl" class="sc-input" [placeholder]="'wizard.socialTiktokPlaceholder' | translate" />
                  </div>
                </div>
              </div>
            </div>
          }

          @if (currentStep() === 4) {
            <div class="wizard-step animate-fade-in">
              <div class="step-header">
                <span class="step-icon">{{ steps[3].icon }}</span>
                <h2>{{ steps[3].title | translate }}</h2>
                <p>{{ steps[3].subtitle | translate }}</p>
              </div>

              <app-ai-product-image-generator
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
          }

          @if (currentStep() === 5) {
            <div class="wizard-step animate-fade-in">
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
                @if (wizardForm.get('description')?.value) {
                  <div class="summary-item">
                    <span class="summary-label">{{ 'wizard.description' | translate }}:</span>
                    <span class="summary-value">{{ wizardForm.get('description')?.value }}</span>
                  </div>
                }
              </div>

              @if (selectedBusinessType()) {
                <div class="summary-card">
                  <h3>{{ 'wizard.summaryCategories' | translate }}</h3>
                  <div class="category-chips">
                    <span class="category-chip">{{ getCategoryName(selectedBusinessType()) }}</span>
                  </div>
                </div>
              }

              @if (wizardForm.get('email')?.value || wizardForm.get('phone')?.value) {
                <div class="summary-card">
                  <h3>{{ 'wizard.summaryContact' | translate }}</h3>
                  @if (wizardForm.get('email')?.value) {
                    <div class="summary-item">
                      <span class="summary-label">{{ 'wizard.email' | translate }}:</span>
                      <span class="summary-value">{{ wizardForm.get('email')?.value }}</span>
                    </div>
                  }
                  @if (wizardForm.get('phone')?.value) {
                    <div class="summary-item">
                      <span class="summary-label">{{ 'wizard.phone' | translate }}:</span>
                      <span class="summary-value">{{ wizardForm.get('phone')?.value }}</span>
                    </div>
                  }
                </div>
              }

              @if (selectedUnsplashImages().length > 0) {
                <div class="summary-card">
                  <h3>🖼️ Ausgewähltes Titelbild</h3>
                  <div class="unsplash-preview-row">
                    @for (img of selectedUnsplashImages(); track img.id) {
                      <img [src]="img.thumbUrl" [alt]="img.description || 'Unsplash photo'" class="unsplash-preview-thumb" />
                    }
                  </div>
                </div>
              }

              @if (aiProductImages.length > 0) {
                <div class="summary-card">
                  <h3>{{ 'wizard.summaryAiImages' | translate }}</h3>
                  <div class="summary-item">
                    <span class="summary-label">{{ 'wizard.aiImagesCount' | translate }}:</span>
                    <span class="summary-value">{{ aiProductImages.length }} {{ 'wizard.images' | translate }}</span>
                  </div>
                  <div class="ai-images-preview">
                    @for (img of aiProductImages.slice(0, 5); track img.preview) {
                      <img [src]="img.preview" [alt]="img.file.name" class="preview-thumbnail" />
                    }
                    @if (aiProductImages.length > 5) {
                      <span class="more-images">+{{ aiProductImages.length - 5 }} {{ 'wizard.moreImages' | translate }}</span>
                    }
                  </div>
                </div>
              }

              <div class="telegram-spotlight">
                <div class="telegram-spotlight__icon">💬</div>
                <div class="telegram-spotlight__body">
                  <h4 class="telegram-spotlight__title">{{ 'wizard.telegramFeatureTitle' | translate }}</h4>
                  <p class="telegram-spotlight__desc">{{ 'wizard.telegramFeatureDesc' | translate }}</p>
                  <ul class="telegram-spotlight__points">
                    <li>{{ 'wizard.telegramFeaturePoint1' | translate }}</li>
                    <li>{{ 'wizard.telegramFeaturePoint2' | translate }}</li>
                    <li>{{ 'wizard.telegramFeaturePoint3' | translate }}</li>
                  </ul>
                </div>
                <div class="telegram-spotlight__badge">{{ 'wizard.telegramFeatureBadge' | translate }}</div>
              </div>

              @if (error()) {
                <div class="sc-error">{{ error() }}</div>
              }
            </div>
          }
        </form>
      </div>

      <div class="wizard-footer">
        @if (currentStep() > 1) {
          <button type="button" class="sc-btn-outline wizard-footer__btn" (click)="previousStep()" [disabled]="loading()">
            ← {{ 'wizard.back' | translate }}
          </button>
        }

        @if (currentStep() < 5) {
          <button type="button" class="sc-btn-primary wizard-footer__btn" (click)="nextStep()" [disabled]="!canProceed() || loading()">
            {{ 'wizard.next' | translate }} →
          </button>
        }

        @if (currentStep() === 5) {
          <button type="button" class="sc-btn-primary wizard-footer__btn" (click)="createStore()" [disabled]="loading()">
            @if (loading()) {
              <span class="sc-spinner"></span>
              {{ 'wizard.creating' | translate }}
            } @else {
              🚀 {{ 'wizard.createStore' | translate }}
            }
          </button>
        }
      </div>
    </app-store-creation-shell>
  `,
  styles: [`
    .sc-header-btn {
      background: rgba(255,255,255,.16);
      border: 1px solid rgba(255,255,255,.28);
      color: rgba(255,255,255,.92);
      border-radius: 999px;
      padding: .55rem .95rem;
      font-size: .82rem;
      font-weight: 600;
      cursor: pointer;
      transition: background .15s ease, transform .15s ease;
    }

    .sc-header-btn:hover {
      background: rgba(255,255,255,.24);
      transform: translateX(1px);
    }

    .sc-stepper {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0;
      margin: .75rem 0 1.5rem;
      flex-wrap: wrap;
    }

    .sc-stepper__step {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: .3rem;
      cursor: pointer;
      min-width: 70px;
    }

    .sc-stepper__dot {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: .8rem;
      font-weight: 700;
      transition: all .2s;
      background: rgba(255,255,255,.2);
      color: #fff;
      border: 2px solid rgba(255,255,255,.4);
    }

    .sc-stepper__step.active .sc-stepper__dot { background: #fff; color: #7c3aed; border-color: #fff; }
    .sc-stepper__step.done .sc-stepper__dot { background: #10b981; border-color: #10b981; }

    .sc-stepper__label {
      font-size: .65rem;
      color: rgba(255,255,255,.75);
      text-align: center;
      max-width: 60px;
      line-height: 1.2;
    }

    .sc-stepper__step.active .sc-stepper__label { color: #fff; font-weight: 700; }

    .sc-stepper__line {
      flex: 1;
      height: 2px;
      background: rgba(255,255,255,.25);
      min-width: 20px;
      margin: 0 4px 22px;
    }

    .sc-stepper__line.done { background: #10b981; }

    .sc-card {
      background: #fff;
      border-radius: 24px;
      padding: 2rem 1.75rem;
      box-shadow: 0 24px 64px rgba(0,0,0,.22);
      margin-top: .5rem;
    }

    .animate-in { animation: scSlideUp .35s cubic-bezier(.34,1.56,.64,1); }
    .animate-fade-in { animation: scFadeIn .3s ease; }

    @keyframes scSlideUp {
      from { opacity: 0; transform: translateY(24px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @keyframes scFadeIn {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .sc-card__eyebrow {
      font-size: .72rem;
      font-weight: 700;
      letter-spacing: .06em;
      text-transform: uppercase;
      color: #a855f7;
      margin-bottom: .5rem;
    }

    .sc-card__title {
      font-size: 1.5rem;
      font-weight: 800;
      color: #1a1a2e;
      margin: 0 0 .25rem;
    }

    .sc-card__sub {
      color: #6b7280;
      font-size: .9rem;
      margin: 0 0 1.25rem;
    }

    .step-header {
      text-align: center;
      margin-bottom: 1.5rem;
    }

    .step-icon {
      font-size: 2.6rem;
      display: block;
      margin-bottom: .75rem;
    }

    .step-icon--small {
      font-size: 1.4rem;
      margin-bottom: 0;
    }

    .step-header h2 {
      font-size: 1.35rem;
      font-weight: 800;
      color: #1a1a2e;
      margin: 0 0 .35rem;
    }

    .step-header p {
      color: #6b7280;
      font-size: .92rem;
      margin: 0;
    }

    .sc-field { margin-bottom: 1.1rem; }

    .sc-label {
      display: block;
      font-size: .82rem;
      font-weight: 600;
      color: #374151;
      margin-bottom: .35rem;
    }

    .sc-input {
      width: 100%;
      padding: .65rem .875rem;
      font-size: .9rem;
      border-radius: 12px;
      border: 1.5px solid #e5e7eb;
      background: #f9fafb;
      color: #111827;
      outline: none;
      box-sizing: border-box;
      transition: border-color .15s, box-shadow .15s, background .15s;
    }

    .sc-input:focus {
      border-color: #a855f7;
      background: #fff;
      box-shadow: 0 0 0 3px rgba(168,85,247,.12);
    }

    .sc-input.error { border-color: #ef4444; }
    .sc-textarea { min-height: 110px; resize: vertical; }
    .sc-hint { font-size: .78rem; color: #9ca3af; margin-top: .35rem; }
    .sc-field-error { color: #dc2626; font-size: .78rem; margin: .25rem 0 0; }

    .input-with-prefix { position: relative; display: flex; align-items: center; }
    .input-with-prefix .sc-input { padding-right: 120px; }
    .input-suffix { position: absolute; right: 1rem; color: #6b7280; font-weight: 500; pointer-events: none; }

    .sc-carousel-wrap {
      background: #f8f7ff;
      border-radius: 14px;
      padding: .75rem;
      margin-bottom: 1.1rem;
      border: 1.5px solid #e9d5ff;
    }

    .sc-carousel-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: .6rem; }
    .sc-carousel-label { font-size: .78rem; font-weight: 700; color: #7c3aed; }

    .sc-carousel-spinner,
    .sc-spinner {
      border-radius: 50%;
      animation: spin .6s linear infinite;
      display: inline-block;
    }

    .sc-carousel-spinner {
      width: 14px;
      height: 14px;
      border: 2px solid #d8b4fe;
      border-top-color: #a855f7;
    }

    .sc-spinner {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255,255,255,.3);
      border-top-color: #fff;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    .sc-carousel {
      display: flex;
      gap: .5rem;
      overflow-x: auto;
      padding-bottom: .25rem;
      scrollbar-width: thin;
      scrollbar-color: #d8b4fe transparent;
    }

    .sc-carousel::-webkit-scrollbar { height: 4px; }
    .sc-carousel::-webkit-scrollbar-thumb { background: #d8b4fe; border-radius: 4px; }

    .sc-carousel__item {
      flex-shrink: 0;
      width: 110px;
      height: 72px;
      border-radius: 10px;
      overflow: hidden;
      cursor: pointer;
      position: relative;
      border: 2.5px solid transparent;
      transition: border-color .15s, transform .15s;
      padding: 0;
      background: transparent;
    }

    .sc-carousel__item:hover { transform: scale(1.04); }

    .sc-carousel__item.selected {
      border-color: #a855f7;
      box-shadow: 0 0 0 3px rgba(168,85,247,.25);
    }

    .sc-carousel__item img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .sc-carousel__check {
      position: absolute;
      top: 5px;
      right: 5px;
      width: 22px;
      height: 22px;
      background: #a855f7;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .sc-attribution {
      font-size: .68rem;
      color: #9ca3af;
      margin: .35rem 0 0;
      text-align: right;
    }

    .sc-attribution a { color: #a855f7; text-decoration: none; }
    .sc-attribution a:hover { text-decoration: underline; }

    .sc-cat-grid { display: flex; flex-wrap: wrap; gap: .5rem; }

    .sc-cat-btn {
      padding: .45rem .9rem;
      border-radius: 20px;
      border: 1.5px solid #e5e7eb;
      background: #f9fafb;
      font-size: .83rem;
      cursor: pointer;
      transition: all .15s;
      color: #374151;
      font-weight: 500;
    }

    .sc-cat-btn:hover {
      border-color: #a855f7;
      color: #7c3aed;
      background: #faf5ff;
    }

    .sc-cat-btn.active {
      border-color: #a855f7;
      background: linear-gradient(135deg, #a855f7, #7c3aed);
      color: #fff;
      font-weight: 700;
    }

    .business-type-copy__card,
    .sc-panel {
      background: #faf5ff;
      border: 1.5px solid #e9d5ff;
      border-radius: 14px;
      padding: 1rem;
    }

    .business-type-copy__card h3,
    .sc-panel__header h4 {
      font-size: .95rem;
      color: #6b21a8;
      margin: 0 0 .3rem;
    }

    .business-type-copy__card p,
    .sc-panel__header p {
      font-size: .82rem;
      color: #6b7280;
      margin: 0;
    }

    .sc-panel { margin-bottom: 1.1rem; }
    .sc-panel__header { display: flex; align-items: flex-start; gap: .75rem; margin-bottom: .85rem; }

    .form-row {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 1rem;
    }

    .wa-toggle {
      display: flex;
      align-items: center;
      gap: .55rem;
      font-size: .85rem;
      color: #374151;
      cursor: pointer;
    }

    .wa-toggle-label { font-weight: 600; }

    .optional-tag {
      font-size: .68rem;
      font-weight: 700;
      background: #ede9fe;
      color: #7c3aed;
      padding: .1rem .45rem;
      border-radius: 999px;
      margin-left: .35rem;
      text-transform: uppercase;
      letter-spacing: .05em;
    }

    .summary-card {
      background: #f9fafb;
      border-radius: 14px;
      padding: 1rem;
      margin-bottom: 1rem;
      border: 1px solid #e5e7eb;
    }

    .summary-card h3 {
      font-size: 1rem;
      font-weight: 700;
      color: #1f2937;
      margin: 0 0 .85rem;
    }

    .summary-item {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      padding: .75rem 0;
      border-bottom: 1px solid #e5e7eb;
    }

    .summary-item:last-child { border-bottom: none; }
    .summary-label { font-weight: 600; color: #6b7280; }
    .summary-value { color: #1f2937; text-align: right; }

    .category-chips { display: flex; flex-wrap: wrap; gap: .75rem; }
    .category-chip { background: #667eea; color: #fff; padding: .5rem 1rem; border-radius: 20px; font-size: .875rem; font-weight: 500; }

    .unsplash-preview-row,
    .ai-images-preview {
      display: flex;
      gap: .5rem;
      flex-wrap: wrap;
      margin-top: .75rem;
      align-items: center;
    }

    .unsplash-preview-thumb,
    .preview-thumbnail {
      width: 64px;
      height: 64px;
      object-fit: cover;
      border-radius: 8px;
      border: 2px solid #e5e7eb;
    }

    .more-images {
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 64px;
      height: 64px;
      background: #f3f4f6;
      border-radius: 8px;
      font-size: .8rem;
      font-weight: 600;
      color: #6b7280;
      border: 2px dashed #d1d5db;
      padding: 0 .5rem;
    }

    .optional-note {
      background: #e0f2fe;
      border-left: 4px solid #0284c7;
      padding: 1rem 1.5rem;
      border-radius: 8px;
      margin-top: 1rem;
      display: flex;
      align-items: center;
      gap: .75rem;
      color: #075985;
      font-size: .95rem;
    }

    .telegram-spotlight {
      display: flex;
      align-items: flex-start;
      gap: 1rem;
      padding: 1.25rem 1.5rem;
      border-radius: 16px;
      background: linear-gradient(135deg, #0f2027 0%, #1a3a4a 50%, #1a1a2e 100%);
      border: 1px solid rgba(255,255,255,.1);
      margin-top: 1rem;
      position: relative;
      overflow: hidden;
    }

    .telegram-spotlight::before {
      content: '';
      position: absolute;
      top: -30px;
      right: -30px;
      width: 120px;
      height: 120px;
      background: radial-gradient(circle, rgba(41,182,246,.25) 0%, transparent 70%);
      border-radius: 50%;
    }

    .telegram-spotlight__icon { font-size: 2.5rem; flex-shrink: 0; line-height: 1; }
    .telegram-spotlight__body { flex: 1; position: relative; z-index: 1; }
    .telegram-spotlight__title { font-size: 1.05rem; font-weight: 700; color: #fff; margin: 0 0 .4rem; }
    .telegram-spotlight__desc { font-size: .875rem; color: rgba(255,255,255,.75); margin: 0 0 .75rem; line-height: 1.5; }
    .telegram-spotlight__points { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: .3rem; }
    .telegram-spotlight__points li { font-size: .8rem; color: rgba(255,255,255,.85); display: flex; align-items: center; gap: .4rem; }
    .telegram-spotlight__points li::before { content: '•'; color: #29b6f6; font-weight: 700; font-size: .85rem; }
    .telegram-spotlight__badge {
      flex-shrink: 0;
      background: linear-gradient(135deg, #29b6f6, #0288d1);
      color: #fff;
      font-size: .7rem;
      font-weight: 700;
      padding: .35rem .75rem;
      border-radius: 20px;
      align-self: flex-start;
      white-space: nowrap;
      letter-spacing: .04em;
      text-transform: uppercase;
      position: relative;
      z-index: 1;
    }

    .sc-btn-primary {
      width: 100%;
      padding: .85rem 1.5rem;
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: #fff;
      border: none;
      border-radius: 14px;
      font-size: 1rem;
      font-weight: 700;
      cursor: pointer;
      transition: opacity .15s, transform .15s;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: .4rem;
    }

    .sc-btn-primary:hover { opacity: .92; transform: translateY(-1px); }
    .sc-btn-primary:disabled { opacity: .55; cursor: not-allowed; transform: none; }

    .sc-btn-outline {
      width: 100%;
      padding: .7rem 1.5rem;
      background: transparent;
      color: #7c3aed;
      border: 1.5px solid #a855f7;
      border-radius: 14px;
      font-size: .875rem;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: .3rem;
      transition: background .15s;
    }

    .sc-btn-outline:hover { background: #f5f3ff; }
    .sc-btn-outline:disabled { opacity: .5; cursor: not-allowed; }

    .wizard-footer {
      display: flex;
      justify-content: space-between;
      gap: .75rem;
      margin-top: 1rem;
    }

    .wizard-footer__btn { flex: 1; }

    .sc-error {
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #dc2626;
      border-radius: 10px;
      padding: .65rem .875rem;
      font-size: .875rem;
      margin-top: 1rem;
    }

    @media (max-width: 640px) {
      .sc-card { padding: 1.5rem 1.25rem; }
      .form-row { grid-template-columns: 1fr; }
      .wizard-footer { flex-direction: column; }
      .telegram-spotlight { flex-direction: column; }
      .sc-stepper { gap: .4rem .2rem; }
      .sc-stepper__line { display: none; }
    }
  `]
})
export class StoreWizardComponent implements OnInit, OnDestroy {
  currentStep = signal(1);
  selectedCategories = signal<string[]>([]);
  selectedBusinessType = signal<string>('SHOP');
  selectedUnsplashImages = signal<UnsplashImage[]>([]);
  carouselImages = signal<UnsplashImage[]>([]);
  carouselLoading = signal(false);
  selectedBannerImage = signal<UnsplashImage | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);

  wizardForm!: FormGroup;
  private nameInput$ = new Subject<string>();
  private nameInputSub?: Subscription;

  steps: WizardStep[] = [
    { id: 1, title: 'wizard.step1Title', subtitle: 'wizard.step1Subtitle', icon: '🏪', completed: false },
    { id: 2, title: 'wizard.step2Title', subtitle: 'wizard.step2Subtitle', icon: '🎯', completed: false },
    { id: 3, title: 'wizard.step3Title', subtitle: 'wizard.step3Subtitle', icon: '📞', completed: false },
    { id: 4, title: 'wizard.step4Title', subtitle: 'wizard.step4Subtitle', icon: '🤖', completed: false, visible: false },
    { id: 5, title: 'wizard.step5Title', subtitle: 'wizard.step5Subtitle', icon: '✅', completed: false }
  ];

  businessTypes = [
    { id: 'SHOP', icon: '🛍️', name: 'Online-Shop', description: 'Produkte, Dropshipping, E-Commerce' },
    { id: 'RESTAURANT', icon: '🍽️', name: 'Restaurant', description: 'Menü, Bestellungen, Tischreservierung' },
    { id: 'RIAD', icon: '🕌', name: 'Riad / Hotel', description: 'Unterkünfte, Zimmer, Touren' }
  ];

  createdStoreId: number | null = null;
  aiProductImages: AiImageData[] = [];

  constructor(
    private fb: FormBuilder,
    private storeService: StoreService,
    private wizardProgressService: WizardProgressService,
    private unsplashService: UnsplashService,
    private router: Router
  ) {
    this.initializeForm();
  }

  private initializeForm(): void {
    this.wizardForm = this.fb.group({
      storeName: this.fb.control('', [Validators.required]),
      storeSlug: this.fb.control('', [Validators.required, Validators.pattern(/^[a-z0-9-]+$/)]),
      description: this.fb.control('', []),
      businessType: this.fb.control('SHOP', []),
      email: this.fb.control('', []),
      phone: this.fb.control('', []),
      whatsappNumber: this.fb.control('', []),
      whatsappNotificationsEnabled: this.fb.control(false, []),
      address: this.fb.control('', []),
      city: this.fb.control('', []),
      postalCode: this.fb.control('', []),
      telegramUrl: this.fb.control('', []),
      facebookUrl: this.fb.control('', []),
      instagramUrl: this.fb.control('', []),
      tiktokUrl: this.fb.control('', [])
    });

    const storeNameControl = this.wizardForm.get('storeName');
    const storeSlugControl = this.wizardForm.get('storeSlug');

    if (storeNameControl && storeSlugControl) {
      storeNameControl.valueChanges.subscribe((name) => {
        if (name && !storeSlugControl.dirty) {
          const slug = name
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim();
          storeSlugControl.setValue(slug, { emitEvent: false });
        }
      });
    }
  }

  ngOnInit(): void {
    if (this.hasStore()) {
      this.router.navigate(['/dashboard']);
      return;
    }

    this.nameInputSub = this.nameInput$.pipe(
      debounceTime(600),
      distinctUntilChanged()
    ).subscribe((name) => {
      if (name.length >= 3) {
        this.loadCarousel(name);
      } else {
        this.carouselImages.set([]);
        this.selectedBannerImage.set(null);
        this.selectedUnsplashImages.set([]);
      }
    });

    this.loadSavedProgress();
  }

  ngOnDestroy(): void {
    this.nameInputSub?.unsubscribe();
  }

  onStoreNameInput(value: string): void {
    this.nameInput$.next(value.trim());
  }

  loadCarousel(query: string): void {
    this.carouselLoading.set(true);
    const category = this.selectedBusinessType() || 'store';
    this.unsplashService.getSuggestions(category, query, 1).subscribe({
      next: (res) => {
        this.carouselLoading.set(false);
        const images = res.images?.slice(0, 6) || [];
        this.carouselImages.set(images);
        if (images.length > 0) {
          const currentSelection = this.selectedBannerImage();
          const nextSelection = currentSelection && images.some((img) => img.id === currentSelection.id)
            ? currentSelection
            : images[0];
          this.selectedBannerImage.set(nextSelection);
          this.selectedUnsplashImages.set(nextSelection ? [nextSelection] : []);
        } else {
          this.selectedBannerImage.set(null);
          this.selectedUnsplashImages.set([]);
        }
      },
      error: () => {
        this.carouselLoading.set(false);
      }
    });
  }

  selectBannerImage(img: UnsplashImage): void {
    this.selectedBannerImage.set(img);
    this.selectedUnsplashImages.set([img]);
  }

  hasStore(): boolean {
    return false;
  }

  private loadSavedProgress(): void {
    this.wizardProgressService.loadProgress().subscribe({
      next: (progress) => {
        if (progress && progress.status === 'IN_PROGRESS') {
          this.currentStep.set(progress.currentStep);

          if (progress.completedSteps) {
            progress.completedSteps.forEach((stepNum) => {
              if (stepNum > 0 && stepNum <= this.steps.length) {
                this.steps[stepNum - 1].completed = true;
              }
            });
          }

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

            if (progress.data.selectedCategories) {
              this.selectedCategories.set(progress.data.selectedCategories);
            }

            const savedName = progress.data.storeName || '';
            if (savedName.length >= 3) {
              this.nameInput$.next(savedName);
            }
          }
        }
      },
      error: () => {
        console.log('ℹ️ Kein gespeicherter Fortschritt gefunden. Starte neu.');
      }
    });
  }

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
      completedSteps: this.steps.filter((step) => step.completed).map((step) => step.id)
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
      case 3:
      case 4:
      default:
        return true;
    }
  }

  nextStep(): void {
    if (!this.canProceed()) {
      return;
    }

    const current = this.currentStep();
    if (current === 3 && !this.createdStoreId) {
      this.createStoreForAiStep();
      return;
    }

    this.steps[current - 1].completed = true;
    this.currentStep.set(current + 1);
    this.saveCurrentProgress();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

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
        businessType: this.selectedBusinessType() || 'SHOP',
        seedSampleData: this.selectedBusinessType() !== 'SHOP',
        whatsappNumber: formValue.whatsappNumber || null,
        whatsappNotificationsEnabled: formValue.whatsappNotificationsEnabled || false,
        contactInfo: {
          email: formValue.email || null,
          phone: formValue.phone || null,
          address: formValue.address || null,
          city: formValue.city || null,
          postalCode: formValue.postalCode || null
        },
        telegramUrl: formValue.telegramUrl || null,
        facebookUrl: formValue.facebookUrl || null,
        instagramUrl: formValue.instagramUrl || null,
        tiktokUrl: formValue.tiktokUrl || null
      };

      const result = await this.storeService.createStore(storeData).toPromise();
      if (!result || !result.id) {
        throw new Error('Store konnte nicht erstellt werden');
      }

      this.createdStoreId = result.id;
      await this.applyUnsplashImages(result.id);
      this.steps[2].completed = true;
      this.currentStep.set(4);
      this.loading.set(false);
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
      this.saveCurrentProgress();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  goToStep(stepId: number): void {
    if (stepId < this.currentStep() || this.steps[stepId - 1].completed) {
      this.currentStep.set(stepId);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  selectBusinessType(type: string): void {
    this.selectedBusinessType.set(type);
    this.wizardForm.patchValue({ businessType: type });
    const storeName = (this.wizardForm.get('storeName')?.value ?? '').trim();
    if (storeName.length >= 3) {
      this.loadCarousel(storeName);
    }
  }

  private async applyUnsplashImages(storeId: number): Promise<void> {
    const selectedBanner = this.selectedBannerImage();
    const images = selectedBanner ? [selectedBanner] : this.selectedUnsplashImages();
    if (!images.length) {
      return;
    }

    try {
      await this.unsplashService.applyImages(storeId, images, 'SLIDER').toPromise();
    } catch (err) {
      console.warn('⚠️ Unsplash-Bilder konnten nicht angewendet werden (nicht kritisch):', err);
    }
  }

  toggleCategory(categoryId: string): void {
    const current = this.selectedCategories();
    if (current.includes(categoryId)) {
      this.selectedCategories.set(current.filter((id) => id !== categoryId));
    } else {
      this.selectedCategories.set([...current, categoryId]);
    }
  }

  getCategoryName(categoryId: string): string {
    return this.businessTypes.find((bt) => bt.id === categoryId)?.name || categoryId;
  }

  skip(): void {
    this.wizardProgressService.skipWizard().subscribe({
      next: () => {
        console.log('⏭️ Wizard übersprungen');
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        console.error('❌ Fehler beim Überspringen:', err);
        this.router.navigate(['/dashboard']);
      }
    });
  }

  async createStore(): Promise<void> {
    if (this.createdStoreId) {
      this.wizardProgressService.completeWizard(this.createdStoreId).subscribe({
        next: () => console.log('✅ Wizard als abgeschlossen markiert'),
        error: (err) => console.warn('⚠️ Fehler beim Markieren:', err)
      });

      this.router.navigate(['/stores', this.createdStoreId, 'onboarding'], {
        queryParams: { newStore: 'true' }
      });
      return;
    }

    if (this.wizardForm.invalid) {
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
        businessType: this.selectedBusinessType() || 'SHOP',
        seedSampleData: this.selectedBusinessType() !== 'SHOP',
        whatsappNumber: formValue.whatsappNumber || null,
        whatsappNotificationsEnabled: formValue.whatsappNotificationsEnabled || false,
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
      await this.applyUnsplashImages(result.id);
      this.wizardProgressService.completeWizard(result.id).subscribe({
        next: () => console.log('✅ Wizard als abgeschlossen markiert'),
        error: (err) => console.warn('⚠️ Fehler beim Markieren:', err)
      });

      setTimeout(() => {
        this.router.navigate(['/stores', result.id, 'onboarding'], {
          queryParams: { newStore: 'true' }
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
    void selected;
  }
}
