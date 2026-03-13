import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface SeoSettingsDTO {
  id?: number;
  storeId: number;
  domainId?: number;
  siteName?: string;
  defaultTitleTemplate?: string;
  defaultMetaDescription?: string;
  canonicalBaseUrl?: string;
  robotsIndex?: boolean;
  ogDefaultImagePath?: string;
  ogDefaultImageUrl?: string;
  twitterHandle?: string;
  facebookPageUrl?: string;
  instagramUrl?: string;
  youtubeUrl?: string;
  linkedinUrl?: string;
  hreflangConfig?: HreflangEntry[];
  version?: number;
}

export interface HreflangEntry {
  langCode: string;
  absoluteUrlBase: string;
}

export interface RedirectRuleDTO {
  id?: number;
  storeId: number;
  domainId?: number;
  sourcePath: string;
  targetUrl: string;
  httpCode: number;
  isRegex: boolean;
  priority: number;
  isActive: boolean;
  comment?: string;
  tag?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface StructuredDataTemplateDTO {
  id?: number;
  storeId: number;
  type: 'PRODUCT' | 'ORGANIZATION' | 'BREADCRUMB' | 'ARTICLE' | 'COLLECTION';
  templateJson: string;
  isActive: boolean;
}

export interface AssetUploadResponse {
  id: number;
  path: string;
  publicUrl: string;
  sizeBytes: number;
}

/**
 * Service for managing SEO settings, redirects, and structured data.
 */
@Injectable({
  providedIn: 'root'
})
export class SeoApiService {
  private baseUrl = '/api/stores';

  constructor(private http: HttpClient) {}

  // SEO Settings
  getSeoSettings(storeId: number, domainId?: number): Observable<SeoSettingsDTO> {
    let params = new HttpParams();
    if (domainId) {
      params = params.set('domainId', domainId.toString());
    }
    return this.http.get<SeoSettingsDTO>(`${this.baseUrl}/${storeId}/seo`, { params });
  }

  updateSeoSettings(storeId: number, settings: SeoSettingsDTO): Observable<SeoSettingsDTO> {
    return this.http.put<SeoSettingsDTO>(`${this.baseUrl}/${storeId}/seo`, settings);
  }

  uploadSeoAsset(storeId: number, type: string, file: File): Observable<AssetUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<AssetUploadResponse>(
      `${this.baseUrl}/${storeId}/seo/assets?type=${type}`,
      formData
    );
  }

  // Redirects
  getRedirects(storeId: number, params?: {
    domainId?: number;
    query?: string;
    page?: number;
    size?: number;
  }): Observable<any> {
    let httpParams = new HttpParams();
    if (params?.domainId) httpParams = httpParams.set('domainId', params.domainId.toString());
    if (params?.query) httpParams = httpParams.set('query', params.query);
    if (params?.page !== undefined) httpParams = httpParams.set('page', params.page.toString());
    if (params?.size !== undefined) httpParams = httpParams.set('size', params.size.toString());

    return this.http.get(`${this.baseUrl}/${storeId}/redirects`, { params: httpParams });
  }

  createRedirect(storeId: number, redirect: RedirectRuleDTO): Observable<RedirectRuleDTO> {
    return this.http.post<RedirectRuleDTO>(`${this.baseUrl}/${storeId}/redirects`, redirect);
  }

  updateRedirect(storeId: number, id: number, redirect: RedirectRuleDTO): Observable<RedirectRuleDTO> {
    return this.http.put<RedirectRuleDTO>(`${this.baseUrl}/${storeId}/redirects/${id}`, redirect);
  }

  deleteRedirect(storeId: number, id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${storeId}/redirects/${id}`);
  }

  importRedirects(storeId: number, file: File, domainId?: number): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    let url = `${this.baseUrl}/${storeId}/redirects/import`;
    if (domainId) {
      url += `?domainId=${domainId}`;
    }
    return this.http.post(url, formData);
  }

  exportRedirects(storeId: number, domainId?: number): Observable<Blob> {
    let params = new HttpParams();
    if (domainId) params = params.set('domainId', domainId.toString());
    return this.http.get(`${this.baseUrl}/${storeId}/redirects/export`, {
      params,
      responseType: 'blob'
    });
  }

  refreshRedirectCache(storeId: number): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/${storeId}/redirects/refresh`, {});
  }

  // Structured Data
  getStructuredDataTemplates(storeId: number): Observable<StructuredDataTemplateDTO[]> {
    return this.http.get<StructuredDataTemplateDTO[]>(`${this.baseUrl}/${storeId}/structured-data`);
  }

  createStructuredDataTemplate(storeId: number, template: StructuredDataTemplateDTO): Observable<StructuredDataTemplateDTO> {
    return this.http.post<StructuredDataTemplateDTO>(`${this.baseUrl}/${storeId}/structured-data`, template);
  }

  updateStructuredDataTemplate(storeId: number, id: number, template: StructuredDataTemplateDTO): Observable<StructuredDataTemplateDTO> {
    return this.http.put<StructuredDataTemplateDTO>(`${this.baseUrl}/${storeId}/structured-data/${id}`, template);
  }

  deleteStructuredDataTemplate(storeId: number, id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${storeId}/structured-data/${id}`);
  }

  renderStructuredData(storeId: number, templateJson: string, context: any): Observable<string> {
    return this.http.post(`${this.baseUrl}/${storeId}/structured-data/render`, {
      templateJson,
      context
    }, { responseType: 'text' });
  }

  // Public Redirect Resolution (for SPA)
  resolveRedirect(host: string, path: string): Observable<any> {
    return this.http.get('/public/redirect/resolve', {
      params: { host, path }
    });
  }
}

