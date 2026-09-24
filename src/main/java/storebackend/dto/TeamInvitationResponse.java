package storebackend.dto;

/**
 * Response für Team-Einladung mit E-Mail-Status
 * 
 * Enthält sowohl die Einladungs-Daten als auch den echten E-Mail-Versandstatus,
 * damit die UI korrekt reagieren kann:
 * - emailSent=true  → "Einladung versendet" ✅
 * - emailSent=false → "Einladung erstellt, E-Mail fehlgeschlagen" ⚠️ + Resend-Button
 */
public record TeamInvitationResponse(
    TeamInvitationDTO invitation,
    boolean emailSent,
    String emailStatus,
    String emailErrorCode,
    boolean retryAllowed
) {}
