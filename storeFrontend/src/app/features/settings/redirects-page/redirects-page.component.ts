import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { SeoApiService, RedirectRuleDTO } from '../../../core/services/seo-api.service';
import { RedirectDialogComponent } from './redirect-dialog.component';
import { ResponsiveDataListComponent, ColumnConfig, ActionConfig } from '@app/shared/components/responsive-data-list/responsive-data-list.component';

@Component({
  selector: 'app-redirects-page',
  standalone: true,
  imports: [
    CommonModule,
    MatSnackBarModule,
    MatDialogModule,
    ResponsiveDataListComponent
  ],
  template: `
    <div class="redirects-container">
      <div class="redirects-header">
        <div class="redirects-header__left">
          <h2>↪ URL Redirects</h2>
          <span class="redirects-count" *ngIf="!loading">{{ redirects.length }} Einträge</span>
        </div>
        <div class="redirects-header__actions">
          <button class="btn-secondary" (click)="onExport()" title="CSV Export">📥 Export</button>
          <label class="btn-secondary" title="CSV Import">
            📤 Import
            <input type="file" accept=".csv" (change)="onImport($event)" style="display:none">
          </label>
          <button class="btn-primary" (click)="onAdd()" data-testid="seo-redirect-add">+ Neu</button>
        </div>
      </div>

      <app-responsive-data-list
        [items]="redirects"
        [columns]="columns"
        [actions]="actions"
        [loading]="loading"
        [rowClickable]="true"
        [searchable]="true"
        searchPlaceholder="Pfad oder URL suchen..."
        emptyMessage="Noch keine Redirect-Regeln angelegt"
        emptyIcon="↪"
        (rowClick)="onEdit($event)">
      </app-responsive-data-list>
    </div>
  `,
  styles: [`
    .redirects-container { padding: 1.5rem 0; }
    .redirects-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      flex-wrap: wrap;
      margin-bottom: 1.25rem;
    }
    .redirects-header__left { display: flex; align-items: center; gap: .75rem; }
    .redirects-header__left h2 { margin: 0; font-size: 1.25rem; font-weight: 700; color: #1e293b; }
    .redirects-count {
      background: #f1f5f9; color: #64748b;
      padding: .2rem .65rem; border-radius: 20px; font-size: .8rem; font-weight: 500;
    }
    .redirects-header__actions { display: flex; gap: .5rem; flex-wrap: wrap; align-items: center; }
    .btn-primary {
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: #fff; border: none; padding: .6rem 1.25rem;
      border-radius: 8px; font-size: .875rem; font-weight: 600;
      cursor: pointer; transition: all .2s;
    }
    .btn-primary:hover { opacity: .9; transform: translateY(-1px); }
    .btn-secondary {
      background: #fff; color: #475569;
      border: 1.5px solid #e2e8f0; padding: .6rem 1rem;
      border-radius: 8px; font-size: .875rem; font-weight: 500;
      cursor: pointer; transition: all .2s;
    }
    .btn-secondary:hover { border-color: #667eea; color: #667eea; }
  `]
})
export class RedirectsPageComponent implements OnInit {
  storeId!: number;
  redirects: RedirectRuleDTO[] = [];
  loading = false;

  columns: ColumnConfig[] = [
    {
      key: 'sourcePath',
      label: 'Quellpfad',
      type: 'text',
      sortable: true,
      formatFn: (v) => `🔗 ${v}`
    },
    {
      key: 'targetUrl',
      label: 'Ziel-URL',
      type: 'text',
      hideOnMobile: true,
      formatFn: (v) => v || '-'
    },
    {
      key: 'httpCode',
      label: 'Code',
      type: 'badge',
      width: '80px',
      formatFn: (v) => String(v || '-'),
      badgeClass: (v) => v === 301 ? 'status-shipped' : 'status-confirmed'
    },
    {
      key: 'isActive',
      label: 'Status',
      type: 'badge',
      formatFn: (v) => v ? 'Aktiv' : 'Inaktiv',
      badgeClass: (v) => v ? 'status-active' : 'status-inactive'
    },
    {
      key: 'hitCount',
      label: 'Aufrufe',
      type: 'number',
      sortable: true,
      hideOnMobile: true
    }
  ];

  actions: ActionConfig[] = [
    {
      icon: '✏️',
      label: 'Bearbeiten',
      handler: (r) => this.onEdit(r)
    },
    {
      icon: '🟢',
      label: 'Aktivieren',
      visible: (r: RedirectRuleDTO) => !r.isActive,
      handler: (r: RedirectRuleDTO) => this.onToggleActive(r)
    },
    {
      icon: '🔴',
      label: 'Deaktivieren',
      visible: (r: RedirectRuleDTO) => !!r.isActive,
      handler: (r: RedirectRuleDTO) => this.onToggleActive(r)
    },
    {
      icon: '🗑️',
      label: 'Löschen',
      class: 'danger',
      handler: (r) => this.onDelete(r)
    }
  ];

  constructor(
    private route: ActivatedRoute,
    private seoApi: SeoApiService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.storeId = Number(this.route.snapshot.paramMap.get('storeId'));
    this.loadRedirects();
  }

  loadRedirects(): void {
    this.loading = true;
    this.seoApi.getRedirects(this.storeId).subscribe({
      next: (data) => { this.redirects = data; this.loading = false; },
      error: (err) => {
        console.error(err);
        this.snackBar.open('Fehler beim Laden', 'OK', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  onAdd(): void {
    this.dialog.open(RedirectDialogComponent, { width: '600px', data: { storeId: this.storeId } })
      .afterClosed().subscribe(r => r && this.loadRedirects());
  }

  onEdit(redirect: RedirectRuleDTO): void {
    this.dialog.open(RedirectDialogComponent, { width: '600px', data: { storeId: this.storeId, redirect } })
      .afterClosed().subscribe(r => r && this.loadRedirects());
  }

  onToggleActive(redirect: RedirectRuleDTO): void {
    const updated = { ...redirect, isActive: !redirect.isActive };
    this.seoApi.updateRedirect(this.storeId, redirect.id!, updated).subscribe({
      next: () => { this.snackBar.open('✅ Status aktualisiert', 'OK', { duration: 2000 }); this.loadRedirects(); },
      error: () => this.snackBar.open('❌ Fehler', 'OK', { duration: 3000 })
    });
  }

  onDelete(redirect: RedirectRuleDTO): void {
    if (!confirm(`Redirect "${redirect.sourcePath}" wirklich löschen?`)) return;
    this.seoApi.deleteRedirect(this.storeId, redirect.id!).subscribe({
      next: () => { this.snackBar.open('✅ Redirect gelöscht', 'OK', { duration: 2000 }); this.loadRedirects(); },
      error: () => this.snackBar.open('❌ Fehler', 'OK', { duration: 3000 })
    });
  }

  onImport(event: Event): void {
    this.snackBar.open('ℹ️ CSV Import kommt bald', 'OK', { duration: 2000 });
  }

  onExport(): void {
    this.snackBar.open('ℹ️ CSV Export kommt bald', 'OK', { duration: 2000 });
  }
}
