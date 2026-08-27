import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { DhlComponent } from './dhl.component';
import { DhlService } from '@app/core/services/dhl.service';
import { TranslationService } from '@app/core/services/translation.service';
import { DhlErrorService } from '@app/core/services/dhl-error.service';
import { ToastService } from '@app/core/services/toast.service';

/**
 * DHL Component Integration Test
 * 
 * Purpose: Verify DI setup and prevent NG0201 errors
 * 
 * This test ensures that:
 * 1. DhlComponent can be instantiated with real provider setup
 * 2. All services are correctly injectable
 * 3. Child components (DhlSlotManagementComponent, DhlActivityLogComponent)
 *    have their transitive dependencies satisfied
 * 
 * Critical: This test MUST fail if a required DI provider is missing
 */
describe('DhlComponent Integration (NG0201 Prevention)', () => {
  let component: DhlComponent;
  let fixture: ComponentFixture<DhlComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DhlComponent], // Standalone component
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        // Mock ActivatedRoute with storeId parameter
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: (key: string) => key === 'storeId' ? '121' : null
              }
            }
          }
        },
        // Services that MUST be injectable
        DhlService,
        DhlErrorService,
        ToastService,
        TranslationService
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DhlComponent);
    component = fixture.componentInstance;
  });

  it('should create component without NG0201 error', () => {
    expect(component).toBeTruthy();
  });

  it('should inject DhlService', () => {
    const service = TestBed.inject(DhlService);
    expect(service).toBeTruthy();
  });

  it('should inject DhlErrorService (critical: uses TranslationService, not TranslatePipe)', () => {
    // This test verifies the fix for NG0201
    // DhlErrorService MUST inject TranslationService, not TranslatePipe
    const errorService = TestBed.inject(DhlErrorService);
    expect(errorService).toBeTruthy();

    // Verify it has translationService property (not translate/TranslatePipe)
    expect((errorService as any).translationService).toBeTruthy();
  });

  it('should inject ToastService', () => {
    const service = TestBed.inject(ToastService);
    expect(service).toBeTruthy();
  });

  it('should inject TranslationService', () => {
    const service = TestBed.inject(TranslationService);
    expect(service).toBeTruthy();
    expect(service.translate).toBeDefined();
  });

  it('should render without errors when initialized', () => {
    expect(() => fixture.detectChanges()).not.toThrow();
  });
});
