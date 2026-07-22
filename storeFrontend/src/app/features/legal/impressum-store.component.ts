import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { LegalBaseComponent } from './legal-base.component';

@Component({
  selector: 'app-impressum-store',
  standalone: true,
  imports: [CommonModule, TranslatePipe, RouterModule],
  template: `<div class="legal-page"><h1>Impressum (Store-specific)</h1></div>`,
  styles: [`h1 { text-align: center; padding: 100px 20px; }`]
})
export class ImpressumStoreComponent extends LegalBaseComponent {
  protected getContentField() { return this.store?.legalName && this.store?.address && this.store?.contactEmail ? 'ok' : null; }
  protected getEmptyTitleKey() { return 'legal.impressum.notConfigured'; }
  protected getEmptyTextKey() { return 'legal.impressum.notConfiguredDesc'; }
}
