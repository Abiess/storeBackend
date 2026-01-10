import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { RoleService } from '@app/core/services/role.service';
import { CartService } from '@app/core/services/cart.service';
import { CheckoutService } from '@app/core/services/checkout.service';
import { Permission, UserRole } from '@app/core/models';

interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'error';
  message: string;
  details?: any;
}

@Component({
  selector: 'app-test-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="test-dashboard">
      <header class="dashboard-header">
        <h1>🧪 Test-Dashboard</h1>
        <p>Testen Sie alle Funktionen des Systems im Mock-Modus</p>
      </header>

      <!-- Quick Actions -->
      <div class="quick-actions">
        <button class="btn btn-primary" (click)="runAllTests()">
          ▶️ Alle Tests ausführen
        </button>
        <button class="btn btn-secondary" (click)="clearResults()">
          🗑️ Ergebnisse löschen
        </button>
        <button class="btn btn-info" (click)="goToStorefront()">
          🛒 Zum Storefront
        </button>
        <button class="btn btn-info" (click)="goToCart()">
          🛍️ Zum Warenkorb
        </button>
      </div>

      <!-- Test Categories -->
      <div class="test-categories">
        <!-- Warenkorb Tests -->
        <section class="test-category">
          <h2>🛒 Warenkorb Tests</h2>
          <div class="test-grid">
            <div class="test-card">
              <h3>Session ID generieren</h3>
              <button class="btn btn-sm" (click)="testGenerateSessionId()">Testen</button>
              <div class="test-result" *ngIf="getResult('sessionId')">
                <span class="status" [class]="getResult('sessionId')?.status">
                  {{ getResult('sessionId')?.status === 'success' ? '✅' : '❌' }}
                </span>
                <p>{{ getResult('sessionId')?.message }}</p>
                <code *ngIf="getResult('sessionId')?.details">
                  {{ getResult('sessionId')?.details }}
                </code>
              </div>
            </div>

            <div class="test-card">
              <h3>Warenkorb laden</h3>
              <button class="btn btn-sm" (click)="testGetCart()">Testen</button>
              <div class="test-result" *ngIf="getResult('getCart')">
                <span class="status" [class]="getResult('getCart')?.status">
                  {{ getResult('getCart')?.status === 'success' ? '✅' : '❌' }}
                </span>
                <p>{{ getResult('getCart')?.message }}</p>
              </div>
            </div>

            <div class="test-card">
              <h3>Artikel hinzufügen</h3>
              <button class="btn btn-sm" (click)="testAddToCart()">Testen</button>
              <div class="test-result" *ngIf="getResult('addToCart')">
                <span class="status" [class]="getResult('addToCart')?.status">
                  {{ getResult('addToCart')?.status === 'success' ? '✅' : '❌' }}
                </span>
                <p>{{ getResult('addToCart')?.message }}</p>
              </div>
            </div>

            <div class="test-card">
              <h3>Warenkorb leeren</h3>
              <button class="btn btn-sm" (click)="testClearCart()">Testen</button>
              <div class="test-result" *ngIf="getResult('clearCart')">
                <span class="status" [class]="getResult('clearCart')?.status">
                  {{ getResult('clearCart')?.status === 'success' ? '✅' : '❌' }}
                </span>
                <p>{{ getResult('clearCart')?.message }}</p>
              </div>
            </div>
          </div>
        </section>

        <!-- Checkout Tests -->
        <section class="test-category">
          <h2>💳 Checkout Tests</h2>
          <div class="test-grid">
            <div class="test-card">
              <h3>Bestellung aufgeben</h3>
              <button class="btn btn-sm" (click)="testCheckout()">Testen</button>
              <div class="test-result" *ngIf="getResult('checkout')">
                <span class="status" [class]="getResult('checkout')?.status">
                  {{ getResult('checkout')?.status === 'success' ? '✅' : '❌' }}
                </span>
                <p>{{ getResult('checkout')?.message }}</p>
                <code *ngIf="getResult('checkout')?.details">
                  Bestellnummer: {{ getResult('checkout')?.details?.orderNumber }}
                </code>
              </div>
            </div>

            <div class="test-card">
              <h3>Bestellung abrufen</h3>
              <input 
                type="text" 
                [(ngModel)]="testOrderNumber" 
                placeholder="ORD-2025-01000"
                class="form-control"
              >
              <input 
                type="email" 
                [(ngModel)]="testEmail" 
                placeholder="test@example.com"
                class="form-control"
              >
              <button class="btn btn-sm" (click)="testGetOrder()">Testen</button>
              <div class="test-result" *ngIf="getResult('getOrder')">
                <span class="status" [class]="getResult('getOrder')?.status">
                  {{ getResult('getOrder')?.status === 'success' ? '✅' : '❌' }}
                </span>
                <p>{{ getResult('getOrder')?.message }}</p>
              </div>
            </div>
          </div>
        </section>

        <!-- Rollen & Berechtigungen Tests -->
        <section class="test-category">
          <h2>🔐 Rollen & Berechtigungen Tests</h2>
          <div class="test-grid">
            <div class="test-card">
              <h3>Store-Rollen laden</h3>
              <button class="btn btn-sm" (click)="testGetStoreRoles()">Testen</button>
              <div class="test-result" *ngIf="getResult('storeRoles')">
                <span class="status" [class]="getResult('storeRoles')?.status">
                  {{ getResult('storeRoles')?.status === 'success' ? '✅' : '❌' }}
                </span>
                <p>{{ getResult('storeRoles')?.message }}</p>
              </div>
            </div>

            <div class="test-card">
              <h3>Berechtigung prüfen</h3>
              <select [(ngModel)]="testPermission" class="form-control">
                <option [value]="Permission.PRODUCT_CREATE">PRODUCT_CREATE</option>
                <option [value]="Permission.STORE_DELETE">STORE_DELETE</option>
                <option [value]="Permission.DOMAIN_VERIFY">DOMAIN_VERIFY</option>
              </select>
              <button class="btn btn-sm" (click)="testHasPermission()">Testen</button>
              <div class="test-result" *ngIf="getResult('hasPermission')">
                <span class="status" [class]="getResult('hasPermission')?.status">
                  {{ getResult('hasPermission')?.status === 'success' ? '✅' : '❌' }}
                </span>
                <p>{{ getResult('hasPermission')?.message }}</p>
              </div>
            </div>

            <div class="test-card">
              <h3>Rolle zuweisen</h3>
              <input 
                type="number" 
                [(ngModel)]="testUserId" 
                placeholder="User ID"
                class="form-control"
              >
              <select [(ngModel)]="testRole" class="form-control">
                <option [value]="UserRole.STORE_OWNER">STORE_OWNER</option>
                <option [value]="UserRole.STORE_ADMIN">STORE_ADMIN</option>
                <option [value]="UserRole.STORE_MANAGER">STORE_MANAGER</option>
                <option [value]="UserRole.STORE_STAFF">STORE_STAFF</option>
              </select>
              <button class="btn btn-sm" (click)="testAssignRole()">Testen</button>
              <div class="test-result" *ngIf="getResult('assignRole')">
                <span class="status" [class]="getResult('assignRole')?.status">
                  {{ getResult('assignRole')?.status === 'success' ? '✅' : '❌' }}
                </span>
                <p>{{ getResult('assignRole')?.message }}</p>
              </div>
            </div>

            <div class="test-card">
              <h3>Domain-Zugriff prüfen</h3>
              <button class="btn btn-sm" (click)="testDomainAccess()">Testen</button>
              <div class="test-result" *ngIf="getResult('domainAccess')">
                <span class="status" [class]="getResult('domainAccess')?.status">
                  {{ getResult('domainAccess')?.status === 'success' ? '✅' : '❌' }}
                </span>
                <p>{{ getResult('domainAccess')?.message }}</p>
              </div>
            </div>
          </div>
        </section>
      </div>

      <!-- Test Results Summary -->
      <div class="test-summary" *ngIf="testResults.length > 0">
        <h2>📊 Test-Zusammenfassung</h2>
        <div class="summary-stats">
          <div class="stat success">
            <span class="count">{{ getSuccessCount() }}</span>
            <span class="label">Erfolgreich</span>
          </div>
          <div class="stat error">
            <span class="count">{{ getErrorCount() }}</span>
            <span class="label">Fehler</span>
          </div>
          <div class="stat total">
            <span class="count">{{ testResults.length }}</span>
            <span class="label">Gesamt</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .test-dashboard {
      max-width: 1400px;
      margin: 0 auto;
      padding: 20px;
    }

    .dashboard-header {
      text-align: center;
      margin-bottom: 30px;
    }

    .dashboard-header h1 {
      margin: 0 0 10px 0;
      color: #333;
    }

    .dashboard-header p {
      color: #666;
      margin: 0;
    }

    .quick-actions {
      display: flex;
      gap: 10px;
      justify-content: center;
      margin-bottom: 30px;
      flex-wrap: wrap;
    }

    .btn {
      padding: 12px 24px;
      border: none;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s;
    }

    .btn-primary {
      background: #667eea;
      color: white;
    }

    .btn-primary:hover {
      background: #5568d3;
    }

    .btn-secondary {
      background: #6c757d;
      color: white;
    }

    .btn-info {
      background: #17a2b8;
      color: white;
    }

    .btn-sm {
      padding: 8px 16px;
      font-size: 14px;
    }

    .test-categories {
      display: flex;
      flex-direction: column;
      gap: 30px;
    }

    .test-category {
      background: white;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.1);
    }

    .test-category h2 {
      margin: 0 0 20px 0;
      color: #667eea;
      border-bottom: 2px solid #667eea;
      padding-bottom: 10px;
    }

    .test-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px;
    }

    .test-card {
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 16px;
      background: #f8f9fa;
    }

    .test-card h3 {
      margin: 0 0 12px 0;
      font-size: 16px;
      color: #333;
    }

    .form-control {
      width: 100%;
      padding: 8px 12px;
      margin: 8px 0;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 14px;
    }

    .test-result {
      margin-top: 12px;
      padding: 12px;
      border-radius: 6px;
      background: white;
    }

    .status {
      display: inline-block;
      font-size: 20px;
      margin-right: 8px;
    }

    .status.success {
      color: #28a745;
    }

    .status.error {
      color: #dc3545;
    }

    .test-result p {
      margin: 4px 0;
      color: #333;
      font-size: 14px;
    }

    .test-result code {
      display: block;
      margin-top: 8px;
      padding: 8px;
      background: #f0f0f0;
      border-radius: 4px;
      font-size: 12px;
      color: #666;
    }

    .test-summary {
      margin-top: 40px;
      background: white;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.1);
    }

    .test-summary h2 {
      margin: 0 0 20px 0;
      color: #333;
    }

    .summary-stats {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
    }

    .stat {
      text-align: center;
      padding: 20px;
      border-radius: 8px;
    }

    .stat.success {
      background: #d4edda;
      border: 2px solid #28a745;
    }

    .stat.error {
      background: #f8d7da;
      border: 2px solid #dc3545;
    }

    .stat.total {
      background: #d1ecf1;
      border: 2px solid #17a2b8;
    }

    .stat .count {
      display: block;
      font-size: 36px;
      font-weight: 700;
      margin-bottom: 8px;
    }

    .stat .label {
      display: block;
      font-size: 14px;
      color: #666;
    }

    @media (max-width: 768px) {
      .test-grid {
        grid-template-columns: 1fr;
      }

      .summary-stats {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class TestDashboardComponent implements OnInit {
  testResults: TestResult[] = [];
  
  testOrderNumber = 'ORD-2025-01000';
  testEmail = 'test@example.com';
  testUserId = 10;
  testRole = UserRole.STORE_STAFF;
  testPermission = Permission.PRODUCT_CREATE;

  Permission = Permission;
  UserRole = UserRole;

  constructor(
    private cartService: CartService,
    private checkoutService: CheckoutService,
    private roleService: RoleService,
    private router: Router
  ) {}

  ngOnInit(): void {}

  runAllTests(): void {
    this.clearResults();
    this.testGenerateSessionId();
    setTimeout(() => this.testGetCart(), 500);
    setTimeout(() => this.testAddToCart(), 1000);
    setTimeout(() => this.testGetStoreRoles(), 1500);
    setTimeout(() => this.testHasPermission(), 2000);
    setTimeout(() => this.testDomainAccess(), 2500);
  }

  clearResults(): void {
    this.testResults = [];
  }

  addResult(result: TestResult): void {
    const index = this.testResults.findIndex(r => r.name === result.name);
    if (index !== -1) {
      this.testResults[index] = result;
    } else {
      this.testResults.push(result);
    }
  }

  getResult(name: string): TestResult | undefined {
    return this.testResults.find(r => r.name === name);
  }

  getSuccessCount(): number {
    return this.testResults.filter(r => r.status === 'success').length;
  }

  getErrorCount(): number {
    return this.testResults.filter(r => r.status === 'error').length;
  }

  testGenerateSessionId(): void {
    try {
      const sessionId = this.cartService.getOrCreateSessionId();
      this.addResult({
        name: 'sessionId',
        status: 'success',
        message: 'Session ID erfolgreich generiert',
        details: sessionId
      });
    } catch (error) {
      this.addResult({
        name: 'sessionId',
        status: 'error',
        message: 'Fehler beim Generieren der Session ID'
      });
    }
  }

  testGetCart(): void {
    const storeId = 1;
    this.cartService.getCart(storeId).subscribe({
      next: (cart) => {
        this.addResult({
          name: 'getCart',
          status: 'success',
          message: `Warenkorb geladen: ${cart.items.length} Artikel, Gesamt: ${cart.subtotal}€`
        });
      },
      error: (error) => {
        this.addResult({
          name: 'getCart',
          status: 'error',
          message: 'Fehler beim Laden des Warenkorbs: ' + error.message
        });
      }
    });
  }

  testAddToCart(): void {
    this.cartService.addItem({
      storeId: 1,
      productId: 1,
      quantity: 1
    }).subscribe({
      next: (item) => {
        this.addResult({
          name: 'addToCart',
          status: 'success',
          message: `Artikel hinzugefügt: ${item.productName} - ${item.variantName}`
        });
      },
      error: (error) => {
        this.addResult({
          name: 'addToCart',
          status: 'error',
          message: 'Fehler beim Hinzufügen: ' + error.message
        });
      }
    });
  }

  testClearCart(): void {
    const storeId = 1;
    this.cartService.clearCart(storeId).subscribe({
      next: () => {
        this.addResult({
          name: 'clearCart',
          status: 'success',
          message: 'Warenkorb erfolgreich geleert'
        });
      },
      error: (error) => {
        this.addResult({
          name: 'clearCart',
          status: 'error',
          message: 'Fehler beim Leeren: ' + error.message
        });
      }
    });
  }

  testCheckout(): void {
    const sessionId = this.cartService.getOrCreateSessionId();
    this.checkoutService.checkout({
      sessionId,
      storeId: 1,
      customerEmail: 'test@example.com',
      shippingAddress: {
        firstName: 'Max',
        lastName: 'Test',
        address1: 'Teststr. 1',
        city: 'Berlin',
        postalCode: '12345',
        country: 'Deutschland'
      },
      billingAddress: {
        firstName: 'Max',
        lastName: 'Test',
        address1: 'Teststr. 1',
        city: 'Berlin',
        postalCode: '12345',
        country: 'Deutschland'
      }
    }).subscribe({
      next: (response) => {
        this.addResult({
          name: 'checkout',
          status: 'success',
          message: 'Bestellung erfolgreich aufgegeben',
          details: response
        });
        this.testOrderNumber = response.orderNumber;
        this.testEmail = response.customerEmail;
      },
      error: (error) => {
        this.addResult({
          name: 'checkout',
          status: 'error',
          message: 'Checkout fehlgeschlagen: ' + error.message
        });
      }
    });
  }

  testGetOrder(): void {
    this.checkoutService.getOrderByNumber(this.testOrderNumber, this.testEmail).subscribe({
      next: (order) => {
        this.addResult({
          name: 'getOrder',
          status: 'success',
          message: `Bestellung gefunden: ${order.orderNumber}, Status: ${order.status}`
        });
      },
      error: (error) => {
        this.addResult({
          name: 'getOrder',
          status: 'error',
          message: 'Bestellung nicht gefunden: ' + error.message
        });
      }
    });
  }

  testGetStoreRoles(): void {
    this.roleService.getStoreRoles(1).subscribe({
      next: (roles) => {
        this.addResult({
          name: 'storeRoles',
          status: 'success',
          message: `${roles.length} Store-Rollen geladen`
        });
      },
      error: (error) => {
        this.addResult({
          name: 'storeRoles',
          status: 'error',
          message: 'Fehler beim Laden: ' + error.message
        });
      }
    });
  }

  testHasPermission(): void {
    this.roleService.hasPermission(1, 1, this.testPermission).subscribe({
      next: (hasPermission) => {
        this.addResult({
          name: 'hasPermission',
          status: 'success',
          message: hasPermission 
            ? `✅ User 1 hat Berechtigung: ${this.testPermission}`
            : `❌ User 1 hat KEINE Berechtigung: ${this.testPermission}`
        });
      },
      error: (error) => {
        this.addResult({
          name: 'hasPermission',
          status: 'error',
          message: 'Fehler beim Prüfen: ' + error.message
        });
      }
    });
  }

  testAssignRole(): void {
    this.roleService.assignStoreRole(this.testUserId, 1, this.testRole).subscribe({
      next: () => {
        this.addResult({
          name: 'assignRole',
          status: 'success',
          message: `Rolle ${this.testRole} wurde User ${this.testUserId} zugewiesen`
        });
      },
      error: (error) => {
        this.addResult({
          name: 'assignRole',
          status: 'error',
          message: 'Fehler beim Zuweisen: ' + error.message
        });
      }
    });
  }

  testDomainAccess(): void {
    this.roleService.canManageDomain(1, 1).subscribe({
      next: (canManage) => {
        this.addResult({
          name: 'domainAccess',
          status: 'success',
          message: canManage 
            ? '✅ User 1 kann Domain 1 verwalten'
            : '❌ User 1 kann Domain 1 NICHT verwalten'
        });
      },
      error: (error) => {
        this.addResult({
          name: 'domainAccess',
          status: 'error',
          message: 'Fehler beim Prüfen: ' + error.message
        });
      }
    });
  }

  goToStorefront(): void {
    // Öffne die Storefront über die Subdomain (z.B. test-store.markt.ma)
    // Annahme: Store mit ID 1 hat den Slug 'test-store'
    window.open('https://test-store.markt.ma', '_blank');
  }

  goToCart(): void {
    this.router.navigate(['/cart']);
  }
}
