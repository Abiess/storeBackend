import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SeoApiService, SeoSettingsDTO } from '../../../core/services/seo-api.service';
import { StoreNavigationComponent } from '@app/shared/components/store-navigation.component';

@Component({
  selector: 'app-seo-settings-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    RouterModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatSlideToggleModule,
    MatTooltipModule,
    StoreNavigationComponent
  ],
  templateUrl: './seo-settings-page.component.html',
  styleUrls: ['./seo-settings-page.component.scss']
})
export class SeoSettingsPageComponent implements OnInit {
  storeId!: number;
  settingsForm!: FormGroup;
  loading = false;
  saving = false;
  saveSuccess = false;
  ogImagePreview?: string;
  ogImageUploading = false;
  hreflangEntries: { langCode: string; absoluteUrlBase: string }[] = [];

  /** Zeichen-Counter für Meta-Description */
  get descLength(): number {
    return this.settingsForm?.get('defaultMetaDescription')?.value?.length ?? 0;
  }

  /** Google SERP-Vorschau */
  get serpTitle(): string {
    return this.settingsForm?.get('siteName')?.value || 'Dein Shop';
  }
  get serpUrl(): string {
    return this.settingsForm?.get('canonicalBaseUrl')?.value || 'https://dein-shop.markt.ma';
  }
  get serpDesc(): string {
    return this.settingsForm?.get('defaultMetaDescription')?.value || 'Willkommen in unserem Shop ...';
  }

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private seoApi: SeoApiService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    // 3-stufige StoreId-Extraktion
    let id = this.route.snapshot.paramMap.get('storeId') || this.route.snapshot.paramMap.get('id');
    if (!id && this.route.parent) {
      id = this.route.parent.snapshot.paramMap.get('storeId') || this.route.parent.snapshot.paramMap.get('id');
    }
    if (!id) {
      const m = this.router.url.match(/\/stores\/(\d+)/);
      if (m) id = m[1];
    }
    this.storeId = Number(id);

    if (!this.storeId || isNaN(this.storeId)) {
      this.snackBar.open('❌ Store-ID nicht gefunden', 'OK', { duration: 4000 });
      this.router.navigate(['/dashboard']);
      return;
    }

    this.initForm();
    this.loadSettings();
  }

  initForm(): void {
    this.settingsForm = this.fb.group({
      siteName:               ['', Validators.required],
      defaultTitleTemplate:   [''],
      defaultMetaDescription: ['', [Validators.required, Validators.maxLength(160)]],
      defaultMetaKeywords:    [''],
      canonicalBaseUrl:       [''],
      // Social
      twitterHandle:   [''],
      facebookPageUrl: [''],
      instagramUrl:    [''],
      youtubeUrl:      [''],
      linkedinUrl:     [''],
      // OG Image
      ogDefaultImageUrl:  [''],
      ogDefaultImagePath: [''],
      // Technical
      robotsIndex:     [true],
      enableSitemapXml:[true],
      robotsTxtContent:['']
    });
  }

  loadSettings(): void {
    this.loading = true;
    this.seoApi.getSeoSettings(this.storeId).subscribe({
      next: (settings: any) => {
        this.settingsForm.patchValue({
          siteName:               settings.siteName               || '',
          defaultTitleTemplate:   settings.defaultTitleTemplate   || '',
          defaultMetaDescription: settings.defaultMetaDescription || '',
          defaultMetaKeywords:    settings.defaultMetaKeywords    || '',
          canonicalBaseUrl:       settings.canonicalBaseUrl       || '',
          twitterHandle:          settings.twitterHandle          || '',
          facebookPageUrl:        settings.facebookPageUrl        || '',
          instagramUrl:           settings.instagramUrl           || '',
          youtubeUrl:             settings.youtubeUrl             || '',
          linkedinUrl:            settings.linkedinUrl            || '',
          ogDefaultImageUrl:      settings.ogDefaultImageUrl      || '',
          ogDefaultImagePath:     settings.ogDefaultImagePath     || '',
          robotsIndex:            settings.robotsIndex   ?? true,
          enableSitemapXml:       settings.enableSitemapXml ?? true,
          robotsTxtContent:       settings.robotsTxtContent || ''
        });

        this.ogImagePreview = settings.ogDefaultImageUrl || undefined;

        // Hreflang JSON parsen
        if (settings.hreflangConfigJson) {
          try {
            this.hreflangEntries = JSON.parse(settings.hreflangConfigJson);
          } catch { this.hreflangEntries = []; }
        }
        this.loading = false;
      },
      error: (err: unknown) => {
        console.error('SEO settings load error:', err);
        this.snackBar.open('⚠️ Einstellungen konnten nicht geladen werden', 'OK', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  onSave(): void {
    if (this.settingsForm.invalid) {
      this.settingsForm.markAllAsTouched();
      this.snackBar.open('⚠️ Bitte Pflichtfelder ausfüllen', 'OK', { duration: 3000 });
      return;
    }

    this.saving = true;
    const dto: SeoSettingsDTO = {
      ...this.settingsForm.value,
      storeId: this.storeId,
      hreflangConfigJson: JSON.stringify(this.hreflangEntries)
    } as any;

    this.seoApi.updateSeoSettings(this.storeId, dto).subscribe({
      next: () => {
        this.saving = false;
        this.saveSuccess = true;
        setTimeout(() => this.saveSuccess = false, 3000);
        this.snackBar.open('✅ SEO-Einstellungen gespeichert', '', { duration: 2500 });
      },
      error: (err: unknown) => {
        console.error('SEO save error:', err);
        this.saving = false;
        this.snackBar.open('❌ Fehler beim Speichern', 'OK', { duration: 3000 });
      }
    });
  }

  onReset(): void {
    this.loadSettings();
  }

  onImageSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    // Sofort-Preview
    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      this.ogImagePreview = e.target?.result as string;
    };
    reader.readAsDataURL(file);

    // Upload
    this.ogImageUploading = true;
    this.seoApi.uploadSeoAsset(this.storeId, 'og-image', file).subscribe({
      next: (res: any) => {
        this.settingsForm.patchValue({ ogDefaultImagePath: res.path, ogDefaultImageUrl: res.publicUrl });
        this.ogImagePreview = res.publicUrl;
        this.ogImageUploading = false;
        this.snackBar.open('✅ Bild hochgeladen', '', { duration: 2000 });
      },
      error: () => {
        this.ogImageUploading = false;
        this.snackBar.open('❌ Upload fehlgeschlagen', 'OK', { duration: 3000 });
      }
    });
  }

  addHreflang(): void {
    this.hreflangEntries.push({ langCode: '', absoluteUrlBase: '' });
  }

  removeHreflang(index: number): void {
    this.hreflangEntries.splice(index, 1);
  }

  trackByIndex(index: number): number {
    return index;
  }

  navigateBack(): void {
    this.router.navigate(['/stores', this.storeId, 'settings']);
  }
}
