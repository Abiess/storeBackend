import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { SubdomainService } from '../services/subdomain.service';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Guard der prüft ob die aktuelle Domain eine Storefront-Subdomain ist
 * Falls ja, wird zur Storefront-Landing-Page weitergeleitet
 */
@Injectable({
  providedIn: 'root'
})
export class SubdomainRedirectGuard implements CanActivate {
  constructor(
    private subdomainService: SubdomainService,
    private router: Router
  ) {}

  canActivate(): Observable<boolean | UrlTree> | boolean {
    const info = this.subdomainService.detectSubdomain();

    console.log('🔒 Subdomain Guard - Info:', info);

    // Wenn es eine Subdomain ist, zur Storefront-Landing weiterleiten
    if (info.isSubdomain) {
      console.log('✅ Subdomain erkannt - Leite zur Storefront weiter');
      return this.router.parseUrl('/storefront-landing');
    }

    // Normale markt.ma Domain - Zugriff erlaubt
    return true;
  }
}

