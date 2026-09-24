import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { DhlSlotGridComponent } from './dhl-slot-grid.component';
import { DhlSlot } from '@app/core/services/dhl.service';

/**
 * TEIL 2 - Lagerverwaltung: `viewMode` erlaubt das Anklicken belegter/
 * teilbelegter Fächer zur Detailansicht, unabhängig vom bestehenden
 * `selectable`/`slotSelected` Storage-Auswahl-Modus (der weiterhin nur
 * freie Fächer selektierbar machen darf).
 */
describe('DhlSlotGridComponent - viewMode (Fach anklickbar)', () => {
  let component: DhlSlotGridComponent;
  let fixture: ComponentFixture<DhlSlotGridComponent>;

  const freeSlot: DhlSlot = { id: 1, code: 'A1', sortOrder: 1, active: true, capacity: 3, occupiedCount: 0, occupied: false };
  const partialSlot: DhlSlot = { id: 7, code: 'A7', sortOrder: 7, active: true, capacity: 3, occupiedCount: 2, occupied: false };
  const fullSlot: DhlSlot = { id: 2, code: 'A2', sortOrder: 2, active: true, capacity: 2, occupiedCount: 2, occupied: true };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DhlSlotGridComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents();

    fixture = TestBed.createComponent(DhlSlotGridComponent);
    component = fixture.componentInstance;
  });

  it('viewMode=true: Klick auf teilbelegtes Fach emittiert slotClicked', () => {
    component.viewMode = true;
    component.slots = [partialSlot];
    fixture.detectChanges();

    const emitted: DhlSlot[] = [];
    component.slotClicked.subscribe(s => emitted.push(s));

    component.onSlotClick(partialSlot);

    expect(emitted).toEqual([partialSlot]);
  });

  it('viewMode=true: Klick auf VOLLES Fach emittiert ebenfalls slotClicked (Detailansicht erlaubt)', () => {
    component.viewMode = true;
    component.slots = [fullSlot];
    fixture.detectChanges();

    const emitted: DhlSlot[] = [];
    component.slotClicked.subscribe(s => emitted.push(s));

    expect(component.isSlotDisabled(fullSlot)).toBe(false);
    component.onSlotClick(fullSlot);

    expect(emitted).toEqual([fullSlot]);
  });

  it('viewMode=true: leeres Fach (occupiedCount=0) bleibt disabled/nicht anklickbar', () => {
    component.viewMode = true;
    component.slots = [freeSlot];
    fixture.detectChanges();

    expect(component.isSlotDisabled(freeSlot)).toBe(true);

    const emitted: DhlSlot[] = [];
    component.slotClicked.subscribe(s => emitted.push(s));
    component.onSlotClick(freeSlot);

    expect(emitted.length).toBe(0);
  });

  it('bestehendes selectable/slotSelected-Verhalten bleibt unverändert (volles Fach weiterhin nicht wählbar)', () => {
    component.viewMode = false;
    component.selectable = true;
    component.slots = [fullSlot];
    fixture.detectChanges();

    expect(component.isSlotDisabled(fullSlot)).toBe(true);

    const emitted: DhlSlot[] = [];
    component.slotSelected.subscribe(s => emitted.push(s));
    component.onSlotClick(fullSlot);

    expect(emitted.length).toBe(0);
  });

  it('bestehendes selectable/slotSelected-Verhalten: freies Fach weiterhin wählbar', () => {
    component.viewMode = false;
    component.selectable = true;
    component.slots = [freeSlot];
    fixture.detectChanges();

    const emitted: DhlSlot[] = [];
    component.slotSelected.subscribe(s => emitted.push(s));
    component.onSlotClick(freeSlot);

    expect(emitted).toEqual([freeSlot]);
  });
});
