import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil, finalize, catchError, of } from 'rxjs';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { DhlLayoutService } from '@app/core/services/dhl-layout.service';
import {
  DhlShelfSlotLayout,
  DhlZone,
  DhlLayoutUpdateRequest,
  DhlLayoutPositionUpdate,
  DhlAddSlotToLayoutRequest,
  SlotStatus,
  getSlotStatus,
  getSizeFromGrid,
  SlotSize,
  SLOT_SIZE_MAP
} from '@app/core/models/dhl.model';
import { TranslatePipe } from '@app/core/pipes/translate.pipe';
import { LucideAngularModule } from 'lucide-angular';
import { DhlZoneManagerDialogComponent } from './dhl-zone-manager-dialog.component';
import { DhlSlotEditorDialogComponent } from './dhl-slot-editor-dialog.component';
import { DhlService, DhlSlot } from '@app/core/services/dhl.service';

/**
 * DHL Phase 3A – Visual Warehouse Plan
 * 
 * Features:
 * - Betriebs-/Expertenmodus Toggle
 * - Grid-based Layout (nicht freies Canvas)
 * - Angular CDK Drag&Drop
 * - Zone Management
 * - Slot Highlighting (AUTO/Pickup)
 * - Batch Save (dirty tracking)
 * - Fallback für Slots ohne Layout
 * - Mobile-responsive
 * - i18n DE/EN/AR + RTL
 */
