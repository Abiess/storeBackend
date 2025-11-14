import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuditLogService } from '@app/core/services/audit-log.service';
import { AuditLog, AuditAction, AuditEntityType, AuditLogFilter, Role } from '@app/core/models';

@Component({
  selector: 'app-audit-log',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './audit-log.component.html',
  styleUrls: ['./audit-log.component.scss']
})
export class AuditLogComponent implements OnInit {
  @Input() storeId!: number;

  auditLogs: AuditLog[] = [];
  loading = false;

  // Filter
  selectedAction: AuditAction | '' = '';
  selectedEntityType: AuditEntityType | '' = '';
  selectedUserId: number | null = null;
  startDate: string = '';
  endDate: string = '';

  // Pagination
  currentPage = 0;
  pageSize = 20;
  totalPages = 0;
  totalElements = 0;

  // Enums für Template
  readonly AuditAction = AuditAction;
  readonly AuditEntityType = AuditEntityType;
  readonly actionOptions = Object.values(AuditAction);
  readonly entityTypeOptions = Object.values(AuditEntityType);

  // Expanded rows
  expandedRows = new Set<number>();

  constructor(private auditLogService: AuditLogService) {}

  ngOnInit(): void {
    this.loadAuditLogs();
  }

  loadAuditLogs(): void {
    this.loading = true;

    const filter: AuditLogFilter = {
      storeId: this.storeId,
      page: this.currentPage,
      size: this.pageSize
    };

    if (this.selectedAction) filter.action = this.selectedAction as AuditAction;
    if (this.selectedEntityType) filter.entityType = this.selectedEntityType as AuditEntityType;
    if (this.selectedUserId) filter.userId = this.selectedUserId;
    if (this.startDate) filter.startDate = this.startDate;
    if (this.endDate) filter.endDate = this.endDate;

    this.auditLogService.getAuditLogs(filter).subscribe({
      next: (response) => {
        this.auditLogs = response.logs;
        this.totalPages = response.totalPages;
        this.totalElements = response.totalElements;
        this.currentPage = response.currentPage;
        this.loading = false;
      },
      error: (error) => {
        console.error('Fehler beim Laden der Audit-Logs:', error);
        this.loading = false;
      }
    });
  }

  applyFilter(): void {
    this.currentPage = 0;
    this.loadAuditLogs();
  }

  resetFilter(): void {
    this.selectedAction = '';
    this.selectedEntityType = '';
    this.selectedUserId = null;
    this.startDate = '';
    this.endDate = '';
    this.currentPage = 0;
    this.loadAuditLogs();
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages - 1) {
      this.currentPage++;
      this.loadAuditLogs();
    }
  }

  previousPage(): void {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.loadAuditLogs();
    }
  }

  goToPage(page: number): void {
    this.currentPage = page;
    this.loadAuditLogs();
  }

  toggleRow(logId: number): void {
    if (this.expandedRows.has(logId)) {
      this.expandedRows.delete(logId);
    } else {
      this.expandedRows.add(logId);
    }
  }

  isRowExpanded(logId: number): boolean {
    return this.expandedRows.has(logId);
  }

  exportLogs(): void {
    const filter: AuditLogFilter = {
      storeId: this.storeId
    };

    if (this.selectedAction) filter.action = this.selectedAction as AuditAction;
    if (this.selectedEntityType) filter.entityType = this.selectedEntityType as AuditEntityType;
    if (this.startDate) filter.startDate = this.startDate;
    if (this.endDate) filter.endDate = this.endDate;

    this.auditLogService.exportAuditLogs(filter).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `audit-logs-${new Date().toISOString()}.csv`;
        link.click();
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        console.error('Fehler beim Exportieren:', error);
        alert('Fehler beim Exportieren der Logs');
      }
    });
  }

  getActionLabel(action: AuditAction): string {
    const labels: Record<AuditAction, string> = {
      [AuditAction.CREATE]: 'Erstellt',
      [AuditAction.UPDATE]: 'Aktualisiert',
      [AuditAction.DELETE]: 'Gelöscht',
      [AuditAction.LOGIN]: 'Angemeldet',
      [AuditAction.LOGOUT]: 'Abgemeldet',
      [AuditAction.ACTIVATE]: 'Aktiviert',
      [AuditAction.DEACTIVATE]: 'Deaktiviert',
      [AuditAction.PUBLISH]: 'Veröffentlicht',
      [AuditAction.UNPUBLISH]: 'Unveröffentlicht',
      [AuditAction.EXPORT]: 'Exportiert',
      [AuditAction.IMPORT]: 'Importiert'
    };
    return labels[action] || action;
  }

  getEntityTypeLabel(entityType: AuditEntityType): string {
    const labels: Record<AuditEntityType, string> = {
      [AuditEntityType.STORE]: 'Shop',
      [AuditEntityType.PRODUCT]: 'Produkt',
      [AuditEntityType.CATEGORY]: 'Kategorie',
      [AuditEntityType.ORDER]: 'Bestellung',
      [AuditEntityType.USER]: 'Benutzer',
      [AuditEntityType.SETTINGS]: 'Einstellungen',
      [AuditEntityType.THEME]: 'Theme',
      [AuditEntityType.DOMAIN]: 'Domain',
      [AuditEntityType.MEDIA]: 'Medien',
      [AuditEntityType.SUBSCRIPTION]: 'Abonnement'
    };
    return labels[entityType] || entityType;
  }

  getRoleLabel(role: Role): string {
    const labels: Record<Role, string> = {
      [Role.SUPER_ADMIN]: 'Super Admin',
      [Role.STORE_OWNER]: 'Shop-Besitzer',
      [Role.STORE_MANAGER]: 'Shop-Manager',
      [Role.STORE_EMPLOYEE]: 'Mitarbeiter',
      [Role.CUSTOMER]: 'Kunde'
    };
    return labels[role] || role;
  }

  getActionColor(action: AuditAction): string {
    const colors: Record<AuditAction, string> = {
      [AuditAction.CREATE]: 'success',
      [AuditAction.UPDATE]: 'info',
      [AuditAction.DELETE]: 'danger',
      [AuditAction.LOGIN]: 'secondary',
      [AuditAction.LOGOUT]: 'secondary',
      [AuditAction.ACTIVATE]: 'success',
      [AuditAction.DEACTIVATE]: 'warning',
      [AuditAction.PUBLISH]: 'success',
      [AuditAction.UNPUBLISH]: 'warning',
      [AuditAction.EXPORT]: 'info',
      [AuditAction.IMPORT]: 'info'
    };
    return colors[action] || 'secondary';
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatValue(value: any): string {
    if (value === null || value === undefined) {
      return '-';
    }
    if (typeof value === 'boolean') {
      return value ? 'Ja' : 'Nein';
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value);
  }
}

