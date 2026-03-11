import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProductnavigationBarComponent } from './productnavigation-bar.component';

describe('ProductnavigationBarComponent', () => {
  let component: ProductnavigationBarComponent;
  let fixture: ComponentFixture<ProductnavigationBarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductnavigationBarComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ProductnavigationBarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
