import { Injectable } from '@angular/core';
import { HttpClient, HttpEvent, HttpEventType, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { BackendDateTime } from '@app/core/utils/date.utils';
import { SupplierInvoiceImportPreviewResponse } from '@app/core/models/import-preview.model';

export interface SupplierInvoiceDocument {
  id: number;
  storeId: number;
  originalFilename: string;
  storageObjectName: string;
  mimeType: string;
  fileSize: number;
  pageCount: number | null;
  uploadStatus: 'UPLOADED' | 'PREVIEW_READY' | 'FAILED';
  uploadedByUserId: number;
  createdAt: BackendDateTime;
  updatedAt: BackendDateTime;
}

export interface UploadProgress {
  progress: number;
  status: 'uploading' | 'complete' | 'error';
  message?: string;
}

export interface SupplierInvoiceOcrResult {
  documentId: number;
  documentType: 'TEXT_PDF' | 'SCANNED_PDF' | 'IMAGE' | 'UNKNOWN';
  status: 'TEXT_EXTRACTED' | 'OCR_RUNNING' | 'OCR_COMPLETED' | 'FAILED';
  engine: string | null;
  languages: string[];
  psmMode: number | null;
  pageCount: number;
  durationMs: number;
  characterCount: number;
  nonEmptyLineCount: number;
  rawText: string;
  textPerPage: string[];
  errorMessage: string | null;
}

export interface ParsedInvoiceFields {
  supplierName: string | null;
  invoiceNumber: string | null;
  invoiceDate: string | null;
  deliveryDate: string | null;
  netAmount: number | null;
  taxAmount: number | null;
  grossAmount: number | null;
  currency: string | null;
}

export interface InvoiceParseResult {
  documentId: number;
  status: 'OCR_COMPLETED' | 'FAILED';
  cached?: boolean;
  parsedAt?: string;
  parserVersion?: string;
  ocr?: {
    engine: string;
    pageCount: number;
    durationMs: number;
  };
  fields: ParsedInvoiceFields;
  fieldSources?: { [key: string]: string };
  confidence: { [key: string]: number };
  warnings: string[];
  rawText?: string;
  lines?: InvoiceLine[];
  lineSummary?: LineSummary;
}

// Phase 3B-1: Invoice Line Types
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
  status: 'UNREVIEWED' | 'REVIEW_REQUIRED' | 'CONFIRMED' | 'MAPPED';
  mappingSource: 'NONE' | 'LEARNED_MAPPING' | 'USER_ASSIGNED';
  suggestedProductId: number | null;
  userCorrected: boolean;
  calculatedStockQuantity?: number | null;
}

export interface LineSummary {
  detected: number;
  confirmed: number;
  mapped: number;
  needsReview: number;
}

export interface UpdateLineRequest {
  supplierArticleNumber?: string | null;
  description?: string | null;
  quantity?: number | null;
  unit?: string | null;
  packagingUnit?: number | null;
  unitPrice?: number | null;
  lineTotal?: number | null;
  taxRate?: number | null;
  discount?: number | null;
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

// Phase 3B-2: Manual Line Management
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

export interface SupplierNameCorrectionRequest {
  rawValue: string;
  correctedValue: string;
  rememberForFuture: boolean;
}

export interface SupplierNameCorrectionResponse {
  fieldType: string;
  rawValue: string;
  correctedValue: string;
  confirmationCount: number;
  active: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class SupplierInvoiceService {
  private readonly baseUrl = `${environment.apiUrl}/stores`;

  // Validierung
  private readonly ALLOWED_MIME_TYPES = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp'
  ];
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

  constructor(private http: HttpClient) {}

