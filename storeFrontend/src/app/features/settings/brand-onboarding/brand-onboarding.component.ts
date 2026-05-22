import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router } from '@angular/router';
import { BrandService, BrandGenerateRequest, BrandGenerateResponse } from '../../../core/services/brand.service';
import { MediaService } from '../../../core/services/media.service';
import { StoreService } from '../../../core/services/store.service';
import { ProductnavigationBarComponent } from '@app/features/productnavigation-bar/productnavigation-bar.component';

@Component({
    selector: 'app-brand-onboarding',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatButtonModule,
        MatCardModule,
        MatChipsModule,
        MatProgressSpinnerModule,
        MatIconModule,
        ProductnavigationBarComponent
    ],
    templateUrl: './brand-onboarding.component.html',
    styleUrls: ['./brand-onboarding.component.scss']
})
export class BrandOnboardingComponent implements OnInit {
    private fb = inject(FormBuilder);
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private brandService = inject(BrandService);
    private mediaService = inject(MediaService);
    private storeService = inject(StoreService);

    brandForm!: FormGroup;
    storeId: number | null = null;
    storeName: string | null = null;      // ← vorgeladener Shop-Name
    loading = false;
    generatedBrand: BrandGenerateResponse | null = null;
    previewPalette: { [key: string]: string } = {};

    // Logo Upload State
    logoPreview: string | null = null;
    uploadedLogoUrl: string | null = null;
    uploading = false;
    uploadProgress = 0;
    uploadError: string | null = null;

    styles = [
        { value: 'minimal', label: 'Minimal' },
        { value: 'playful', label: 'Playful' },
        { value: 'geometric', label: 'Geometric' },
        { value: 'organic', label: 'Organic' }
    ];

    preferredColors: string[] = [];
    forbiddenColors: string[] = [];

    ngOnInit(): void {
        this.storeId = this.extractStoreId();

        console.log('✅ BrandOnboarding storeId:', this.storeId);

        this.brandForm = this.fb.group({
            shopName: [{ value: '', disabled: true }, Validators.required],  // Read-only: kommt aus Store
            slogan: [''],
            industry: [''],
            style: ['minimal', Validators.required],
            preferredColorInput: [''],
            forbiddenColorInput: ['']
        });

        // Store-Name laden und Feld vorausfüllen
        if (this.storeId !== null) {
            this.storeService.getStoreById(this.storeId).subscribe({
                next: (store) => {
                    this.storeName = store.name;
                    this.brandForm.patchValue({ shopName: store.name });
                },
                error: (err) => console.error('Fehler beim Laden des Stores:', err)
            });
        }
    }

    private extractStoreId(): number | null {
        // 3-stufige StoreId-Extraktion (Workspace-Standard)
        let id: string | null = this.route.snapshot.paramMap.get('storeId') || this.route.snapshot.paramMap.get('id');
        if (!id && this.route.parent) {
            id = this.route.parent.snapshot.paramMap.get('storeId') || this.route.parent.snapshot.paramMap.get('id');
        }
        if (!id) {
            const m = this.router.url.match(/\/stores\/(\d+)/);
            if (m) id = m[1];
        }
        if (id === null) return null;
        const parsed = Number(id);
        return Number.isNaN(parsed) ? null : parsed;
    }


    addPreferredColor(): void {
        const colorInput = this.brandForm.get('preferredColorInput')?.value;
        if (colorInput && this.isValidHexColor(colorInput)) {
            this.preferredColors.push(colorInput);
            this.brandForm.patchValue({ preferredColorInput: '' });
        }
    }

    removePreferredColor(color: string): void {
        this.preferredColors = this.preferredColors.filter(c => c !== color);
    }

    addForbiddenColor(): void {
        const colorInput = this.brandForm.get('forbiddenColorInput')?.value;
        if (colorInput && this.isValidHexColor(colorInput)) {
            this.forbiddenColors.push(colorInput);
            this.brandForm.patchValue({ forbiddenColorInput: '' });
        }
    }

    removeForbiddenColor(color: string): void {
        this.forbiddenColors = this.forbiddenColors.filter(c => c !== color);
    }

    isValidHexColor(color: string): boolean {
        return /^#[0-9A-F]{6}$/i.test(color);
    }

