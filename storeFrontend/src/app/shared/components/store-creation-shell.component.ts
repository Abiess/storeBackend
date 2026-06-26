import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-store-creation-shell',
  standalone: true,
  imports: [CommonModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="sc-shell">
      <header class="sc-header">
        <a routerLink="/" class="sc-logo">
          <img src="assets/images/logo.svg" alt="markt.ma" class="sc-logo-img">
        </a>
        <ng-content select="[slot=header-right]"></ng-content>
      </header>
      <div class="sc-body">
        <ng-content></ng-content>
      </div>
    </div>
  `,
  styles: [`
    .sc-shell {
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 0 1rem 3rem;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }

    .sc-header {
      width: 100%;
      max-width: 540px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1.25rem 0 0.5rem;
      gap: 1rem;
    }

    .sc-logo {
      display: flex;
      align-items: center;
      text-decoration: none;
    }

    .sc-logo-img {
      height: 36px;
      width: auto;
      object-fit: contain;
      /* Logo sichtbar machen: Kein Filter mehr */
      display: block;
    }

    .sc-body {
      width: 100%;
      max-width: 540px;
    }
  `]
})
export class StoreCreationShellComponent {}
