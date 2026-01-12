import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  // Root-Route lädt abhängig von Subdomain entweder Storefront oder Landing
  {
    path: '',
    loadComponent: () => {
      // Prüfe ob Subdomain
      const hostname = window.location.hostname;
      const isSubdomain = hostname.endsWith('.markt.ma') &&
                         hostname !== 'markt.ma' &&
                         hostname !== 'www.markt.ma' &&
                         hostname !== 'api.markt.ma';

      console.log('🌐 Routing - Hostname:', hostname, 'isSubdomain:', isSubdomain);

      if (isSubdomain) {
        // Lade Storefront für Subdomains (ÖFFENTLICH)
        return import('./features/storefront/storefront-landing.component').then(m => m.StorefrontLandingComponent);
      } else {
        // Lade normale Landing Page für markt.ma
        return import('./features/landing/landing.component').then(m => m.LandingComponent);
      }
    }
  },

  // ==================== Auth Routes ====================
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'register',
    loadComponent: () => import('./features/auth/register.component').then(m => m.RegisterComponent)
  },

  // ==================== Dashboard ====================
  {
    path: 'dashboard',
    loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [authGuard]
  },

  // ==================== User Settings ====================
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
    path: 'role-management',
    loadComponent: () => import('./features/settings/role-management.component').then(m => m.RoleManagementComponent),
    canActivate: [authGuard]
  },

  // ==================== Store Management Routes ====================
  // Format: /stores/:id/...
  {
    path: 'stores/:id',
    loadComponent: () => import('./features/stores/store-detail.component').then(m => m.StoreDetailComponent),
    canActivate: [authGuard]
  },
  {
    path: 'stores/:id/settings',
    loadComponent: () => import('./features/stores/store-settings.component').then(m => m.StoreSettingsComponent),
    canActivate: [authGuard]
  },
  {
    path: 'stores/:id/orders',
    loadComponent: () => import('./features/stores/store-orders.component').then(m => m.StoreOrdersComponent),
    canActivate: [authGuard]
  },
  {
    path: 'stores/:id/theme',
    loadComponent: () => import('./features/stores/store-theme.component').then(m => m.StoreThemeComponent),
    canActivate: [authGuard]
  },

  // ==================== Product Management ====================
  // WICHTIG: Spezifische Routen (mit /new) müssen VOR allgemeinen Routen stehen!
  {
    path: 'stores/:id/products/new',
    loadComponent: () => import('./features/products/product-form.component').then(m => m.ProductFormComponent),
    canActivate: [authGuard]
  },
  {
    path: 'stores/:id/products/:productId/edit',
    loadComponent: () => import('./features/products/product-form.component').then(m => m.ProductFormComponent),
    canActivate: [authGuard]
  },
  {
    path: 'stores/:id/products',
    loadComponent: () => import('./features/products/product-list.component').then(m => m.ProductListComponent),
    canActivate: [authGuard]
  },

  // ==================== Category Management ====================
  // WICHTIG: Spezifische Routen (mit /new) müssen VOR allgemeinen Routen stehen!
  {
    path: 'stores/:id/categories/new',
    loadComponent: () => import('./features/products/category-form.component').then(m => m.CategoryFormComponent),
    canActivate: [authGuard]
  },
  {
    path: 'stores/:id/categories/:categoryId/edit',
    loadComponent: () => import('./features/products/category-form.component').then(m => m.CategoryFormComponent),
    canActivate: [authGuard]
  },
  {
    path: 'stores/:id/categories',
    loadComponent: () => import('./features/products/category-list.component').then(m => m.CategoryListComponent),
    canActivate: [authGuard]
  },

  // ==================== Coupon Management ====================
  // WICHTIG: Spezifische Routen müssen VOR allgemeinen Routen stehen!
  {
    path: 'stores/:id/coupons/:couponId',
    loadComponent: () => import('./features/coupons/coupon-editor/coupon-editor.component').then(m => m.CouponEditorComponent),
    canActivate: [authGuard]
  },
  {
    path: 'stores/:id/coupons',
    loadComponent: () => import('./features/coupons/coupons-list/coupons-list.component').then(m => m.CouponsListComponent),
    canActivate: [authGuard]
  },

  // ==================== SEO & Brand Management ====================
  {
    path: 'stores/:id/seo/redirects',
    loadComponent: () => import('./features/settings/redirects-page/redirects-page.component').then(m => m.RedirectsPageComponent),
    canActivate: [authGuard]
  },
  {
    path: 'stores/:id/seo/structured-data',
    loadComponent: () => import('./features/settings/structured-data-page/structured-data-page.component').then(m => m.StructuredDataPageComponent),
    canActivate: [authGuard]
  },
  {
    path: 'stores/:id/seo',
    loadComponent: () => import('./features/settings/seo-settings-page/seo-settings-page.component').then(m => m.SeoSettingsPageComponent),
    canActivate: [authGuard]
  },
  {
    path: 'stores/:id/brand',
    loadComponent: () => import('./features/settings/brand-onboarding/brand-onboarding.component').then(m => m.BrandOnboardingComponent),
    canActivate: [authGuard]
  },

  // ==================== Public Storefront Routes ====================
  {
    path: 'storefront-landing',
    loadComponent: () => import('./features/storefront/storefront-landing.component').then(m => m.StorefrontLandingComponent)
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

  // ==================== Demo Routes ====================
  {
    path: 'coupon-demo',
    loadComponent: () => import('./features/coupons/coupon-demo/coupon-demo.component').then(m => m.CouponDemoComponent)
  },
  {
    path: 'checkout-demo',
    loadComponent: () => import('./features/coupons/checkout-demo/checkout-demo.component').then(m => m.CheckoutDemoComponent)
  },
  {
    path: 'test-dashboard',
    loadComponent: () => import('./features/testing/test-dashboard.component').then(m => m.TestDashboardComponent)
  },

  // ==================== Legacy/Deprecated Routes (Redirects) ====================
  {
    path: 'storefront/:id',
    redirectTo: '/',
    pathMatch: 'full'
  },
  {
    path: 'frontend/:id',
    redirectTo: '/',
    pathMatch: 'full'
  },

  // ==================== Wildcard (404) ====================
  {
    path: '**',
    loadComponent: () => {
      const hostname = window.location.hostname;
      const isSubdomain = hostname.endsWith('.markt.ma') &&
                         hostname !== 'markt.ma' &&
                         hostname !== 'www.markt.ma' &&
                         hostname !== 'api.markt.ma';

      console.log('🌐 Wildcard Route (404) - Hostname:', hostname, 'isSubdomain:', isSubdomain);

      if (isSubdomain) {
        // Für Subdomains: Lade Storefront (öffentlich)
        return import('./features/storefront/storefront-landing.component').then(m => m.StorefrontLandingComponent);
      } else {
        // Für markt.ma: 404 Page oder Landing Page
        return import('./features/landing/landing.component').then(m => m.LandingComponent);
      }
    }
  }
];
