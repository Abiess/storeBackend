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
  SlotStatus,
  getSlotStatus,
  getSizeFromGrid,
  SlotSize,
  SLOT_SIZE_MAP
} from '@app/core/models/dhl.model';
import { TranslatePipe } from '@app/core/pipes/translate.pipe';
import { LucideAngularModule } from 'lucide-angular';

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
  imports: [CommonModule, FormsModule, DragDropModule, TranslatePipe, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dhl-visual-plan.component.html',
  styleUrls: ['./dhl-visual-plan.component.scss']
})
export class DhlVisualPlanComponent implements OnInit, OnDestroy {
  private layoutService = inject(DhlLayoutService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private destroy$ = new Subject<void>();

  // ========== STATE ==========

  storeId!: number;

  // Data
  layouts = signal<DhlShelfSlotLayout[]>([]);
  zones = signal<DhlZone[]>([]);
  
  // UI State
  mode = signal<'operation' | 'expert'>('operation');
  loading = signal(false);
  saving = signal(false);
  error = signal<string | null>(null);
  
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
  
  // Slots ohne Layout (Fallback)
  slotsWithoutLayout = signal<any[]>([]);
  
  // Enums for template
  SlotStatus = SlotStatus;
  SlotSize = SlotSize;

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
    
    this.loadData();
  }

  ngOnDestroy(): void {
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

  onDrop(event: CdkDragDrop<DhlShelfSlotLayout[]>): void {
    if (!this.isExpertMode()) return;
    
    const slotLayout = event.item.data as DhlShelfSlotLayout;
    
    // TODO: Calculate new grid position from drop coordinates
    // Placeholder: Move in array
    const currentLayouts = this.layouts();
    moveItemInArray(currentLayouts, event.previousIndex, event.currentIndex);
    this.layouts.set([...currentLayouts]);
    
    // Mark as changed
    this.markSlotChanged(slotLayout.slotId, {
      slotId: slotLayout.slotId,
      gridX: slotLayout.gridX,
      gridY: slotLayout.gridY,
      gridWidth: slotLayout.gridWidth,
      gridHeight: slotLayout.gridHeight,
      zoneId: slotLayout.zoneId
    });
    
    console.log(`Slot ${slotLayout.slotCode} dropped`);
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
    
    const request: DhlLayoutUpdateRequest = { updates: changes };
    
    this.layoutService.updateLayoutBatch(this.storeId, request).pipe(
      takeUntil(this.destroy$),
      finalize(() => this.saving.set(false))
    ).subscribe({
      next: () => {
        console.log(`✅ Saved ${changes.length} layout changes`);
        this.isDirty.set(false);
        this.pendingChanges.set(new Map());
        this.loadData(); // Reload für korrekte Daten
      },
      error: (err) => {
        console.error('Save error:', err);
        this.error.set('Fehler beim Speichern');
      }
    });
  }

  discardChanges(): void {
    this.layouts.set(JSON.parse(JSON.stringify(this.originalLayouts)));
    this.pendingChanges.set(new Map());
    this.isDirty.set(false);
    console.log('Changes discarded');
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
    // TODO: Open slot details dialog
    console.log('Show details for:', layout.slotCode);
  }

  selectSlot(layout: DhlShelfSlotLayout): void {
    // TODO: Open slot editor dialog
    console.log('Edit slot:', layout.slotCode);
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

  // ========== ZONE ACTIONS ==========

  openZoneManager(): void {
    // TODO: Open zone manager dialog
    console.log('Open zone manager');
  }

  createNewSlot(): void {
    // TODO: Open new slot dialog
    console.log('Create new slot');
  }

  // ========== TRACKING ==========

  trackBySlotId(index: number, layout: DhlShelfSlotLayout): number {
    return layout.slotId;
  }

  trackByZoneName(index: number, zone: { name: string }): string {
    return zone.name;
  }
}
