/**
 * Phase 3B-1B: Invoice line item models
 */

export type LineStatus = 'UNREVIEWED' | 'REVIEW_REQUIRED' | 'CONFIRMED' | 'MAPPED';
export type MappingSource = 'NONE' | 'LEARNED_MAPPING' | 'USER_ASSIGNED';

export interface InvoiceLine {
  id: number;
  positionNumber: number;
  supplierArticleNumber: string | null;
  description: string | null;
  quantity: number | null;
  unit: string | null;
  packagingUnit: number | null;
  unitPrice: number | null;
  lineTotal: number | null;
  taxRate: number | null;
  discount: number | null;
  confidence: number;
  warnings: string[];
  status: LineStatus;
  mappingSource: MappingSource;
  suggestedProductId: number | null;
  userCorrected: boolean;
}

export interface LineSummary {
  detected: number;
  confirmed: number;
  mapped: number;
  needsReview: number;
}

export interface UpdateLineRequest {
  supplierArticleNumber?: string;
  description?: string;
  quantity?: number;
  unit?: string;
  packagingUnit?: number;
  unitPrice?: number;
  lineTotal?: number;
  taxRate?: number;
  discount?: number;
}

export interface ProductMappingRequest {
  productId: number;
  rememberForFuture: boolean;
}

export interface BulkConfirmRequest {
  lineIds: number[];
  onlyWithoutWarnings: boolean;
}

export interface BulkConfirmResponse {
  requested: number;
  confirmed: number;
  skipped: number;
  lineSummary: LineSummary;
}

export interface CreateLineRequest {
  supplierArticleNumber: string;
  description: string;
  quantity?: number;
  unit?: string;
  packagingUnit?: number;
  unitPrice?: number;
  lineTotal?: number;
  taxRate?: number;
}

export interface SplitLineRequest {
  splitPosition: number;
}
