import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
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

  // ==================== Dashboard Routes (Legacy Support) ====================
  // WICHTIG: Diese müssen VOR den primären Store-Routen stehen!
  // Diese Routen unterstützen alte Links mit /dashboard/ Prefix
  {
    path: 'dashboard/stores/:storeId',
    loadComponent: () => import('./features/stores/store-detail.component').then(m => m.StoreDetailComponent),
    canActivate: [authGuard]
  },
  {
    path: 'dashboard/stores/:storeId/settings',
    loadComponent: () => import('./features/stores/store-settings.component').then(m => m.StoreSettingsComponent),
    canActivate: [authGuard]
  },
  {
    path: 'dashboard/stores/:storeId/orders',
    loadComponent: () => {
      console.log('✅ Route matched: dashboard/stores/:storeId/orders');
      return import('./features/stores/store-orders.component').then(m => m.StoreOrdersComponent);
    },
    canActivate: [authGuard]
  },
  {
    path: 'dashboard/stores/:storeId/theme',
    loadComponent: () => import('./features/stores/store-theme.component').then(m => m.StoreThemeComponent),
    canActivate: [authGuard]
  },
  {
    path: 'dashboard/stores/:storeId/products/new',
    loadComponent: () => {
      console.log('✅ Route matched: dashboard/stores/:storeId/products/new');
      return import('./features/products/product-form.component').then(m => m.ProductFormComponent);
    },
    canActivate: [authGuard]
  },
  {
    path: 'dashboard/stores/:storeId/products/:productId/edit',
    loadComponent: () => import('./features/products/product-form.component').then(m => m.ProductFormComponent),
    canActivate: [authGuard]
  },
  {
    path: 'dashboard/stores/:storeId/products',
    loadComponent: () => import('./features/products/product-list.component').then(m => m.ProductListComponent),
    canActivate: [authGuard]
  },
  {
    path: 'dashboard/stores/:storeId/categories/new',
    loadComponent: () => {
      console.log('✅ Route matched: dashboard/stores/:storeId/categories/new');
      return import('./features/products/category-form.component').then(m => m.CategoryFormComponent);
    },
    canActivate: [authGuard]
  },
  {
    path: 'dashboard/stores/:storeId/categories/:categoryId/edit',
    loadComponent: () => import('./features/products/category-form.component').then(m => m.CategoryFormComponent),
    canActivate: [authGuard]
  },
  {
    path: 'dashboard/stores/:storeId/categories',
    loadComponent: () => import('./features/products/category-list.component').then(m => m.CategoryListComponent),
    canActivate: [authGuard]
  },
  {
    path: 'dashboard/stores/:storeId/coupons',
    loadComponent: () => import('./features/coupons/coupons-list/coupons-list.component').then(m => m.CouponsListComponent),
    canActivate: [authGuard]
  },
  {
    path: 'dashboard/stores/:storeId/coupons/:couponId',
    loadComponent: () => import('./features/coupons/coupon-editor/coupon-editor.component').then(m => m.CouponEditorComponent),
    canActivate: [authGuard]
  },
  {
    path: 'dashboard/stores/:storeId/seo/redirects',
    loadComponent: () => import('./features/settings/redirects-page/redirects-page.component').then(m => m.RedirectsPageComponent),
    canActivate: [authGuard]
  },
  {
    path: 'dashboard/stores/:storeId/seo/structured-data',
    loadComponent: () => import('./features/settings/structured-data-page/structured-data-page.component').then(m => m.StructuredDataPageComponent),
    canActivate: [authGuard]
  },
  {
    path: 'dashboard/stores/:storeId/seo',
    loadComponent: () => import('./features/settings/seo-settings-page/seo-settings-page.component').then(m => m.SeoSettingsPageComponent),
    canActivate: [authGuard]
  },
  {
    path: 'dashboard/stores/:storeId/brand',
    loadComponent: () => import('./features/settings/brand-onboarding/brand-onboarding.component').then(m => m.BrandOnboardingComponent),
    canActivate: [authGuard]
  },

  // ==================== Product Management (Primary Routes) ====================
  // WICHTIG: Spezifische Routen (mit /new) müssen VOR allgemeinen Routen stehen!
  {
    path: 'stores/:id/products/new',
    loadComponent: () => {
      console.log('✅ Route matched: stores/:id/products/new');
      return import('./features/products/product-form.component').then(m => m.ProductFormComponent);
    },
    canActivate: [authGuard]
  },
  {
    path: 'stores/:id/products/:productId/edit',
    loadComponent: () => {
      console.log('✅ Route matched: stores/:id/products/:productId/edit');
      return import('./features/products/product-form.component').then(m => m.ProductFormComponent);
    },
    canActivate: [authGuard]
  },
  {
    path: 'stores/:id/products',
    loadComponent: () => {
      console.log('✅ Route matched: stores/:id/products');
      return import('./features/products/product-list.component').then(m => m.ProductListComponent);
    },
    canActivate: [authGuard]
  },

  // ==================== Category Management (Primary Routes) ====================
  // WICHTIG: Spezifische Routen (mit /new) müssen VOR allgemeinen Routen stehen!
  {
    path: 'stores/:id/categories/new',
    loadComponent: () => {
      console.log('✅ Route matched: stores/:id/categories/new');
      return import('./features/products/category-form.component').then(m => m.CategoryFormComponent);
    },
    canActivate: [authGuard]
  },
  {
    path: 'stores/:id/categories/:categoryId/edit',
    loadComponent: () => {
      console.log('✅ Route matched: stores/:id/categories/:categoryId/edit');
      return import('./features/products/category-form.component').then(m => m.CategoryFormComponent);
    },
    canActivate: [authGuard]
  },
  {
    path: 'stores/:id/categories',
    loadComponent: () => {
      console.log('✅ Route matched: stores/:id/categories');
      return import('./features/products/category-list.component').then(m => m.CategoryListComponent);
    },
    canActivate: [authGuard]
  },

  // ==================== Store Management Routes ====================
  // Format: /stores/:id/...
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
  {
    path: 'stores/:id',
    loadComponent: () => import('./features/stores/store-detail.component').then(m => m.StoreDetailComponent),
    canActivate: [authGuard]
  },

  // ==================== Coupon Management ====================
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
    path: 'storefront/profile',
    loadComponent: () => import('./features/storefront/customer-profile.component').then(m => m.CustomerProfileComponent),
    canActivate: [authGuard]
  },
  {
    path: 'storefront/order-confirmation',
    loadComponent: () => import('./features/storefront/order-confirmation.component').then(m => m.OrderConfirmationComponent)
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

  // ==================== Root Route ====================
  // MUSS am Ende stehen, sonst matched es alles!
  {
    path: '',
    loadComponent: () => {
      const hostname = window.location.hostname;
      const isSubdomain = hostname.endsWith('.markt.ma') &&
                         hostname !== 'markt.ma' &&
                         hostname !== 'www.markt.ma' &&
                         hostname !== 'api.markt.ma';

      console.log('🌐 Root Route - Hostname:', hostname, 'isSubdomain:', isSubdomain);

      if (isSubdomain) {
        return import('./features/storefront/storefront-landing.component').then(m => m.StorefrontLandingComponent);
      } else {
        return import('./features/landing/landing.component').then(m => m.LandingComponent);
      }
    }
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
      const path = window.location.pathname;
      const isSubdomain = hostname.endsWith('.markt.ma') &&
                         hostname !== 'markt.ma' &&
                         hostname !== 'www.markt.ma' &&
                         hostname !== 'api.markt.ma';

      console.log('❌ Wildcard Route (404) - Path:', path, 'Hostname:', hostname, 'isSubdomain:', isSubdomain);

      if (isSubdomain) {
        return import('./features/storefront/storefront-landing.component').then(m => m.StorefrontLandingComponent);
      } else {
        return import('./features/landing/landing.component').then(m => m.LandingComponent);
      }
    }
  }
];
