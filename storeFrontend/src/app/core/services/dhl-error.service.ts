import { Injectable, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { TranslationService } from '@app/core/services/translation.service';
import { ToastService } from '@app/core/services/toast.service';

/**
 * Structured DHL error response from backend
 */
export interface DhlErrorResponse {
  timestamp: string;
  status: number;
  code: string;
  message: string;
  details?: {
    trackingCode?: string;
    slot?: string;
    slotCode?: string;
    pickedUpAt?: string;
    storedAt?: string;
    capacity?: number;
    occupied?: number;
    reason?: string;
    // Phase 3A.5 - Slot Management
    code?: string;
    count?: number;
    requestedCapacity?: number;
    occupiedCount?: number;
  };
}

/**
 * DHL Error Mapper Service
 * 
 * Phase 3A.3 - Zentralisiertes Error-Handling für alle DHL-Flows
 * 
 * Mappt Backend-Error-Codes zu benutzerfreundlichen i18n-Messages
 * und zeigt diese via Toast an.
 * 
 * WICHTIG: Keine rohen Backend-Messages anzeigen!
 */
@Injectable({
  providedIn: 'root'
})
export class DhlErrorService {
  private translationService = inject(TranslationService);
  private toast = inject(ToastService);

  /**
   * Behandelt HTTP-Fehler von DHL-Endpoints
   * 
   * @param error HttpErrorResponse
   * @param context Kontext für zusätzliche Infos (optional)
   * @returns true wenn Fehler behandelt wurde
   */
  handleError(error: HttpErrorResponse, context?: string): boolean {
    if (!error || !error.error) {
      // Generischer Fehler
      this.showGenericError();
      return false;
    }

    const errorBody = error.error as DhlErrorResponse;
    const code = errorBody.code || error.status.toString();

    // Fachliche DHL-Fehler (Phase 3A.3)
    switch (code) {
      case 'PARCEL_ALREADY_PICKED_UP':
        this.showAlreadyPickedUp(errorBody.details);
        return true;

      case 'PARCEL_ALREADY_STORED':
        this.showAlreadyStored(errorBody.details);
        return true;

      case 'PARCEL_NOT_FOUND':
        this.showNotFound(errorBody.details);
        return true;

      case 'INVALID_TRACKING_CODE':
        this.showInvalidTrackingCode(errorBody.details);
        return true;

      case 'SLOT_FULL':
        this.showSlotFull(errorBody.details);
        return true;

      case 'NO_FREE_SLOT':
        this.showNoFreeSlot();
        return true;

      // Phase 3A.5 - Slot Management Fehler
      case 'SLOT_CODE_ALREADY_EXISTS':
        this.showSlotCodeAlreadyExists(errorBody.details);
        return true;

      case 'INVALID_SLOT_CAPACITY':
        this.showInvalidSlotCapacity(errorBody.details);
        return true;

      case 'INVALID_BATCH_COUNT':
        this.showInvalidBatchCount(errorBody.details);
        return true;

      case 'CAPACITY_BELOW_OCCUPIED':
        this.showCapacityBelowOccupied(errorBody.details);
        return true;

      case 'CANNOT_DEACTIVATE_OCCUPIED_SLOT':
        this.showCannotDeactivateOccupied(errorBody.details);
        return true;

      case 'SLOT_NOT_FOUND':
        this.showSlotNotFound();
        return true;

      // Security-Fehler
      case 'UNAUTHORIZED':
      case '401':
        this.showUnauthorized();
        return true;

      case 'FORBIDDEN':
      case '403':
        this.showForbidden();
        return true;

      // Generische HTTP-Fehler
      case '404':
        this.showNotFound();
        return true;

      case '500':
        this.showServerError();
        return true;

      default:
        // Unbekannter Fehler
        this.showGenericError();
        return false;
    }
  }

  // ════════════════════════════════════════════════════════════════════════
  // FACHLICHE FEHLER
  // ════════════════════════════════════════════════════════════════════════

  private showAlreadyPickedUp(details?: DhlErrorResponse['details']): void {
    const title = this.translationService.translate('dhl.error.alreadyPickedUp');
    let message = this.translationService.translate('dhl.error.alreadyPickedUpDesc');

    if (details?.slot) {
      message += `\n${this.translationService.translate('dhl.activityLog.slot')}: ${details.slot}`;
    }
    if (details?.pickedUpAt) {
      const date = new Date(details.pickedUpAt).toLocaleString('de-DE');
      message += `\n${this.translationService.translate('dhl.error.pickedUpAt')}: ${date}`;
    }

    this.toast.warning(`${title}\n\n${message}`, 5000);
  }

  private showAlreadyStored(details?: DhlErrorResponse['details']): void {
    const title = this.translationService.translate('dhl.error.alreadyStored');
    let message = this.translationService.translate('dhl.error.alreadyStoredDesc');

    if (details?.slot) {
      message += `\n${this.translationService.translate('dhl.activityLog.slot')}: ${details.slot}`;
    }
    if (details?.storedAt) {
      const date = new Date(details.storedAt).toLocaleString('de-DE');
      message += `\n${this.translationService.translate('dhl.error.storedAt')}: ${date}`;
    }

    this.toast.warning(`${title}\n\n${message}`, 5000);
  }

  private showNotFound(details?: DhlErrorResponse['details']): void {
    const title = this.translationService.translate('dhl.error.notFound');
    const message = this.translationService.translate('dhl.error.notFoundDesc');
    this.toast.error(`${title}\n\n${message}`, 4000);
  }

  private showInvalidTrackingCode(details?: DhlErrorResponse['details']): void {
    const title = this.translationService.translate('dhl.error.invalidCode');
    let message = this.translationService.translate('dhl.error.invalidCodeDesc');

    if (details?.reason) {
      message += `\n${details.reason}`;
    }

    this.toast.error(`${title}\n\n${message}`, 4000);
  }

  private showSlotFull(details?: DhlErrorResponse['details']): void {
    const title = this.translationService.translate('dhl.error.slotFull');
    let message = this.translationService.translate('dhl.error.slotFullDesc');

    if (details?.slotCode) {
      message = message.replace('{slot}', details.slotCode);
    }
    if (details?.capacity && details?.occupied) {
      message += `\n(${details.occupied}/${details.capacity} ${this.translationService.translate('dhl.error.occupied')})`;
    }

    this.toast.warning(`${title}\n\n${message}`, 5000);
  }

  private showNoFreeSlot(): void {
    const title = this.translationService.translate('dhl.error.noFreeSlot');
    const message = this.translationService.translate('dhl.error.noFreeSlotDesc');
    this.toast.error(`${title}\n\n${message}`, 5000);
  }

  // ════════════════════════════════════════════════════════════════════════
  // PHASE 3A.5 - SLOT MANAGEMENT ERRORS
  // ════════════════════════════════════════════════════════════════════════

  private showSlotCodeAlreadyExists(details?: DhlErrorResponse['details']): void {
    const title = this.translationService.translate('dhl.slotError.codeExists');
    let message = this.translationService.translate('dhl.slotError.codeExistsDesc');

    if (details?.code) {
      message += `\n\nCode: ${details.code}`;
    }

    this.toast.error(`${title}\n\n${message}`, 5000);
  }

  private showInvalidSlotCapacity(details?: DhlErrorResponse['details']): void {
    const title = this.translationService.translate('dhl.slotError.invalidCapacity');
    const message = this.translationService.translate('dhl.slotError.invalidCapacityDesc');
    this.toast.error(`${title}\n\n${message}`, 4000);
  }

  private showInvalidBatchCount(details?: DhlErrorResponse['details']): void {
    const title = this.translationService.translate('dhl.slotError.invalidBatchCount');
    let message = this.translationService.translate('dhl.slotError.invalidBatchCountDesc');

    if (details?.count) {
      message += `\n\n${this.translationService.translate('dhl.slotError.providedCount')}: ${details.count}`;
    }

    this.toast.error(`${title}\n\n${message}`, 4000);
  }

  private showCapacityBelowOccupied(details?: DhlErrorResponse['details']): void {
    const title = this.translationService.translate('dhl.slotError.capacityBelowOccupied');
    let message = this.translationService.translate('dhl.slotError.capacityBelowOccupiedDesc');

    if (details?.occupiedCount && details?.requestedCapacity) {
      message += `\n\n${this.translationService.translate('dhl.slotError.occupied')}: ${details.occupiedCount}`;
      message += `\n${this.translationService.translate('dhl.slotError.requestedCapacity')}: ${details.requestedCapacity}`;
    }

    this.toast.warning(`${title}\n\n${message}`, 5000);
  }

  private showCannotDeactivateOccupied(details?: DhlErrorResponse['details']): void {
    const title = this.translationService.translate('dhl.slotError.cannotDeactivate');
    let message = this.translationService.translate('dhl.slotError.cannotDeactivateDesc');

    if (details?.occupiedCount) {
      message += `\n\n${this.translationService.translate('dhl.slotError.currentlyOccupied')}: ${details.occupiedCount}`;
    }

    this.toast.warning(`${title}\n\n${message}`, 5000);
  }

  private showSlotNotFound(): void {
    const title = this.translationService.translate('dhl.slotError.notFound');
    const message = this.translationService.translate('dhl.slotError.notFoundDesc');
    this.toast.error(`${title}\n\n${message}`, 4000);
  }

  // ════════════════════════════════════════════════════════════════════════
  // SECURITY & GENERIC ERRORS
  // ════════════════════════════════════════════════════════════════════════

  private showUnauthorized(): void {
    const title = this.translationService.translate('dhl.error.unauthorized');
    const message = this.translationService.translate('dhl.error.unauthorizedDesc');
    this.toast.error(`${title}\n\n${message}`, 5000);
  }

  private showForbidden(): void {
    const title = this.translationService.translate('dhl.error.forbidden');
    const message = this.translationService.translate('dhl.error.forbiddenDesc');
    this.toast.error(`${title}\n\n${message}`, 5000);
  }

  private showServerError(): void {
    const title = this.translationService.translate('dhl.error.serverError');
    const message = this.translationService.translate('dhl.error.serverErrorDesc');
    this.toast.error(`${title}\n\n${message}`, 5000);
  }

  private showGenericError(): void {
    const title = this.translationService.translate('dhl.error.generic');
    const message = this.translationService.translate('dhl.error.genericDesc');
    this.toast.error(`${title}\n\n${message}`, 4000);
  }
}
