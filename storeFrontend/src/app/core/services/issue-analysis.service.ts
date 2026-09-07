import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { IssueImageAnalysisResult } from '../models';

/**
 * TEMP: Client für den isolierten Test-Endpoint POST /api/test/issue-analysis.
 * Kein Business-Feature – dient nur der Machbarkeitsprüfung der OpenRouter-Vision-Analyse.
 */
@Injectable({
  providedIn: 'root'
})
export class IssueAnalysisService {
  constructor(private http: HttpClient) {}

  analyzeIssueImage(imageFile: File, language: string = 'de'): Observable<IssueImageAnalysisResult> {
    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('language', language);
    return this.http.post<IssueImageAnalysisResult>(`${environment.apiUrl}/test/issue-analysis`, formData);
  }
}
