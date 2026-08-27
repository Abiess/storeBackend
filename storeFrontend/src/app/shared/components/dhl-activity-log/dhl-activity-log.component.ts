import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@app/core/pipes/translate.pipe';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import {
  DhlActivityLogService,
  DhlActivityLog,
  DhlActivityLogPage
} from '@app/core/services/dhl-activity-log.service';

@Component({
  selector: 'app-dhl-activity-log',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './dhl-activity-log.component.html',
  styleUrls: ['./dhl-activity-log.component.scss']
})
export class DhlActivityLogComponent implements OnInit, OnDestroy {
  @Input() storeId!: number;

  loading = false;
  activities: DhlActivityLog[] = [];
  currentPage = 0;
  pageSize = 20;
  totalElements = 0;
  totalPages = 0;

  filterToday = false;
  filterAction = '';
  filterUserId: number | null = null;
  availableUsers: Array<{ userId: number; email: string }> = [];

  private destroy$ = new Subject<void>();

  constructor(private activityLogService: DhlActivityLogService) {}

  ngOnInit() {
    this.loadActivities();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadActivities() {
    if (!this.storeId) return;

    this.loading = true;

    this.activityLogService
      .getActivityLog(
        this.storeId,
        this.currentPage,
        this.pageSize,
        this.filterToday || undefined,
        this.filterAction || undefined,
        this.filterUserId || undefined
      )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (page: DhlActivityLogPage) => {
          this.activities = page.content;
          this.totalElements = page.totalElements;
          this.totalPages = page.totalPages;
          this.currentPage = page.number;
          this.loading = false;
          this.extractAvailableUsers();
        },
        error: (err: Error) => {
          console.error('Failed to load DHL activity log', err);
          this.loading = false;
          this.activities = [];
        }
      });
  }

  extractAvailableUsers() {
    const userMap = new Map<number, string>();
    this.activities.forEach(activity => {
      if (!userMap.has(activity.userId)) {
        userMap.set(activity.userId, activity.userEmail);
      }
    });
    this.availableUsers = Array.from(userMap.entries())
      .map(([userId, email]) => ({ userId, email }))
      .sort((a, b) => a.email.localeCompare(b.email));
  }

  onFilterChange() {
    this.currentPage = 0;
    this.loadActivities();
  }

  previousPage() {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.loadActivities();
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages - 1) {
      this.currentPage++;
      this.loadActivities();
    }
  }

  formatTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  formatTrackingCode(code: string): string {
    return code.length <= 12 ? code : code.substring(0, 12) + '...';
  }

  formatDuration(ms: number | null | undefined): string {
    if (!ms) return '—';
    const seconds = ms / 1000;
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')} min`;
  }

  getActionBadgeClass(action: string): string {
    const classMap: Record<string, string> = {
      'STORED': 'status-active',
      'FOUND': 'status-processing',
      'PICKED_UP': 'status-shipped',
      'SCAN_FAILED': 'status-archived',
      'MANUAL_SEARCH': 'status-draft'
    };
    return classMap[action] || 'status-draft';
  }

  getActionIcon(action: string): string {
    const iconMap: Record<string, string> = {
      'STORED': '📦',
      'FOUND': '🔍',
      'PICKED_UP': '✅',
      'SCAN_FAILED': '❌',
      'MANUAL_SEARCH': '🔎'
    };
    return iconMap[action] || '•';
  }

  getActionLabel(action: string): string {
    return `dhl.action.${action.toLowerCase().replace('_', '')}`;
  }
}
