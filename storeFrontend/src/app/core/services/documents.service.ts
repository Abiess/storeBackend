import { Injectable } from '@angular/core';
import { HttpClient, HttpEvent, HttpEventType } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

/**
 * DOCUMENTS-App (Phase 1) – persönlicher Dokumenten-Tresor.
 *
 * GLOBAL-Scope: alle Endpunkte sind bewusst OHNE `storeId` (siehe
 * `AppKey.DOCUMENTS` / `DocumentController` im Backend). Die Daten selbst
 * bleiben trotzdem strikt user-privat (Owner-or-Shared, serverseitig
 * durchgesetzt) – dieser Service bildet nur die vorhandene REST-API 1:1 ab,
 * KEINE eigene Auth-/Storage-Logik.
 */
export interface DocumentDTO {
  id: number;
  ownerUserId: number;
  ownerEmail: string;
  title: string;
  category: string | null;
  note: string | null;
  documentDate: string | null;
  expiryDate: string | null;
  hasFile: boolean;
  originalFilename: string | null;
  mimeType: string | null;
  size: number | null;
  extractedText: string | null;
  createdAt: string;
  updatedAt: string;
  /** true, wenn der aufrufende User NICHT der Owner ist (Tab "Mit mir geteilt"). */
  sharedWithMe: boolean;
  /** Berechtigung des aufrufenden Users, falls sharedWithMe=true (MVP: immer VIEW). */
  permission: string | null;
}

export interface DocumentShareDTO {
  id: number;
  documentId: number;
  sharedWithUserId: number;
  sharedWithUserEmail: string;
  permission: string;
  createdAt: string;
}

export interface DocumentCreateRequest {
  title: string;
  category?: string | null;
  note?: string | null;
  documentDate?: string | null;
  expiryDate?: string | null;
}

export type DocumentUpdateRequest = DocumentCreateRequest;

export interface UploadProgress {
  progress: number;
  status: 'uploading' | 'complete';
}

export const DOCUMENT_CATEGORIES = [
  'INSURANCE', 'CONTRACT', 'INVOICE', 'WARRANTY', 'VEHICLE', 'APARTMENT', 'WORK', 'ID', 'OTHER'
] as const;

@Injectable({ providedIn: 'root' })
export class DocumentsService {
  private readonly baseUrl = `${environment.apiUrl}/documents`;

  private readonly ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
  private readonly MAX_FILE_SIZE = 15 * 1024 * 1024; // 15 MB

  constructor(private http: HttpClient) {}

  validateFile(file: File): string | null {
    if (!file) return 'documents.errors.uploadFailed';
    if (file.size === 0 || file.size > this.MAX_FILE_SIZE) return 'documents.errors.uploadFailed';
    if (!this.ALLOWED_MIME_TYPES.includes(file.type)) return 'documents.errors.uploadFailed';
    return null;
  }

  listMine(): Observable<DocumentDTO[]> {
    return this.http.get<DocumentDTO[]>(this.baseUrl);
  }

  listSharedWithMe(): Observable<DocumentDTO[]> {
    return this.http.get<DocumentDTO[]>(`${this.baseUrl}/shared`);
  }

  getById(id: number): Observable<DocumentDTO> {
    return this.http.get<DocumentDTO>(`${this.baseUrl}/${id}`);
  }

  createManual(request: DocumentCreateRequest): Observable<DocumentDTO> {
    return this.http.post<DocumentDTO>(this.baseUrl, request);
  }

  /** Fotografieren/Datei hochladen (Datei + Metadaten in einem Request). */
  uploadNew(file: File, request: DocumentCreateRequest): Observable<UploadProgress | DocumentDTO> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', request.title);
    if (request.category) formData.append('category', request.category);
    if (request.note) formData.append('note', request.note);
    if (request.documentDate) formData.append('documentDate', request.documentDate);
    if (request.expiryDate) formData.append('expiryDate', request.expiryDate);

    return this.http.post<DocumentDTO>(`${this.baseUrl}/upload`, formData, {
      reportProgress: true,
      observe: 'events'
    }).pipe(
      map((event: HttpEvent<any>) => {
        switch (event.type) {
          case HttpEventType.UploadProgress:
            return { progress: event.total ? Math.round((100 * event.loaded) / event.total) : 0, status: 'uploading' as const };
          case HttpEventType.Response:
            return event.body as DocumentDTO;
          default:
            return { progress: 0, status: 'uploading' as const };
        }
      }),
      catchError(error => throwError(() => error))
    );
  }

  attachFile(id: number, file: File): Observable<DocumentDTO> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<DocumentDTO>(`${this.baseUrl}/${id}/file`, formData);
  }

  update(id: number, request: DocumentUpdateRequest): Observable<DocumentDTO> {
    return this.http.put<DocumentDTO>(`${this.baseUrl}/${id}`, request);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  /** Liefert eine Blob-URL zum direkten Anzeigen/Öffnen der hinterlegten Datei (Owner oder geteilt). */
  downloadBlob(id: number): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/${id}/download`, { responseType: 'blob' });
  }

  share(id: number, email: string): Observable<DocumentShareDTO> {
    return this.http.post<DocumentShareDTO>(`${this.baseUrl}/${id}/shares`, { email, permission: 'VIEW' });
  }

  listShares(id: number): Observable<DocumentShareDTO[]> {
    return this.http.get<DocumentShareDTO[]>(`${this.baseUrl}/${id}/shares`);
  }

  unshare(id: number, shareId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}/shares/${shareId}`);
  }
}
