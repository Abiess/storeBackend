import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of, throwError, Observable } from 'rxjs';
import { DhlWarehousePlanComponent } from './dhl-warehouse-plan.component';
import { DhlService, DhlSlot, DhlParcel } from '@app/core/services/dhl.service';
import { DhlErrorService } from '@app/core/services/dhl-error.service';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';

/**
 * TEIL 2 - Lagerverwaltung (Schritt 1: nur "Paket entfernen"):
 *
 * - Klick auf ein belegtes/teilbelegtes Fach öffnet das Detail-Panel.
 * - Nur STORED-Pakete des angeklickten Fachs werden angezeigt
 *   (PICKED_UP/CANCELLED gelten NICHT als aktiv).
 * - Bestätigtes Entfernen ruft den bestehenden Endpoint
 *   POST /parcels/{parcelId}/cancel auf (Grund MANUAL_REMOVAL).
 * - Abgebrochenes Entfernen darf KEINEN Request auslösen.
 * - Nach Erfolg werden Slots + Pakete neu geladen (Occupancy/Zähler aktuell).
 * - Backend-Fehler werden über DhlErrorService verständlich angezeigt.
 */
describe('DhlWarehousePlanComponent - TEIL 2 Paket entfernen', () => {
  let component: DhlWarehousePlanComponent;
  let fixture: ComponentFixture<DhlWarehousePlanComponent>;
  let mockDhlService: jasmine.SpyObj<DhlService>;
  let mockDhlErrorService: jasmine.SpyObj<DhlErrorService>;

  function mockSlotA7(): DhlSlot {
    return { id: 7, code: 'A7', sortOrder: 7, active: true, capacity: 3, occupiedCount: 2, occupied: false };
  }

  function mockParcels(): DhlParcel[] {
    return [
      {
        id: 1, storeId: 123, trackingCode: '00340434664988418341', shelfLocation: 'A7',
        receivedAt: '2026-09-01T15:00:00Z', status: 'STORED',
        createdAt: '2026-09-01T15:00:00Z', updatedAt: '2026-09-01T15:00:00Z'
      },
      {
        id: 2, storeId: 123, trackingCode: '358064457490', shelfLocation: 'A7',
        receivedAt: '2026-09-02T10:00:00Z', status: 'STORED',
        createdAt: '2026-09-02T10:00:00Z', updatedAt: '2026-09-02T10:00:00Z'
      },
      // Bereits abgeholt - darf NICHT als aktives Paket im Fach A7 erscheinen
      {
        id: 3, storeId: 123, trackingCode: '111111111111', shelfLocation: 'A7',
        receivedAt: '2026-08-01T10:00:00Z', pickedUpAt: '2026-08-02T10:00:00Z', status: 'PICKED_UP',
        createdAt: '2026-08-01T10:00:00Z', updatedAt: '2026-08-02T10:00:00Z'
      },
      // Bereits storniert - darf NICHT als aktives Paket im Fach A7 erscheinen
      {
        id: 4, storeId: 123, trackingCode: '222222222222', shelfLocation: 'A7',
        receivedAt: '2026-08-01T10:00:00Z', status: 'CANCELLED',
        createdAt: '2026-08-01T10:00:00Z', updatedAt: '2026-08-02T10:00:00Z'
      }
    ];
  }

  beforeEach(async () => {
    mockDhlService = jasmine.createSpyObj('DhlService', [
      'getSlots',
      'listStoredParcels',
      'cancelParcel'
    ]);
    mockDhlErrorService = jasmine.createSpyObj('DhlErrorService', ['handleError']);

    mockDhlService.getSlots.and.returnValue(of([mockSlotA7()]));
    mockDhlService.listStoredParcels.and.returnValue(of(mockParcels()));

    await TestBed.configureTestingModule({
      imports: [DhlWarehousePlanComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: DhlService, useValue: mockDhlService },
        { provide: DhlErrorService, useValue: mockDhlErrorService },
        { provide: Router, useValue: jasmine.createSpyObj('Router', ['navigate'], { url: '/stores/123/dhl/plan' }) },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => '123' } }, parent: null }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DhlWarehousePlanComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('Klick auf belegtes Fach öffnet das Detail-Panel', () => {
    expect(component.selectedSlotForDetail()).toBeNull();

    component.onSlotClicked(mockSlotA7());

    expect(component.selectedSlotForDetail()).toEqual(mockSlotA7());
    expect(mockDhlService.listStoredParcels).toHaveBeenCalledWith(123);
  });

  it('zeigt nur STORED-Pakete des angeklickten Fachs (PICKED_UP/CANCELLED ausgeschlossen)', () => {
    component.onSlotClicked(mockSlotA7());

    const shown = component.selectedSlotParcels();
    expect(shown.length).toBe(2);
    expect(shown.every(p => p.status === 'STORED')).toBe(true);
    expect(shown.some(p => p.id === 3)).toBe(false); // PICKED_UP
    expect(shown.some(p => p.id === 4)).toBe(false); // CANCELLED
  });

  it('Cancel bestätigt → cancelParcel() wird mit MANUAL_REMOVAL aufgerufen', fakeAsync(() => {
    const cancelledParcel: DhlParcel = {
      ...mockParcels()[0],
      status: 'CANCELLED',
      cancelledAt: '2026-09-03T10:00:00Z',
      cancellationReason: 'MANUAL_REMOVAL'
    };
    mockDhlService.cancelParcel.and.returnValue(of(cancelledParcel));

    component.onSlotClicked(mockSlotA7());
    component.onRemoveConfirmed(mockParcels()[0]);
    tick();

    expect(mockDhlService.cancelParcel).toHaveBeenCalledWith(123, 1, { reason: 'MANUAL_REMOVAL' });
  }));

  it('Cancel abgebrochen (Dialog geschlossen ohne Bestätigung) → kein Request', () => {
    component.onSlotClicked(mockSlotA7());
    component.closeSlotDetail();

    expect(mockDhlService.cancelParcel).not.toHaveBeenCalled();
    expect(component.selectedSlotForDetail()).toBeNull();
  });

  it('Erfolg → Paket verschwindet aus dem aktiven Fach + Slots/Zähler werden neu geladen', fakeAsync(() => {
    const cancelledParcel: DhlParcel = {
      ...mockParcels()[0],
      status: 'CANCELLED',
      cancelledAt: '2026-09-03T10:00:00Z',
      cancellationReason: 'MANUAL_REMOVAL'
    };
    mockDhlService.cancelParcel.and.returnValue(of(cancelledParcel));

    // Vor der Entfernung: Dialog öffnen, 2 STORED-Pakete sichtbar
    component.onSlotClicked(mockSlotA7());
    expect(component.selectedSlotParcels().length).toBe(2);

    // Nach der Entfernung liefert das Backend nur noch das zweite Paket als STORED
    // + eine reduzierte Belegung für Fach A7 (Occupancy/Zähler-Refresh)
    const remainingParcels = mockParcels().filter(p => p.id !== 1);
    remainingParcels[0] = { ...remainingParcels[0], status: 'STORED' };
    mockDhlService.listStoredParcels.and.returnValue(of(remainingParcels));

    const updatedSlot: DhlSlot = { ...mockSlotA7(), occupiedCount: 1 };
    mockDhlService.getSlots.and.returnValue(of([updatedSlot]));

    component.onRemoveConfirmed(mockParcels()[0]);
    tick();

    expect(component.selectedSlotParcels().some(p => p.id === 1)).toBe(false);
    expect(component.slots()[0].occupiedCount).toBe(1);
  }));

  it('Backend-Fehler beim Entfernen → verständliche Fehlermeldung über DhlErrorService, kein Absturz', fakeAsync(() => {
    const mockError = new HttpErrorResponse({
      error: { code: 'PARCEL_NOT_STORED', message: 'Parcel already picked up' },
      status: 409,
      statusText: 'Conflict'
    });
    mockDhlService.cancelParcel.and.returnValue(throwError(() => mockError));

    component.onSlotClicked(mockSlotA7());
    component.onRemoveConfirmed(mockParcels()[0]);
    tick();

    expect(mockDhlErrorService.handleError).toHaveBeenCalledWith(mockError);
    expect(component.removingParcelId()).toBeNull();
  }));

  it('removingParcelId() zeigt an, welches Paket gerade entfernt wird (Loading-State)', fakeAsync(() => {
    // Asynchrone (nicht sofort synchron auflösende) Antwort, um den
    // Zwischenzustand während des laufenden Requests zu prüfen.
    let resolveFn!: (value: DhlParcel) => void;
    const pending = new Promise<DhlParcel>(resolve => { resolveFn = resolve; });
    mockDhlService.cancelParcel.and.returnValue(
      new Observable<DhlParcel>((subscriber) => {
        pending.then(value => { subscriber.next(value); subscriber.complete(); });
      })
    );

    component.onSlotClicked(mockSlotA7());
    component.onRemoveConfirmed(mockParcels()[0]);

    expect(component.removingParcelId()).toBe(1);

    resolveFn({ ...mockParcels()[0], status: 'CANCELLED' } as DhlParcel);
    tick();
    expect(component.removingParcelId()).toBeNull();
  }));
});
