import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface BrandGenerateRequest {
  shopName: string;
  slogan?: string;
  industry?: string;
  style: 'minimal' | 'playful' | 'geometric' | 'organic';
  preferredColors?: string[];
  forbiddenColors?: string[];
  salt?: string;
}

export interface BrandGenerateResponse {
  assets: { [key: string]: string };
  paletteTokens: { [key: string]: string };
  initials: string;
}

export interface BrandAssetsResponse {
  assets: { [key: string]: string };
  paletteTokens: { [key: string]: string };
}

@Injectable({
  providedIn: 'root'
})
export class BrandService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/api/stores`;

  generate(storeId: number, request: BrandGenerateRequest): Observable<BrandGenerateResponse> {
    return this.http.post<BrandGenerateResponse>(
      `${this.baseUrl}/${storeId}/brand/generate`,
      request
    );
  }

  getAssets(storeId: number): Observable<BrandAssetsResponse> {
    return this.http.get<BrandAssetsResponse>(
      `${this.baseUrl}/${storeId}/brand/assets`
    );
  }

  savePalette(storeId: number, tokens: { [key: string]: string }): Observable<{ [key: string]: string }> {
    return this.http.put<{ [key: string]: string }>(
      `${this.baseUrl}/${storeId}/brand/palette`,
      tokens
    );
  }
}

