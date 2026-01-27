package storebackend.service;


import com.twilio.rest.api.v2010.account.Message;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import com.twilio.Twilio;
import com.twilio.type.PhoneNumber;
/**
 * Twilio Service für SMS und WhatsApp Nachrichten
 *
 * Setup:
 * 1. Twilio Account erstellen: https://www.twilio.com
 * 2. Account SID und Auth Token in application.properties eintragen
 * 3. Telefonnummer kaufen für SMS
 * 4. WhatsApp Sandbox aktivieren (für Testing)
 */
@Service
@Slf4j
public class TwilioService {

    @Value("${twilio.account-sid:}")
    private String accountSid;

    @Value("${twilio.auth-token:}")
    private String authToken;

    @Value("${twilio.phone-number:}")
    private String fromPhoneNumber;

    @Value("${twilio.whatsapp-number:}")
    private String whatsappNumber;

    @Value("${twilio.enabled:false}")
    private boolean enabled;

    @PostConstruct
    public void init() {
        if (enabled && accountSid != null && !accountSid.isEmpty()) {
            try {
                Twilio.init(accountSid, authToken);
                log.info("✅ Twilio initialized successfully");
            } catch (Exception e) {
                log.error("❌ Failed to initialize Twilio: {}", e.getMessage());
                enabled = false;
            }
        } else {
            log.warn("⚠️ Twilio is disabled or not configured");
        }
    }

    /**
     * Sendet eine SMS
     */
    public boolean sendSMS(String toPhoneNumber, String messageText) {
        if (!enabled) {
            log.warn("⚠️ Twilio disabled - SMS not sent to {}", toPhoneNumber);
            // Im Development-Modus simulieren wir erfolgreichen Versand
            return simulateSuccess("SMS", toPhoneNumber, messageText);
        }

        try {
            Message message = Message.creator(
                new PhoneNumber(toPhoneNumber),
                new PhoneNumber(fromPhoneNumber),
                messageText
            ).create();

            log.info("✅ SMS sent to {} (SID: {})", toPhoneNumber, message.getSid());
            return true;
        } catch (Exception e) {
            log.error("❌ Failed to send SMS to {}: {}", toPhoneNumber, e.getMessage());
            return false;
        }
    }

    /**
     * Sendet eine WhatsApp Nachricht
     */
    public boolean sendWhatsAppMessage(String toPhoneNumber, String messageText) {
        if (!enabled) {
            log.warn("⚠️ Twilio disabled - WhatsApp not sent to {}", toPhoneNumber);
            // Im Development-Modus simulieren wir erfolgreichen Versand
            return simulateSuccess("WhatsApp", toPhoneNumber, messageText);
        }

        try {
            // WhatsApp benötigt "whatsapp:" Prefix
            String whatsappTo = "whatsapp:" + toPhoneNumber;
            String whatsappFrom = "whatsapp:" + whatsappNumber;

            Message message = Message.creator(
                new PhoneNumber(whatsappTo),
                new PhoneNumber(whatsappFrom),
                messageText
            ).create();

            log.info("✅ WhatsApp sent to {} (SID: {})", toPhoneNumber, message.getSid());
            return true;
        } catch (Exception e) {
            log.error("❌ Failed to send WhatsApp to {}: {}", toPhoneNumber, e.getMessage());
            return false;
        }
    }

    /**
     * Simuliert erfolgreichen Versand im Development-Modus
     * Code wird im Log ausgegeben
     */
    private boolean simulateSuccess(String channel, String toPhoneNumber, String messageText) {
        log.info("📱 [{}] SIMULATION - Message to {}: {}", channel, toPhoneNumber, messageText);
        log.info("🔐 DEVELOPMENT MODE - Check logs for verification code");
        return true;
    }

    public boolean isEnabled() {
        return enabled;
    }
}

