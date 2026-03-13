import { Routes } from '@angular/router';
import { DeliveryManagementComponent } from './delivery-management.component';

export const deliveryRoutes: Routes = [
  {
    path: '',
    component: DeliveryManagementComponent
  }
];
// Export all delivery models
export * from '../../core/models/delivery.model';

