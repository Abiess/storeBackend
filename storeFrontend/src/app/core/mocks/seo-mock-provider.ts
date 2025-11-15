import { Provider } from '@angular/core';
import { SeoApiService } from '../services/seo-api.service';
import { MockSeoApiService } from './mock-seo-api.service';
import { SEO_MOCK_CONFIG } from './seo-mock-config';

/**
 * Provider factory for SEO API Service.
 * Returns MockSeoApiService if mock mode is enabled, otherwise real service.
 */
export function provideSeoApi(): Provider[] {
  const isMockEnabled = SEO_MOCK_CONFIG.enabled;

  if (isMockEnabled) {
    console.log('🎭 SEO Mock Mode ENABLED - Using mock data instead of backend');
    return [
      {
        provide: SeoApiService,
        useClass: MockSeoApiService
      }
    ];
  } else {
    console.log('🌐 SEO Mock Mode DISABLED - Using real backend API');
    return [SeoApiService];
  }
}

/**
 * Toggle mock mode at runtime (useful for development).
 */
export function toggleMockMode(): void {
  SEO_MOCK_CONFIG.enabled = !SEO_MOCK_CONFIG.enabled;
  console.log(`🎭 SEO Mock Mode ${SEO_MOCK_CONFIG.enabled ? 'ENABLED' : 'DISABLED'}`);
  window.location.reload();
}

/**
 * Set mock mode programmatically.
 */
export function setMockMode(enabled: boolean): void {
  SEO_MOCK_CONFIG.enabled = enabled;
  console.log(`🎭 SEO Mock Mode ${enabled ? 'ENABLED' : 'DISABLED'}`);
}

// Expose to window for easy testing in console
if (typeof window !== 'undefined') {
  (window as any).toggleSeoMockMode = toggleMockMode;
  (window as any).setSeoMockMode = setMockMode;
}