    generateBrand(): void {
        if (this.brandForm.valid && this.storeId != null) {
            this.loading = true;
            const raw = this.brandForm.getRawValue();   // ← getRawValue holt auch disabled fields

            const request: BrandGenerateRequest = {
                shopName: raw.shopName,
                slogan: raw.slogan,
                industry: raw.industry,
                style: raw.style,
                preferredColors: this.preferredColors.length > 0 ? this.preferredColors : undefined,
                forbiddenColors: this.forbiddenColors.length > 0 ? this.forbiddenColors : undefined
            };

            this.brandService.generate(this.storeId, request).subscribe({
                next: (response: BrandGenerateResponse) => {
                    this.generatedBrand = response;
                    this.previewPalette = response.paletteTokens;
                    this.applyPaletteToPreview();
                    this.loading = false;
                },
                error: (error: unknown) => {
                    console.error('Failed to generate brand kit', error);
                    this.loading = false;
                }
            });
        }
    }

    regenerateBrand(): void {
        if (this.brandForm.valid && this.storeId != null) {
            this.loading = true;
            const raw = this.brandForm.getRawValue();

            const request: BrandGenerateRequest = {
                shopName: raw.shopName,
                slogan: raw.slogan,
                industry: raw.industry,
                style: raw.style,
                preferredColors: this.preferredColors.length > 0 ? this.preferredColors : undefined,
                forbiddenColors: this.forbiddenColors.length > 0 ? this.forbiddenColors : undefined,
                salt: Math.random().toString(36).substring(7)
            };

            this.brandService.generate(this.storeId, request).subscribe({
                next: (response: BrandGenerateResponse) => {
                    this.generatedBrand = response;
                    this.previewPalette = response.paletteTokens;
                    this.applyPaletteToPreview();
                    this.loading = false;
                },
                error: (error: unknown) => {
                    console.error('Failed to regenerate brand kit', error);
                    this.loading = false;
                }
            });
        }
    }

    savePalette(): void {
        if (this.previewPalette && this.storeId != null) {
            this.brandService.savePalette(this.storeId, this.previewPalette).subscribe({
                next: () => {},
                error: (error: unknown) => {
                    console.error('Failed to save palette', error);
                }
            });
        }
    }

    downloadZip(): void {
        // Stub for downloading all assets as ZIP
    }

    private applyPaletteToPreview(): void {
        if (this.previewPalette) {
            const previewElement = document.querySelector('.brand-preview') as HTMLElement;
            if (previewElement) {
                Object.entries(this.previewPalette).forEach(([key, value]) => {
                    previewElement.style.setProperty(key, value);
                });
            }
        }
    }

    getAssetKeys(): string[] {
        return this.generatedBrand ? Object.keys(this.generatedBrand.assets) : [];
    }

    // ──────────────────────────────────────────────
    // Logo Upload
    // ──────────────────────────────────────────────

    onFileSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        if (!file) return;

        this.uploadError = null;

        if (!file.type.startsWith('image/')) {
            this.uploadError = 'Bitte nur Bild-Dateien hochladen (PNG, JPG, SVG)';
            return;
        }

        const maxSize = 2 * 1024 * 1024;
        if (file.size > maxSize) {
            this.uploadError = `Datei zu groß (${(file.size / 1024 / 1024).toFixed(2)} MB). Maximum: 2 MB`;
            return;
        }

        // Sofort-Preview lokal
        const reader = new FileReader();
        reader.onload = (e: ProgressEvent<FileReader>) => {
            this.logoPreview = e.target?.result as string;
        };
        reader.readAsDataURL(file);

        this.uploadLogo(file);
    }

    uploadLogo(file: File): void {
        if (this.storeId === null) {
            this.uploadError = 'Fehler: Store-Kontext nicht verfügbar';
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
                    this.uploadedLogoUrl = event.response.url;
                    this.uploading = false;
                    this.uploadProgress = 100;
                }
            },
            error: (err: any) => {
                this.uploading = false;
                this.uploadProgress = 0;
                this.uploadError = err?.error?.message || 'Upload fehlgeschlagen. Bitte erneut versuchen.';
                this.logoPreview = null;
                this.uploadedLogoUrl = null;
            }
        });
    }

    removeLogo(event: Event): void {
        event.stopPropagation();
        this.logoPreview = null;
        this.uploadedLogoUrl = null;
        this.uploadError = null;
        this.uploadProgress = 0;
    }

    retryUpload(): void {
        const fileInput = document.querySelector<HTMLInputElement>('input[type="file"]');
        if (fileInput) fileInput.click();
    }
}
