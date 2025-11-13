import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/dashboard',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'register',
    loadComponent: () => import('./features/auth/register.component').then(m => m.RegisterComponent)
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [authGuard]
  },
  {
    path: 'settings',
    loadComponent: () => import('./features/settings/settings.component').then(m => m.SettingsComponent),
    canActivate: [authGuard]
  },
  {
    path: 'stores/:id',
    loadComponent: () => import('./features/stores/store-detail.component').then(m => m.StoreDetailComponent),
    canActivate: [authGuard]
  },
  {
    path: 'dashboard/stores/:storeId/products',
    loadComponent: () => import('./features/products/product-list.component').then(m => m.ProductListComponent),
    canActivate: [authGuard]
  },
  {
    path: 'dashboard/stores/:storeId/products/new',
    loadComponent: () => import('./features/products/product-form.component').then(m => m.ProductFormComponent),
    canActivate: [authGuard]
  },
  {
    path: 'dashboard/stores/:storeId/products/:id/edit',
    loadComponent: () => import('./features/products/product-form.component').then(m => m.ProductFormComponent),
    canActivate: [authGuard]
  },
  {
    path: 'dashboard/stores/:storeId/categories/new',
    loadComponent: () => import('./features/products/category-form.component').then(m => m.CategoryFormComponent),
    canActivate: [authGuard]
  },
  {
    path: 'dashboard/stores/:storeId/categories/:id/edit',
    loadComponent: () => import('./features/products/category-form.component').then(m => m.CategoryFormComponent),
    canActivate: [authGuard]
  },
  {
    path: 'storefront/:id',
    loadComponent: () => import('./features/storefront/storefront.component').then(m => m.StorefrontComponent)
  },
  {
    path: 'storefront',
    loadComponent: () => import('./features/storefront/storefront.component').then(m => m.StorefrontComponent)
  },
  {
    path: 'cart',
    loadComponent: () => import('./features/storefront/cart.component').then(m => m.CartComponent)
  },
  {
    path: 'checkout',
    loadComponent: () => import('./features/storefront/checkout.component').then(m => m.CheckoutComponent)
  },
  {
    path: 'order-confirmation',
    loadComponent: () => import('./features/storefront/order-confirmation.component').then(m => m.OrderConfirmationComponent)
  },
  {
    path: '**',
    redirectTo: '/dashboard'
  }
];
