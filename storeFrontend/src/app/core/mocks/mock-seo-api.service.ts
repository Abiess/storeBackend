import { Injectable } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import {
  SeoApiService,
  SeoSettingsDTO,
  RedirectRuleDTO,
  StructuredDataTemplateDTO,
  AssetUploadResponse
} from '../services/seo-api.service';

/**
 * Mock implementation of SEO API Service for testing without backend.
 * Simulates all SEO-related operations with in-memory data.
 */
@Injectable({
  providedIn: 'root'
})
export class MockSeoApiService extends SeoApiService {
  private mockSettings: Map<number, SeoSettingsDTO> = new Map();
  private mockRedirects: Map<number, RedirectRuleDTO[]> = new Map();
  private mockTemplates: Map<number, StructuredDataTemplateDTO[]> = new Map();
  private redirectIdCounter = 1;
  private templateIdCounter = 1;

  constructor() {
    super(null as any); // Mock doesn't use HttpClient
    this.initializeMockData();
  }

  private initializeMockData() {
    // Initialize with some default data if needed
  }

  // Implement mock methods for SEO API Service here
  // For example:
  // getSettings(): Observable<SeoSettingsDTO> { ... }
  // updateSettings(settings: SeoSettingsDTO): Observable<SeoSettingsDTO> { ... }
  // getRedirects(): Observable<RedirectRuleDTO[]> { ... }
  // addRedirect(redirect: RedirectRuleDTO): Observable<RedirectRuleDTO> { ... }
  // removeRedirect(id: number): Observable<void> { ... }
  // getTemplates(): Observable<StructuredDataTemplateDTO[]> { ... }
  // addTemplate(template: StructuredDataTemplateDTO): Observable<StructuredDataTemplateDTO> { ... }
  // removeTemplate(id: number): Observable<void> { ... }
}
