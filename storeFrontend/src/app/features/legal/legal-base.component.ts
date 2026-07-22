import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { TranslatePipe } from '@ngx-translate/core';
import { PublicApiService } from '@app/core/services/public-api.service';
import { AuthService } from '@app/core/services/auth.service';
import { PublicStore } from '@app/core/models';
import { environment } from '@env/environment';
import { firstValueFrom } from 'rxjs';

/**
 * Base component for store-specific legal pages.
 * Provides common functionality for loading store data and checking ownership.
 */
@Component({
  standalone: true,
  imports: [CommonModule, TranslatePipe, RouterModule],
  template: ''
})
export abstract class LegalBaseComponent implements OnInit {
  store: PublicStore | null = null;
  loading = true;
  isOwner = false;

  protected abstract getContentField(): string | null | undefined;
  protected abstract getEmptyTitleKey(): string;
  protected abstract getEmptyTextKey(): string;

  constructor(
    protected publicApiService: PublicApiService,
    protected authService: AuthService,
    protected http: HttpClient,
    protected router: Router
  ) {}

  async ngOnInit() {
    try {
      const hostname = window.location.hostname;
      this.store = await firstValueFrom(this.publicApiService.resolveStore(hostname));
      await this.checkOwnership();
    } catch (error) {
      console.error('Failed to load store:', error);
    } finally {
      this.loading = false;
    }
  }

  private async checkOwnership() {
    const user = this.authService.currentUserValue;
    if (!user || !this.store) {
      this.isOwner = false;
      return;
    }

    try {
      await firstValueFrom(this.http.get(`${environment.apiUrl}/stores/${this.store.id}`));
      this.isOwner = true;
    } catch {
      this.isOwner = false;
    }
  }

  get hasContent(): boolean {
    const content = this.getContentField();
    return !!content && content.trim().length > 0;
  }

  navigateToSettings() {
    if (this.store) {
      this.router.navigate(['/stores', this.store.id, 'settings']);
    }
  }
}
