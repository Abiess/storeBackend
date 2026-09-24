import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { AuditLog, AuditLogFilter, AuditLogResponse, AuditAction, AuditEntityType } from '../models';

@Injectable({
  providedIn: 'root'
})
export class AuditLogService {
  private apiUrl = `${environment.apiUrl}/audit-logs`;

  constructor(private http: HttpClient) {}

  /**
   * Hole Audit-Logs für einen Shop mit Filterung
   */
  getAuditLogs(filter: AuditLogFilter): Observable<AuditLogResponse> {
    if (environment.useMockData) {
      return this.getMockAuditLogs(filter);
    }

    let params = new HttpParams();
    if (filter.storeId) params = params.set('storeId', filter.storeId.toString());
    if (filter.userId) params = params.set('userId', filter.userId.toString());
    if (filter.action) params = params.set('action', filter.action);
    if (filter.entityType) params = params.set('entityType', filter.entityType);
    if (filter.startDate) params = params.set('startDate', filter.startDate);
    if (filter.endDate) params = params.set('endDate', filter.endDate);
    if (filter.page !== undefined) params = params.set('page', filter.page.toString());
    if (filter.size) params = params.set('size', filter.size.toString());

    return this.http.get<AuditLogResponse>(this.apiUrl, { params });
  }

  /**
   * Hole Audit-Logs für einen spezifischen Store
   */
  getStoreAuditLogs(storeId: number, page: number = 0, size: number = 50): Observable<AuditLogResponse> {
    return this.getAuditLogs({ storeId, page, size });
  }

  /**
   * Hole Audit-Logs für einen spezifischen User
   */
  getUserAuditLogs(userId: number, page: number = 0, size: number = 50): Observable<AuditLogResponse> {
    return this.getAuditLogs({ userId, page, size });
  }

  /**
   * Exportiere Audit-Logs als CSV
   */
  exportAuditLogs(filter: AuditLogFilter): Observable<Blob> {
    if (environment.useMockData) {
      // Mock CSV export
      const csvContent = 'ID,Datum,User,Rolle,Aktion,Entity,Beschreibung\n';
      return new Observable(observer => {
        observer.next(new Blob([csvContent], { type: 'text/csv' }));
        observer.complete();
      });
    }

    let params = new HttpParams();
    if (filter.storeId) params = params.set('storeId', filter.storeId.toString());
    if (filter.userId) params = params.set('userId', filter.userId.toString());
    if (filter.action) params = params.set('action', filter.action);
    if (filter.entityType) params = params.set('entityType', filter.entityType);
    if (filter.startDate) params = params.set('startDate', filter.startDate);
    if (filter.endDate) params = params.set('endDate', filter.endDate);

    return this.http.get(`${this.apiUrl}/export`, {
      params,
      responseType: 'blob'
    });
  }

