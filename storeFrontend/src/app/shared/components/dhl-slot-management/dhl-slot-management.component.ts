import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  Input,
  OnChanges,
  OnInit,
  SimpleChanges,
  computed,
  inject,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DhlSlotService, DhlShelfSlotDto } from '@app/core/services/dhl-slot.service';
import { DhlErrorService } from '@app/core/services/dhl-error.service';
import { ToastService } from '@app/core/services/toast.service';
import { TranslationService } from '@app/core/services/translation.service';
import {
  ActionConfig,
  ColumnConfig,
  ResponsiveDataListComponent
} from '@app/shared/components/responsive-data-list/responsive-data-list.component';
import { TranslatePipe } from '@app/core/pipes/translate.pipe';

type DialogMode = 'single' | 'bulk' | 'edit' | null;

interface SingleSlotForm {
  code: string;
  capacity: number;
  description: string;
}

interface BulkSlotForm {
  prefix: string;
  startNumber: number;
  count: number;
  capacity: number;
  description: string;
}

interface EditSlotForm {
  capacity: number;
  active: boolean;
  description: string;
}

interface DhlSlotListItem extends DhlShelfSlotDto {
  occupancyLabel: string;
  statusLabel: string;
  statusClass: string;
}

@Component({
  selector: 'app-dhl-slot-management',
  standalone: true,
  imports: [CommonModule, FormsModule, ResponsiveDataListComponent, TranslatePipe],
  template: `
    <section class="slot-management" [class.slot-management--rtl]="isRtl()">
      <div class="slot-management__header">
        <div>
          <h2>{{ 'dhl.slots.title' | translate }}</h2>
          <p class="slot-management__subtitle">{{ occupancySummary() }}</p>
        </div>

        <div class="slot-management__actions">
          <button
            type="button"
            class="btn btn-secondary"
            (click)="loadSlots()"
            [disabled]="loading() || saving()"
            title="{{ 'dhl.plan.retry' | translate }}">
            ↻
          </button>
          <button
            type="button"
            class="btn btn-secondary"
            (click)="openBulkDialog()"
            [disabled]="loading() || saving()">
            + {{ 'dhl.slots.createBulk' | translate }}
          </button>
          <button
            type="button"
            class="btn btn-primary"
            (click)="openSingleDialog()"
            [disabled]="loading() || saving()">
            + {{ 'dhl.slots.createSingle' | translate }}
          </button>
        </div>
      </div>

      <div class="slot-management__stats">
        <article class="stat-card">
          <span class="stat-card__label">{{ 'dhl.slots.total' | translate }}</span>
          <strong class="stat-card__value">{{ totalSlots() }}</strong>
        </article>

        <article class="stat-card">
          <span class="stat-card__label">{{ 'dhl.slots.occupied' | translate }}</span>
          <strong class="stat-card__value">{{ occupiedCapacity() }}</strong>
        </article>

        <article class="stat-card stat-card--wide">
          <span class="stat-card__label">{{ 'dhl.slots.capacity' | translate }}</span>
          <strong class="stat-card__value">{{ occupiedCapacity() }} / {{ totalCapacity() }}</strong>
          <div class="stat-card__progress">
            <div class="stat-card__progress-fill" [style.width.%]="occupancyPercentage()"></div>
          </div>
        </article>
      </div>

      <app-responsive-data-list
        [items]="listItems()"
        [columns]="columns()"
        [actions]="actions()"
        [loading]="loading()"
        [searchPlaceholder]="searchPlaceholder()"
        [emptyIcon]="'📦'"
        [emptyMessage]="emptyMessage()"
        [defaultView]="'table'"
        [trackBy]="'id'">
      </app-responsive-data-list>

      <div *ngIf="dialogMode()" class="dialog-overlay" (click)="closeDialog()">
        <div class="dialog" (click)="$event.stopPropagation()">
          <div class="dialog__header">
            <div>
              <h3>{{ dialogTitle() }}</h3>
              <p *ngIf="dialogSubtitle()" class="dialog__subtitle">{{ dialogSubtitle() }}</p>
            </div>

            <button
              type="button"
              class="icon-button"
              (click)="closeDialog()"
              [disabled]="saving()"
              aria-label="Close dialog">
              ✕
            </button>
          </div>

          <div class="dialog__body">
            <ng-container *ngIf="dialogMode() === 'single'">
              <div class="form-grid">
                <div class="form-group">
                  <label for="slot-code">{{ 'dhl.slots.code' | translate }} *</label>
                  <input
                    id="slot-code"
                    type="text"
                    [ngModel]="singleForm().code"
                    (ngModelChange)="updateSingleCode($event)"
                    [disabled]="saving()"
                    [class.is-invalid]="showSingleCodeError()"
                    placeholder="{{ 'dhl.slots.codePlaceholder' | translate }}">
                  <p class="form-hint" [class.form-hint--error]="showSingleCodeError()">
                    {{ 'dhl.slots.codeHint' | translate }}
                  </p>
                </div>

                <div class="form-group">
                  <label for="slot-capacity">{{ 'dhl.slots.capacity' | translate }} *</label>
                  <input
                    id="slot-capacity"
                    type="number"
                    min="1"
                    [ngModel]="singleForm().capacity"
                    (ngModelChange)="updateSingleCapacity($event)"
                    [disabled]="saving()"
                    [class.is-invalid]="showSingleCapacityError()">
                  <p class="form-hint" [class.form-hint--error]="showSingleCapacityError()">
                    {{ capacityHint(1) }}
                  </p>
                </div>

                <div class="form-group form-group--full">
                  <label for="slot-description">{{ 'dhl.slots.description' | translate }}</label>
                  <textarea
                    id="slot-description"
                    rows="3"
                    [ngModel]="singleForm().description"
                    (ngModelChange)="updateSingleDescription($event)"
                    [disabled]="saving()"
                    placeholder="{{ 'dhl.slots.descriptionPlaceholder' | translate }}">
                  </textarea>
                </div>
              </div>
            </ng-container>

            <ng-container *ngIf="dialogMode() === 'bulk'">
              <div class="form-grid">
                <div class="form-group">
                  <label for="bulk-prefix">{{ 'dhl.slots.prefix' | translate }} *</label>
                  <input
                    id="bulk-prefix"
                    type="text"
                    [ngModel]="bulkForm().prefix"
                    (ngModelChange)="updateBulkPrefix($event)"
                    [disabled]="saving()"
                    [class.is-invalid]="showBulkPrefixError()"
                    placeholder="{{ 'dhl.slots.prefixPlaceholder' | translate }}">
                </div>

                <div class="form-group">
                  <label for="bulk-start">{{ 'dhl.slots.startNumber' | translate }} *</label>
                  <input
                    id="bulk-start"
                    type="number"
                    min="1"
                    [ngModel]="bulkForm().startNumber"
                    (ngModelChange)="updateBulkStartNumber($event)"
                    [disabled]="saving()"
                    [class.is-invalid]="showBulkStartNumberError()">
                </div>

                <div class="form-group">
                  <label for="bulk-count">{{ 'dhl.slots.count' | translate }} *</label>
                  <input
                    id="bulk-count"
                    type="number"
                    min="1"
                    max="100"
                    [ngModel]="bulkForm().count"
                    (ngModelChange)="updateBulkCount($event)"
                    [disabled]="saving()"
                    [class.is-invalid]="showBulkCountError()">
                  <p class="form-hint" [class.form-hint--error]="showBulkCountError()">
                    {{ 'dhl.slots.countHint' | translate }}
                  </p>
                </div>

                <div class="form-group">
                  <label for="bulk-capacity">{{ 'dhl.slots.capacity' | translate }} *</label>
                  <input
                    id="bulk-capacity"
                    type="number"
                    min="1"
                    [ngModel]="bulkForm().capacity"
                    (ngModelChange)="updateBulkCapacity($event)"
                    [disabled]="saving()"
                    [class.is-invalid]="showBulkCapacityError()">
                  <p class="form-hint" [class.form-hint--error]="showBulkCapacityError()">
                    {{ capacityHint(1) }}
                  </p>
                </div>

                <div class="form-group form-group--full">
                  <label for="bulk-description">{{ 'dhl.slots.description' | translate }}</label>
                  <textarea
                    id="bulk-description"
                    rows="3"
                    [ngModel]="bulkForm().description"
                    (ngModelChange)="updateBulkDescription($event)"
                    [disabled]="saving()"
                    placeholder="{{ 'dhl.slots.descriptionPlaceholder' | translate }}">
                  </textarea>
                </div>
              </div>

              <div class="preview-box">
                <span class="preview-box__label">{{ 'dhl.slots.preview' | translate }}</span>
                <strong>{{ bulkPreview() }}</strong>
              </div>
            </ng-container>

            <ng-container *ngIf="dialogMode() === 'edit' && editSlot()">
              <div class="slot-info-card">
                <div class="slot-info-card__row">
                  <span>{{ 'dhl.slots.code' | translate }}</span>
                  <strong>{{ editSlot()?.code }}</strong>
                </div>
                <div class="slot-info-card__row">
                  <span>{{ 'dhl.slots.occupancy' | translate }}</span>
                  <strong>{{ editOccupancyLabel() }}</strong>
                </div>
                <div class="slot-info-card__row">
                  <span>{{ 'dhl.slots.status' | translate }}</span>
                  <strong>{{ editStatusLabel() }}</strong>
                </div>
              </div>

              <div class="form-grid">
                <div class="form-group">
                  <label for="edit-capacity">{{ 'dhl.slots.capacity' | translate }} *</label>
                  <input
                    id="edit-capacity"
                    type="number"
                    [attr.min]="editMinimumCapacity()"
                    [ngModel]="editForm().capacity"
                    (ngModelChange)="updateEditCapacity($event)"
                    [disabled]="saving()"
                    [class.is-invalid]="showEditCapacityError()">
                  <p class="form-hint" [class.form-hint--error]="showEditCapacityError()">
                    {{ capacityHint(editMinimumCapacity()) }}
                  </p>
                </div>

                <div class="form-group">
                  <label>{{ 'dhl.slots.active' | translate }}</label>
                  <label
                    class="checkbox-field"
                    [class.checkbox-field--disabled]="!canToggleActive()"
                    [attr.title]="activeToggleHint()">
                    <input
                      type="checkbox"
                      [checked]="editForm().active"
                      (change)="updateEditActive($event)"
                      [disabled]="saving() || !canToggleActive()">
                    <span>{{ 'dhl.slots.active' | translate }}</span>
                  </label>
                  <p *ngIf="!canToggleActive()" class="form-hint">
                    {{ 'dhl.slots.cannotDeactivateHint' | translate }}
                  </p>
                </div>

                <div class="form-group form-group--full">
                  <label for="edit-description">{{ 'dhl.slots.description' | translate }}</label>
                  <textarea
                    id="edit-description"
                    rows="3"
                    [ngModel]="editForm().description"
                    (ngModelChange)="updateEditDescription($event)"
                    [disabled]="saving()"
                    placeholder="{{ 'dhl.slots.descriptionPlaceholder' | translate }}">
                  </textarea>
                </div>
              </div>
            </ng-container>
          </div>

          <div class="dialog__footer">
            <button
              type="button"
              class="btn btn-secondary"
              (click)="closeDialog()"
              [disabled]="saving()">
              {{ 'dhl.slotEditor.cancel' | translate }}
            </button>
            <button
              type="button"
              class="btn btn-primary"
              (click)="submitDialog()"
              [disabled]="submitDisabled()">
              <span *ngIf="!saving()">{{ dialogSubmitLabel() }}</span>
              <span *ngIf="saving()">{{ 'common.loading' | translate }}...</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  `,
  styleUrls: ['./dhl-slot-management.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DhlSlotManagementComponent implements OnInit, OnChanges {
  private readonly destroyRef = inject(DestroyRef);
  private readonly slotService = inject(DhlSlotService);
  private readonly dhlErrorService = inject(DhlErrorService);
  private readonly toastService = inject(ToastService);
  private readonly translationService = inject(TranslationService);

  @Input({ required: true }) storeId!: number;

  readonly slots = signal<DhlShelfSlotDto[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly dialogMode = signal<DialogMode>(null);
  readonly editSlot = signal<DhlShelfSlotDto | null>(null);

  readonly singleSubmitAttempted = signal(false);
  readonly bulkSubmitAttempted = signal(false);
  readonly editSubmitAttempted = signal(false);

  readonly singleForm = signal<SingleSlotForm>(this.createDefaultSingleForm());
  readonly bulkForm = signal<BulkSlotForm>(this.createDefaultBulkForm());
  readonly editForm = signal<EditSlotForm>(this.createDefaultEditForm());

  readonly totalSlots = computed(() => this.slots().length);
  readonly occupiedCapacity = computed(() =>
    this.slots().reduce((sum, slot) => sum + (slot.occupiedCount || 0), 0)
  );
  readonly totalCapacity = computed(() =>
    this.slots().reduce((sum, slot) => sum + (slot.capacity || 0), 0)
  );
  readonly occupancyPercentage = computed(() => {
    const capacity = this.totalCapacity();
    if (capacity <= 0) {
      return 0;
    }

    return Math.min(100, Math.round((this.occupiedCapacity() / capacity) * 100));
  });
  readonly occupancySummary = computed(() =>
    `${this.translation('dhl.slots.occupied')}: ${this.occupiedCapacity()} / ${this.totalCapacity()}`
  );
  readonly isRtl = computed(() => this.translationService.isRTL());
  readonly listItems = computed<DhlSlotListItem[]>(() =>
    this.sortSlots(this.slots()).map((slot) => ({
      ...slot,
      occupancyLabel: `${slot.occupiedCount}/${slot.capacity}`,
      statusLabel: this.getStatusLabel(slot),
      statusClass: this.getStatusClass(slot)
    }))
  );
  readonly columns = computed<ColumnConfig[]>(() => {
    this.translationService.currentLang();

    return [
      {
        key: 'code',
        label: this.translation('dhl.slots.code'),
        width: '130px',
        sortable: true
      },
      {
        key: 'description',
        label: this.translation('dhl.slots.description'),
        formatFn: (value: string | undefined) => value?.trim() || '—'
      },
      {
        key: 'occupancyLabel',
        label: this.translation('dhl.slots.occupancy'),
        width: '140px'
      },
      {
        key: 'statusLabel',
        label: this.translation('dhl.slots.status'),
        type: 'badge',
        width: '120px',
        badgeClass: (_value: string, item: DhlSlotListItem) => item.statusClass
      }
    ];
  });
  readonly actions = computed<ActionConfig[]>(() => {
    this.translationService.currentLang();

    return [
      {
        icon: '✏️',
        label: this.translation('dhl.slots.edit'),
        class: 'slot-action-edit',
        handler: (item: DhlShelfSlotDto) => this.openEditDialog(item)
      }
    ];
  });
  readonly searchPlaceholder = computed(() => this.translation('dhl.slots.search'));
  readonly emptyMessage = computed(() =>
    `${this.translation('dhl.slots.empty')}. ${this.translation('dhl.slots.emptyHint')}`
  );
  readonly bulkPreview = computed(() => this.buildBulkPreview(this.bulkForm()));
  readonly editMinimumCapacity = computed(() => Math.max(1, this.editSlot()?.occupiedCount ?? 0));
  readonly editOccupancyLabel = computed(() => {
    const slot = this.editSlot();
    return slot ? `${slot.occupiedCount}/${slot.capacity}` : '—';
  });
  readonly editStatusLabel = computed(() => {
    const slot = this.editSlot();
    return slot ? this.getStatusLabel(slot) : '—';
  });
  readonly dialogTitle = computed(() => {
    switch (this.dialogMode()) {
      case 'single':
        return this.translation('dhl.slots.createSingle');
      case 'bulk':
        return this.translation('dhl.slots.createBulk');
      case 'edit':
        return this.translation('dhl.slots.edit');
      default:
        return '';
    }
  });
  readonly dialogSubtitle = computed(() => {
    if (this.dialogMode() !== 'edit' || !this.editSlot()) {
      return '';
    }

    return this.editSlot()?.code || '';
  });
  readonly dialogSubmitLabel = computed(() => {
    switch (this.dialogMode()) {
      case 'single':
        return this.translation('dhl.slots.createSingle');
      case 'bulk':
        return this.translation('dhl.slots.createBulk');
      case 'edit':
        return this.translation('dhl.slotEditor.save');
      default:
        return '';
    }
  });
  readonly submitDisabled = computed(() => {
    if (this.saving()) {
      return true;
    }

    switch (this.dialogMode()) {
      case 'single':
        return !this.isSingleFormValid();
      case 'bulk':
        return !this.isBulkFormValid();
      case 'edit':
        return !this.isEditFormValid();
      default:
        return true;
    }
  });

  ngOnInit(): void {
    if (this.storeId) {
      this.loadSlots();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['storeId'] && !changes['storeId'].firstChange && this.storeId) {
      this.closeDialog();
      this.loadSlots();
    }
  }

  loadSlots(): void {
    if (!this.storeId) {
      return;
    }

    this.loading.set(true);

    this.slotService.getSlots(this.storeId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false))
      )
      .subscribe({
        next: (slots) => this.slots.set(this.sortSlots(slots)),
        error: (error: HttpErrorResponse) => {
          this.slots.set([]);
          this.dhlErrorService.handleError(error, 'slot-list');
        }
      });
  }

  openSingleDialog(): void {
    this.singleSubmitAttempted.set(false);
    this.singleForm.set(this.createDefaultSingleForm());
    this.dialogMode.set('single');
  }

  openBulkDialog(): void {
    this.bulkSubmitAttempted.set(false);
    this.bulkForm.set(this.createDefaultBulkForm());
    this.dialogMode.set('bulk');
  }

  openEditDialog(slot: DhlShelfSlotDto): void {
    this.editSubmitAttempted.set(false);
    this.editSlot.set(slot);
    this.editForm.set({
      capacity: slot.capacity,
      active: slot.active,
      description: slot.description || ''
    });
    this.dialogMode.set('edit');
  }

  closeDialog(): void {
    if (this.saving()) {
      return;
    }

    this.dialogMode.set(null);
    this.editSlot.set(null);
  }

  submitDialog(): void {
    switch (this.dialogMode()) {
      case 'single':
        this.createSingleSlot();
        return;
      case 'bulk':
        this.createBulkSlots();
        return;
      case 'edit':
        this.updateSlot();
        return;
      default:
        return;
    }
  }

  updateSingleCode(value: string): void {
    this.singleForm.update((form) => ({ ...form, code: value.toUpperCase().trim() }));
  }

  updateSingleCapacity(value: unknown): void {
    this.singleForm.update((form) => ({ ...form, capacity: this.toNumber(value, 0) }));
  }

  updateSingleDescription(value: string): void {
    this.singleForm.update((form) => ({ ...form, description: value }));
  }

  updateBulkPrefix(value: string): void {
    this.bulkForm.update((form) => ({ ...form, prefix: value.toUpperCase().trim() }));
  }

  updateBulkStartNumber(value: unknown): void {
    this.bulkForm.update((form) => ({ ...form, startNumber: this.toNumber(value, 0) }));
  }

  updateBulkCount(value: unknown): void {
    this.bulkForm.update((form) => ({ ...form, count: this.toNumber(value, 0) }));
  }

  updateBulkCapacity(value: unknown): void {
    this.bulkForm.update((form) => ({ ...form, capacity: this.toNumber(value, 0) }));
  }

  updateBulkDescription(value: string): void {
    this.bulkForm.update((form) => ({ ...form, description: value }));
  }

  updateEditCapacity(value: unknown): void {
    this.editForm.update((form) => ({ ...form, capacity: this.toNumber(value, 0) }));
  }

  updateEditActive(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.editForm.update((form) => ({ ...form, active: checked }));
  }

  updateEditDescription(value: string): void {
    this.editForm.update((form) => ({ ...form, description: value }));
  }

  showSingleCodeError(): boolean {
    return this.singleSubmitAttempted() && !this.singleForm().code.trim();
  }

  showSingleCapacityError(): boolean {
    return this.singleSubmitAttempted() && this.singleForm().capacity < 1;
  }

  showBulkPrefixError(): boolean {
    return this.bulkSubmitAttempted() && !this.bulkForm().prefix.trim();
  }

  showBulkStartNumberError(): boolean {
    return this.bulkSubmitAttempted() && this.bulkForm().startNumber < 1;
  }

  showBulkCountError(): boolean {
    return this.bulkSubmitAttempted() && !this.isBulkCountValid();
  }

  showBulkCapacityError(): boolean {
    return this.bulkSubmitAttempted() && this.bulkForm().capacity < 1;
  }

  showEditCapacityError(): boolean {
    return this.editSubmitAttempted() && !this.isEditCapacityValid();
  }

  capacityHint(occupied: number): string {
    return this.translation('dhl.slots.capacityHint').replace('{occupied}', String(occupied));
  }

  activeToggleHint(): string | null {
    return this.canToggleActive() ? null : this.translation('dhl.slots.cannotDeactivateHint');
  }

  canToggleActive(): boolean {
    return (this.editSlot()?.occupiedCount ?? 0) === 0;
  }

  private createSingleSlot(): void {
    this.singleSubmitAttempted.set(true);
    if (!this.isSingleFormValid()) {
      return;
    }

    const form = this.singleForm();

    this.saving.set(true);
    this.slotService.createSlot(this.storeId, {
      code: form.code.trim(),
      capacity: form.capacity,
      description: this.normalizeOptionalText(form.description)
    })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.saving.set(false))
      )
      .subscribe({
        next: () => {
          this.toastService.success(this.translation('dhl.slots.createSuccess'));
          this.resetDialogState();
          this.loadSlots();
        },
        error: (error: HttpErrorResponse) => this.dhlErrorService.handleError(error, 'slot-create')
      });
  }

  private createBulkSlots(): void {
    this.bulkSubmitAttempted.set(true);
    if (!this.isBulkFormValid()) {
      return;
    }

    const form = this.bulkForm();

    this.saving.set(true);
    this.slotService.createBulkSlots(this.storeId, {
      prefix: form.prefix.trim(),
      startNumber: form.startNumber,
      count: form.count,
      capacity: form.capacity,
      description: this.normalizeOptionalText(form.description)
    })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.saving.set(false))
      )
      .subscribe({
        next: () => {
          this.toastService.success(this.translation('dhl.slots.createBulkSuccess'));
          this.resetDialogState();
          this.loadSlots();
        },
        error: (error: HttpErrorResponse) => this.dhlErrorService.handleError(error, 'slot-bulk-create')
      });
  }

  private updateSlot(): void {
    this.editSubmitAttempted.set(true);
    const slot = this.editSlot();

    if (!slot || !this.isEditFormValid()) {
      return;
    }

    const form = this.editForm();

    this.saving.set(true);
    this.slotService.updateSlot(this.storeId, slot.id, {
      capacity: form.capacity,
      active: form.active,
      description: this.normalizeOptionalText(form.description)
    })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.saving.set(false))
      )
      .subscribe({
        next: () => {
          this.toastService.success(this.translation('dhl.slots.updateSuccess'));
          this.resetDialogState();
          this.loadSlots();
        },
        error: (error: HttpErrorResponse) => this.dhlErrorService.handleError(error, 'slot-update')
      });
  }

  private isSingleFormValid(): boolean {
    const form = this.singleForm();
    return form.code.trim().length > 0 && form.capacity >= 1;
  }

  private isBulkFormValid(): boolean {
    const form = this.bulkForm();
    return form.prefix.trim().length > 0
      && form.startNumber >= 1
      && this.isBulkCountValid()
      && form.capacity >= 1;
  }

  private isBulkCountValid(): boolean {
    const count = this.bulkForm().count;
    return count >= 1 && count <= 100;
  }

  private isEditFormValid(): boolean {
    return this.isEditCapacityValid();
  }

  private isEditCapacityValid(): boolean {
    return this.editForm().capacity >= this.editMinimumCapacity();
  }

  private getStatusLabel(slot: DhlShelfSlotDto): string {
    if (!slot.active) {
      return this.translation('dhl.slots.statusInactive');
    }
    if (slot.occupiedCount >= slot.capacity) {
      return this.translation('dhl.slots.statusFull');
    }
    return this.translation('dhl.slots.statusActive');
  }

  private getStatusClass(slot: DhlShelfSlotDto): string {
    if (!slot.active) {
      return 'status-inactive';
    }
    if (slot.occupiedCount >= slot.capacity) {
      return 'status-archived';
    }
    return 'status-active';
  }

  private buildBulkPreview(form: BulkSlotForm): string {
    if (!form.prefix.trim() || form.startNumber < 1 || form.count < 1) {
      return '—';
    }

    const preview = Array.from(
      { length: Math.min(form.count, 12) },
      (_value, index) => `${form.prefix.trim()}${form.startNumber + index}`
    );

    if (form.count <= 12) {
      return preview.join(', ');
    }

    const tailStart = form.startNumber + form.count - 2;
    return `${preview.slice(0, 6).join(', ')}, ... ${form.prefix.trim()}${tailStart}, ${form.prefix.trim()}${tailStart + 1}`;
  }

  private translation(key: string): string {
    return this.translationService.translate(key);
  }

  private createDefaultSingleForm(): SingleSlotForm {
    return {
      code: '',
      capacity: 1,
      description: ''
    };
  }

  private createDefaultBulkForm(): BulkSlotForm {
    return {
      prefix: '',
      startNumber: 1,
      count: 10,
      capacity: 1,
      description: ''
    };
  }

  private createDefaultEditForm(): EditSlotForm {
    return {
      capacity: 1,
      active: true,
      description: ''
    };
  }

  private resetDialogState(): void {
    this.dialogMode.set(null);
    this.editSlot.set(null);
  }

  private normalizeOptionalText(value: string): string | undefined {
    const normalized = value.trim();
    return normalized ? normalized : undefined;
  }

  private toNumber(value: unknown, fallback: number): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  private sortSlots(slots: DhlShelfSlotDto[]): DhlShelfSlotDto[] {
    return [...slots].sort((left, right) => {
      if (left.sortOrder !== right.sortOrder) {
        return left.sortOrder - right.sortOrder;
      }

      return left.code.localeCompare(right.code, undefined, { numeric: true, sensitivity: 'base' });
    });
  }
}
