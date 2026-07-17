package storebackend.service;

import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.MailAuthenticationException;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import storebackend.dto.EmailDeliveryResult;
import storebackend.dto.EmailDeliveryStatus;

/**
 * Zentraler E-Mail-Versand-Service mit einheitlichem Error-Handling
 * 
 * ALLE E-Mail-Versände müssen über diesen Service laufen!
 * - Keine rohen SMTP-Exceptions an Caller
 * - Klassifizierung von Fehlern (Temporary vs. Permanent)
 * - Logging ohne sensible Daten (keine Tokens, keine vollständigen E-Mail-Adressen)
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class EmailDeliveryService {

    private final JavaMailSender mailSender;

    /**
     * Sendet eine E-Mail und gibt strukturiertes Ergebnis zurück
     * 
     * @param message Vorbereitete MimeMessage
     * @param emailType Typ der E-Mail für Logging (z.B. "verification", "password-reset", "team-invitation")
     * @return EmailDeliveryResult mit Status, ErrorCode und User-Message
     */
    public EmailDeliveryResult send(MimeMessage message, String emailType) {
        try {
            // Empfänger-Domain für Logging extrahieren (keine vollständige Adresse!)
            String recipientDomain = extractRecipientDomain(message);
            
            log.info("📧 Sending email: type={}, recipientDomain={}", emailType, recipientDomain);
            
            mailSender.send(message);
            
            log.info("✅ Email sent successfully: type={}, recipientDomain={}", emailType, recipientDomain);
            
            return EmailDeliveryResult.success();

        } catch (MailAuthenticationException ex) {
            // SMTP Authentication fehlgeschlagen - Permanenter Fehler (Konfiguration falsch)
            log.error("❌ Email delivery failed - SMTP authentication: type={}, error={}", 
                    emailType, ex.getMessage());
            
            return EmailDeliveryResult.permanentFailure(
                "SMTP_AUTH_FAILED",
                "Der E-Mail-Dienst ist aktuell nicht korrekt konfiguriert. Bitte kontaktieren Sie den Support."
            );

        } catch (MailSendException ex) {
            // SMTP Send-Fehler - Muss klassifiziert werden
            String recipientDomain = extractRecipientDomain(message);
            log.warn("⚠️ Email delivery failed - SMTP send exception: type={}, recipientDomain={}, error={}", 
                    emailType, recipientDomain, sanitizeErrorMessage(ex.getMessage()));
            
            return classifyMailSendException(ex);

        } catch (Exception ex) {
            // Unbekannter Fehler
            log.error("❌ Email delivery failed - unexpected error: type={}, error={}", 
                    emailType, ex.getClass().getSimpleName());
            
            return EmailDeliveryResult.temporaryFailure(
                "UNKNOWN_EMAIL_ERROR",
                "Die E-Mail konnte derzeit nicht versendet werden. Bitte versuchen Sie es später erneut."
            );
        }
    }

    /**
     * Klassifiziert MailSendException in spezifische Fehlercodes
     */
    private EmailDeliveryResult classifyMailSendException(MailSendException ex) {
        String message = ex.getMessage() != null ? ex.getMessage() : "";

        // Gmail Daily Limit (550 5.4.5)
        if (message.contains("550-5.4.5") || message.contains("550 5.4.5") ||
            message.toLowerCase().contains("daily user sending limit exceeded") ||
            message.toLowerCase().contains("daily sending quota exceeded")) {
            
            log.warn("⚠️ Gmail daily sending limit exceeded");
            
            return EmailDeliveryResult.temporaryFailure(
                "SMTP_DAILY_LIMIT",
                "Das tägliche E-Mail-Limit wurde erreicht. Bitte versuchen Sie es in 24 Stunden erneut."
            );
        }

        // Ungültige Empfängeradresse (550 5.1.1)
        if (message.contains("550 5.1.1") || message.toLowerCase().contains("user unknown") ||
            message.toLowerCase().contains("invalid recipient")) {
            
            return EmailDeliveryResult.permanentFailure(
                "INVALID_RECIPIENT",
                "Die E-Mail-Adresse ist ungültig oder existiert nicht."
            );
        }

        // Mailbox voll (552 5.2.2)
        if (message.contains("552 5.2.2") || message.toLowerCase().contains("mailbox full")) {
            return EmailDeliveryResult.temporaryFailure(
                "MAILBOX_FULL",
                "Das Postfach des Empfängers ist voll. Bitte versuchen Sie es später erneut."
            );
        }

        // Allgemeiner SMTP-Fehler
        return EmailDeliveryResult.temporaryFailure(
            "SMTP_UNAVAILABLE",
            "Die E-Mail konnte momentan nicht versendet werden. Bitte versuchen Sie es später erneut."
        );
    }

    /**
     * Extrahiert Domain aus Empfängeradresse für Logging (KEINE vollständige Adresse!)
     */
    private String extractRecipientDomain(MimeMessage message) {
        try {
            String recipient = message.getAllRecipients()[0].toString();
            if (recipient.contains("@")) {
                return "*@" + recipient.substring(recipient.indexOf("@") + 1);
            }
        } catch (Exception e) {
            // Fehler beim Extrahieren ignorieren
        }
        return "unknown";
    }

    /**
     * Bereinigt Fehlermeldung von sensiblen Daten (z.B. vollständige E-Mail-Adressen)
     */
    private String sanitizeErrorMessage(String message) {
        if (message == null) return "null";
        
        // Kürze sehr lange Fehler
        if (message.length() > 200) {
            message = message.substring(0, 200) + "...";
        }
        
        // Entferne E-Mail-Adressen (Regex: xxx@yyy.zzz)
        message = message.replaceAll("\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b", "[EMAIL]");
        
        return message;
    }
}
