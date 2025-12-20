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
  // Explizite Route für Storefront Landing (falls direkt aufgerufen)
  {
    path: 'storefront-landing',
    loadComponent: () => import('./features/storefront/storefront-landing.component').then(m => m.StorefrontLandingComponent)
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
  // SEO Management Routes
  {
    path: 'admin/store/:storeId/seo',
    loadComponent: () => import('./features/settings/seo-settings-page/seo-settings-page.component').then(m => m.SeoSettingsPageComponent),
    //canActivate: [authGuard]
  },
  // Brand Kit Generator Route
  {
    path: 'admin/store/:storeId/brand',
    loadComponent: () => import('./features/settings/brand-onboarding/brand-onboarding.component').then(m => m.BrandOnboardingComponent),
    canActivate: [authGuard]
  },
  {
    path: 'admin/store/:storeId/seo/redirects',
    loadComponent: () => import('./features/settings/redirects-page/redirects-page.component').then(m => m.RedirectsPageComponent),
    canActivate: [authGuard]
  },
  {
    path: 'admin/store/:storeId/seo/structured-data',
    loadComponent: () => import('./features/settings/structured-data-page/structured-data-page.component').then(m => m.StructuredDataPageComponent),
    canActivate: [authGuard]
  },
  // Coupon Management Routes
  {
    path: 'dashboard/:storeId/coupons',
    loadComponent: () => import('./features/coupons/coupons-list/coupons-list.component').then(m => m.CouponsListComponent),
    canActivate: [authGuard]
  },
  {
    path: 'dashboard/:storeId/coupons/:id',
    loadComponent: () => import('./features/coupons/coupon-editor/coupon-editor.component').then(m => m.CouponEditorComponent),
    canActivate: [authGuard]
  },
  {
    path: 'coupon-demo',
    loadComponent: () => import('./features/coupons/coupon-demo/coupon-demo.component').then(m => m.CouponDemoComponent)
  },
  {
    path: 'checkout-demo',
    loadComponent: () => import('./features/coupons/checkout-demo/checkout-demo.component').then(m => m.CheckoutDemoComponent)
  },
  // Alte Storefront-Routen entfernt - nur noch Subdomain-Zugriff!
  // Benutzer sollten slug.markt.ma verwenden, nicht markt.ma/storefront/id

  // Fallback für alte Links - Redirect zur Subdomain
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
  // Warenkorb und Checkout bleiben öffentlich zugänglich
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
  // Wildcard Route - unterschiedliche Behandlung für Subdomains
  {
    path: '**',
    loadComponent: () => {
      const hostname = window.location.hostname;
      const isSubdomain = hostname.endsWith('.markt.ma') &&
                         hostname !== 'markt.ma' &&
                         hostname !== 'www.markt.ma' &&
                         hostname !== 'api.markt.ma';

      console.log('🌐 Wildcard Route - Hostname:', hostname, 'isSubdomain:', isSubdomain);

      if (isSubdomain) {
        // Für Subdomains: Lade Storefront (öffentlich)
        return import('./features/storefront/storefront-landing.component').then(m => m.StorefrontLandingComponent);
      } else {
        // Für markt.ma: Weiterleitung zum Dashboard würde Auth benötigen, also zur Landing Page
        return import('./features/landing/landing.component').then(m => m.LandingComponent);
      }
    }
  }
];
