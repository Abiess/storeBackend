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
import { ActivatedRoute } from '@angular/router';
import { BrandService, BrandGenerateRequest, BrandGenerateResponse } from '../../../core/services/brand.service';
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
    private brandService = inject(BrandService);

    brandForm!: FormGroup;
    storeId: number | null = null;
    loading = false;
    generatedBrand: BrandGenerateResponse | null = null;
    previewPalette: { [key: string]: string } = {};

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
            shopName: ['', Validators.required],
            slogan: [''],
            industry: [''],
            style: ['minimal', Validators.required],
            preferredColorInput: [''],
            forbiddenColorInput: ['']
        });
    }

    private extractStoreId(): number | null {
        const ownParam = this.route.snapshot.paramMap.get('storeId');
        if (ownParam !== null) {
            const parsed = Number(ownParam);
            return Number.isNaN(parsed) ? null : parsed;
        }

        const parentParam = this.route.parent?.snapshot.paramMap.get('storeId');
        if (parentParam !== null && parentParam !== undefined) {
            const parsed = Number(parentParam);
            return Number.isNaN(parsed) ? null : parsed;
        }

        let current = this.route.parent;
        while (current) {
            const value = current.snapshot.paramMap.get('storeId');
            if (value !== null) {
                const parsed = Number(value);
                return Number.isNaN(parsed) ? null : parsed;
            }
            current = current.parent;
        }

        return null;
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

            const request: BrandGenerateRequest = {
                shopName: this.brandForm.value.shopName,
                slogan: this.brandForm.value.slogan,
                industry: this.brandForm.value.industry,
                style: this.brandForm.value.style,
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

            const request: BrandGenerateRequest = {
                shopName: this.brandForm.value.shopName,
                slogan: this.brandForm.value.slogan,
                industry: this.brandForm.value.industry,
                style: this.brandForm.value.style,
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
}
