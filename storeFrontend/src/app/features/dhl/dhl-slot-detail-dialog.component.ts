import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DhlParcel, DhlSlot } from '@app/core/services/dhl.service';
import { TranslatePipe } from '@app/core/pipes/translate.pipe';

/**
 * DHL Slot Detail Dialog Component (Teil 2 - Lagerverwaltung, Schritt 1)
 *
 * Zeigt die STORED-Pakete eines einzelnen Lagerfachs an und erlaubt das
 * Entfernen einzelner Pakete aus dem aktiven Lager (nutzt den bestehenden
 * Backend-Endpoint POST /parcels/{parcelId}/cancel via cancelRequested-Output -
 * dieses Presentational-Component führt selbst KEINEN HTTP-Call aus, um
 * Aufrufer die volle Kontrolle über Laden/Fehlerbehandlung/Refresh zu geben).
 *
 * Kein neues Lager-UI - erweitert lediglich die bestehende Fach-Grid-Ansicht
 * um ein Detail-Panel.
 */
@Component({
  selector: 'app-dhl-slot-detail-dialog',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  template: `
    <div class="dialog-backdrop" (click)="onBackdropClick()">
      <div class="dialog-box" (click)="$event.stopPropagation()">
        <div class="dialog-header">
          <h2>📦 {{ 'dhl.slotDetail.title' | translate }} {{ slot?.code }}</h2>
          <button class="close-btn" (click)="close.emit()" type="button">✕</button>
        </div>

        <p class="occupancy-line">
          {{ slot?.occupiedCount }} {{ 'dhl.slotDetail.occupancyLabel' | translate: { capacity: slot?.capacity ?? 0 } }}
        </p>

        <!-- Liste der eingelagerten Pakete -->
        <div *ngIf="!confirmingParcel()" class="parcel-list">
          <div *ngIf="parcels.length === 0" class="empty-hint">
            {{ 'dhl.slotDetail.empty' | translate }}
          </div>

          <div *ngFor="let parcel of parcels" class="parcel-row">
            <div class="parcel-info">
              <div class="parcel-tracking">{{ parcel.trackingCode }}</div>
              <div class="parcel-meta">
                {{ 'dhl.slotDetail.dhlParcel' | translate }}
                <span *ngIf="parcel.receivedAt">
                  · {{ 'dhl.slotDetail.storedSince' | translate }}
                  {{ parcel.receivedAt | date:'short' }}
                </span>
              </div>
            </div>
            <button
              class="btn-remove"
              type="button"
              [disabled]="removingParcelId() === parcel.id"
              (click)="startRemove(parcel)">
              🗑️ {{ 'dhl.slotDetail.removeButton' | translate }}
            </button>
          </div>
        </div>

        <!-- Bestätigungsansicht vor dem Entfernen -->
        <div *ngIf="confirmingParcel() as parcel" class="confirm-box">
          <h3>{{ 'dhl.slotDetail.confirmTitle' | translate }}</h3>
          <p>
            <strong>{{ 'dhl.slotDetail.confirmTrackingLabel' | translate }}:</strong>
            {{ parcel.trackingCode }}
          </p>
          <p>
            <strong>{{ 'dhl.slotDetail.confirmSlotLabel' | translate }}:</strong>
            {{ slot?.code }}
          </p>

          <div class="confirm-actions">
            <button
              class="btn-secondary"
              type="button"
              [disabled]="removingParcelId() === parcel.id"
              (click)="cancelRemove()">
              {{ 'dhl.slotDetail.confirmCancel' | translate }}
            </button>
            <button
              class="btn-danger"
              type="button"
              [disabled]="removingParcelId() === parcel.id"
              (click)="confirmRemove(parcel)">
              <span *ngIf="removingParcelId() !== parcel.id">{{ 'dhl.slotDetail.confirmRemove' | translate }}</span>
              <span *ngIf="removingParcelId() === parcel.id">{{ 'dhl.slotDetail.removing' | translate }}</span>
            </button>
          </div>
        </div>

        <div class="dialog-footer">
          <button class="btn-close" type="button" (click)="close.emit()">
            {{ 'dhl.slotDetail.close' | translate }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dialog-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 1rem;
    }

    .dialog-box {
      background: white;
      border-radius: 12px;
      padding: 1.5rem;
      max-width: 480px;
      width: 100%;
      max-height: 85vh;
      overflow-y: auto;
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.25);
    }

    .dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
    }

    .dialog-header h2 {
      font-size: 1.3rem;
      margin: 0;
      color: #333;
    }

    .close-btn {
      background: none;
      border: none;
      font-size: 1.25rem;
      cursor: pointer;
      color: #666;
    }

    .occupancy-line {
      color: #666;
      margin: 0 0 1rem 0;
      font-weight: 600;
    }

    .parcel-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .empty-hint {
      text-align: center;
      padding: 2rem 1rem;
      color: #888;
    }

    .parcel-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      padding: 0.75rem;
      background: #f8f9fa;
      border-radius: 8px;
      border: 2px solid #e0e0e0;
    }

    .parcel-tracking {
      font-family: monospace;
      font-weight: 600;
      color: #333;
    }

    .parcel-meta {
      font-size: 0.8rem;
      color: #666;
      margin-top: 0.15rem;
    }

    .btn-remove {
      padding: 0.5rem 0.85rem;
      background: white;
      border: 2px solid #dc3545;
      color: #dc3545;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
    }

    .btn-remove:hover:not(:disabled) {
      background: #dc3545;
      color: white;
    }

    .btn-remove:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .confirm-box {
      background: #fff3cd;
      border: 2px solid #ffc107;
      border-radius: 8px;
      padding: 1rem;
    }

    .confirm-box h3 {
      margin: 0 0 0.75rem 0;
      color: #856404;
      font-size: 1.1rem;
    }

    .confirm-box p {
      margin: 0.25rem 0;
      color: #333;
    }

    .confirm-actions {
      display: flex;
      gap: 0.75rem;
      margin-top: 1rem;
    }

    .btn-secondary {
      flex: 1;
      padding: 0.75rem;
      background: white;
      border: 2px solid #ddd;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
    }

    .btn-danger {
      flex: 1;
      padding: 0.75rem;
      background: #dc3545;
      color: white;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
    }

    .btn-danger:disabled,
    .btn-secondary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .dialog-footer {
      margin-top: 1.25rem;
      text-align: right;
    }

    .btn-close {
      padding: 0.65rem 1.5rem;
      background: #f0f0f0;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
    }
  `]
})
export class DhlSlotDetailDialogComponent implements OnChanges {
  @Input() slot: DhlSlot | null = null;
  /** Bereits gefilterte Liste der STORED-Pakete dieses Fachs (Aufrufer filtert). */
  @Input() parcels: DhlParcel[] = [];
  /** ID des Pakets, dessen Entfernung gerade läuft (für Loading-State im Button). */
  @Input() removingParcelIdInput: number | null = null;

