import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { TeamInvitation, TeamInvitationResponse, CreateTeamInvitationRequest } from '../models';

@Injectable({
  providedIn: 'root'
})
export class TeamInvitationService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  createInvitation(
    storeId: number,
    request: CreateTeamInvitationRequest
  ): Observable<TeamInvitationResponse> {
    return this.http.post<TeamInvitationResponse>(
      `${this.apiUrl}/stores/${storeId}/team-invitations`,
      request
    );
  }

  getInvitations(storeId: number): Observable<TeamInvitation[]> {
    return this.http.get<TeamInvitation[]>(
      `${this.apiUrl}/stores/${storeId}/team-invitations`
    );
  }

  revokeInvitation(storeId: number, invitationId: number): Observable<void> {
    return this.http.post<void>(
      `${this.apiUrl}/stores/${storeId}/team-invitations/${invitationId}/revoke`,
      {}
    );
  }

  resendInvitation(storeId: number, invitationId: number): Observable<TeamInvitationResponse> {
    return this.http.post<TeamInvitationResponse>(
      `${this.apiUrl}/stores/${storeId}/team-invitations/${invitationId}/resend`,
      {}
    );
  }

  acceptInvitation(token: string): Observable<{ success: boolean; message: string; storeId: number }> {
    return this.http.post<{ success: boolean; message: string; storeId: number }>(
      `${this.apiUrl}/team-invitations/accept`,
      { token }
    );
  }

  getInvitationPreview(token: string): Observable<{ email: string; emailMasked: string; storeName: string; role: string; expiresAt: string }> {
    return this.http.get<{ email: string; emailMasked: string; storeName: string; role: string; expiresAt: string }>(
      `${this.apiUrl}/team-invitations/preview`,
      { params: { token } }
    );
  }
}
