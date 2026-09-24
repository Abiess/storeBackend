package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

/**
 * Response nach erfolgreicher Registrierung.
 * 
 * WICHTIG: Enthält KEINEN JWT-Token, da der Benutzer seine E-Mail
 * erst bestätigen muss bevor er sich anmelden kann.
 * 
 * NEU: Enthält Email-Versandstatus damit Frontend korrekt reagieren kann
 * 
 * Verwendung:
 * - registrationSuccessful: true wenn Benutzer angelegt wurde
 * - emailVerificationRequired: true um Frontend zu signalisieren dass Email-Bestätigung nötig ist
 * - emailSent: true wenn Bestätigungs-E-Mail erfolgreich versendet wurde
 * - emailStatus: Status des E-Mail-Versands (SENT, TEMPORARILY_FAILED, PERMANENTLY_FAILED)
 * - emailErrorCode: Fehlercode bei Versandfehler (z.B. "SMTP_DAILY_LIMIT")
 * - email: Die registrierte E-Mail-Adresse (kann maskiert werden: te***@example.com)
 * - message: Benutzerfreundliche Nachricht
 * - retryAllowed: Kann User "E-Mail erneut senden"?
 */
@Data
@AllArgsConstructor
public class RegistrationResponse {
    private boolean registrationSuccessful;
    private boolean emailVerificationRequired;
    private boolean emailSent;
    private String emailStatus;
    private String emailErrorCode;
    private String email;
    private String message;
    private boolean retryAllowed;
    
    /**
     * Standard-Response: Registrierung erfolgreich, Verifizierung erforderlich, Email versendet
     */
    public static RegistrationResponse success(String email) {
        return new RegistrationResponse(
            true,
            true,
            true,
            "SENT",
            null,
            email,
            "Registration successful! Please check your email to verify your account.",
            false
        );
    }
    
    /**
     * Response mit maskierter E-Mail (Datenschutz) und Email-Versandstatus
     */
    public static RegistrationResponse successWithEmailStatus(String email, EmailDeliveryResult emailResult) {
        return new RegistrationResponse(
            true,
            true,
            emailResult.isSent(),
            emailResult.status().name(),
            emailResult.errorCode(),
            maskEmail(email),
            emailResult.isSent() 
                ? "Konto erfolgreich erstellt! Bitte prüfen Sie Ihren Posteingang."
                : "Konto erfolgreich erstellt. Die Bestätigungs-E-Mail konnte derzeit nicht versendet werden.",
            !emailResult.isSent() && emailResult.isTemporaryFailure()
        );
    }
    
    /**
     * @deprecated Use successWithEmailStatus() to include email delivery status
     */
    @Deprecated
    public static RegistrationResponse successWithMaskedEmail(String email) {
        return new RegistrationResponse(
            true,
            true,
            true,
            "SENT",
            null,
            maskEmail(email),
            "Registration successful! Please check your email to verify your account.",
            false
        );
    }
    
    /**
     * Maskiert E-Mail-Adresse für öffentliche Anzeige
     * Beispiel: test@example.com → te***@example.com
     */
    private static String maskEmail(String email) {
        if (email == null || !email.contains("@")) {
            return email;
        }
        
        String[] parts = email.split("@");
        String localPart = parts[0];
        String domain = parts[1];
        
        if (localPart.length() <= 2) {
            return localPart.charAt(0) + "***@" + domain;
        }
        
        return localPart.substring(0, 2) + "***@" + domain;
    }
}
