import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SubscriptionService } from '@app/core/services/subscription';
import { Subscription } from '@app/core/models';
import { toDate } from '@app/core/utils/date.utils';

@Component({
    selector: 'app-subscription-overview',
    standalone: true,
    imports: [CommonModule],
    template: `
        <div class="subscription-card" *ngIf="subscription">
            <h2>Deine Subscription</h2>

            <div class="details">
                <p>
                    <strong>Plan:</strong> {{ subscription.plan }}
                </p>
                <p>
                    <strong>Status:</strong> {{ subscription.status }}
                </p>

                <!-- ✅ toDate() Helper konvertiert LocalDateTime → Date -->
                <p>
                    <strong>Gestartet am:</strong>
                    {{ formatDate(subscription.startDate) }}
                </p>

                <p *ngIf="subscription.renewalDate">
                    <strong>Nächste Verlängerung:</strong>
                    {{ formatDate(subscription.renewalDate) }}
                </p>

                <p *ngIf="subscription.endDate">
                    <strong>Endet am:</strong>
                    {{ formatDate(subscription.endDate) }}
                </p>
            </div>
        </div>
    `
})
export class SubscriptionOverviewComponent implements OnInit {
  subscription: Subscription | null = null;

  constructor(private subscriptionService: SubscriptionService) {}

  ngOnInit() {
    // ✅ Dates werden automatisch konvertiert im Service
    this.subscriptionService.getCurrentSubscription(1).subscribe(
      sub => {
        this.subscription = sub;

        // Backend sendet LocalDateTime als String, wir konvertieren mit toDate():
        console.log('Start Date:', sub?.startDate); // "2024-01-15T10:30:00"
        console.log('Konvertiert:', toDate(sub?.startDate)); // Date Object
      }
    );
  }

  /**
   * ✅ Helper-Methode: Konvertiert LocalDateTime-String zu formatiertem Datum
   * Nutzt toDate() aus date.utils für sichere Konvertierung
   */
  formatDate(dateValue: string | Date | null | undefined): string {
    if (!dateValue) return '-';
    
    const date = toDate(dateValue);
    if (!date) return '-';

    // Deutsches Format: dd.MM.yyyy HH:mm
    return new Intl.DateTimeFormat('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }
}

