import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-customer-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="customer-dashboard">
      <h2>Mein Konto</h2>
      <div class="dashboard-grid">
        <div class="dashboard-card" routerLink="/customer/orders">
          <h3>Bestellungen</h3>
          <p>Bestellhistorie ansehen</p>
        </div>
        <div class="dashboard-card" routerLink="/customer/wishlist">
          <h3>Wunschliste</h3>
          <p>Gespeicherte Produkte</p>
        </div>
        <div class="dashboard-card" routerLink="/customer/saved-carts">
          <h3>Gespeicherte Warenkörbe</h3>
          <p>Warenkörbe verwalten</p>
        </div>
        <div class="dashboard-card" routerLink="/customer/addresses">
          <h3>Adressbuch</h3>
          <p>Adressen verwalten</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .customer-dashboard {
      padding: 2rem;
      max-width: 1200px;
      margin: 0 auto;
    }
    .dashboard-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1.5rem;
      margin-top: 2rem;
    }
    .dashboard-card {
      padding: 2rem;
      border: 1px solid #ddd;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.3s;
    }
    .dashboard-card:hover {
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      transform: translateY(-2px);
    }
    .dashboard-card h3 {
      margin: 0 0 0.5rem 0;
    }
    .dashboard-card p {
      color: #666;
      margin: 0;
    }
  `]
})
export class CustomerDashboardComponent {
}

