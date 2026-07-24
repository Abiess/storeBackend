import { ApplicationConfig, APP_INITIALIZER, LOCALE_ID } from '@angular/core';
import { LUCIDE_ICONS, LucideIconProvider } from 'lucide-angular';
import {
  LayoutDashboard, Package, Star, Bot, Settings, Palette, Megaphone, Truck,
  Search, Tag, User, UserPlus, LogIn, CreditCard, ChartColumn, Smartphone,
  ShieldCheck, Gem, ChevronLeft, ChevronRight, ChevronDown, ArrowUpRight,
  ExternalLink, Check, CircleCheck, Store, X, ShoppingBag, MessageCircle,
  PlayCircle, Zap, Globe, Link2, Brain, Users, HardDrive, Lock,
  Bell, Crown, LogOut, Menu, Send, Rocket,
  // Bottom-Nav Icons
  House, ShoppingCart, LayoutGrid,
  // Category Icons for create-store-public (SHOP)
  Shirt, Pizza, Sparkles, Home,
  // Restaurant Icons
  UtensilsCrossed, Beef, Coffee, Flame, Fish, Salad, Cake,
  // Riad Icons
  Building, Wallet, Heart,
  // Supplier Invoice Icons
  FileText, Upload, Eye, Trash2, Download, RotateCw, ZoomIn, ZoomOut, CloudUpload
} from 'lucide-angular';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptorsFromDi, HTTP_INTERCEPTORS, HttpClient } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { registerLocaleData } from '@angular/common';
import localeDe from '@angular/common/locales/de';
import localeDeExtra from '@angular/common/locales/extra/de';
import localeAr from '@angular/common/locales/ar';
import localeArExtra from '@angular/common/locales/extra/ar';
import localeFr from '@angular/common/locales/fr';
import localeFrExtra from '@angular/common/locales/extra/fr';
import { routes } from './app.routes';
import { AuthInterceptor } from './core/interceptors/auth.interceptor';
import { ErrorInterceptor } from './core/interceptors/error.interceptor';
import {provideCouponService} from "@app/core/providers/coupon.provider";
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { TranslateHttpLoader, provideTranslateHttpLoader } from '@ngx-translate/http-loader';
import { importProvidersFrom } from '@angular/core';
import { LanguageService } from './core/services/language.service';
import { provideServiceWorker } from '@angular/service-worker';
import { isDevMode } from '@angular/core';

// Registriere Locales für DatePipe, CurrencyPipe etc.
registerLocaleData(localeDe, 'de-DE', localeDeExtra);
registerLocaleData(localeAr, 'ar-MA', localeArExtra);
registerLocaleData(localeFr, 'fr-FR', localeFrExtra);

// Language Initializer Factory
export function initializeLanguage(languageService: LanguageService) {
  return () => languageService.initialize();
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptorsFromDi()),
    provideAnimations(),
    provideCouponService(),
    // Lucide Icons – global für alle Standalone-Components
    {
      provide: LUCIDE_ICONS,
      multi: true,
      useValue: new LucideIconProvider({
        LayoutDashboard, Package, Star, Bot, Settings, Palette, Megaphone, Truck,
        Search, Tag, User, UserPlus, LogIn, CreditCard, ChartColumn, Smartphone,
        ShieldCheck, Gem, ChevronLeft, ChevronRight, ChevronDown, ArrowUpRight,
        ExternalLink, Check, CircleCheck, Store, X, ShoppingBag, MessageCircle,
        PlayCircle, Zap, Globe, Link2, Brain, Users, HardDrive, Lock,
        Bell, Crown, LogOut, Menu, Send, Rocket,
        // Bottom-Nav
        House, ShoppingCart, LayoutGrid,
        // Category Icons (SHOP)
        Shirt, Pizza, Sparkles, Home,
        // Restaurant Icons
        UtensilsCrossed, Beef, Coffee, Flame, Fish, Salad, Cake,
        // Riad Icons
        Building, Wallet, Heart,
        // Supplier Invoice Icons
        FileText, Upload, Eye, Trash2, Download, RotateCw, ZoomIn, ZoomOut, CloudUpload
      })
    },
    // Standard Locale (kann dynamisch überschrieben werden)
    { provide: LOCALE_ID, useValue: 'de-DE' },
    // ngx-translate Setup für Angular 17
    importProvidersFrom(
      TranslateModule.forRoot({
        fallbackLang: 'en', // ✅ Verwendet fallbackLang statt defaultLanguage (deprecated)
        loader: {
          provide: TranslateLoader,
          useClass: TranslateHttpLoader
        }
      })
    ),
    // Provide TranslateHttpLoader Config
    provideTranslateHttpLoader({
      prefix: './assets/i18n/',
      suffix: '.json'
    }),
    // APP_INITIALIZER für Language Detection
    {
      provide: APP_INITIALIZER,
      useFactory: initializeLanguage,
      deps: [LanguageService],
      multi: true
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: ErrorInterceptor,
      multi: true
    },
    // Service Worker (PWA) – nur aktiv im Production Build
    // Im Dev-Modus (ng serve) ist SW deaktiviert → kein Cache-Problem
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000'
    })
  ]
};
