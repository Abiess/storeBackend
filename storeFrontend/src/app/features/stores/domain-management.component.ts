import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Domain, DomainType } from '../../core/models';
import { DomainService } from '../../core/services/domain.service';
import { StoreService } from '../../core/services/store.service';
import { TranslatePipe } from '../../core/pipes/translate.pipe';
import { StoreNavigationComponent } from '../../shared/components/store-navigation.component';

@Component({
  selector: 'app-domain-management',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, StoreNavigationComponent],
  template: `
    <main class="domain-page">
      <app-store-navigation [currentPage]="'settings.domain.title' | translate"></app-store-navigation>
      <header class="page-header">
        <button type="button" class="back-button" (click)="goBack()">← {{ 'common.back' | translate }}</button>
        <h1>{{ 'domainManager.title' | translate }}</h1>
        <p>{{ 'domainManager.subtitle' | translate }}</p>
      </header>

      <section class="card">
        <h2>{{ 'domainManager.addTitle' | translate }}</h2>
        <p>{{ 'domainManager.addHelp' | translate }}</p>
        <form (ngSubmit)="addDomain()" class="add-form">
          <label for="custom-domain">{{ 'domainManager.domainLabel' | translate }}</label>
          <div class="input-row">
            <input id="custom-domain" name="customDomain" [(ngModel)]="host"
              [placeholder]="'domainManager.placeholder' | translate" autocomplete="url" required>
            <button type="submit" [disabled]="saving || !host.trim()">
              {{ saving ? ('common.saving' | translate) : ('domainManager.addButton' | translate) }}
            </button>
          </div>
        </form>
        <div class="error" *ngIf="error">{{ error | translate }}</div>
        <div class="success" *ngIf="success">{{ success | translate }}</div>
      </section>

      <section class="card">
        <h2>{{ 'domainManager.listTitle' | translate }}</h2>
        <p *ngIf="loading">{{ 'common.loading' | translate }}</p>
        <p *ngIf="!loading && domains.length === 0">{{ 'domainManager.empty' | translate }}</p>

        <article class="domain-card" *ngFor="let domain of domains">
          <div class="domain-heading">
            <div>
              <strong>{{ domain.host }}</strong>
              <span class="badge" [class.verified]="domain.isVerified">
                {{ domain.isVerified ? ('domainManager.verified' | translate) : ('domainManager.pending' | translate) }}
              </span>
              <span class="badge primary" *ngIf="domain.isPrimary">{{ 'domainManager.primary' | translate }}</span>
            </div>
            <div class="actions">
              <a class="open-domain" *ngIf="domain.isVerified" [href]="'https://' + domain.host" target="_blank" rel="noopener">
                {{ 'domainManager.openStore' | translate }}
              </a>
              <button type="button" *ngIf="domain.isVerified && !domain.isPrimary"
                [disabled]="busyDomainId === domain.id" (click)="makePrimary(domain)">
                {{ 'domainManager.makePrimary' | translate }}
              </button>
              <button type="button" class="danger" *ngIf="!domain.isPrimary" [disabled]="busyDomainId === domain.id"
                (click)="removeDomain(domain)">{{ 'common.delete' | translate }}</button>
            </div>
          </div>

          <div class="activation-note" *ngIf="domain.type === DomainType.CUSTOM && domain.isVerified">
            <strong>{{ 'domainManager.ownershipVerifiedTitle' | translate }}</strong>
            <p>{{ 'domainManager.activationNote' | translate }}</p>
          </div>

          <div class="instructions" *ngIf="domain.type === DomainType.CUSTOM && !domain.isVerified">
            <h3>{{ 'domainManager.instructionsTitle' | translate }}</h3>
            <ol>
              <li>{{ 'domainManager.dnsRouting' | translate }}</li>
              <li>{{ 'domainManager.dnsCnameTarget' | translate:{target: storeHostname} }}</li>
              <li>{{ 'domainManager.dnsTxtHelp' | translate }}</li>
              <li>{{ 'domainManager.dnsWait' | translate }}</li>
              <li>{{ 'domainManager.serverSetup' | translate }}</li>
            </ol>
            <ng-container *ngIf="getTxtRecord(domain) as record; else rawInstructions">
              <div class="record-field">
                <div>
                  <strong>{{ 'domainManager.txtNameShort' | translate }}</strong>
                  <code>{{ record.shortName }}</code>
                  <small>{{ 'domainManager.txtNameHelp' | translate }}</small>
                </div>
                <button type="button" class="copy-button" (click)="copyValue('name', record.shortName)">
                  {{ copiedField === 'name' ? ('domainManager.copied' | translate) : ('domainManager.copy' | translate) }}
                </button>
              </div>
              <div class="record-field secondary-field">
                <div>
                  <strong>{{ 'domainManager.txtNameFull' | translate }}</strong>
                  <code>{{ record.fullName }}</code>
                </div>
                <button type="button" class="copy-button secondary-button" (click)="copyValue('fullName', record.fullName)">
                  {{ copiedField === 'fullName' ? ('domainManager.copied' | translate) : ('domainManager.copy' | translate) }}
                </button>
              </div>
              <div class="record-field">
                <div>
                  <strong>{{ 'domainManager.txtValue' | translate }}</strong>
                  <code>{{ record.value }}</code>
                </div>
                <button type="button" class="copy-button" (click)="copyValue('value', record.value)">
                  {{ copiedField === 'value' ? ('domainManager.copied' | translate) : ('domainManager.copy' | translate) }}
                </button>
              </div>
            </ng-container>
            <ng-template #rawInstructions>
              <pre *ngIf="instructions[domain.id]">{{ instructions[domain.id] }}</pre>
            </ng-template>
            <div class="error" *ngIf="copyError">{{ copyError | translate }}</div>
            <button type="button" [disabled]="busyDomainId === domain.id" (click)="verify(domain)">
              {{ busyDomainId === domain.id ? ('domainManager.checking' | translate) : ('domainManager.verify' | translate) }}
            </button>
          </div>
        </article>
      </section>
    </main>
  `,
  styles: [`
    .domain-page{max-width:1040px;margin:0 auto;padding:24px;color:#172033}.page-header{margin:24px 0}.page-header h1{margin:12px 0 4px}.page-header p,.card>p{color:#5c667a}.back-button{border:0;background:none;color:#2454a6;padding:0;cursor:pointer}.card{background:#fff;border:1px solid #e0e5ed;border-radius:12px;padding:22px;margin:18px 0;box-shadow:0 2px 8px #1720330a}.card h2{margin:0 0 8px}.add-form label{display:block;font-weight:600;margin:16px 0 6px}.input-row{display:flex;gap:10px}.input-row input{flex:1;min-width:0;padding:11px;border:1px solid #c9d1df;border-radius:7px}.actions button,.input-row button,.instructions button{border:0;border-radius:7px;background:#2454a6;color:white;padding:10px 14px;cursor:pointer}.actions button:disabled,.input-row button:disabled,.instructions button:disabled{opacity:.55;cursor:wait}.domain-card{border-top:1px solid #e4e8ef;padding:17px 0}.domain-heading{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}.badge{display:inline-block;margin-left:8px;padding:4px 8px;border-radius:20px;background:#fff1d6;color:#805100;font-size:12px}.badge.verified{background:#def7e8;color:#176238}.badge.primary{background:#e8edff;color:#294a9b}.actions{display:flex;gap:8px}.actions .danger{background:#fff;color:#a42b36;border:1px solid #e2b7bb}.instructions{margin-top:14px;padding:15px;background:#f6f8fb;border-radius:8px}.instructions h3{margin:0 0 8px}.instructions li{margin:7px 0}.instructions pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#fff;border:1px solid #dce2eb;padding:12px;border-radius:7px;font-size:13px}.record-field{display:flex;justify-content:space-between;align-items:center;gap:12px;background:#fff;border:1px solid #dce2eb;border-radius:7px;padding:12px;margin:10px 0}.record-field>div{min-width:0;display:grid;gap:6px}.record-field code{overflow-wrap:anywhere;font-size:13px}.record-field small{color:#5c667a}.copy-button{flex-shrink:0;border:1px solid #2454a6!important;background:#fff!important;color:#2454a6!important}.secondary-field{background:#f9fafc}.secondary-button{border-color:#aeb8ca!important;color:#40516e!important}.activation-note{margin-top:12px;padding:12px 14px;background:#f6f8fb;border-left:3px solid #6882bd;border-radius:6px}.activation-note p{margin:5px 0 0;color:#5c667a}.error{margin-top:12px;color:#a42b36}.success{margin-top:12px;color:#176238}@media(max-width:600px){.domain-page{padding:16px}.card{padding:16px}.input-row{flex-direction:column}.actions{width:100%}.record-field{align-items:flex-start}.copy-button{padding:8px 10px!important}}
  `]
})
export class DomainManagementComponent implements OnInit {
  readonly DomainType = DomainType;
  storeId = 0;
  storeHostname = 'markt.ma';
  host = '';
  domains: Domain[] = [];
  instructions: Record<number, string> = {};
  copiedField = '';
  copyError = '';
  loading = true;
  saving = false;
  busyDomainId: number | null = null;
  error = '';
  success = '';

