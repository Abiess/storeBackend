import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/landing/landing.component').then(m => m.LandingComponent)
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
    path: 'subscription',
    loadComponent: () => import('./features/settings/subscription.component').then(m => m.SubscriptionComponent),
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
    path: 'stores/:storeId/theme',
    loadComponent: () => import('./features/settings/theme-customizer.component').then(m => m.ThemeCustomizerComponent),
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
    path: 'test-dashboard',
    loadComponent: () => import('./features/testing/test-dashboard.component').then(m => m.TestDashboardComponent)
  },
  {
    path: 'role-management',
    loadComponent: () => import('./features/settings/role-management.component').then(m => m.RoleManagementComponent)
  },
  {
    path: '**',
    redirectTo: '/dashboard'
  }
];
