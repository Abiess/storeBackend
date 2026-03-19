import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { AdminSidebarComponent } from '../admin-sidebar/admin-sidebar.component';
import { AuthService } from '@app/core/services/auth.service';
import { User } from '@app/core/models';
import {LanguageSwitcherComponent} from "@app/core/i18n.exports";

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, AdminSidebarComponent, LanguageSwitcherComponent],
  templateUrl: './admin-layout.component.html',
  styleUrls: ['./admin-layout.component.scss']
})
export class AdminLayoutComponent implements OnInit {
  storeId?: number;
  currentUser: User | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Methode 1: Aus Route Params
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.storeId = +params['id'];
        console.log('✅ AdminLayout: StoreId aus params[id]:', this.storeId);
      } else if (params['storeId']) {
        this.storeId = +params['storeId'];
        console.log('✅ AdminLayout: StoreId aus params[storeId]:', this.storeId);
      }
    });

    // Methode 2: Aus Parent Route (falls verschachtelt)
    if (!this.storeId && this.route.parent) {
      this.route.parent.params.subscribe(params => {
        if (params['id'] && !this.storeId) {
          this.storeId = +params['id'];
          console.log('✅ AdminLayout: StoreId aus parent params:', this.storeId);
        }
      });
    }

    // Methode 3: Aus URL extrahieren (Fallback)
    if (!this.storeId) {
      const urlMatch = this.router.url.match(/\/stores\/(\d+)/);
      if (urlMatch) {
        this.storeId = +urlMatch[1];
        console.log('✅ AdminLayout: StoreId aus URL extrahiert:', this.storeId);
      }
    }

    // Get current user (synchron)
    this.currentUser = this.authService.getCurrentUser();
  }

  getUserInitials(): string {
    if (!this.currentUser) return '?';
    const name = this.currentUser.name || this.currentUser.email;
    return name.charAt(0).toUpperCase();
  }

  logout(): void {
    this.authService.logout();
  }
}