  /**
   * Mock-Daten für Entwicklung
   */
  private getMockAuditLogs(filter: AuditLogFilter): Observable<AuditLogResponse> {
    const mockLogs: AuditLog[] = [
      {
        id: 1,
        storeId: filter.storeId || 1,
        userId: 1,
        userName: 'Demo User',
        userEmail: 'demo@markt.ma',
        userRole: 'STORE_OWNER' as any,
        action: AuditAction.CREATE,
        entityType: AuditEntityType.PRODUCT,
        entityId: 1,
        entityName: 'Premium Laptop',
        description: 'Produkt "Premium Laptop" wurde erstellt',
        changes: [
          { field: 'title', fieldLabel: 'Titel', oldValue: null, newValue: 'Premium Laptop' },
          { field: 'basePrice', fieldLabel: 'Preis', oldValue: null, newValue: 1299.99 },
          { field: 'status', fieldLabel: 'Status', oldValue: null, newValue: 'PUBLISHED' }
        ],
        ipAddress: '192.168.1.1',
        createdAt: new Date(Date.now() - 3600000).toISOString()
      },
      {
        id: 2,
        storeId: filter.storeId || 1,
        userId: 1,
        userName: 'Demo User',
        userEmail: 'demo@markt.ma',
        userRole: 'STORE_OWNER' as any,
        action: AuditAction.UPDATE,
        entityType: AuditEntityType.PRODUCT,
        entityId: 1,
        entityName: 'Premium Laptop',
        description: 'Produkt "Premium Laptop" wurde aktualisiert',
        changes: [
          { field: 'basePrice', fieldLabel: 'Preis', oldValue: 1299.99, newValue: 1199.99 },
          { field: 'stock', fieldLabel: 'Lagerbestand', oldValue: 20, newValue: 23 }
        ],
        ipAddress: '192.168.1.1',
        createdAt: new Date(Date.now() - 7200000).toISOString()
      },
      {
        id: 3,
        storeId: filter.storeId || 1,
        userId: 1,
        userName: 'Demo User',
        userEmail: 'demo@markt.ma',
        userRole: 'STORE_OWNER' as any,
        action: AuditAction.UPDATE,
        entityType: AuditEntityType.THEME,
        entityId: 1,
        entityName: 'Modern Theme',
        description: 'Theme-Einstellungen wurden geändert',
        changes: [
          { field: 'colors.primary', fieldLabel: 'Primärfarbe', oldValue: '#667eea', newValue: '#5a67d8' },
          { field: 'layout.borderRadius', fieldLabel: 'Border Radius', oldValue: 'medium', newValue: 'large' }
        ],
        ipAddress: '192.168.1.1',
        createdAt: new Date(Date.now() - 10800000).toISOString()
      },
      {
        id: 4,
        storeId: filter.storeId || 1,
        userId: 1,
        userName: 'Demo User',
        userEmail: 'demo@markt.ma',
        userRole: 'STORE_OWNER' as any,
        action: AuditAction.CREATE,
        entityType: AuditEntityType.CATEGORY,
        entityId: 1,
        entityName: 'Elektronik',
        description: 'Kategorie "Elektronik" wurde erstellt',
        changes: [
          { field: 'name', fieldLabel: 'Name', oldValue: null, newValue: 'Elektronik' },
          { field: 'slug', fieldLabel: 'Slug', oldValue: null, newValue: 'elektronik' }
        ],
        ipAddress: '192.168.1.1',
        createdAt: new Date(Date.now() - 14400000).toISOString()
      },
      {
        id: 5,
        storeId: filter.storeId || 1,
        userId: 1,
        userName: 'Demo User',
        userEmail: 'demo@markt.ma',
        userRole: 'STORE_OWNER' as any,
        action: AuditAction.UPDATE,
        entityType: AuditEntityType.SETTINGS,
        entityName: 'Shop-Einstellungen',
        description: 'Shop-Einstellungen wurden aktualisiert',
        changes: [
          { field: 'name', fieldLabel: 'Shop-Name', oldValue: 'Mein Shop', newValue: 'TechShop Demo' },
          { field: 'description', fieldLabel: 'Beschreibung', oldValue: '', newValue: 'Premium Tech Products' }
        ],
        ipAddress: '192.168.1.1',
        createdAt: new Date(Date.now() - 18000000).toISOString()
      },
      {
        id: 6,
        storeId: filter.storeId || 1,
        userId: 2,
        userName: 'Manager User',
        userEmail: 'manager@markt.ma',
        userRole: 'STORE_MANAGER' as any,
        action: AuditAction.UPDATE,
        entityType: AuditEntityType.ORDER,
        entityId: 1,
        entityName: 'Bestellung #ORD-2025-01000',
        description: 'Bestellstatus wurde geändert',
        changes: [
          { field: 'status', fieldLabel: 'Status', oldValue: 'PENDING', newValue: 'CONFIRMED' }
        ],
        ipAddress: '192.168.1.5',
        createdAt: new Date(Date.now() - 21600000).toISOString()
      }
    ];

    // Filter anwenden
    let filteredLogs = mockLogs;

    if (filter.storeId) {
      filteredLogs = filteredLogs.filter(log => log.storeId === filter.storeId);
    }

    if (filter.userId) {
      filteredLogs = filteredLogs.filter(log => log.userId === filter.userId);
    }

    if (filter.action) {
      filteredLogs = filteredLogs.filter(log => log.action === filter.action);
    }

    if (filter.entityType) {
      filteredLogs = filteredLogs.filter(log => log.entityType === filter.entityType);
    }

    // Pagination
    const page = filter.page || 0;
    const size = filter.size || 50;
    const start = page * size;
    const end = start + size;
    const paginatedLogs = filteredLogs.slice(start, end);

    return new Observable(observer => {
      setTimeout(() => {
        observer.next({
          logs: paginatedLogs,
          totalElements: filteredLogs.length,
          totalPages: Math.ceil(filteredLogs.length / size),
          currentPage: page
        });
        observer.complete();
      }, 500);
    });
  }
}

