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

  /**
   * Get SEO settings for a specific store.
   * @param storeId The ID of the store.
   * @returns An observable containing the SEO settings.
   */
  getSeoSettings(storeId: number): Observable<SeoSettingsDTO> {
    const url = `${this.baseUrl}/${storeId}/seo-settings`;
    return this.http.get<SeoSettingsDTO>(url);
  }

  /**
   * Update SEO settings for a specific store.
   * @param storeId The ID of the store.
   * @param settings The SEO settings to update.
   * @returns An observable containing the updated SEO settings.
   */
  updateSeoSettings(storeId: number, settings: SeoSettingsDTO): Observable<SeoSettingsDTO> {
    const url = `${this.baseUrl}/${storeId}/seo-settings`;
    return this.http.put<SeoSettingsDTO>(url, settings);
  }

  /**
   * Get redirect rules for a specific store.
   * @param storeId The ID of the store.
   * @returns An observable containing the list of redirect rules.
   */
  getRedirectRules(storeId: number): Observable<RedirectRuleDTO[]> {
    const url = `${this.baseUrl}/${storeId}/redirect-rules`;
    return this.http.get<RedirectRuleDTO[]>(url);
  }

  /**
   * Create a new redirect rule.
   * @param storeId The ID of the store.
   * @param rule The redirect rule to create.
   * @returns An observable containing the created redirect rule.
   */
  createRedirectRule(storeId: number, rule: RedirectRuleDTO): Observable<RedirectRuleDTO> {
    const url = `${this.baseUrl}/${storeId}/redirect-rules`;
    return this.http.post<RedirectRuleDTO>(url, rule);
  }

  /**
   * Update an existing redirect rule.
   * @param storeId The ID of the store.
   * @param rule The redirect rule to update.
   * @returns An observable containing the updated redirect rule.
   */
  updateRedirectRule(storeId: number, rule: RedirectRuleDTO): Observable<RedirectRuleDTO> {
    const url = `${this.baseUrl}/${storeId}/redirect-rules/${rule.id}`;
    return this.http.put<RedirectRuleDTO>(url, rule);
  }

  /**
   * Delete a redirect rule.
   * @param storeId The ID of the store.
   * @param ruleId The ID of the redirect rule to delete.
   * @returns An observable indicating the completion of the delete operation.
   */
  deleteRedirectRule(storeId: number, ruleId: number): Observable<void> {
    const url = `${this.baseUrl}/${storeId}/redirect-rules/${ruleId}`;
    return this.http.delete<void>(url);
  }

  /**
   * Get structured data templates for a specific store.
   * @param storeId The ID of the store.
   * @returns An observable containing the list of structured data templates.
   */
  getStructuredDataTemplates(storeId: number): Observable<StructuredDataTemplateDTO[]> {
    const url = `${this.baseUrl}/${storeId}/structured-data-templates`;
    return this.http.get<StructuredDataTemplateDTO[]>(url);
  }

  /**
   * Create a new structured data template.
   * @param storeId The ID of the store.
   * @param template The structured data template to create.
   * @returns An observable containing the created structured data template.
   */
  createStructuredDataTemplate(storeId: number, template: StructuredDataTemplateDTO): Observable<StructuredDataTemplateDTO> {
    const url = `${this.baseUrl}/${storeId}/structured-data-templates`;
    return this.http.post<StructuredDataTemplateDTO>(url, template);
  }

  /**
   * Update an existing structured data template.
   * @param storeId The ID of the store.
   * @param template The structured data template to update.
   * @returns An observable containing the updated structured data template.
   */
  updateStructuredDataTemplate(storeId: number, template: StructuredDataTemplateDTO): Observable<StructuredDataTemplateDTO> {
    const url = `${this.baseUrl}/${storeId}/structured-data-templates/${template.id}`;
    return this.http.put<StructuredDataTemplateDTO>(url, template);
  }

  /**
   * Delete a structured data template.
   * @param storeId The ID of the store.
   * @param templateId The ID of the structured data template to delete.
   * @returns An observable indicating the completion of the delete operation.
   */
  deleteStructuredDataTemplate(storeId: number, templateId: number): Observable<void> {
    const url = `${this.baseUrl}/${storeId}/structured-data-templates/${templateId}`;
    return this.http.delete<void>(url);
  }

  /**
   * Upload an asset (e.g., image) for SEO purposes.
   * @param storeId The ID of the store.
   * @param file The file to upload.
   * @returns An observable containing the upload response.
   */
  uploadAsset(storeId: number, file: File): Observable<AssetUploadResponse> {
    const url = `${this.baseUrl}/${storeId}/seo-assets`;
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<AssetUploadResponse>(url, formData);
  }

  /**
   * Render structured data with a given template and context.
   * @param storeId The ID of the store.
   * @param templateJson The JSON template string.
   * @param context The context data for rendering.
   * @returns An observable containing the rendered structured data.
   */
  renderStructuredData(storeId: number, templateJson: string, context: any): Observable<any> {
    const url = `${this.baseUrl}/${storeId}/structured-data-templates/render`;
    return this.http.post<any>(url, { templateJson, context });
  }
}