  /**
   * Upload document with progress tracking
   */
  uploadDocument(storeId: number, file: File): Observable<UploadProgress | SupplierInvoiceDocument> {
    // Client-side validation
    const validationError = this.validateFile(file);
    if (validationError) {
      return throwError(() => new Error(validationError));
    }

    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<SupplierInvoiceDocument>(
      `${this.baseUrl}/${storeId}/supplier-invoices/documents`,
      formData,
      {
        reportProgress: true,
        observe: 'events'
      }
    ).pipe(
      map((event: HttpEvent<any>) => {
        switch (event.type) {
          case HttpEventType.UploadProgress:
            const progress = event.total ? Math.round((100 * event.loaded) / event.total) : 0;
            return { progress, status: 'uploading' as const };
          case HttpEventType.Response:
            return event.body as SupplierInvoiceDocument;
          default:
            return { progress: 0, status: 'uploading' as const };
        }
      }),
      catchError(error => {
        console.error('Upload error:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Get all documents for a store
   */
  getDocuments(storeId: number): Observable<SupplierInvoiceDocument[]> {
    return this.http.get<SupplierInvoiceDocument[]>(
      `${this.baseUrl}/${storeId}/supplier-invoices/documents`
    );
  }

  /**
   * Get single document metadata
   */
  getDocument(storeId: number, documentId: number): Observable<SupplierInvoiceDocument> {
    return this.http.get<SupplierInvoiceDocument>(
      `${this.baseUrl}/${storeId}/supplier-invoices/documents/${documentId}`
    );
  }

  /**
   * Download document content as Blob (authenticated)
   */
  downloadDocument(storeId: number, documentId: number): Observable<Blob> {
    return this.http.get(
      `${this.baseUrl}/${storeId}/supplier-invoices/documents/${documentId}/content`,
      { responseType: 'blob' }
    );
  }

  /**
   * Delete document
   */
  deleteDocument(storeId: number, documentId: number): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/${storeId}/supplier-invoices/documents/${documentId}`
    );
  }

  /**
   * Get document count
   */
  getDocumentCount(storeId: number): Observable<number> {
    return this.http.get<number>(
      `${this.baseUrl}/${storeId}/supplier-invoices/documents/count`
    );
  }

  /**
   * Client-side file validation (for UX only, backend is authoritative)
   */
  validateFile(file: File): string | null {
    if (!file) {
      return 'SUPPLIER_INVOICES.ERRORS.NO_FILE';
    }

    if (file.size === 0) {
      return 'SUPPLIER_INVOICES.ERRORS.EMPTY_FILE';
    }

    if (file.size > this.MAX_FILE_SIZE) {
      return 'SUPPLIER_INVOICES.ERRORS.FILE_TOO_LARGE';
    }

    if (!this.ALLOWED_MIME_TYPES.includes(file.type)) {
      return 'SUPPLIER_INVOICES.ERRORS.INVALID_FILE_TYPE';
    }

    return null;
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  /**
   * Get file type icon
   */
  getFileIcon(mimeType: string): string {
    if (mimeType === 'application/pdf') return '📄';
    if (mimeType.startsWith('image/')) return '🖼️';
    return '📎';
  }

  /**
   * Check if file is PDF
   */
  isPdf(mimeType: string): boolean {
    return mimeType === 'application/pdf';
  }

  /**
   * Check if file is image
   */
  isImage(mimeType: string): boolean {
    return mimeType.startsWith('image/');
  }

  /**
   * @deprecated Use parseInvoice() instead with force=true
   * This method will be removed in a future version
   */
  runOcr(
    storeId: number,
    documentId: number,
    psmMode: 3 | 4 | 6 = 6
  ): Observable<SupplierInvoiceOcrResult> {
    console.warn('runOcr() is deprecated. Use parseInvoice() instead.');
    return this.http.post<SupplierInvoiceOcrResult>(
      `${this.baseUrl}/${storeId}/supplier-invoices/documents/${documentId}/ocr?psmMode=${psmMode}`,
      null
    );
  }

  /**
   * Get cached parse result if available
   */
  getParseResult(
    storeId: number,
    documentId: number
  ): Observable<InvoiceParseResult> {
    return this.http.get<InvoiceParseResult>(
      `${this.baseUrl}/${storeId}/supplier-invoices/documents/${documentId}/parse-result`
    );
  }

  /**
   * Parse invoice with OCR + field extraction
   */
  parseInvoice(
    storeId: number,
    documentId: number,
    psmMode: 3 | 4 | 6 = 6,
    force: boolean = false
  ): Observable<InvoiceParseResult> {
    return this.http.post<InvoiceParseResult>(
      `${this.baseUrl}/${storeId}/supplier-invoices/documents/${documentId}/parse?psmMode=${psmMode}&force=${force}`,
      null
    );
  }

  /**
   * Confirm supplier name correction (Phase 3A Learning System)
   */
  confirmSupplierNameCorrection(
    storeId: number,
    documentId: number,
    request: SupplierNameCorrectionRequest
  ): Observable<SupplierNameCorrectionResponse> {
    return this.http.post<SupplierNameCorrectionResponse>(
      `${this.baseUrl}/${storeId}/supplier-invoices/documents/${documentId}/corrections/supplier-name`,
      request
    );
  }
  
  // Phase 3B-1: Invoice Line Item Operations
  updateInvoiceLine(storeId: number, documentId: number, lineId: number, request: UpdateLineRequest): Observable<InvoiceLine> {
    return this.http.put<InvoiceLine>(
      `${this.baseUrl}/${storeId}/supplier-invoices/documents/${documentId}/lines/${lineId}`,
      request
    );
  }
  
  assignProductMapping(storeId: number, documentId: number, lineId: number, request: ProductMappingRequest): Observable<InvoiceLine> {
    return this.http.post<InvoiceLine>(
      `${this.baseUrl}/${storeId}/supplier-invoices/documents/${documentId}/lines/${lineId}/product-mapping`,
      request
    );
  }
  
  bulkConfirmLines(storeId: number, documentId: number, request: BulkConfirmRequest): Observable<BulkConfirmResponse> {
    return this.http.post<BulkConfirmResponse>(
      `${this.baseUrl}/${storeId}/supplier-invoices/documents/${documentId}/lines/bulk-confirm`,
      request
    );
  }

  getImportPreview(storeId: number, documentId: number): Observable<SupplierInvoiceImportPreviewResponse> {
    return this.http.get<SupplierInvoiceImportPreviewResponse>(
      `${this.baseUrl}/${storeId}/supplier-invoices/documents/${documentId}/import-preview`
    );
  }
  
  // Phase 3B-2: Manual Line Management
  createInvoiceLine(storeId: number, documentId: number, request: CreateLineRequest): Observable<InvoiceLine> {
    return this.http.post<InvoiceLine>(
      `${this.baseUrl}/${storeId}/supplier-invoices/documents/${documentId}/lines`,
      request
    );
  }
  
  deleteInvoiceLine(storeId: number, documentId: number, lineId: number): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/${storeId}/supplier-invoices/documents/${documentId}/lines/${lineId}`
    );
  }
  
  splitInvoiceLine(storeId: number, documentId: number, lineId: number, request: SplitLineRequest): Observable<InvoiceLine[]> {
    return this.http.post<InvoiceLine[]>(
      `${this.baseUrl}/${storeId}/supplier-invoices/documents/${documentId}/lines/${lineId}/split`,
      request
    );
  }
  
  mergeInvoiceLineWithNext(storeId: number, documentId: number, lineId: number): Observable<InvoiceLine> {
    return this.http.post<InvoiceLine>(
      `${this.baseUrl}/${storeId}/supplier-invoices/documents/${documentId}/lines/${lineId}/merge-next`,
      {}
    );
  }
}
