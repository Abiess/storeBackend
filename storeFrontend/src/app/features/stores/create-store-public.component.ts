import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { AuthService } from '@app/core/services/auth.service';
import { TranslationService } from '@app/core/services/translation.service';
import { environment } from '@env/environment';
import { UnsplashService, UnsplashImage } from '@app/core/services/unsplash.service';
import { TranslatePipe } from '@app/core/pipes/translate.pipe';
import { StoreCreationShellComponent } from '@app/shared/components/store-creation-shell.component';

interface CreateStoreResponse {
  token: string;
  storeId: number;
  storeSlug: string;
  storeUrl: string;
  userId: number;
  userEmail: string;
  isAnonymous: boolean;
  message: string;
}

@Component({
  selector: 'app-create-store-public',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslatePipe, StoreCreationShellComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-store-creation-shell>
      <a routerLink="/login" slot="header-right" class="sc-login-link">{{ 'auth.alreadyRegistered' | translate }}</a>

      @if (step() === 'form') {
        <div class="sc-card animate-in">
          <div class="sc-card__eyebrow">{{ 'createStorePublic.eyebrow' | translate }}</div>
          <h1 class="sc-card__title">{{ 'createStorePublic.title' | translate }}</h1>

          <form [formGroup]="form" (ngSubmit)="submit()">
            <div class="sc-field">
              <label class="sc-label">{{ 'createStorePublic.storeNameLabel' | translate }} *</label>
              <input
                type="text"
                formControlName="storeName"
                class="sc-input"
                [placeholder]="'createStorePublic.storeNamePlaceholder' | translate"
                (input)="onStoreNameInput($any($event.target).value)"
                [class.error]="form.get('storeName')?.invalid && form.get('storeName')?.touched"
              />
              @if (form.get('storeName')?.invalid && form.get('storeName')?.touched) {
                <p class="sc-field-error">{{ 'createStorePublic.storeNameError' | translate }}</p>
              }
            </div>

            @if (carouselImages().length > 0 || carouselLoading()) {
              <div class="sc-carousel-wrap animate-fade-in">
                <div class="sc-carousel-header">
                  <span class="sc-carousel-label">{{ 'createStorePublic.bannerLabel' | translate }}</span>
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
                      <img [src]="img.thumbUrl" [alt]="img.description || 'Store banner'" loading="lazy" />
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
                    {{ 'createStorePublic.photoBy' | translate }}
                    <a [href]="selectedBannerImage()?.authorUrl" target="_blank" rel="noreferrer">{{ selectedBannerImage()?.authorName }}</a>
                    · {{ 'createStorePublic.unsplash' | translate }}
                  </p>
                }
              </div>
            }

            <div class="sc-field">
              <label class="sc-label">{{ 'createStorePublic.categoryLabel' | translate }}</label>
              <div class="sc-cat-grid">
                @for (cat of categories; track cat.id) {
                  <button
                    type="button"
                    class="sc-cat-btn"
                    [class.active]="selectedCategory() === cat.id"
                    (click)="selectCategory(cat.id)">
                    {{ cat.icon }} {{ cat.name }}
                  </button>
                }
              </div>
            </div>

            @if (errorMsg()) {
              <div class="sc-error">⚠️ {{ errorMsg() }}</div>
            }

            <button type="submit" class="sc-btn-primary" [disabled]="loading() || form.invalid">
              @if (loading()) {
                <span class="sc-spinner"></span> {{ 'createStorePublic.submitCreating' | translate }}
              } @else {
                {{ 'createStorePublic.submitBtn' | translate }}
              }
            </button>

            <p class="sc-privacy">{{ 'createStorePublic.privacy' | translate }}</p>
          </form>
        </div>
      }

      @if (step() === 'done') {
        <div class="sc-card animate-in sc-done">
          <div class="sc-done__icon">🎉</div>
          <h1 class="sc-card__title">{{ 'createStorePublic.doneTitle' | translate }}</h1>
          <p class="sc-card__sub">{{ storeName() }}</p>
          <div class="sc-done__actions">
            <button class="sc-btn-primary" (click)="goToDashboard()">{{ 'createStorePublic.addProducts' | translate }}</button>
            <a class="sc-done__link" [href]="storeUrl()" target="_blank" rel="noreferrer">{{ 'createStorePublic.viewStore' | translate }}</a>
          </div>
          <div class="sc-account-box">
            <h3>{{ 'createStorePublic.saveEmailTitle' | translate }}</h3>
            <p>{{ 'createStorePublic.saveEmailSubtitle' | translate }}</p>
            @if (!emailSent()) {
              <div class="sc-email-row">
                <input
                  type="email"
                  [value]="emailToSave()"
                  (input)="emailToSave.set($any($event.target).value)"
                  [placeholder]="'createStorePublic.emailPlaceholder' | translate"
                  class="sc-input sc-input--light"
                />
                <button class="sc-btn-send" [disabled]="emailSaving() || !emailToSave().includes('@')" (click)="sendAccessEmail()">
                  @if (emailSaving()) {
                    <span class="sc-spinner"></span>
                  } @else {
                    {{ 'createStorePublic.sendBtn' | translate }}
                  }
                </button>
              </div>
              @if (emailError()) {
                <p class="sc-field-error">{{ emailError() }}</p>
              }
              <p class="sc-skip" (click)="goToDashboard()">{{ 'createStorePublic.skip' | translate }}</p>
            } @else {
              <p class="sc-email-ok">✅ {{ ('createStorePublic.emailSent' | translate).replace('{{email}}', emailToSave()) }}</p>
              @if (!pwLinkSent()) {
                <button class="sc-btn-outline" [disabled]="pwLinkSending()" (click)="requestPasswordLink()">
                  @if (pwLinkSending()) {
                    <span class="sc-spinner"></span>
                  } @else {
                    🔑 {{ 'createStorePublic.setPasswordBtn' | translate }}
                  }
                </button>
              } @else {
                <p class="sc-email-ok">📬 {{ 'createStorePublic.setPasswordSent' | translate }}</p>
              }
            }
          </div>
        </div>
      }
    </app-store-creation-shell>
  `,
  styles: [`
    .sc-login-link { color: rgba(255,255,255,.85); font-size: .82rem; text-decoration: none; }
    .sc-login-link:hover { color: #fff; text-decoration: underline; }

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
    .sc-input--light { background: #f5f3ff; border-color: #d8b4fe; }
    .sc-field-error { color: #dc2626; font-size: .78rem; margin: .25rem 0 0; }

    .sc-carousel-wrap {
      background: #f8f7ff;
      border-radius: 14px;
      padding: .75rem;
      margin-bottom: 1.1rem;
      border: 1.5px solid #e9d5ff;
    }

    .sc-carousel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: .6rem;
    }

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
      margin-top: .5rem;
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
      margin-top: .6rem;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: .3rem;
      transition: background .15s;
    }

    .sc-btn-outline:hover { background: #f5f3ff; }
    .sc-btn-outline:disabled { opacity: .5; cursor: not-allowed; }

    .sc-btn-send {
      padding: .65rem 1rem;
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: #fff;
      border: none;
      border-radius: 10px;
      font-size: .875rem;
      font-weight: 700;
      cursor: pointer;
      white-space: nowrap;
      display: flex;
      align-items: center;
      gap: .3rem;
    }

    .sc-btn-send:disabled { opacity: .55; cursor: not-allowed; }

    .sc-spinner {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255,255,255,.3);
      border-top-color: #fff;
    }

    .sc-error {
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #dc2626;
      border-radius: 10px;
      padding: .65rem .875rem;
      font-size: .875rem;
      margin-bottom: .75rem;
    }

    .sc-privacy { text-align: center; font-size: .75rem; color: #9ca3af; margin: .5rem 0 0; }

    .sc-done { text-align: center; }
    .sc-done__icon { font-size: 3.5rem; margin-bottom: .5rem; }
    .sc-done__actions { display: flex; flex-direction: column; gap: .75rem; margin: 1.25rem 0; }
    .sc-done__link { color: #667eea; font-size: .9rem; font-weight: 600; text-decoration: none; }
    .sc-done__link:hover { text-decoration: underline; }

    .sc-account-box {
      background: #faf5ff;
      border: 1.5px solid #e9d5ff;
      border-radius: 14px;
      padding: 1rem;
      text-align: left;
    }

    .sc-account-box h3 { font-size: .95rem; color: #6b21a8; margin: 0 0 .3rem; }
    .sc-account-box p { font-size: .82rem; color: #6b7280; margin: 0 0 .65rem; }
    .sc-email-row { display: flex; gap: .5rem; margin-bottom: .5rem; }
    .sc-email-ok { font-size: .875rem; color: #16a34a; margin: 0; }
    .sc-skip { font-size: .78rem; color: #9ca3af; cursor: pointer; text-align: right; margin: .25rem 0 0; }
    .sc-skip:hover { color: #667eea; }

    @media (max-width: 480px) {
      .sc-card { padding: 1.5rem 1.25rem; }
      .sc-card__title { font-size: 1.3rem; }
      .sc-email-row { flex-direction: column; }
    }
  `]
})
export class CreateStorePublicComponent implements OnInit, OnDestroy {
  step = signal<'form' | 'done'>('form');
  loading = signal(false);
  errorMsg = signal('');
  selectedCategory = signal('');
  storeName = signal('');
  storeSlug = signal('');
  storeUrl = signal('');
  selectedUnsplashImages = signal<UnsplashImage[]>([]);
  carouselImages = signal<UnsplashImage[]>([]);
  carouselLoading = signal(false);
  selectedBannerImage = signal<UnsplashImage | null>(null);
  emailToSave = signal('');
  emailSaving = signal(false);
  emailSent = signal(false);
  emailError = signal('');
  pwLinkSending = signal(false);
  pwLinkSent = signal(false);
  pwLinkError = signal('');
  private createdStoreId = 0;
  private nameInput$ = new Subject<string>();
  private nameInputSub?: Subscription;

  categories = [
    { id: 'fashion', icon: '👗', name: 'Mode' },
    { id: 'electronics', icon: '📱', name: 'Elektronik' },
    { id: 'food', icon: '🍕', name: 'Lebensmittel' },
    { id: 'beauty', icon: '💄', name: 'Beauty' },
    { id: 'home', icon: '🏠', name: 'Heim' },
    { id: 'other', icon: '📦', name: 'Sonstiges' }
  ];

  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router,
    private authService: AuthService,
    private unsplashService: UnsplashService,
    private translationService: TranslationService
  ) {
    this.form = this.fb.group({
      storeName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(80)]]
    });
  }

  ngOnInit(): void {
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
  }

  ngOnDestroy(): void {
    this.nameInputSub?.unsubscribe();
  }

  selectCategory(id: string): void {
    this.selectedCategory.set(id === this.selectedCategory() ? '' : id);
    const storeName = (this.form.get('storeName')?.value ?? '').trim();
    if (storeName.length >= 3) {
      this.loadCarousel(storeName);
    }
  }

  onStoreNameInput(value: string): void {
    this.nameInput$.next(value.trim());
  }

  loadCarousel(query: string): void {
    this.carouselLoading.set(true);
    const category = this.selectedCategory() || 'store';
    this.unsplashService.getSuggestions(category, query, 1).subscribe({
      next: (res) => {
        this.carouselLoading.set(false);
        const images = res.images?.slice(0, 6) || [];
        this.carouselImages.set(images);
        if (images.length > 0) {
          const existingSelection = this.selectedBannerImage();
          const nextSelection = existingSelection && images.some((img) => img.id === existingSelection.id)
            ? existingSelection
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

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.errorMsg.set('');

    const name: string = this.form.value.storeName.trim();
    const slugBase = name.toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .substring(0, 30);

    const payload = {
      storeName: name,
      storeSlug: slugBase,
      category: this.selectedCategory() || 'other'
    };

    this.http.post<CreateStoreResponse>(`${environment.apiUrl}/public/create-store`, payload).subscribe({
      next: (res) => {
        this.loading.set(false);
        localStorage.setItem('auth_token', res.token);
        localStorage.setItem('currentUser', JSON.stringify({
          id: res.userId,
          email: res.userEmail,
          name,
          role: 'USER',
          roles: ['USER']
        }));
        this.authService.setAuthFromStorage();
        this.createdStoreId = res.storeId;
        this.storeName.set(name);
        this.storeSlug.set(res.storeSlug);
        this.storeUrl.set(res.storeUrl ?? ('https://' + res.storeSlug + '.markt.ma'));
        this.applyUnsplashImages(res.storeId).then(() => this.step.set('done'));
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMsg.set(err?.error?.message || this.translationService.translate('createStorePublic.errorCreatingStore'));
      }
    });
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

  goToDashboard(): void {
    this.router.navigate(['/stores', this.createdStoreId]);
  }

  sendAccessEmail(): void {
    const email = this.emailToSave().trim();
    if (!email || !email.includes('@')) {
      return;
    }
    this.emailSaving.set(true);
    this.emailError.set('');

    this.http.post<{ token: string; message: string }>(
      `${environment.apiUrl}/public/create-store/save-email`,
      { email, storeId: this.createdStoreId },
      { headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` } }
    ).subscribe({
      next: (res) => {
        if (res.token) {
          localStorage.setItem('auth_token', res.token);
          const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
          user.email = email;
          localStorage.setItem('currentUser', JSON.stringify(user));
          this.authService.setAuthFromStorage();
        }
        this.emailSaving.set(false);
        this.emailSent.set(true);
      },
      error: (err) => {
        this.emailSaving.set(false);
        this.emailError.set(err?.error?.message || this.translationService.translate('createStorePublic.emailError'));
      }
    });
  }

  requestPasswordLink(): void {
    const email = this.emailToSave().trim();
    if (!email.includes('@')) {
      return;
    }
    this.pwLinkSending.set(true);
    this.pwLinkError.set('');
    this.http.post(`${environment.apiUrl}/auth/forgot-password`, { email }).subscribe({
      next: () => {
        this.pwLinkSending.set(false);
        this.pwLinkSent.set(true);
      },
      error: () => {
        this.pwLinkSending.set(false);
        this.pwLinkError.set('Fehler');
      }
    });
  }
}
