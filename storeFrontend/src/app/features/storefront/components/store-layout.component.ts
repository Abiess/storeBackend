import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Main Layout Wrapper Component
 * Provides the overall structure for the storefront (inspired by idealo.de)
 */
@Component({
  selector: 'app-store-layout',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="store-layout" [class.sidebar-open]="sidebarOpen">
      <!-- Mobile Overlay -->
      <div 
        class="sidebar-overlay" 
        [class.active]="sidebarOpen"
        (click)="toggleSidebar()">
      </div>

      <!-- Sidebar -->
      <aside class="store-sidebar" [class.open]="sidebarOpen">
        <ng-content select="[sidebar]"></ng-content>
      </aside>

      <!-- Main Content Area -->
      <div class="store-content">
        <!-- Top Section (Hero, Featured, etc.) -->
        <div class="store-content-top">
          <ng-content select="[top]"></ng-content>
        </div>

        <!-- Main Products Area -->
        <div class="store-content-main">
          <ng-content select="[main]"></ng-content>
        </div>
      </div>

      <!-- Mobile Toggle Button -->
      <button 
        class="mobile-sidebar-toggle" 
        (click)="toggleSidebar()"
        [attr.aria-label]="sidebarOpen ? 'Kategorien schließen' : 'Kategorien öffnen'">
        <svg *ngIf="!sidebarOpen" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="3" y1="6" x2="21" y2="6"></line>
          <line x1="3" y1="12" x2="21" y2="12"></line>
          <line x1="3" y1="18" x2="21" y2="18"></line>
        </svg>
        <svg *ngIf="sidebarOpen" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
        <span class="toggle-text">{{ sidebarOpen ? 'Schließen' : 'Filter' }}</span>
      </button>
    </div>
  `,
  styles: [`
    /* ============================================
       Store Layout - Main Structure
       ============================================ */
    .store-layout {
      display: flex;
      max-width: 1400px;
      margin: 0 auto;
      position: relative;
      min-height: calc(100vh - 200px);
    }

    /* ============================================
       Sidebar
       ============================================ */
    .store-sidebar {
      width: 280px;
      flex-shrink: 0;
      position: sticky;
      top: 80px;
      height: fit-content;
      max-height: calc(100vh - 100px);
      overflow-y: auto;
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
      margin-right: 24px;
      transition: transform 0.3s ease;
      z-index: 100;
    }

    .store-sidebar::-webkit-scrollbar {
      width: 6px;
    }

    .store-sidebar::-webkit-scrollbar-thumb {
      background: #e0e0e0;
      border-radius: 3px;
    }

    /* ============================================
       Content Area
       ============================================ */
    .store-content {
      flex: 1;
      min-width: 0;
    }

    .store-content-top {
      margin-bottom: 32px;
    }

    .store-content-main {
      background: white;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
    }

    /* ============================================
       Mobile Sidebar Toggle
       ============================================ */
    .mobile-sidebar-toggle {
      display: none;
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: #2563eb;
      color: white;
      border: none;
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4);
      cursor: pointer;
      z-index: 1000;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 4px;
      transition: all 0.3s ease;
    }

    .mobile-sidebar-toggle:hover {
      background: #1d4ed8;
      transform: scale(1.05);
    }

    .mobile-sidebar-toggle svg {
      display: block;
    }

    .toggle-text {
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .sidebar-overlay {
      display: none;
    }

    /* ============================================
       Tablet Styles (768px - 1024px)
       ============================================ */
    @media (max-width: 1024px) {
      .store-layout {
        max-width: 100%;
        padding: 0 16px;
      }

      .store-sidebar {
        width: 240px;
        margin-right: 16px;
      }

      .store-content-main {
        padding: 20px;
      }
    }

    /* ============================================
       Mobile Styles (< 768px)
       ============================================ */
    @media (max-width: 768px) {
      .store-layout {
        padding: 0 12px;
      }

      .store-sidebar {
        position: fixed;
        top: 0;
        left: 0;
        width: 85%;
        max-width: 320px;
        height: 100vh;
        max-height: 100vh;
        margin: 0;
        border-radius: 0;
        transform: translateX(-100%);
        box-shadow: none;
        z-index: 1001;
      }

      .store-sidebar.open {
        transform: translateX(0);
        box-shadow: 4px 0 12px rgba(0, 0, 0, 0.15);
      }

      .sidebar-overlay {
        display: block;
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        opacity: 0;
        visibility: hidden;
        transition: all 0.3s ease;
        z-index: 1000;
      }

      .sidebar-overlay.active {
        opacity: 1;
        visibility: visible;
      }

      .mobile-sidebar-toggle {
        display: flex;
      }

      .store-content-main {
        padding: 16px;
        border-radius: 8px;
      }

      .store-content-top {
        margin-bottom: 20px;
      }
    }

    /* ============================================
       Small Mobile (< 480px)
       ============================================ */
    @media (max-width: 480px) {
      .store-layout {
        padding: 0 8px;
      }

      .store-sidebar {
        width: 90%;
      }

      .mobile-sidebar-toggle {
        width: 56px;
        height: 56px;
        bottom: 20px;
        right: 20px;
      }

      .store-content-main {
        padding: 12px;
      }
    }
  `]
})
export class StoreLayoutComponent {
  @Input() sidebarOpen = false;

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }
}

