import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { TranslatePipe } from '@app/core/pipes/translate.pipe';
import { StoreCustomerAccountCreated, StoreCustomerAccountService } from '@app/core/services/store-customer-account.service';
import { StoreService } from '@app/core/services/store.service';

@Component({
  selector: 'app-store-customer-accounts',
  imports: [CommonModule, ReactiveFormsModule, RouterModule, TranslatePipe],
  template: `
    <main class="customer-accounts-page">
      <header class="page-heading">
        <div>
          <h1>{{ 'adminCustomerAccounts.title' | translate }}</h1>
          <p>{{ 'adminCustomerAccounts.subtitle' | translate }}</p>
        </div>
      </header>

      <p class="status-message" *ngIf="loadingStore">{{ 'common.loading' | translate }}</p>
      <section class="setup-notice" *ngIf="!loadingStore && !inviteOnlyEnabled">
        <p>{{ 'adminCustomerAccounts.inviteOnlyRequired' | translate }}</p>
        <a [routerLink]="['/stores', storeId, 'settings']">{{ 'adminCustomerAccounts.settingsLink' | translate }}</a>
      </section>

      <section class="account-card" *ngIf="!loadingStore && inviteOnlyEnabled">
        <form [formGroup]="form" (ngSubmit)="createAccount()">
          <label for="customerName">{{ 'adminCustomerAccounts.name' | translate }}</label>
          <input id="customerName" formControlName="name" autocomplete="name" maxlength="150" />

          <label for="customerPhone">{{ 'adminCustomerAccounts.phone' | translate }}</label>
          <input id="customerPhone" formControlName="phone" type="tel" autocomplete="tel" maxlength="30" />
          <small>{{ 'adminCustomerAccounts.phoneHint' | translate }}</small>

          <label for="customerPassword">{{ 'adminCustomerAccounts.password' | translate }}</label>
          <input id="customerPassword" formControlName="password" type="password" autocomplete="new-password" />
          <small>{{ 'adminCustomerAccounts.passwordHint' | translate }}</small>

          <p class="error-message" *ngIf="errorMessage" role="alert">{{ errorMessage | translate }}</p>
          <button type="submit" [disabled]="form.invalid || creating">
            {{ creating ? ('common.loading' | translate) : ('adminCustomerAccounts.create' | translate) }}
          </button>
        </form>
      </section>

      <section class="created-card" *ngIf="createdAccount as account" aria-live="polite">
        <h2>{{ 'adminCustomerAccounts.createdTitle' | translate }}</h2>
        <p>{{ 'adminCustomerAccounts.shareHint' | translate }}</p>
        <dl>
          <dt>{{ 'adminCustomerAccounts.loginId' | translate }}</dt><dd>{{ account.loginId }}</dd>
          <dt>{{ 'adminCustomerAccounts.name' | translate }}</dt><dd>{{ account.name }}</dd>
          <dt>{{ 'adminCustomerAccounts.phone' | translate }}</dt><dd>{{ account.phone || '—' }}</dd>
          <dt>{{ 'adminCustomerAccounts.password' | translate }}</dt><dd>{{ createdPassword }}</dd>
        </dl>
        <button type="button" class="copy-button" (click)="copyCredentials()">
          {{ copied ? ('adminCustomerAccounts.copied' | translate) : ('adminCustomerAccounts.copy' | translate) }}
        </button>
      </section>
    </main>
  `,
  styles: [`
    :host { display: block; }
    .customer-accounts-page { max-width: 56rem; margin: 0 auto; padding: 1.5rem; color: #1f2937; }
    .page-heading { margin-bottom: 1.5rem; }
    .page-heading h1 { margin: 0 0 .35rem; font-size: 1.65rem; }
    .page-heading p, .account-card small, .created-card p { color: #64748b; }
    .account-card, .created-card, .setup-notice { padding: 1.5rem; border: 1px solid #e2e8f0; border-radius: .8rem; background: #fff; }
    form { display: grid; gap: .55rem; }
    label { margin-top: .45rem; font-weight: 600; }
    input { box-sizing: border-box; width: 100%; min-height: 2.8rem; padding: .65rem .75rem; border: 1px solid #cbd5e1; border-radius: .45rem; font: inherit; }
    button { min-height: 2.8rem; margin-top: .75rem; padding: .6rem 1rem; border: 0; border-radius: .45rem; background: #4f46e5; color: #fff; font: inherit; font-weight: 600; cursor: pointer; }
    button:disabled { opacity: .55; cursor: not-allowed; }
    .created-card { margin-top: 1.25rem; border-color: #86efac; background: #f0fdf4; }
    .created-card h2 { margin-top: 0; }
    dl { display: grid; grid-template-columns: minmax(8rem, 1fr) 2fr; gap: .5rem 1rem; margin: 1rem 0; }
    dt { color: #64748b; } dd { margin: 0; overflow-wrap: anywhere; font-weight: 600; }
    .copy-button { background: #166534; }
    .error-message { color: #b91c1c; margin: .5rem 0; }
    .setup-notice a { color: #4338ca; font-weight: 600; }
    @media (max-width: 540px) { .customer-accounts-page { padding: 1rem; } dl { grid-template-columns: 1fr; gap: .15rem; } dd { margin-bottom: .6rem; } }
  `]
})
export class StoreCustomerAccountsComponent implements OnInit {
  storeId = 0;
  form: FormGroup;
  loadingStore = true;
  inviteOnlyEnabled = false;
  creating = false;
  errorMessage = '';
  createdAccount: StoreCustomerAccountCreated | null = null;
  createdPassword = '';
  copied = false;

  constructor(
    private route: ActivatedRoute,
    private formBuilder: FormBuilder,
    private storeService: StoreService,
    private accountService: StoreCustomerAccountService
  ) {
    this.storeId = Number(this.route.snapshot.paramMap.get('id'));
    this.form = this.formBuilder.group({
      name: ['', [Validators.required, Validators.maxLength(150)]],
      phone: ['', Validators.maxLength(30)],
      password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(72)]]
    });
  }

  ngOnInit(): void {
    this.storeService.getStoreById(this.storeId).subscribe({
      next: store => {
        this.inviteOnlyEnabled = store.customerAccountMode === 'INVITE_ONLY';
        this.loadingStore = false;
      },
      error: () => { this.loadingStore = false; }
    });
  }

  createAccount(): void {
    if (!this.inviteOnlyEnabled || this.form.invalid) return;
    const values = this.form.getRawValue();
    const password = values.password ?? '';
    this.creating = true;
    this.errorMessage = '';
    this.createdAccount = null;
    this.copied = false;
    this.accountService.create(this.storeId, {
      name: (values.name ?? '').trim(),
      phone: (values.phone ?? '').trim() || undefined,
      password
    }).subscribe({
      next: account => {
        this.createdAccount = account;
        this.createdPassword = password;
        this.form.reset();
        this.creating = false;
      },
      error: error => {
        this.errorMessage = error?.error?.message || 'adminCustomerAccounts.createError';
        this.creating = false;
      }
    });
  }

  async copyCredentials(): Promise<void> {
    if (!this.createdAccount) return;
    const text = [
      `${this.createdAccount.loginId}`,
      this.createdAccount.phone || '',
      this.createdPassword
    ].filter(Boolean).join('\n');
    try {
      await navigator.clipboard.writeText(text);
      this.copied = true;
    } catch {
      this.errorMessage = 'adminCustomerAccounts.copyError';
    }
  }
}