  @Output() close = new EventEmitter<void>();
  /** Wird ausgelöst, wenn der Benutzer die Entfernung final bestätigt hat. */
  @Output() removeConfirmed = new EventEmitter<DhlParcel>();

  confirmingParcel = signal<DhlParcel | null>(null);

  ngOnChanges(changes: SimpleChanges): void {
    // Wenn das gerade zu bestätigende Paket nach einem `parcels`-Update
    // nicht mehr in der Liste ist (z.B. erfolgreich entfernt), Bestätigungs-
    // ansicht automatisch zurücksetzen - sonst bliebe der Confirm-Dialog für
    // ein bereits entferntes Paket sichtbar.
    if (changes['parcels']) {
      const confirming = this.confirmingParcel();
      if (confirming && !this.parcels.some(p => p.id === confirming.id)) {
        this.confirmingParcel.set(null);
      }
    }
  }

  removingParcelId(): number | null {
    return this.removingParcelIdInput;
  }

  startRemove(parcel: DhlParcel): void {
    this.confirmingParcel.set(parcel);
  }

  cancelRemove(): void {
    this.confirmingParcel.set(null);
  }

  confirmRemove(parcel: DhlParcel): void {
    this.removeConfirmed.emit(parcel);
  }

  /**
   * Nach erfolgreicher Entfernung durch den Aufrufer zurücksetzen
   * (z.B. wenn das entfernte Paket aus `parcels` verschwunden ist).
   */
  resetConfirmation(): void {
    this.confirmingParcel.set(null);
  }

  onBackdropClick(): void {
    this.close.emit();
  }
}
