import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '@env/environment';
import {
  DeliveryPartnerProfile,
  CreateDeliveryPartnerRequest,
  DeliveryPartnerReview,
  DeliveryPartnerStats,
  DeliveryPartnerFilter,
  MoroccoRegion
} from '../models/delivery.model';

/**
 * Service für den Delivery-Partner-Marktplatz.
 *
 * Ermöglicht es Lieferanten (Firma/Einzelperson), ein Portfolio anzulegen,
 * und Store-Betreibern, Partner zu finden, zu bewerten und zu beauftragen.
 *
 * Backend-Basis: /api/delivery-partners (plattformweit, nicht Store-gebunden)
 */
@Injectable({ providedIn: 'root' })
export class DeliveryPartnerService {
  private readonly API = `${environment.apiUrl}/delivery-partners`;

  private partnersSubject = new BehaviorSubject<DeliveryPartnerProfile[]>([]);
  public partners$ = this.partnersSubject.asObservable();

  constructor(private http: HttpClient) {}

  // ═══════════════════════════════════════════════════
  //  MARKETPLACE (öffentlich / alle User)
  // ═══════════════════════════════════════════════════

  /** Alle aktiven Partner laden (mit optionalem Filter) */
  searchPartners(filter?: DeliveryPartnerFilter): Observable<DeliveryPartnerProfile[]> {
    let params = new HttpParams();
    if (filter) {
      if (filter.region)        params = params.set('region', filter.region);
      if (filter.type)          params = params.set('type', filter.type);
      if (filter.service)       params = params.set('service', filter.service);
      if (filter.international != null) params = params.set('international', String(filter.international));
      if (filter.minRating)     params = params.set('minRating', String(filter.minRating));
      if (filter.verified != null) params = params.set('verified', String(filter.verified));
      if (filter.search)        params = params.set('search', filter.search);
    }
    return this.http.get<DeliveryPartnerProfile[]>(this.API, { params }).pipe(
      tap(partners => this.partnersSubject.next(partners))
    );
  }

  /** Einzelnes Partner-Profil laden */
  getPartner(partnerId: number): Observable<DeliveryPartnerProfile> {
    return this.http.get<DeliveryPartnerProfile>(`${this.API}/${partnerId}`);
  }

  /** Featured / Top-Partner laden */
  getFeaturedPartners(): Observable<DeliveryPartnerProfile[]> {
    return this.http.get<DeliveryPartnerProfile[]>(`${this.API}/featured`);
  }

  // ═══════════════════════════════════════════════════
  //  EIGENES PROFIL (eingeloggter Partner)
  // ═══════════════════════════════════════════════════

  /** Mein Profil laden */
  getMyProfile(): Observable<DeliveryPartnerProfile> {
    return this.http.get<DeliveryPartnerProfile>(`${this.API}/me`);
  }

  /** Profil anlegen */
  createProfile(request: CreateDeliveryPartnerRequest): Observable<DeliveryPartnerProfile> {
    return this.http.post<DeliveryPartnerProfile>(`${this.API}/me`, request);
  }

  /** Profil aktualisieren */
  updateProfile(request: Partial<CreateDeliveryPartnerRequest>): Observable<DeliveryPartnerProfile> {
    return this.http.put<DeliveryPartnerProfile>(`${this.API}/me`, request);
  }

  /** Profil de-/aktivieren */
  toggleActive(active: boolean): Observable<DeliveryPartnerProfile> {
    return this.http.patch<DeliveryPartnerProfile>(`${this.API}/me/status`, { active });
  }

  // ═══════════════════════════════════════════════════
  //  BEWERTUNGEN
  // ═══════════════════════════════════════════════════

  /** Bewertungen für einen Partner laden */
  getPartnerReviews(partnerId: number): Observable<DeliveryPartnerReview[]> {
    return this.http.get<DeliveryPartnerReview[]>(`${this.API}/${partnerId}/reviews`);
  }

  /** Statistiken eines Partners laden */
  getPartnerStats(partnerId: number): Observable<DeliveryPartnerStats> {
    return this.http.get<DeliveryPartnerStats>(`${this.API}/${partnerId}/stats`);
  }

  /** Bewertung abgeben (als Store-Besitzer) */
  createReview(partnerId: number, review: {
    rating: number;
    comment: string;
    reliability: number;
    speed: number;
    communication: number;
    priceQuality: number;
  }): Observable<DeliveryPartnerReview> {
    return this.http.post<DeliveryPartnerReview>(
      `${this.API}/${partnerId}/reviews`, review
    );
  }

  // ═══════════════════════════════════════════════════
  //  HELPERS
  // ═══════════════════════════════════════════════════

  /** Marokko-Regionen mit Klarnamen */
  static readonly MOROCCO_REGIONS: { code: MoroccoRegion; label: string }[] = [
    { code: 'CASABLANCA_SETTAT', label: 'Casablanca-Settat' },
    { code: 'RABAT_SALE_KENITRA', label: 'Rabat-Salé-Kénitra' },
    { code: 'MARRAKECH_SAFI', label: 'Marrakech-Safi' },
    { code: 'FES_MEKNES', label: 'Fès-Meknès' },
    { code: 'TANGER_TETOUAN_AL_HOCEIMA', label: 'Tanger-Tétouan-Al Hoceïma' },
    { code: 'ORIENTAL', label: 'Oriental' },
    { code: 'BENI_MELLAL_KHENIFRA', label: 'Béni Mellal-Khénifra' },
    { code: 'DRAA_TAFILALET', label: 'Drâa-Tafilalet' },
    { code: 'SOUSS_MASSA', label: 'Souss-Massa' },
    { code: 'GUELMIM_OUED_NOUN', label: 'Guelmim-Oued Noun' },
    { code: 'LAAYOUNE_SAKIA_EL_HAMRA', label: 'Laâyoune-Sakia El Hamra' },
    { code: 'DAKHLA_OUED_ED_DAHAB', label: 'Dakhla-Oued Ed-Dahab' }
  ];

  /** Service-Typen mit Labels */
  static readonly SERVICE_TYPES: { code: string; label: string; icon: string }[] = [
    { code: 'EXPRESS', label: 'Express-Lieferung', icon: '⚡' },
    { code: 'STANDARD', label: 'Standardversand', icon: '📦' },
    { code: 'COD', label: 'Nachnahme (Cash on Delivery)', icon: '💰' },
    { code: 'SAME_DAY', label: 'Same-Day Delivery', icon: '🏃' },
    { code: 'COLD_CHAIN', label: 'Kühlkette', icon: '❄️' },
    { code: 'FRAGILE', label: 'Zerbrechlich / Spezial', icon: '🔮' },
    { code: 'BULK', label: 'Großmengen / Paletten', icon: '🏗️' },
    { code: 'RETURN', label: 'Retouren-Service', icon: '🔄' }
  ];

  /** Fahrzeugtypen */
  static readonly VEHICLE_TYPES: { code: string; label: string; icon: string }[] = [
    { code: 'BICYCLE', label: 'Fahrrad', icon: '🚲' },
    { code: 'MOTORCYCLE', label: 'Motorrad', icon: '🏍️' },
    { code: 'CAR', label: 'PKW', icon: '🚗' },
    { code: 'VAN', label: 'Transporter', icon: '🚐' },
    { code: 'TRUCK', label: 'LKW', icon: '🚛' }
  ];
}

