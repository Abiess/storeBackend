package storebackend.dto;

/**
 * Ergebnis eines E-Mail-Versands (Record für Immutability)
 * 
 * @param status Versandstatus (SENT, TEMPORARILY_FAILED, PERMANENTLY_FAILED)
 * @param errorCode Maschinenlesbarer Fehlercode (null bei Erfolg)
 * @param userMessage Benutzerfreundliche Nachricht (niemals rohe SMTP-Exception!)
 */
public record EmailDeliveryResult(
    EmailDeliveryStatus status,
    String errorCode,
    String userMessage
) {
    public boolean isSent() {
        return status == EmailDeliveryStatus.SENT;
    }
    
    public boolean isTemporaryFailure() {
        return status == EmailDeliveryStatus.TEMPORARILY_FAILED;
    }
    
    public boolean isPermanentFailure() {
        return status == EmailDeliveryStatus.PERMANENTLY_FAILED;
    }
    
    /** Factory für erfolgreichen Versand */
    public static EmailDeliveryResult success() {
        return new EmailDeliveryResult(
            EmailDeliveryStatus.SENT,
            null,
            "E-Mail wurde erfolgreich versendet"
        );
    }
    
    /** Factory für temporären Fehler */
    public static EmailDeliveryResult temporaryFailure(String errorCode, String userMessage) {
        return new EmailDeliveryResult(
            EmailDeliveryStatus.TEMPORARILY_FAILED,
            errorCode,
            userMessage
        );
    }
    
    /** Factory für permanenten Fehler */
    public static EmailDeliveryResult permanentFailure(String errorCode, String userMessage) {
        return new EmailDeliveryResult(
            EmailDeliveryStatus.PERMANENTLY_FAILED,
            errorCode,
            userMessage
        );
    }
}
