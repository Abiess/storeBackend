package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

/**
 * Response nach erfolgreicher Registrierung.
 * 
 * WICHTIG: Enthält KEINEN JWT-Token, da der Benutzer seine E-Mail
 * erst bestätigen muss bevor er sich anmelden kann.
 * 
 * Verwendung:
 * - registrationSuccessful: true wenn Benutzer angelegt wurde
 * - emailVerificationRequired: true um Frontend zu signalisieren dass Email-Bestätigung nötig ist
 * - email: Die registrierte E-Mail-Adresse (kann maskiert werden: te***@example.com)
 * - message: Benutzerfreundliche Nachricht
 */
@Data
@AllArgsConstructor
public class RegistrationResponse {
    private boolean registrationSuccessful;
    private boolean emailVerificationRequired;
    private String email;
    private String message;
    
    /**
     * Standard-Response: Registrierung erfolgreich, Verifizierung erforderlich
     */
    public static RegistrationResponse success(String email) {
        return new RegistrationResponse(
            true,
            true,
            email,
            "Registration successful! Please check your email to verify your account."
        );
    }
    
    /**
     * Response mit maskierter E-Mail (Datenschutz)
     * Beispiel: test@example.com → te***@example.com
     */
    public static RegistrationResponse successWithMaskedEmail(String email) {
        return new RegistrationResponse(
            true,
            true,
            maskEmail(email),
            "Registration successful! Please check your email to verify your account."
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
