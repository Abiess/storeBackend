import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ProductTierPriceService, ProductTierPrice } from './product-tier-price.service';
import { environment } from '../../../environments/environment';

describe('ProductTierPriceService', () => {
  let service: ProductTierPriceService;
  let httpMock: HttpTestingController;
  const storeId = 1;
  const productId = 100;
  const baseUrl = environment.apiUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ProductTierPriceService]
    });
    service = TestBed.inject(ProductTierPriceService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should get tier prices for a product', () => {
    const mockTierPrices: ProductTierPrice[] = [
      {
        id: 1,
        productId: productId,
        minimumQuantity: 10,
        unitPrice: 8.99,
        label: 'Wholesale',
        active: true,
        sortOrder: 0
      },
      {
        id: 2,
        productId: productId,
        minimumQuantity: 50,
        unitPrice: 7.99,
        label: null,
        active: true,
        sortOrder: 1
      }
    ];

    service.getTierPrices(storeId, productId).subscribe(tierPrices => {
      expect(tierPrices.length).toBe(2);
      expect(tierPrices[0].minimumQuantity).toBe(10);
      expect(tierPrices[0].unitPrice).toBe(8.99);
      expect(tierPrices[1].minimumQuantity).toBe(50);
    });

    const req = httpMock.expectOne(`${baseUrl}/stores/${storeId}/products/${productId}/tier-prices`);
    expect(req.request.method).toBe('GET');
    req.flush(mockTierPrices);
  });

  it('should create a new tier price (POST)', () => {
    const newTierPrice: Partial<ProductTierPrice> = {
      productId: productId,
      minimumQuantity: 10,
      unitPrice: 8.99,
      label: 'Wholesale',
      active: true,
      sortOrder: 0
    };

    const createdTierPrice: ProductTierPrice = { id: 1, ...newTierPrice as ProductTierPrice };

    service.createTierPrice(storeId, productId, newTierPrice).subscribe(tierPrice => {
      expect(tierPrice.id).toBe(1);
      expect(tierPrice.minimumQuantity).toBe(10);
    });

    const req = httpMock.expectOne(`${baseUrl}/stores/${storeId}/products/${productId}/tier-prices`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(newTierPrice);
    req.flush(createdTierPrice);
  });

  it('should update an existing tier price (PUT)', () => {
    const tierPriceId = 1;
    const updatedData: Partial<ProductTierPrice> = {
      minimumQuantity: 15,
      unitPrice: 7.99,
      active: true,
      sortOrder: 0
    };

    const updatedTierPrice: ProductTierPrice = {
      id: tierPriceId,
      productId: productId,
      label: null,
      minimumQuantity: 15,
      unitPrice: 7.99,
      active: true,
      sortOrder: 0
    };

    service.updateTierPrice(storeId, productId, tierPriceId, updatedData).subscribe(tierPrice => {
      expect(tierPrice.id).toBe(tierPriceId);
      expect(tierPrice.minimumQuantity).toBe(15);
      expect(tierPrice.unitPrice).toBe(7.99);
    });

    const req = httpMock.expectOne(`${baseUrl}/stores/${storeId}/products/${productId}/tier-prices/${tierPriceId}`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(updatedData);
    req.flush(updatedTierPrice);
  });

  it('should delete a tier price (DELETE)', () => {
    const tierPriceId = 1;

    service.deleteTierPrice(storeId, productId, tierPriceId).subscribe(() => {
      expect(true).toBe(true); // Successfully deleted
    });

    const req = httpMock.expectOne(`${baseUrl}/stores/${storeId}/products/${productId}/tier-prices/${tierPriceId}`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