  constructor(private route: ActivatedRoute, private router: Router, private domainService: DomainService,
    private storeService: StoreService) {}

  ngOnInit(): void {
    this.storeId = Number(this.route.snapshot.paramMap.get('id'));
    this.storeService.getStoreById(this.storeId).subscribe({
      next: store => this.storeHostname = `${store.slug}.markt.ma`
    });
    this.loadDomains();
  }

  addDomain(): void {
    const normalizedHost = this.host.trim();
    if (!normalizedHost || this.saving) return;
    this.error = '';
    this.success = '';
    this.saving = true;
    this.domainService.createDomain(this.storeId, { host: normalizedHost, type: DomainType.CUSTOM }).subscribe({
      next: domain => {
        this.host = '';
        this.saving = false;
        this.success = 'domainManager.created';
        this.loadDomains();
        this.loadInstructions(domain.id);
      },
      error: err => {
        this.saving = false;
        this.error = err?.error?.message || 'domainManager.addError';
      }
    });
  }

  loadDomains(): void {
    this.loading = true;
    this.domainService.getDomains(this.storeId).subscribe({
      next: domains => {
        this.domains = domains;
        this.loading = false;
        domains.filter(domain => domain.type === DomainType.CUSTOM && !domain.isVerified)
          .forEach(domain => this.loadInstructions(domain.id));
      },
      error: () => {
        this.loading = false;
        this.error = 'domainManager.loadError';
      }
    });
  }

