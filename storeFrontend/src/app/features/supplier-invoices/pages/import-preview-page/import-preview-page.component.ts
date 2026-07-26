import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { LucideAngularModule } from 'lucide-angular';

import { Category } from '@app/core/models';
import {
  LineNeedsDecision,
  LineSkipped,
  MatchReason,
  ProductToCreate,
  ProductToUpdate,
  SupplierInvoiceImportPreviewResponse,
  WarningCode
} from '@app/core/models/import-preview.model';
import { CategoryService } from '@app/core/services/category.service';
import { SupplierInvoiceService } from '@app/core/services/supplier-invoice.service';

@Component({
  selector: 'app-import-preview-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    TranslateModule,
    LucideAngularModule
  ],
  templateUrl: './import-preview-page.component.html',
  styleUrls: ['./import-preview-page.component.scss']
})
export class ImportPreviewPageComponent implements OnInit {
  storeId = 0;
  documentId = 0;
  preview: SupplierInvoiceImportPreviewResponse | null = null;
  loading = true;
  error: string | null = null;
  categories: Category[] = [];

  selectedNewProducts = new Set<number>();
  selectedExistingProducts = new Set<number>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private supplierInvoiceService: SupplierInvoiceService,
    private categoryService: CategoryService
  ) {}

  ngOnInit(): void {
    let id = this.route.snapshot.paramMap.get('storeId') || this.route.snapshot.paramMap.get('id');
    if (!id && this.route.parent) {
      id = this.route.parent.snapshot.paramMap.get('id');
    }
    if (!id) {
      const match = this.router.url.match(/\/stores\/(\d+)/);
      if (match) {
        id = match[1];
      }
    }

    this.storeId = id ? Number(id) : 0;
    this.documentId = Number(this.route.snapshot.paramMap.get('documentId') || 0);

    if (!this.storeId || !this.documentId) {
      this.error = 'Store ID or Document ID missing';
      this.loading = false;
      return;
    }

    this.loadCategories();
    this.loadPreview();
  }

  loadPreview(): void {
    this.loading = true;
    this.error = null;

    this.supplierInvoiceService.getImportPreview(this.storeId, this.documentId).subscribe({
      next: (preview) => {
        this.preview = preview;
        this.selectedNewProducts.clear();
        this.selectedExistingProducts.clear();
        preview.existingProducts.forEach((product) => {
          if (product.canImport) {
            this.selectedExistingProducts.add(product.lineId);
          }
        });
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load import preview:', err);
        this.error = err.error?.message || 'Failed to load preview';
        this.loading = false;
      }
    });
  }

  loadCategories(): void {
    this.categoryService.getCategories(this.storeId).subscribe({
      next: (categories) => {
        this.categories = [...categories].sort((a, b) => a.name.localeCompare(b.name));
      },
      error: (err) => {
        console.error('Failed to load categories for import preview:', err);
        this.categories = [];
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/stores', this.storeId, 'supplier-invoices', this.documentId, 'lines']);
  }

  toggleNewProduct(lineId: number): void {
    if (this.selectedNewProducts.has(lineId)) {
      this.selectedNewProducts.delete(lineId);
      return;
    }

    this.selectedNewProducts.add(lineId);
  }

  toggleExistingProduct(lineId: number): void {
    if (this.selectedExistingProducts.has(lineId)) {
      this.selectedExistingProducts.delete(lineId);
      return;
    }

    this.selectedExistingProducts.add(lineId);
  }

  toggleAllExistingProducts(): void {
    if (!this.preview) {
      return;
    }

    const importableProducts = this.preview.existingProducts.filter((product) => product.canImport);
    const allSelected = importableProducts.length > 0
      && importableProducts.every((product) => this.selectedExistingProducts.has(product.lineId));

    if (allSelected) {
      importableProducts.forEach((product) => this.selectedExistingProducts.delete(product.lineId));
      return;
    }

    importableProducts.forEach((product) => this.selectedExistingProducts.add(product.lineId));
  }

  get totalSelected(): number {
    return this.selectedNewProducts.size + this.selectedExistingProducts.size;
  }

  get totalImportableNew(): number {
    return this.preview?.newProducts.filter((product) => this.isNewProductReady(product)).length || 0;
  }

  get totalImportableExisting(): number {
    return this.preview?.existingProducts.filter((product) => product.canImport).length || 0;
  }

  getMatchReasonKey(reason: MatchReason | string | null | undefined): string {
    return `IMPORT_PREVIEW.MATCH_REASON.${reason || 'USER_ASSIGNED'}`;
  }

  getWarningCodeKey(code: WarningCode | string | null | undefined): string {
    return `IMPORT_PREVIEW.WARNING_CODE.${code || 'ERROR'}`;
  }

  getLineReasonKey(line: LineNeedsDecision | LineSkipped): string {
    return this.getWarningCodeKey(('warningCode' in line ? line.warningCode : undefined) || line.reason);
  }

  editLine(lineId: number): void {
    this.router.navigate(['/stores', this.storeId, 'supplier-invoices', this.documentId, 'lines'], {
      queryParams: { lineId }
    });
  }

  formatQuantity(product: ProductToUpdate | ProductToCreate): string {
    if (!product.quantityToAdd) {
      return '—';
    }

    const unit = 'unit' in product ? product.unit : null;
    const packagingUnit = 'packagingUnit' in product ? product.packagingUnit : null;
    const hasPackaging = unit && packagingUnit && packagingUnit > 1;
    if (!hasPackaging) {
      return `${product.quantityToAdd}`;
    }

    const kolli = Math.floor(product.quantityToAdd / packagingUnit);
    if (kolli > 0) {
      return `${kolli} ${unit} × ${packagingUnit} = ${product.quantityToAdd}`;
    }

    return `${product.quantityToAdd}`;
  }

  isNewProductReady(product: ProductToCreate): boolean {
    return !!(product.userCategoryId && product.userRetailPrice);
  }

  calculateMarkup(product: ProductToCreate): string {
    if (!product.userRetailPrice || !product.purchasePrice) {
      return '0';
    }

    const markup = ((product.userRetailPrice - product.purchasePrice) / product.purchasePrice) * 100;
    return markup.toFixed(1);
  }

  getLineLabel(line: LineNeedsDecision | LineSkipped): string {
    return `${line.positionNumber || line.lineId}`;
  }
}
