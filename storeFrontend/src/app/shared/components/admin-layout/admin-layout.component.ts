import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { AdminSidebarComponent } from '../admin-sidebar/admin-sidebar.component';
import { LanguageSwitcherComponent } from '../language-switcher.component';
import { AuthService } from '@app/core/services/auth.service';
import { User } from '@app/core/models';

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
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Get storeId from route params if available
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.storeId = +params['id'];
      } else if (params['storeId']) {
        this.storeId = +params['storeId'];
      }
    });

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

