package storebackend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

/**
 * WhatsApp Cloud API Service (Meta / Facebook)
 *
 * Konfiguration in application.properties:
 *   whatsapp.enabled=true
 *   whatsapp.phone-number-id=DEINE_PHONE_NUMBER_ID
 *   whatsapp.access-token=DEIN_ACCESS_TOKEN
 *
 * Endpoint: https://graph.facebook.com/v23.0/{phoneNumberId}/messages
 *
 * Docs: https://developers.facebook.com/docs/whatsapp/cloud-api/messages
 */
@Service
@Slf4j
public class WhatsAppService {

    @Value("${whatsapp.api-version:v22.0}")
    private String apiVersion;

    @Value("${whatsapp.enabled:false}")
    private boolean enabled;

    @Value("${whatsapp.phone-number-id:}")
    private String phoneNumberId;

    @Value("${whatsapp.access-token:}")
    private String accessToken;

    /**
     * Name des WhatsApp-Templates fuer Verifizierungscode.
     * Muss im Meta Business Manager genehmigt sein.
     * Wenn leer → wird Freitext-Nachricht gesendet.
     */
    @Value("${whatsapp.verification-template-name:}")
    private String verificationTemplateName;

    @Value("${whatsapp.verification-template-lang:de}")
    private String verificationTemplateLang;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    // ─────────────────────────────────────────────────────────────────────────
    // Public API
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Sendet eine einfache Textnachricht via Meta WhatsApp Cloud API.
     *
     * @param to      Empfaenger im E.164 Format (z.B. +491234567890)
     * @param message Nachrichtentext (max. 4096 Zeichen)
     * @return true wenn erfolgreich gesendet
     */
    public boolean sendMessage(String to, String message) {
        if (!isConfigured()) {
            return simulateSend(to, message);
        }

        String cleanNumber = normalizePhone(to);

        Map<String, Object> body = Map.of(
            "messaging_product", "whatsapp",
            "recipient_type", "individual",
            "to", cleanNumber,
            "type", "text",
            "text", Map.of(
                "preview_url", false,
                "body", message
            )
        );

        return doPost(cleanNumber, body);
    }

    /**
     * Sendet einen Verifizierungscode:
     * - Wenn ein genehmigtes Template konfiguriert ist → Template-Nachricht
     * - Sonst → einfache Textnachricht (nur fuer verifizierte Test-Nummern erlaubt)
     *
     * @param to   Empfaenger im E.164 Format
     * @param code 6-stelliger Verifizierungscode
     * @return true wenn erfolgreich gesendet
     */
    public boolean sendVerificationCode(String to, String code) {
        if (!isConfigured()) {
            return simulateSend(to, "Verification code: " + code);
        }

        // Template vorhanden → Template-Nachricht (erfordert genehmigtes Template mit {{1}})
        if (verificationTemplateName != null && !verificationTemplateName.isBlank()) {
            log.info("Sending verification code via template '{}' to {}", verificationTemplateName, to);
            return sendTemplateMessage(to, code);
        }

        // Kein Template → Freitext direkt senden.
        // Funktioniert sofort ohne Template-Genehmigung fuer:
        // - verifizierte Test-Nummern im Meta Developer Portal
        // - Nummern die innerhalb der letzten 24h eine Nachricht gesendet haben
        log.info("Sending verification code as plain text to {} (no template configured)", to);
        String text = "Ihr Bestellcode: *" + code + "*\n\nGueltig 10 Minuten. Bitte nicht weitergeben.";
        return sendMessage(to, text);
    }

    /**
     * Compat-Methode fuer PhoneVerificationService (alter Interface-Name).
     */
    public boolean sendWhatsAppMessage(String to, String message) {
        return sendMessage(to, message);
    }

    /**
     * SMS-Fallback – nicht verfuegbar, leitet auf WhatsApp weiter.
     */
    public boolean sendSMS(String to, String message) {
        log.warn("SMS not supported – falling back to WhatsApp for {}", to);
        return sendMessage(to, message);
    }

    public boolean isEnabled() {
        return enabled;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Template Message
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Sendet eine genehmigte Template-Nachricht mit dem Verifizierungscode
     * als Parameter.
     *
     * Erwartet ein Template mit einer Variable {{1}} fuer den Code, z.B.:
     *   "Ihr Verifizierungscode lautet {{1}}. Gueltig fuer 10 Minuten."
     */
    private boolean sendTemplateMessage(String to, String code) {
        String cleanNumber = normalizePhone(to);

        Map<String, Object> body = Map.of(
            "messaging_product", "whatsapp",
            "recipient_type", "individual",
            "to", cleanNumber,
            "type", "template",
            "template", Map.of(
                "name", verificationTemplateName,
                "language", Map.of("code", verificationTemplateLang),
                "components", List.of(
                    Map.of(
                        "type", "body",
                        "parameters", List.of(
                            Map.of("type", "text", "text", code)
                        )
                    )
                )
            )
        );

        return doPost(cleanNumber, body);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // HTTP
    // ─────────────────────────────────────────────────────────────────────────

    private boolean doPost(String to, Map<String, Object> body) {
        try {
            String url = "https://graph.facebook.com/" + apiVersion + "/" + phoneNumberId + "/messages";

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(accessToken);

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);
            ResponseEntity<String> response = restTemplate.postForEntity(url, request, String.class);

            if (response.getStatusCode().is2xxSuccessful()) {
                log.info("WhatsApp message sent to {} via Meta Cloud API ({})", to, apiVersion);
                return true;
            } else {
                log.warn("Meta WhatsApp API error {}: {}", response.getStatusCode(), response.getBody());
                return false;
            }
        } catch (org.springframework.web.client.HttpClientErrorException e) {
            // Meta gibt den Fehlergrund im Body zurueck (z.B. abgelaufener Token)
            log.error("Meta WhatsApp API client error for {}: HTTP {} | Body: {}", to, e.getStatusCode(), e.getResponseBodyAsString());
            return false;
        } catch (Exception e) {
            log.error("Failed to send WhatsApp to {}: {}", to, e.getMessage());
            return false;
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────────

    private boolean isConfigured() {
        return enabled
            && phoneNumberId != null && !phoneNumberId.isBlank()
            && accessToken != null && !accessToken.isBlank();
    }

    /**
     * Normalisiert die Telefonnummer: entfernt fuehrendes '+'.
     * Meta erwartet das Format ohne '+', z.B. 4917612345678.
     */
    private String normalizePhone(String phone) {
        if (phone == null) return "";
        return phone.trim().replaceFirst("^\\+", "");
    }

    private boolean simulateSend(String to, String message) {
        log.info("[WhatsApp/DEV] To: {} | Message: {}", to, message);
        log.info("[WhatsApp/DEV] Set whatsapp.enabled=true + phone-number-id + access-token to send real messages");
        return true;
    }
}
