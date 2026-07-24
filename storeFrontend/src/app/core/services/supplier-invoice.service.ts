import { Injectable } from '@angular/core';
import { HttpClient, HttpEvent, HttpEventType, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { BackendDateTime } from '@app/core/utils/date.utils';

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
   * Run OCR on a document
   */
  runOcr(
    storeId: number,
    documentId: number,
    psmMode: 3 | 4 | 6 = 6
  ): Observable<SupplierInvoiceOcrResult> {
    return this.http.post<SupplierInvoiceOcrResult>(
      `${this.baseUrl}/${storeId}/supplier-invoices/documents/${documentId}/ocr?psmMode=${psmMode}`,
      null
    );
  }
}
