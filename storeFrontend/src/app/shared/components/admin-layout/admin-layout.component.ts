import { Component, OnInit, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { AdminSidebarComponent } from '../admin-sidebar/admin-sidebar.component';
import { AuthService } from '@app/core/services/auth.service';
import { User } from '@app/core/models';
import { LanguageSwitcherComponent } from '@app/core/i18n.exports';
import {
  LucideAngularModule,
  Bell, Crown, Globe, ChevronDown, LogOut, Menu
} from 'lucide-angular';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [
    CommonModule, RouterModule, AdminSidebarComponent, LanguageSwitcherComponent,
    LucideAngularModule
  ],
  templateUrl: './admin-layout.component.html',
  styleUrls: ['./admin-layout.component.scss']
})
export class AdminLayoutComponent implements OnInit {
  storeId?: number;
  currentUser: User | null = null;
  userDropdownOpen = false;
  notificationCount = 0; // kann später an NotificationService angebunden werden

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private elRef: ElementRef
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.storeId = +params['id'];
      } else if (params['storeId']) {
        this.storeId = +params['storeId'];
      }
    });

    if (!this.storeId && this.route.parent) {
      this.route.parent.params.subscribe(params => {
        if (params['id'] && !this.storeId) {
          this.storeId = +params['id'];
        }
      });
    }

    if (!this.storeId) {
      const urlMatch = this.router.url.match(/\/stores\/(\d+)/);
      if (urlMatch) {
        this.storeId = +urlMatch[1];
      }
    }

    this.currentUser = this.authService.getCurrentUser();
  }

  getUserInitials(): string {
    if (!this.currentUser) return '?';
    const name = this.currentUser.name || this.currentUser.email;
    return name.charAt(0).toUpperCase();
  }

  getUserDisplayName(): string {
    return this.currentUser?.name || this.currentUser?.email || '';
  }

  getPlanLabel(): string {
    return this.currentUser?.plan?.plan ?? 'FREE';
  }

  get isPaidPlan(): boolean {
    const plan = this.currentUser?.plan?.plan;
    return plan === 'PRO' || plan === 'ENTERPRISE';
  }

  toggleUserDropdown(): void {
    this.userDropdownOpen = !this.userDropdownOpen;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elRef.nativeElement.contains(event.target)) {
      this.userDropdownOpen = false;
    }
  }

  logout(): void {
    this.authService.logout();
  }

  navigateToSubscription(): void {
    this.router.navigate(['/subscription']);
  }

  navigateToSettings(): void {
    this.router.navigate(['/settings']);
    this.userDropdownOpen = false;
  }
}
