package storebackend.payment.paypal;

import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConfigurationProperties(prefix = "paypal")
@Data
@Slf4j
public class PayPalConfig {
    
    private String clientId;
    private String clientSecret;
    private String mode = "sandbox";
    
    /**
     * Sandbox-Buyer E-Mail für Pre-Fill im PayPal-Checkout
     * Nur im Sandbox-Modus verwendet - NIEMALS Passwörter oder Kartendaten speichern!
     * Diese E-Mail wird nur verwendet um das PayPal-Login-Fenster vorzubefüllen
     */
    private String sandboxBuyerEmail;
    
    /**
     * Webhook-Konfiguration
     */
    private WebhookConfig webhook = new WebhookConfig();
    
    @Data
    public static class WebhookConfig {
        private String sandboxId;
        private String liveId;
    }
    
    public boolean isSandbox() {
        return "sandbox".equalsIgnoreCase(mode);
    }
    
    public String getApiBase() {
        return isSandbox() 
            ? "https://api-m.sandbox.paypal.com" 
            : "https://api-m.paypal.com";
    }
    
    public boolean isConfigured() {
        boolean configured = clientId != null && !clientId.isBlank() 
            && clientSecret != null && !clientSecret.isBlank();
        if (!configured) {
            log.warn("PayPal not configured - clientId or clientSecret missing");
        }
        return configured;
    }
    
    /**
     * Prüft ob Webhook-Konfiguration vollständig ist
     */
    public boolean isWebhookConfigured() {
        String webhookId = getActiveWebhookId();
        boolean configured = webhookId != null && !webhookId.isBlank();
        if (!configured) {
            log.warn("PayPal Webhook not configured for mode: {}", mode);
        }
        return configured;
    }
    
    /**
     * Gibt die aktive Webhook-ID basierend auf dem Modus zurück
     */
    public String getActiveWebhookId() {
        return isSandbox() ? webhook.getSandboxId() : webhook.getLiveId();
    }
    
    public String getMode() {
        return mode;
    }
    
    /**
     * Gibt die Sandbox-Buyer-Email zurück, falls konfiguriert
     * KRITISCH: Nur im Sandbox-Modus verwenden, niemals im Live-Modus!
     */
    public String getSandboxBuyerEmail() {
        if (!isSandbox()) {
            log.warn("Attempted to access sandboxBuyerEmail in LIVE mode - ignoring");
            return null;
        }
        return sandboxBuyerEmail;
    }
}

