import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { MaritimeVesselsResponse, MaritimeStatus, MaritimePort, MarineWeatherDto } from '../models';

/**
 * Maritime-Feature: Live-AIS-Schiffsdaten für Tanger Med, Nador, Casablanca.
 *
 * Liest ausschließlich die REST-Endpoints des Backends – der AISStream-API-Key
 * bleibt vollständig serverseitig, es gibt keine direkte Frontend↔AISStream-Verbindung.
 */
@Injectable({
  providedIn: 'root'
})
export class MaritimeService {
  constructor(private http: HttpClient) {}

  getVessels(): Observable<MaritimeVesselsResponse> {
    return this.http.get<MaritimeVesselsResponse>(`${environment.apiUrl}/maritime/vessels`);
  }

  getStatus(): Observable<MaritimeStatus> {
    return this.http.get<MaritimeStatus>(`${environment.apiUrl}/maritime/status`);
  }

  getPorts(): Observable<MaritimePort[]> {
    return this.http.get<MaritimePort[]>(`${environment.apiUrl}/maritime/ports`);
  }

  switchPort(port: string): Observable<MaritimeStatus> {
    return this.http.put<MaritimeStatus>(`${environment.apiUrl}/maritime/port`, { port });
  }

  /** Marine-Wetter (Open-Meteo, Backend-Cache) für den aktuell ausgewählten Hafen. Separater REST-Call, kein WebSocket. */
  getWeather(): Observable<MarineWeatherDto> {
    return this.http.get<MarineWeatherDto>(`${environment.apiUrl}/maritime/weather`);
  }
}
