import { Observable, of, delay } from 'rxjs';
import { Domain, CreateDomainRequest, DomainType } from '../models';
import { MOCK_DOMAINS } from './mock-data';

export class MockDomainService {
  private domains: Domain[] = [...MOCK_DOMAINS];

  getDomains(storeId: number): Observable<Domain[]> {
    return of(this.domains).pipe(delay(500));
  }

  createDomain(storeId: number, request: CreateDomainRequest): Observable<Domain> {
    const newDomain: Domain = {
      id: this.domains.length + 1,
      domain: request.domain || request.host || '',
      host: request.host || request.domain || '',
      type: request.type,
      verified: request.type === DomainType.SUBDOMAIN,
      isVerified: request.type === DomainType.SUBDOMAIN,
      isPrimary: request.isPrimary || false,
      storeId: storeId,
      verificationToken: request.type === DomainType.CUSTOM
        ? 'markt-verify-' + Math.random().toString(36).substring(7)
        : undefined,
      createdAt: new Date().toISOString()
    };
    this.domains.push(newDomain);
    return of(newDomain).pipe(delay(500));
  }

  deleteDomain(storeId: number, domainId: number): Observable<void> {
    this.domains = this.domains.filter(d => d.id !== domainId);
    return of(void 0).pipe(delay(500));
  }

  verifyDomain(storeId: number, domainId: number): Observable<Domain> {
    const domain = this.domains.find(d => d.id === domainId);
    if (domain) {
      domain.isVerified = true;
    }
    return of(domain!).pipe(delay(1000));
  }
}
