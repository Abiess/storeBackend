import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { SubdomainService } from '../services/subdomain.service';
import { Observable } from 'rxjs';

/**
 * Guard der prüft ob die aktuelle Domain eine Storefront-Subdomain ist
 * Falls JA, erlaubt direkten Zugriff (für öffentliche Storefront)
 * Falls NEIN (normale markt.ma), erlaubt normalen Zugriff
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

    // Subdomain erkannt - erlaube Zugriff auf alles (öffentlich)
    if (info.isSubdomain) {
      console.log('✅ Subdomain erkannt - Öffentlicher Zugriff erlaubt');
      return true;
    }

    // Normale markt.ma Domain - normale Route
    return true;
  }
}
