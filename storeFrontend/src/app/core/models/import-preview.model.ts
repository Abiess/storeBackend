export interface SupplierInvoiceImportPreviewResponse {
  documentId: number;
  supplierName: string | null;
  invoiceNumber: string | null;
  newProducts: ProductToCreate[];
  existingProducts: ProductToUpdate[];
  needsDecision: LineNeedsDecision[];
  skippedLines: LineSkipped[];
  summary: ImportSummary;
}

export interface ProductToCreate {
  lineId: number;
  supplierArticleNumber: string | null;
  suggestedTitle: string;
  description: string | null;
  purchasePrice: number | null;
  taxRate: number | null;
  unit: string | null;
  packagingUnit: number | null;
  quantityToAdd: number | null;
  requiredInputs: string[];
  canImport: boolean;
  warnings: string[];
  userCategoryId?: number;
  userRetailPrice?: number;
}

export interface ProductToUpdate {
  lineId: number;
  supplierArticleNumber: string | null;
  invoiceDescription: string;
  productId: number;
  productTitle: string;
  matchReason: MatchReason | string | null;
  currentStock: number | null;
  quantityToAdd: number | null;
  newStock: number | null;
  currentPurchasePrice: number | null;
  invoicePurchasePrice: number | null;
  canImport: boolean;
  warnings: string[];
}

export interface LineNeedsDecision {
  lineId: number;
  positionNumber?: number | null;
  supplierArticleNumber: string | null;
  description: string;
  warningCode?: WarningCode | string | null;
  reason?: WarningCode | string | null;
  reasonMessage?: string | null;
}

export interface LineSkipped {
  lineId: number;
  positionNumber?: number | null;
  supplierArticleNumber: string | null;
  description: string;
  reason: SkipReason | string;
  reasonMessage?: string | null;
  importedAt: string | null;
}

export interface ImportSummary {
  totalLines: number;
  readyToCreate: number;
  readyToUpdate: number;
  needsDecision: number;
  skipped: number;
  alreadyImported: number;
}

export type MatchReason = 'USER_ASSIGNED' | 'LEARNED_MAPPING' | 'SKU_MATCH';

export type WarningCode =
  | 'LINE_NOT_REVIEWED'
  | 'PRODUCT_MAPPING_MISSING'
  | 'CATEGORY_REQUIRED'
  | 'SELLING_PRICE_REQUIRED'
  | 'STOCK_QUANTITY_CONFIRMATION_REQUIRED'
  | 'ALREADY_IMPORTED'
  | 'PRODUCT_NOT_FOUND'
  | 'ERROR';

export type SkipReason = 'ALREADY_IMPORTED' | 'PRODUCT_NOT_FOUND' | 'ERROR';
