import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { dashboardStoresRedirectGuard } from './core/guards/dashboard-stores-redirect.guard';

export const routes: Routes = [
  // ==================== Legal Pages (Public) ====================
  {
    path: 'impressum',
    loadComponent: () => import('./features/legal/impressum.component').then(m => m.ImpressumComponent)
  },
  {
    path: 'datenschutz',
    loadComponent: () => import('./features/legal/datenschutz.component').then(m => m.DatenschutzComponent)
  },
  {
    path: 'agb',
    loadComponent: () => import('./features/legal/agb.component').then(m => m.AgbComponent)
  },
  {
    path: 'kontakt',
    loadComponent: () => import('./features/legal/kontakt.component').then(m => m.KontaktComponent)
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
  {
    path: 'verify',
    loadComponent: () => import('./features/auth/email-verification.component').then(m => m.EmailVerificationComponent)
  },
  {
    path: 'forgot-password',
    loadComponent: () => import('./features/auth/forgot-password.component').then(m => m.ForgotPasswordComponent)
  },
  {
    path: 'reset-password',
    loadComponent: () => import('./features/auth/reset-password.component').then(m => m.ResetPasswordComponent)
  },
  // ── Schnellstart: Store ohne E-Mail-Registrierung (WhatsApp/Telegram-Auth) ──
  {
    path: 'quick-start',
    loadComponent: () => import('./features/auth/quick-start.component').then(m => m.QuickStartComponent)
    // KEIN authGuard – dieser Flow ist der Einstieg für neue Nutzer
  },
  // /create-store = öffentlich, kein Login erforderlich – nutzt das gemeinsame Store-Creation-UI
  {
    path: 'create-store',
    loadComponent: () => import('./features/stores/create-store-public.component').then(m => m.CreateStorePublicComponent)
    // KEIN authGuard – funktioniert mit public Endpoint für nicht-eingeloggte User
  },

  // ==================== Store Creation Wizard (für eingeloggte User) ====================
  {
    path: 'store-wizard',
    loadComponent: () => import('./features/stores/store-wizard.component').then(m => m.StoreWizardComponent),
    canActivate: [authGuard]
  },
  {
    path: 'store-success',
    loadComponent: () => import('./features/stores/store-success.component').then(m => m.StoreSuccessComponent),
    canActivate: [authGuard]
  },
  {
    path: 'store-success',
    loadComponent: () => import('./features/stores/store-success.component').then(m => m.StoreSuccessComponent),
    canActivate: [authGuard]
  },

  // ==================== Dashboard ====================
  {
    path: 'dashboard',
    loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [authGuard]
  },

  // DEACTIVATED: Choose Store Path - now directly to /create-store
  // {
  //   path: 'choose-path',
  //   loadComponent: () => import('./features/stores/choose-path.component').then(m => m.ChoosePathComponent),
  //   canActivate: [authGuard]
  // },


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

  // ==================== Dashboard Legacy Redirects ====================
  // Vorher existierten 24 doppelte Routen unter `/dashboard/stores/:storeId/...`,
  // die jeweils dieselbe Komponente luden wie `/stores/:id/...`. Das hatte zwei
  // Nachteile:
  //   1. Doppelter Code/Pflege-Aufwand bei jeder neuen Route.
  //   2. Inkonsistente UI: die globale Admin-Sidebar (Whitelist `/stores/`)
  //      erschien NUR bei der Primärvariante.
  //
  // Lösung: Eine einzige Wildcard-Route + Redirect-Guard, die jede
  // `/dashboard/stores/...`-URL inkl. Suffix, Query-Params und Fragment
  // auf die modernen `/stores/:id/...`-Routen umleitet.
  // Bestehende Bookmarks und externe Links funktionieren weiter, alle landen
  // auf der konsistenten Variante – inklusive Sidebar.
  //
  // WICHTIG: Diese Route muss VOR den primären `/stores/:id/...`-Routen
  // stehen, damit Angular sie bei `/dashboard/stores/...`-URLs zuerst matcht.
  {
    path: 'dashboard/stores',
    canActivate: [dashboardStoresRedirectGuard],
    // Dummy-Komponente wird nie geladen – Guard liefert vorher UrlTree zurück.
    children: [
      {
        path: '**',
        canActivate: [dashboardStoresRedirectGuard],
        loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
      }
    ]
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
    path: 'stores/:id/products/:productId',
    loadComponent: () => {
      console.log('✅ Route matched: stores/:id/products/:productId (detail)');
      return import('./features/products/product-detail.component').then(m => m.ProductDetailComponent);
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
    path: 'stores/:id/homepage-builder',
    loadComponent: () => import('./features/stores/homepage-builder.component').then(m => m.HomepageBuilderComponent),
    canActivate: [authGuard]
  },
  {
    path: 'stores/:id/orders/verification',
    loadComponent: () => import('./features/stores/order-verification-center.component').then(m => m.OrderVerificationCenterComponent),
    canActivate: [authGuard]
  },
  {
    path: 'stores/:id/orders/:orderId',
    loadComponent: () => {
      console.log('✅ Route matched: stores/:id/orders/:orderId (detail)');
      return import('./features/stores/order-detail-professional.component').then(m => m.OrderDetailProfessionalComponent);
    },
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
    path: 'stores/:id/onboarding',
    loadComponent: () => import('./features/stores/store-onboarding.component').then(m => m.StoreOnboardingComponent),
    canActivate: [authGuard]
  },

  // ==================== Delivery Management ====================
  {
    path: 'stores/:id/delivery',
    loadComponent: () => import('./features/delivery/delivery-management.component').then(m => m.DeliveryManagementComponent),
    canActivate: [authGuard]
  },

  // ==================== Platform Admin – Delivery Options ====================
  // Verwaltung globaler Lieferoptionen durch den Plattform-Admin.
  // Store-Manager sehen diese Seite NICHT (kein Sidebar-Eintrag).
  {
    path: 'platform/delivery',
    loadComponent: () => import('./features/delivery/platform-delivery.component').then(m => m.PlatformDeliveryComponent),
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

  // ==================== Reviews Management ====================
  {
    path: 'stores/:id/reviews',
    loadComponent: () => import('./features/stores/store-reviews-manager.component').then(m => m.StoreReviewsManagerComponent),
    canActivate: [authGuard]
  },

  // ==================== Chatbot Management ====================
  {
    path: 'stores/:id/chatbot',
    loadComponent: () => import('./components/chatbot-management/chatbot-management.component').then(m => m.ChatbotManagementComponent),
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

  // ==================== Promo Banner Settings ====================
  {
    path: 'stores/:id/banner',
    loadComponent: () => import('./features/settings/banner-settings/banner-settings.component').then(m => m.BannerSettingsComponent),
    canActivate: [authGuard]
  },

  // ==================== Telegram Integration ====================
  {
    path: 'stores/:id/telegram',
    loadComponent: () => import('./features/settings/telegram/telegram-page.component').then(m => m.TelegramPageComponent),
    canActivate: [authGuard]
  },

  // ==================== WooCommerce Import ====================
  {
    path: 'stores/:id/woocommerce',
    loadComponent: () => import('./features/settings/woocommerce/woocommerce-import.component').then(m => m.WooCommerceImportComponent),
    canActivate: [authGuard]
  },

  // ==================== Team & Rollen Management ====================
  {
    path: 'stores/:id/roles',
    loadComponent: () => import('./features/settings/store-role-management.component').then(m => m.StoreRoleManagementComponent),
    canActivate: [authGuard]
  },

  // ==================== Store Detail (Catch-All) ====================
  // WICHTIG: Diese Route MUSS nach ALLEN spezifischen /stores/:id/xxx-Routen stehen!
  // Sonst fängt sie alles ab und zeigt die Store-Übersicht statt der Unterseite.
  {
    path: 'stores/:id',
    loadComponent: () => import('./features/stores/store-detail.component').then(m => m.StoreDetailComponent),
    canActivate: [authGuard]
  },

  // ==================== Public Storefront Routes ====================
  {
    path: 'storefront-landing',
    loadComponent: () => import('./features/storefront/storefront-landing.component').then(m => m.StorefrontLandingComponent)
  },
  // ── Native App: Store via Slug öffnen (/s/:slug) ─────────────────────────
  // Für Capacitor (Android/iOS): Da es keine Subdomains gibt, wird der Store
  // über diesen Route-Parameter geöffnet (z.B. via Deep Link oder QR-Code).
  {
    path: 's/:slug',
    loadComponent: () => import('./features/storefront/storefront-landing.component').then(m => m.StorefrontLandingComponent)
  },
  // ── Öffentliche Produkt-Detailseite (Subdomain-Storefront) ──────────
  // Muss VOR dem Wildcard-Handler stehen, damit /products/:productId
  // nicht von ** abgefangen und als StorefrontLanding gerendert wird.
  {
    path: 'products/:productId',
    loadComponent: () => import('./features/storefront/storefront-product-detail.component')
      .then(m => m.StorefrontProductDetailComponent)
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

  // ==================== Customer Account Routes ====================
  {
    path: 'customer',
    loadComponent: () => import('./features/customer/customer-dashboard.component').then(m => m.CustomerDashboardComponent),
    canActivate: [authGuard]
  },
  {
    path: 'customer/orders',
    loadComponent: () => import('./features/customer/order-history.component').then(m => m.OrderHistoryComponent),
    canActivate: [authGuard]
  },
  {
    path: 'customer/wishlist',
    loadComponent: () => import('./features/customer/wishlist.component').then(m => m.WishlistComponent),
    canActivate: [authGuard]
  },
  {
    path: 'customer/saved-carts',
    loadComponent: () => import('./features/customer/saved-carts.component').then(m => m.SavedCartsComponent),
    canActivate: [authGuard]
  },
  {
    path: 'customer/addresses',
    loadComponent: () => import('./features/customer/address-book.component').then(m => m.AddressBookComponent),
    canActivate: [authGuard]
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
                         hostname !== 'api.markt.ma' &&
                         hostname !== 'grafana.markt.ma';

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
