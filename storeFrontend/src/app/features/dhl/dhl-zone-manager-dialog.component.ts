import { Component, OnInit, inject, signal, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DhlLayoutService } from '@app/core/services/dhl-layout.service';
import { DhlZone, DhlZoneRequest } from '@app/core/models/dhl.model';
import { TranslatePipe } from '@app/core/pipes/translate.pipe';

/**
 * DHL Zone Manager Dialog
 * 
 * CRUD operations for warehouse zones/areas:
 * - Create zone
 * - Edit zone (name, color, sort order)
 * - Delete zone
 * - Reorder zones
 */
@Component({
  selector: 'app-dhl-zone-manager-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  template: `
    <div class="dialog-overlay" (click)="close()">
      <div class="dialog-content" (click)="$event.stopPropagation()">
        <div class="dialog-header">
          <h2>{{ 'dhl.zones.title' | translate }}</h2>
          <button class="btn-close" (click)="close()">✕</button>
        </div>

        <div class="dialog-body">
          <!-- Zone List -->
          <div class="zone-list">
            <div *ngFor="let zone of sortedZones()" class="zone-item">
              <div class="zone-color" [style.background-color]="zone.color || '#667eea'"></div>
              <div class="zone-info">
                <div class="zone-name">{{ zone.name }}</div>
                <div class="zone-meta">{{ 'dhl.zones.sortOrder' | translate }}: {{ zone.sortOrder }}</div>
              </div>
              <div class="zone-actions">
                <button class="btn-icon" (click)="startEdit(zone)" [title]="'common.edit' | translate">
                  ✏️
                </button>
                <button class="btn-icon btn-danger" (click)="deleteZone(zone)" [title]="'common.delete' | translate">
                  🗑️
                </button>
              </div>
            </div>

            <!-- Empty State -->
            <div *ngIf="zones().length === 0" class="empty-state">
              <p>{{ 'dhl.zones.empty' | translate }}</p>
            </div>
          </div>

          <!-- Create/Edit Form -->
          <div class="zone-form">
            <h3>{{ editingZone() ? ('dhl.zones.edit' | translate) : ('dhl.zones.create' | translate) }}</h3>
            
            <div class="form-group">
              <label>{{ 'dhl.zones.name' | translate }} *</label>
              <input
                type="text"
                [(ngModel)]="formName"
                [placeholder]="'dhl.zones.namePlaceholder' | translate"
                maxlength="100"
                [disabled]="loading()">
            </div>

            <div class="form-group">
              <label>{{ 'dhl.zones.color' | translate }}</label>
              <div class="color-picker">
                <input
                  type="color"
                  [(ngModel)]="formColor"
                  [disabled]="loading()">
                <input
                  type="text"
                  [(ngModel)]="formColor"
                  placeholder="#667eea"
                  maxlength="20"
                  [disabled]="loading()">
              </div>
            </div>

            <div class="form-group">
              <label>{{ 'dhl.zones.sortOrder' | translate }}</label>
              <input
                type="number"
                [(ngModel)]="formSortOrder"
                [disabled]="loading()"
                min="0">
            </div>

            <div class="form-actions">
              <button
                *ngIf="editingZone()"
                class="btn-secondary"
                (click)="cancelEdit()"
                [disabled]="loading()">
                {{ 'common.cancel' | translate }}
              </button>
              <button
                class="btn-primary"
                (click)="saveZone()"
                [disabled]="!canSave() || loading()">
                <span *ngIf="!loading()">{{ editingZone() ? ('common.save' | translate) : ('dhl.zones.create' | translate) }}</span>
                <span *ngIf="loading()">{{ 'common.saving' | translate }}...</span>
              </button>
            </div>
          </div>

          <!-- Error Message -->
          <div *ngIf="error()" class="error-message">
            {{ error() }}
          </div>
        </div>

        <div class="dialog-footer">
          <button class="btn-secondary" (click)="close()">
            {{ 'common.close' | translate }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dialog-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 1rem;
    }

    .dialog-content {
      background: white;
      border-radius: 12px;
      max-width: 600px;
      width: 100%;
      max-height: 90vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
    }

    .dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.5rem;
      border-bottom: 2px solid #e0e0e0;
    }

    .dialog-header h2 {
      margin: 0;
      font-size: 1.5rem;
      color: #333;
    }

    .btn-close {
      background: none;
      border: none;
      font-size: 1.5rem;
      cursor: pointer;
      color: #666;
      padding: 0;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      transition: all 0.2s;
    }

    .btn-close:hover {
      background: #f0f0f0;
      color: #333;
    }

    .dialog-body {
      flex: 1;
      overflow-y: auto;
      padding: 1.5rem;
    }

    .zone-list {
      margin-bottom: 2rem;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      overflow: hidden;
    }

    .zone-item {
      display: flex;
      align-items: center;
      padding: 1rem;
      border-bottom: 1px solid #e0e0e0;
      transition: background 0.2s;
    }

    .zone-item:last-child {
      border-bottom: none;
    }

    .zone-item:hover {
      background: #f8f9fa;
    }

    .zone-color {
      width: 40px;
      height: 40px;
      border-radius: 8px;
      margin-right: 1rem;
      flex-shrink: 0;
      border: 2px solid #e0e0e0;
    }

    .zone-info {
      flex: 1;
    }

    .zone-name {
      font-size: 1.1rem;
      font-weight: 600;
      color: #333;
      margin-bottom: 0.25rem;
    }

    .zone-meta {
      font-size: 0.9rem;
      color: #666;
    }

    .zone-actions {
      display: flex;
      gap: 0.5rem;
    }

    .btn-icon {
      background: white;
      border: 2px solid #e0e0e0;
      border-radius: 6px;
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 1rem;
      transition: all 0.2s;
    }

    .btn-icon:hover {
      background: #f0f0f0;
      transform: translateY(-2px);
    }

    .btn-icon.btn-danger:hover {
      background: #fee;
      border-color: #dc3545;
    }

    .empty-state {
      padding: 2rem;
      text-align: center;
      color: #666;
    }

    .zone-form {
      background: #f8f9fa;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      padding: 1.5rem;
    }

    .zone-form h3 {
      margin: 0 0 1rem 0;
      font-size: 1.1rem;
      color: #333;
    }

    .form-group {
      margin-bottom: 1rem;
    }

    .form-group label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 600;
      color: #333;
      font-size: 0.95rem;
    }

    .form-group input[type="text"],
    .form-group input[type="number"] {
      width: 100%;
      padding: 0.75rem;
      border: 2px solid #e0e0e0;
      border-radius: 6px;
      font-size: 1rem;
      transition: border-color 0.2s;
    }

    .form-group input:focus {
      outline: none;
      border-color: #667eea;
    }

    .form-group input:disabled {
      background: #f5f5f5;
      cursor: not-allowed;
    }

    .color-picker {
      display: flex;
      gap: 0.5rem;
      align-items: center;
    }

    .color-picker input[type="color"] {
      width: 60px;
      height: 40px;
      border: 2px solid #e0e0e0;
      border-radius: 6px;
      cursor: pointer;
    }

    .color-picker input[type="text"] {
      flex: 1;
    }

    .form-actions {
      display: flex;
      gap: 0.5rem;
      margin-top: 1.5rem;
    }

    .btn-primary,
    .btn-secondary {
      flex: 1;
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 6px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-primary {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
    }

    .btn-primary:disabled {
      background: #ccc;
      cursor: not-allowed;
      transform: none;
    }

    .btn-secondary {
      background: white;
      color: #667eea;
      border: 2px solid #667eea;
    }

    .btn-secondary:hover:not(:disabled) {
      background: #f0f0f0;
    }

    .error-message {
      margin-top: 1rem;
      padding: 1rem;
      background: #fee;
      border: 2px solid #dc3545;
      border-radius: 6px;
      color: #721c24;
      font-size: 0.95rem;
    }

    .dialog-footer {
      padding: 1rem 1.5rem;
      border-top: 2px solid #e0e0e0;
      display: flex;
      justify-content: flex-end;
    }

    @media (max-width: 768px) {
      .dialog-content {
        max-width: 100%;
        max-height: 100vh;
        border-radius: 0;
      }

      .zone-item {
        flex-wrap: wrap;
      }

      .zone-actions {
        width: 100%;
        margin-top: 0.5rem;
        justify-content: flex-end;
      }

      .form-actions {
        flex-direction: column;
      }
    }
  `]
})
export class DhlZoneManagerDialogComponent implements OnInit {
  private layoutService = inject(DhlLayoutService);
  
  // Props passed from parent
  storeId = input.required<number>();
  
  // Internal state - zones loaded/managed by dialog
  zones = signal<DhlZone[]>([]);
  
  // State
  loading = signal(false);
  error = signal<string | null>(null);
  editingZone = signal<DhlZone | null>(null);
  
  // Form fields
  formName = '';
  formColor = '#667eea';
  formSortOrder = 0;

  sortedZones = computed(() => 
    [...this.zones()].sort((a, b) => a.sortOrder - b.sortOrder)
  );

  canSave = computed(() => 
    this.formName.trim().length > 0
  );

  ngOnInit(): void {
    this.loadZones();
  }

  private loadZones(): void {
    this.loading.set(true);
    this.error.set(null);
    
    this.layoutService.getZones(this.storeId()).subscribe({
      next: (zones) => {
        this.zones.set(zones);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Failed to load zones:', err);
        this.error.set('Fehler beim Laden der Bereiche');
        this.loading.set(false);
      }
    });
  }

  startEdit(zone: DhlZone): void {
    this.editingZone.set(zone);
    this.formName = zone.name;
    this.formColor = zone.color || '#667eea';
    this.formSortOrder = zone.sortOrder;
    this.error.set(null);
  }

  cancelEdit(): void {
    this.editingZone.set(null);
    this.resetForm();
  }

  private resetForm(): void {
    this.formName = '';
    this.formColor = '#667eea';
    this.formSortOrder = this.zones().length;
    this.error.set(null);
  }

  saveZone(): void {
    if (!this.canSave()) return;

    this.loading.set(true);
    this.error.set(null);

    const request: DhlZoneRequest = {
      name: this.formName.trim(),
      color: this.formColor || undefined,
      sortOrder: this.formSortOrder
    };

    const editing = this.editingZone();
    if (editing) {
      // Update existing zone
      this.layoutService.updateZone(this.storeId(), editing.id, request).subscribe({
        next: (updated) => {
          const zones = this.zones();
          const index = zones.findIndex(z => z.id === editing.id);
          if (index >= 0) {
            zones[index] = updated;
            this.zones.set([...zones]);
          }
          this.loading.set(false);
          this.cancelEdit();
        },
        error: (err) => {
          console.error('Failed to update zone:', err);
          this.error.set(err.error?.message || 'Fehler beim Aktualisieren des Bereichs');
          this.loading.set(false);
        }
      });
    } else {
      // Create new zone
      this.layoutService.createZone(this.storeId(), request).subscribe({
        next: (created) => {
          this.zones.set([...this.zones(), created]);
          this.loading.set(false);
          this.resetForm();
        },
        error: (err) => {
          console.error('Failed to create zone:', err);
          this.error.set(err.error?.message || 'Fehler beim Erstellen des Bereichs');
          this.loading.set(false);
        }
      });
    }
  }

  deleteZone(zone: DhlZone): void {
    if (!confirm(`Bereich "${zone.name}" wirklich löschen?`)) {
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.layoutService.deleteZone(this.storeId(), zone.id).subscribe({
      next: () => {
        this.zones.set(this.zones().filter(z => z.id !== zone.id));
        this.loading.set(false);
        if (this.editingZone()?.id === zone.id) {
          this.cancelEdit();
        }
      },
      error: (err) => {
        console.error('Failed to delete zone:', err);
        this.error.set(err.error?.message || 'Fehler beim Löschen des Bereichs');
        this.loading.set(false);
      }
    });
  }

  close(): void {
    // Emit close event to parent
    // Parent should handle this via @Output or dialog service
    console.log('Close dialog');
  }
}
