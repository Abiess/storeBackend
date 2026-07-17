package storebackend.dto;

/**
 * Standardisierte API-Antwort für Operationen mit E-Mail-Versand
 * (Registrierung, Passwort-Reset, Team-Einladung, etc.)
 * 
 * @param operationSuccessful Wurde die Haupt-Operation erfolgreich ausgeführt? (z.B. User erstellt, Token gespeichert)
 * @param emailSent Wurde die E-Mail erfolgreich versendet?
 * @param emailStatus Status des E-Mail-Versands (SENT, TEMPORARILY_FAILED, PERMANENTLY_FAILED)
 * @param errorCode Fehlercode (null bei Erfolg, z.B. "SMTP_DAILY_LIMIT", "SMTP_AUTH_FAILED")
 * @param message Benutzerfreundliche Nachricht
 * @param retryAllowed Kann der Benutzer es erneut versuchen? (z.B. "E-Mail erneut senden")
 */
public record EmailOperationResponse(
    boolean operationSuccessful,
    boolean emailSent,
    String emailStatus,
    String errorCode,
    String message,
    boolean retryAllowed
) {
    /** Factory: Operation und E-Mail erfolgreich */
    public static EmailOperationResponse success(String message) {
        return new EmailOperationResponse(
            true,
            true,
            EmailDeliveryStatus.SENT.name(),
            null,
            message,
            false
        );
    }
    
    /** Factory: Operation erfolgreich, aber E-Mail fehlgeschlagen */
    public static EmailOperationResponse successWithEmailFailure(
        EmailDeliveryResult emailResult,
        String message
    ) {
        return new EmailOperationResponse(
            true,
            false,
            emailResult.status().name(),
            emailResult.errorCode(),
            message,
            emailResult.isTemporaryFailure() // Retry nur bei temp. Fehler
        );
    }
    
    /** Factory: Operation fehlgeschlagen */
    public static EmailOperationResponse operationFailed(String message) {
        return new EmailOperationResponse(
            false,
            false,
            null,
            null,
            message,
            false
        );
    }
}
