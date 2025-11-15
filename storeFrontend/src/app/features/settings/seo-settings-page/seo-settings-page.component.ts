import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { SeoApiService, SeoSettingsDTO } from '../../../core/services/seo-api.service';

@Component({
  selector: 'app-seo-settings-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatCheckboxModule,
    MatChipsModule,
    MatSlideToggleModule
  ],
  templateUrl: './seo-settings-page.component.html',
  styleUrls: ['./seo-settings-page.component.scss']
})
export class SeoSettingsPageComponent implements OnInit {
  storeId!: number;
  settingsForm!: FormGroup;
  loading = false;
  saving = false;
  ogImagePreview?: string;
  ogImageFile?: File;
  hreflangEntries: any[] = [];

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private seoApi: SeoApiService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.storeId = Number(this.route.snapshot.paramMap.get('storeId'));
    this.initForm();
    this.loadSettings();
  }

  initForm(): void {
    this.settingsForm = this.fb.group({
      siteName: ['', Validators.required],
      defaultTitleTemplate: [''],
      defaultMetaTitle: ['', Validators.required],
      defaultMetaDescription: ['', [Validators.required, Validators.maxLength(160)]],
      defaultMetaKeywords: [''],
      ogDefaultImagePath: [''],
      ogDefaultImageUrl: [''],
      twitterHandle: [''],
      facebookPageUrl: [''],
      instagramUrl: [''],
      youtubeUrl: [''],
      linkedinUrl: [''],
      robotsIndex: [true],
      enableRobotsTxt: [true],
      robotsTxtContent: [''],
      enableSitemapXml: [true],
      sitemapChangefreq: ['weekly'],
      sitemapPriority: [0.7],
      canonicalBaseUrl: ['', Validators.required]
    });
  }

  loadSettings(): void {
    this.loading = true;
    this.seoApi.getSeoSettings(this.storeId).subscribe({
      next: (settings) => {
        this.settingsForm.patchValue(settings);
        this.hreflangEntries = settings.hreflangConfig || [];
        this.ogImagePreview = settings.ogDefaultImageUrl;
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load SEO settings', err);
        this.snackBar.open('Fehler beim Laden der Einstellungen', 'OK', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  onSave(): void {
    if (this.settingsForm.invalid) {
      this.snackBar.open('Bitte füllen Sie alle Pflichtfelder aus', 'OK', { duration: 3000 });
      return;
    }

    this.saving = true;
    const settings: SeoSettingsDTO = {
      ...this.settingsForm.value,
      storeId: this.storeId,
      hreflangConfig: this.hreflangEntries
    };

    this.seoApi.updateSeoSettings(this.storeId, settings).subscribe({
      next: () => {
        this.snackBar.open('✅ Einstellungen gespeichert', 'OK', { duration: 3000 });
        this.saving = false;
      },
      error: (err) => {
        console.error('Failed to save settings', err);
        this.snackBar.open('❌ Fehler beim Speichern', 'OK', { duration: 3000 });
        this.saving = false;
      }
    });
  }

  onReset(): void {
    this.loadSettings();
  }

  onImageSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.ogImageFile = input.files[0];

      // Preview
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.ogImagePreview = e.target.result;
      };
      reader.readAsDataURL(this.ogImageFile);

      // Upload
      this.uploadImage();
    }
  }

  uploadImage(): void {
    if (!this.ogImageFile) return;

    this.saving = true;
    this.seoApi.uploadAsset(this.storeId, this.ogImageFile).subscribe({
      next: (response) => {
        this.snackBar.open('✅ Bild hochgeladen', 'OK', { duration: 2000 });
        this.settingsForm.patchValue({ ogDefaultImagePath: response.path });
        this.saving = false;
      },
      error: (err) => {
        console.error('Failed to upload image', err);
        this.snackBar.open('❌ Upload fehlgeschlagen', 'OK', { duration: 3000 });
        this.saving = false;
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
}

