import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { HomepageSection, CreateHomepageSectionRequest } from '../models';

@Injectable({
  providedIn: 'root'
})
export class HomepageSectionService {
  constructor(private http: HttpClient) {}

  /**
   * Get all sections for a store (admin)
   */
  getStoreSections(storeId: number): Observable<HomepageSection[]> {
    return this.http.get<HomepageSection[]>(
      `${environment.apiUrl}/stores/${storeId}/homepage-sections`
    );
  }

  /**
   * Get active sections (public - for storefront)
   */
  getActiveSections(storeId: number): Observable<HomepageSection[]> {
    return this.http.get<HomepageSection[]>(
      `${environment.apiUrl}/stores/${storeId}/homepage-sections/active`
    );
  }

  /**
   * Create new section
   */
  createSection(request: CreateHomepageSectionRequest): Observable<HomepageSection> {
    return this.http.post<HomepageSection>(
      `${environment.apiUrl}/stores/${request.storeId}/homepage-sections`,
      request
    );
  }

  /**
   * Update section
   */
  updateSection(storeId: number, sectionId: number, updates: Partial<HomepageSection>): Observable<HomepageSection> {
    return this.http.put<HomepageSection>(
      `${environment.apiUrl}/stores/${storeId}/homepage-sections/${sectionId}`,
      updates
    );
  }

  /**
   * Delete section
   */
  deleteSection(storeId: number, sectionId: number): Observable<void> {
    return this.http.delete<void>(
      `${environment.apiUrl}/stores/${storeId}/homepage-sections/${sectionId}`
    );
  }

  /**
   * Reorder sections
   */
  reorderSections(storeId: number, sectionIds: number[]): Observable<void> {
    return this.http.put<void>(
      `${environment.apiUrl}/stores/${storeId}/homepage-sections/reorder`,
      sectionIds
    );
  }
}

