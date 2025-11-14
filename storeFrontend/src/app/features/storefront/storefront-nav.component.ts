import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Category } from '@app/core/models';

@Component({
  selector: 'app-storefront-nav',
  standalone: true,
  imports: [CommonModule],
  template: `
    <nav class="store-nav">
      <div class="container">
        <div class="nav-links">
          <a [class.active]="selectedCategory === null" (click)="categorySelect.emit(null)">
            Alle Produkte
          </a>
          <a *ngFor="let category of categories" 
             [class.active]="selectedCategory?.id === category.id" 
             (click)="categorySelect.emit(category)">
            {{ category.name }}
          </a>
        </div>
      </div>
    </nav>
  `,
  styles: [`
    .store-nav {
      background: white;
      border-bottom: 2px solid var(--theme-border, #e9ecef);
      position: sticky;
      top: 0;
      z-index: 100;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    }
    
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 1rem;
    }
    
    .nav-links {
      display: flex;
      gap: 2rem;
      padding: 1rem 0;
      overflow-x: auto;
    }
    
    .nav-links::-webkit-scrollbar { 
      height: 4px; 
    }
    
    .nav-links::-webkit-scrollbar-thumb { 
      background: var(--theme-primary, #667eea); 
      border-radius: 2px; 
    }
    
    .nav-links a {
      color: var(--theme-text-secondary, #666);
      text-decoration: none;
      font-weight: 500;
      padding: 0.5rem 1rem;
      border-radius: var(--theme-border-radius, 8px);
      transition: all 0.3s;
      white-space: nowrap;
      cursor: pointer;
    }
    
    .nav-links a:hover {
      background: var(--theme-background, #f8f9fa);
      color: var(--theme-primary, #667eea);
    }
    
    .nav-links a.active {
      background: linear-gradient(135deg, var(--theme-primary, #667eea), var(--theme-secondary, #764ba2));
      color: white;
    }
    
    @media (max-width: 768px) {
      .nav-links { 
        gap: 1rem; 
      }
    }
  `]
})
export class StorefrontNavComponent {
  @Input() categories: Category[] = [];
  @Input() selectedCategory: Category | null = null;
  @Output() categorySelect = new EventEmitter<Category | null>();
}

