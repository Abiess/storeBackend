import { Component, OnInit } from '@angular/core';
import { SubscriptionService } from '@core/services/subscription.service';
import { Subscription } from '@core/models';

@Component({
  selector: 'app-subscription-overview',
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
        
        <!-- ✅ DatePipe funktioniert jetzt! -->
        <p>
          <strong>Gestartet am:</strong> 
          {{ subscription.startDate | date:'dd.MM.yyyy HH:mm' }}
        </p>
        
        <p *ngIf="subscription.renewalDate">
          <strong>Nächste Verlängerung:</strong> 
          {{ subscription.renewalDate | date:'dd.MM.yyyy' }}
        </p>
        
        <p *ngIf="subscription.endDate">
          <strong>Endet am:</strong> 
          {{ subscription.endDate | date:'medium' }}
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

        // Jetzt sind es echte Date-Objekte:
        console.log(sub?.startDate); // Date Object
        console.log(sub?.renewalDate instanceof Date); // true
      }
    );
  }
}