@Component({
  selector: 'app-dhl-visual-plan',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    DragDropModule, 
    TranslatePipe, 
    LucideAngularModule,
    DhlZoneManagerDialogComponent,
    DhlSlotEditorDialogComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dhl-visual-plan.component.html',
  styleUrls: ['./dhl-visual-plan.component.scss']
})
export class DhlVisualPlanComponent implements OnInit, OnDestroy {
  private layoutService = inject(DhlLayoutService);
  private dhlService = inject(DhlService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private destroy$ = new Subject<void>();

  // ========== STATE ==========

  storeId!: number;

  // Data
  layouts = signal<DhlShelfSlotLayout[]>([]);
  zones = signal<DhlZone[]>([]);
  allSlots = signal<DhlSlot[]>([]); // All slots from backend
  
  // UI State
  mode = signal<'operation' | 'expert'>('operation');
  loading = signal(false);
  saving = signal(false);
  error = signal<string | null>(null);
  notice = signal<string | null>(null); // For inline notices
  
  // Dialog State
  showZoneDialog = signal(false);
  showSlotEditorDialog = signal(false);
  selectedSlot = signal<DhlShelfSlotLayout | null>(null);
  
  // Dirty Tracking
  isDirty = signal(false);
  originalLayouts: DhlShelfSlotLayout[] = [];
  pendingChanges = signal<Map<number, DhlLayoutPositionUpdate>>(new Map());
  
  // Highlighting
  highlightedSlotId = signal<number | null>(null);
  
  // Grid Display
  gridColumns = computed(() => {
    const layouts = this.layouts();
    if (layouts.length === 0) return 6; // default
    
    const maxX = Math.max(...layouts.map(l => l.gridX + l.gridWidth));
    return Math.max(6, maxX + 1); // mindestens 6 Spalten
  });
  
  gridRows = computed(() => {
    const layouts = this.layouts();
    if (layouts.length === 0) return 4; // default
    
    const maxY = Math.max(...layouts.map(l => l.gridY + l.gridHeight));
    return Math.max(4, maxY + 1); // mindestens 4 Reihen
  });
  
  // Zones gruppiert
  layoutsByZone = computed(() => {
    const layouts = this.layouts();
    const grouped = new Map<string, DhlShelfSlotLayout[]>();
    
    layouts.forEach(layout => {
      const zoneName = layout.zoneName || 'Nicht zugeordnet';
      if (!grouped.has(zoneName)) {
        grouped.set(zoneName, []);
      }
      grouped.get(zoneName)!.push(layout);
    });
    
    return Array.from(grouped.entries()).map(([name, layouts]) => ({
      name,
      layouts,
      zoneId: layouts[0]?.zoneId,
      zoneColor: layouts[0]?.zoneColor
    }));
  });
  
  // Unplaced Slots (existing slots without layout)
  unplacedSlots = computed(() => {
    const allSlotIds = new Set(this.allSlots().map(s => s.id));
    const placedSlotIds = new Set(this.layouts().map(l => l.slotId));
    return this.allSlots().filter(s => !placedSlotIds.has(s.id));
  });
  
  // Enums for template
  SlotStatus = SlotStatus;
  SlotSize = SlotSize;
  
  // Constants
  private readonly CELL_SIZE = 120; // Match CSS grid cell size
  
  // Stable event handler for highlight
  private readonly highlightHandler = (event: Event) => {
    const customEvent = event as CustomEvent;
    const slotCode = customEvent.detail?.slotCode;
    if (slotCode) {
      const slot = this.layouts().find(l => l.slotCode === slotCode);
      if (slot) {
        this.highlightedSlotId.set(slot.id);
        setTimeout(() => this.highlightedSlotId.set(null), 5000);
      } else {
        this.showNotice(`Lagerplatz ${slotCode} ist noch nicht im eigenen Lagerplan platziert.`);
      }
    }
  };

  constructor() {
    // Effect: Warn before leaving with unsaved changes
    effect(() => {
      if (this.isDirty()) {
        window.onbeforeunload = () => 'Sie haben ungespeicherte Änderungen!';
      } else {
        window.onbeforeunload = null;
      }
    });
  }

  // ========== LIFECYCLE ==========

  ngOnInit(): void {
    // Extract storeId (3-stufig wie in Custom Instructions)
    let id = this.route.snapshot.paramMap.get('storeId') || this.route.snapshot.paramMap.get('id');
    if (!id && this.route.parent) {
      id = this.route.parent.snapshot.paramMap.get('id');
    }
    if (!id) {
      const match = this.router.url.match(/\/stores\/(\d+)/);
      if (match) id = match[1];
    }
    
    if (!id) {
      this.error.set('Keine Store-ID gefunden');
      return;
    }
    
    this.storeId = parseInt(id, 10);
    console.log('✅ StoreId extracted for DHL Visual Plan:', this.storeId);
    
    // Register highlight event listener
    window.addEventListener('dhl-highlight-slot', this.highlightHandler);
    
    this.loadData();
    this.loadAllSlots();
  }

  ngOnDestroy(): void {
    // Clean up event listener
    window.removeEventListener('dhl-highlight-slot', this.highlightHandler);
    window.onbeforeunload = null;
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ========== DATA LOADING ==========

  loadData(): void {
    this.loading.set(true);
    this.error.set(null);
    
    // Parallel laden: Layout + Zones
    Promise.all([
      this.layoutService.getLayout(this.storeId).pipe(
        catchError(err => {
          console.error('Layout load error:', err);
          return of([]);
        })
      ).toPromise(),
      
      this.layoutService.getZones(this.storeId).pipe(
        catchError(err => {
          console.error('Zones load error:', err);
          return of([]);
        })
      ).toPromise()
    ]).then(([layouts, zones]) => {
      this.layouts.set(layouts || []);
      this.zones.set(zones || []);
      this.originalLayouts = JSON.parse(JSON.stringify(layouts || []));
      this.loading.set(false);
      
      console.log(`✅ Loaded ${layouts?.length || 0} layouts, ${zones?.length || 0} zones`);
    }).catch(err => {
      console.error('Data load error:', err);
      this.error.set('Fehler beim Laden der Daten');
      this.loading.set(false);
    });
  }
  
  loadAllSlots(): void {
    this.dhlService.getSlots(this.storeId).subscribe({
      next: (slots) => {
        this.allSlots.set(slots);
        console.log(`✅ Loaded ${slots.length} total slots`);
      },
      error: (err) => {
        console.error('Failed to load all slots:', err);
        // Non-critical, continue anyway
      }
    });
  }

  // ========== MODE SWITCHING ==========

  toggleMode(): void {
    if (this.isDirty()) {
      if (!confirm('Ungespeicherte Änderungen gehen verloren. Fortfahren?')) {
        return;
      }
      this.discardChanges();
    }
    
    const newMode = this.mode() === 'operation' ? 'expert' : 'operation';
    this.mode.set(newMode);
    console.log(`Mode switched to: ${newMode}`);
  }

  isExpertMode(): boolean {
    return this.mode() === 'expert';
  }

  isOperationMode(): boolean {
    return this.mode() === 'operation';
  }

  // ========== DRAG & DROP (Expert Mode) ==========

  onDragEnd(event: any, slot: DhlShelfSlotLayout): void {
    if (!this.isExpertMode()) return;
    
    const delta = event.distance;
    const newGridX = Math.max(0, Math.round(slot.gridX + delta.x / this.CELL_SIZE));
    const newGridY = Math.max(0, Math.round(slot.gridY + delta.y / this.CELL_SIZE));
    
    // Check collision
    if (this.hasCollision(newGridX, newGridY, slot.gridWidth, slot.gridHeight, slot.id)) {
      this.showNotice('Position bereits belegt');
      // Reset will happen automatically via cdkDrag
      return;
    }
    
    // Update local state (immutable)
    const updated = { ...slot, gridX: newGridX, gridY: newGridY };
    const layouts = [...this.layouts()];
    const index = layouts.findIndex(l => l.id === slot.id);
    if (index >= 0) {
      layouts[index] = updated;
      this.layouts.set(layouts);
    }
    
    // Track change
    this.markSlotChanged(slot.slotId, {
      slotId: slot.slotId,
      gridX: newGridX,
      gridY: newGridY,
      gridWidth: slot.gridWidth,
      gridHeight: slot.gridHeight,
      zoneId: slot.zoneId
    });
    
    console.log(`Slot ${slot.slotCode} moved to (${newGridX}, ${newGridY})`);
  }
  
  private hasCollision(x: number, y: number, w: number, h: number, excludeId?: number): boolean {
    return this.layouts().some(l => {
      if (l.id === excludeId) return false;
      // Check overlap
      return !(x + w <= l.gridX || x >= l.gridX + l.gridWidth ||
               y + h <= l.gridY || y >= l.gridY + l.gridHeight);
    });
  }

  markSlotChanged(slotId: number, update: DhlLayoutPositionUpdate): void {
    const changes = this.pendingChanges();
    changes.set(slotId, update);
    this.pendingChanges.set(new Map(changes));
    this.isDirty.set(true);
  }

  // ========== SAVE / DISCARD ==========

  saveChanges(): void {
    if (!this.isDirty()) return;
    
    const changes = Array.from(this.pendingChanges().values());
    
    if (changes.length === 0) {
      this.isDirty.set(false);
      return;
    }
    
    this.saving.set(true);
    this.error.set(null);
    
    const request: DhlLayoutUpdateRequest = { updates: changes };
    
    this.layoutService.updateLayoutBatch(this.storeId, request).pipe(
      takeUntil(this.destroy$),
      finalize(() => this.saving.set(false))
    ).subscribe({
      next: () => {
        console.log(`✅ Saved ${changes.length} layout changes`);
        this.isDirty.set(false);
        this.pendingChanges.set(new Map());
        this.showNotice('Änderungen gespeichert');
        // Reload to ensure consistency
        this.loadData();
      },
      error: (err: any) => {
        console.error('Save error:', err);
        this.error.set(err.error?.message || 'Fehler beim Speichern');
      }
    });
  }

  discardChanges(): void {
    if (!confirm('Alle Änderungen verwerfen?')) return;
    
    this.layouts.set(JSON.parse(JSON.stringify(this.originalLayouts)));
    this.pendingChanges.set(new Map());
    this.isDirty.set(false);
    this.showNotice('Änderungen verworfen');
    console.log('Changes discarded');
  }
  
  private showNotice(message: string): void {
    this.notice.set(message);
    setTimeout(() => this.notice.set(null), 5000);
  }

  // ========== SLOT ACTIONS ==========

  onSlotClick(layout: DhlShelfSlotLayout): void {
    if (this.isOperationMode()) {
      // Operation: Show details
      this.showSlotDetails(layout);
    } else {
      // Expert: Select for editing
      this.selectSlot(layout);
    }
  }

  showSlotDetails(layout: DhlShelfSlotLayout): void {
    // TODO: Implement slot details modal (shows parcels in slot)
    // For now, just show info
    console.log('Show details for:', layout.slotCode, `(${layout.occupiedCount}/${layout.slotCapacity})`);
    this.showNotice(`${layout.slotCode}: ${layout.occupiedCount} von ${layout.slotCapacity} belegt`);
  }

  selectSlot(layout: DhlShelfSlotLayout): void {
    this.openSlotEditor(layout);
  }
  
  // ========== DIALOG METHODS ==========
  
  openZoneManager(): void {
    this.showZoneDialog.set(true);
  }

  closeZoneDialog(): void {
    this.showZoneDialog.set(false);
    this.loadData(); // Refresh zones
  }

  openSlotEditor(slot: DhlShelfSlotLayout): void {
    this.selectedSlot.set(slot);
    this.showSlotEditorDialog.set(true);
  }

  closeSlotEditor(): void {
    this.showSlotEditorDialog.set(false);
    this.selectedSlot.set(null);
    this.loadData(); // Refresh after edit
  }

  // ========== HIGHLIGHTING ==========

  highlightSlot(slotIdOrCode: number | string): void {
    let slotId: number;
    
    if (typeof slotIdOrCode === 'string') {
      const layout = this.layouts().find(l => 
        l.slotCode.toUpperCase() === slotIdOrCode.toUpperCase()
      );
      if (!layout) {
        console.warn(`Slot ${slotIdOrCode} not found in layout`);
        return;
      }
      slotId = layout.slotId;
    } else {
      slotId = slotIdOrCode;
    }
    
    this.highlightedSlotId.set(slotId);
    
    // Auto-remove after 10s
    setTimeout(() => {
      if (this.highlightedSlotId() === slotId) {
        this.highlightedSlotId.set(null);
      }
    }, 10000);
    
    console.log(`Slot ${slotId} highlighted`);
  }

  clearHighlight(): void {
    this.highlightedSlotId.set(null);
  }

  isHighlighted(layout: DhlShelfSlotLayout): boolean {
    return this.highlightedSlotId() === layout.slotId;
  }

  // ========== SLOT STATUS ==========

  getStatus(layout: DhlShelfSlotLayout): SlotStatus {
    return getSlotStatus(layout);
  }

  getStatusClass(layout: DhlShelfSlotLayout): string {
    const status = this.getStatus(layout);
    const isHighlighted = this.isHighlighted(layout);
    
    let classes = [`status-${status}`];
    
    if (isHighlighted) {
      classes.push('highlighted');
    }
    
    return classes.join(' ');
  }

  getStatusLabel(layout: DhlShelfSlotLayout): string {
    const status = this.getStatus(layout);
    
    switch (status) {
      case SlotStatus.FREE: return 'Frei';
      case SlotStatus.PARTIAL: return 'Teilbelegt';
      case SlotStatus.FULL: return 'Voll';
      case SlotStatus.INACTIVE: return 'Inaktiv';
    }
  }

  getStatusIcon(layout: DhlShelfSlotLayout): string {
    const status = this.getStatus(layout);
    
    switch (status) {
      case SlotStatus.FREE: return 'circle-check';
      case SlotStatus.PARTIAL: return 'circle-alert';
      case SlotStatus.FULL: return 'circle-x';
      case SlotStatus.INACTIVE: return 'circle-minus';
    }
  }

  // ========== SLOT MANAGEMENT ==========

  createNewSlot(): void {
    // TODO: Could open a create dialog, for now log
    console.log('Create new slot - dialog needed');
    this.showNotice('Neues Fach-Dialog noch nicht implementiert');
  }

  addSlotToPlan(slot: DhlSlot): void {
    if (this.saving()) return;
    
    // Create layout for existing unplaced slot
    const request: DhlAddSlotToLayoutRequest = {
      slotId: slot.id,
      gridX: 0,
      gridY: 0,
      gridWidth: 2,
      gridHeight: 1,
      zoneId: null
    };
    
    this.layoutService.addSlotToLayout(this.storeId, request).subscribe({
      next: () => {
        this.loadData();
        this.showNotice(`${slot.code} zum Plan hinzugefügt`);
      },
      error: (err) => {
        console.error('Failed to add slot to plan:', err);
        this.error.set('Fehler beim Hinzufügen des Fachs');
      }
    });
  }

  // ========== TRACKING ==========

  trackBySlotId(index: number, layout: DhlShelfSlotLayout): number {
    return layout.slotId;
  }

  trackByZoneName(index: number, zone: { name: string }): string {
    return zone.name;
  }
}
