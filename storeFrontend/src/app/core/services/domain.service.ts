import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { Domain, CreateDomainRequest } from '../models';
import { MockDomainService } from '../mocks/mock-domain.service';

@Injectable({
  providedIn: 'root'
})
export class DomainService {
  private mockService = new MockDomainService();

  constructor(private http: HttpClient) {}

  getDomains(storeId: number): Observable<Domain[]> {
    if (environment.useMockData) {
      return this.mockService.getDomains(storeId);
    }
    return this.http.get<Domain[]>(`${environment.apiUrl}/stores/${storeId}/domains`);
  }

  createDomain(storeId: number, request: CreateDomainRequest): Observable<Domain> {
    if (environment.useMockData) {
      return this.mockService.createDomain(storeId, request);
    }
    return this.http.post<Domain>(`${environment.apiUrl}/stores/${storeId}/domains/custom`, {
      host: request.host || request.domain,
      type: request.type
    });
  }

  deleteDomain(storeId: number, domainId: number): Observable<void> {
    if (environment.useMockData) {
      return this.mockService.deleteDomain(storeId, domainId);
    }
    return this.http.delete<void>(`${environment.apiUrl}/stores/${storeId}/domains/${domainId}`);
  }

  verifyDomain(storeId: number, domainId: number): Observable<Domain> {
    if (environment.useMockData) {
      return this.mockService.verifyDomain(storeId, domainId);
    }
    return this.http.post<Domain>(`${environment.apiUrl}/stores/${storeId}/domains/${domainId}/verify`, {});
  }

  getVerificationInstructions(storeId: number, domainId: number): Observable<string> {
    if (environment.useMockData) {
      return this.mockService.getVerificationInstructions(storeId, domainId);
    }
    return this.http.get(`${environment.apiUrl}/stores/${storeId}/domains/${domainId}/verification-instructions`, { responseType: 'text' });
  }

  setPrimaryDomain(storeId: number, domainId: number): Observable<void> {
    if (environment.useMockData) {
      return this.mockService.setPrimaryDomain(storeId, domainId);
    }
    return this.http.post<void>(`${environment.apiUrl}/stores/${storeId}/domains/${domainId}/set-primary`, {});
  }
}