  loadInstructions(domainId: number): void {
    this.domainService.getVerificationInstructions(this.storeId, domainId).subscribe({
      next: text => this.instructions[domainId] = text,
      error: () => this.instructions[domainId] = 'domainManager.instructionsError'
    });
  }

  getTxtRecord(domain: Domain): { fullName: string; shortName: string; value: string } | null {
    const text = this.instructions[domain.id];
    if (!text) return null;
    const fullName = text.match(/^Name:\s*(.+)$/m)?.[1]?.trim();
    const value = text.match(/^Value:\s*(.+)$/m)?.[1]?.trim();
    if (!fullName || !value) return null;
    const suffix = `.${domain.host}`;
    const shortName = fullName.toLowerCase().endsWith(suffix.toLowerCase())
      ? fullName.slice(0, -suffix.length)
      : fullName;
    return { fullName, shortName, value };
  }

  async copyValue(field: string, value: string): Promise<void> {
    this.copyError = '';
    try {
      await navigator.clipboard.writeText(value);
      this.copiedField = field;
      window.setTimeout(() => {
        if (this.copiedField === field) this.copiedField = '';
      }, 1800);
    } catch {
      this.copyError = 'domainManager.copyError';
    }
  }

  verify(domain: Domain): void {
    this.error = '';
    this.busyDomainId = domain.id;
    this.domainService.verifyDomain(this.storeId, domain.id).subscribe({
      next: () => {
        this.success = 'domainManager.verifiedSuccess';
        this.busyDomainId = null;
        this.loadDomains();
      },
      error: () => {
        this.busyDomainId = null;
        this.error = 'domainManager.verifyError';
      }
    });
  }

  makePrimary(domain: Domain): void {
    this.busyDomainId = domain.id;
    this.domainService.setPrimaryDomain(this.storeId, domain.id).subscribe({
      next: () => { this.busyDomainId = null; this.loadDomains(); },
      error: () => { this.busyDomainId = null; this.error = 'domainManager.primaryError'; }
    });
  }

  removeDomain(domain: Domain): void {
    if (!window.confirm(`Remove domain ${domain.host}?`)) return;
    this.busyDomainId = domain.id;
    this.domainService.deleteDomain(this.storeId, domain.id).subscribe({
      next: () => { this.busyDomainId = null; this.loadDomains(); },
      error: () => { this.busyDomainId = null; this.error = 'domainManager.removeError'; }
    });
  }

  goBack(): void { this.router.navigate(['/stores', this.storeId, 'settings']); }
}
