package storebackend.service;

import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import storebackend.dto.EmailDeliveryResult;
import storebackend.entity.OrderItem;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;
    private final EmailTemplateService templateService;
    private final EmailCircuitBreakerService circuitBreakerService;
    private final EmailDeliveryService emailDeliveryService;

    @Value("${spring.mail.from:noreply@markt.ma}")
    private String fromEmail;

    @Value("${app.base-url:https://markt.ma}")
    private String baseUrl;

    @Value("${mail.enabled:false}")
    private boolean mailEnabled;
    
    // ══════════════════════════════════════════════════════════════════════════════════
    // EMERGENCY KILL SWITCHES - Incident Response
    // ══════════════════════════════════════════════════════════════════════════════════
    
    @Value("${feature.store-access-email.enabled:true}")
    private boolean storeAccessEmailEnabled;
    
    @Value("${feature.verification-email.enabled:true}")
    private boolean verificationEmailEnabled;
    
    @Value("${feature.password-reset-email.enabled:true}")
    private boolean passwordResetEmailEnabled;

    // ==================================================================================
    // AUTH E-MAILS
    // ==================================================================================

    /** Rückwärtskompatibel – Default-Sprache "en" */
    public void sendVerificationEmail(String toEmail, String token) {
        sendVerificationEmail(toEmail, token, "en");
    }

    /**
     * DEPRECATED: Nutze sendVerificationEmailWithResult() für neue Funktionen
     * @deprecated Use sendVerificationEmailWithResult() to check email delivery status
     */
    @Deprecated
    public void sendVerificationEmail(String toEmail, String token, String lang) {
        sendVerificationEmailWithResult(toEmail, token, lang);
    }
    
    /**
     * Verifikations-E-Mail mit Result-Status (NEUE METHODE)
     * @return EmailDeliveryResult mit Status, ErrorCode und User-Message
     */
    public EmailDeliveryResult sendVerificationEmailWithResult(String toEmail, String token, String lang) {
        // EMERGENCY KILL SWITCH
        if (!verificationEmailEnabled) {
            log.error("🚨 EMERGENCY: Verification Email DISABLED via feature flag (to: {})", toEmail);
            return EmailDeliveryResult.permanentFailure(
                "FEATURE_DISABLED",
                "E-Mail-Versand ist derzeit deaktiviert."
            );
        }
        
        if (!mailEnabled) {
            log.info("Mail disabled – verification URL: {}/verify?token={}", baseUrl, token);
            return EmailDeliveryResult.permanentFailure(
                "MAIL_DISABLED",
                "E-Mail-Versand ist in dieser Umgebung deaktiviert."
            );
        }
        
        // Circuit Breaker Check
        if (!circuitBreakerService.allowEmail("verification")) {
            log.error("🚨 Circuit Breaker: Verification email to {} blocked (rate limit exceeded)", toEmail);
            return EmailDeliveryResult.temporaryFailure(
                "RATE_LIMIT_EXCEEDED",
                "Zu viele E-Mail-Anfragen. Bitte versuchen Sie es in wenigen Minuten erneut."
            );
        }
        
        try {
            Map<String, Object> vars = new HashMap<>();
            vars.put("verificationUrl", baseUrl + "/verify?token=" + token);
            vars.put("greeting",  buildGreeting(lang, null));
            vars.put("title",     t(lang, "verification.title",  "Verify Your Email"));
            vars.put("intro",     t(lang, "verification.intro",  "Please verify your email."));
            vars.put("btnLabel",  t(lang, "verification.button", "Verify Email Address"));
            vars.put("expiry",    t(lang, "verification.expiry", "This link expires in 24 hours."));
            vars.put("ignore",    t(lang, "verification.ignore", ""));
            addFooter(lang, vars);

            String subject = templateService.renderSubject(
                t(lang, "verification.subject", "Verify your email address - Markt.ma"), vars);
            
            MimeMessage message = buildHtmlMessage(toEmail, subject, 
                templateService.render("email-verification.html", lang, vars));
            
            EmailDeliveryResult result = emailDeliveryService.send(message, "verification");
            
            if (result.isSent()) {
                log.info("✅ Verification email (HTML/{}) sent successfully", lang);
            } else {
                log.warn("⚠️ Verification email delivery failed: status={}, errorCode={}", 
                    result.status(), result.errorCode());
            }
            
            return result;
            
        } catch (Exception e) {
            log.error("❌ Failed to prepare verification email", e);
            return EmailDeliveryResult.permanentFailure(
                "TEMPLATE_ERROR",
                "Die E-Mail konnte nicht erstellt werden."
            );
        }
    }

    public void sendWelcomeEmail(String toEmail, String name) {
        sendWelcomeEmail(toEmail, name, "en");
    }

    public void sendWelcomeEmail(String toEmail, String name, String lang) {
        if (!mailEnabled) { log.info("Mail disabled – welcome email to: {}", toEmail); return; }
        try {
            Map<String, Object> vars = new HashMap<>();
            vars.put("loginUrl", baseUrl + "/login");
            vars.put("greeting", buildGreeting(lang, name));
            vars.put("title",    t(lang, "welcome.title",  "Welcome to Markt.ma!"));
            vars.put("intro",    t(lang, "welcome.intro",  "Your email has been verified."));
            vars.put("btnLabel", t(lang, "welcome.button", "Log In Now"));
            addFooter(lang, vars);

            String subject = templateService.renderSubject(
                t(lang, "welcome.subject", "Welcome to Markt.ma!"), vars);
            sendHtml(toEmail, subject, templateService.render("welcome.html", lang, vars));
            log.info("Welcome email (HTML/{}) sent to: {}", lang, toEmail);
        } catch (Exception e) {
            log.error("Failed to send welcome email to: {}", toEmail, e);
        }
    }

    // ==================================================================================
    // STORE ACCESS E-MAIL (anonymer User gibt E-Mail nach Store-Erstellung ein)
    // ==================================================================================

    public void sendStoreAccessEmail(String toEmail, String storeName,
                                      String storeUrl, String dashboardUrl, String lang) {
        // ═══════════════════════════════════════════════════════════════════════════
        // EMERGENCY KILL SWITCH - Incident Response
        // ═══════════════════════════════════════════════════════════════════════════
        if (!storeAccessEmailEnabled) {
            log.error("╔═══════════════════════════════════════════════════════════════════════════╗");
            log.error("║ 🚨 EMERGENCY KILL SWITCH ACTIVE                                            ║");
            log.error("╠═══════════════════════════════════════════════════════════════════════════╣");
            log.error("║ Feature:             Store Access Email                                   ║");
            log.error("║ Status:              DISABLED                                              ║");
            log.error("║ Empfänger:           {}                                           ║", toEmail);
            log.error("║ Store:               {}                                           ║", storeName);
            log.error("║ Action:              MAIL NOT SENT (feature flag disabled)                ║");
            log.error("║ Config:              feature.store-access-email.enabled=false             ║");
            log.error("╚═══════════════════════════════════════════════════════════════════════════╝");
            return; // Keine Mail senden
        }
        
        // ═══════════════════════════════════════════════════════════════════════════
        // KRITISCH: Mail wird jetzt tatsächlich versendet
        // ═══════════════════════════════════════════════════════════════════════════
        log.warn("╔═══════════════════════════════════════════════════════════════════════════╗");
        log.warn("║ >>> EMAILSERVICE.sendStoreAccessEmail() AUFGERUFEN <<<                     ║");
        log.warn("╠═══════════════════════════════════════════════════════════════════════════╣");
        log.warn("║ To:                  {}                                           ║", toEmail);
        log.warn("║ Store Name:          {}                                           ║", storeName);
        log.warn("║ Mail Enabled:        {}                                                  ║", mailEnabled);
        log.warn("║ Feature Flag:        {}                                                  ║", storeAccessEmailEnabled);
        log.warn("║ Circuit Breaker:     checking...                                          ║");
        log.warn("╚═══════════════════════════════════════════════════════════════════════════╝");
        
        if (!mailEnabled) {
            log.info("❌ Mail disabled – store access email to: {} storeUrl: {}", toEmail, storeUrl);
            return;
        }
        
        // Circuit Breaker Check
        boolean circuitAllowed = circuitBreakerService.allowEmail("store-access");
        log.warn("🔄 Circuit Breaker Result: {} (allowed={})", circuitAllowed ? "OPEN" : "CLOSED", circuitAllowed);
        
        if (!circuitAllowed) {
            log.error("🚨 Circuit Breaker: Store access email to {} blocked (rate limit exceeded)", toEmail);
            return;
        }
        
        try{
            Map<String, Object> vars = new HashMap<>();
            vars.put("storeName",    storeName);
            vars.put("storeUrl",     storeUrl);
            vars.put("dashboardUrl", dashboardUrl);
            vars.put("loginUrl",     dashboardUrl);
            vars.put("greeting",     buildGreeting(lang, storeName));
            vars.put("title",        t(lang, "storeAccess.title",    "Your store is ready!"));
            vars.put("intro",        t(lang, "storeAccess.intro",    "Your store is now live. Save this email for direct access."));
            vars.put("btnLabel",     t(lang, "storeAccess.btnLabel", "Go to Dashboard →"));
            vars.put("tip",          t(lang, "storeAccess.tip",      "Save this email – it contains your direct access link."));
            addFooter(lang, vars);

            String subject = t(lang, "storeAccess.subject",
                    "Your store \"" + storeName + "\" is live \uD83D\uDE80 – markt.ma")
                .replace("{{storeName}}", storeName);
            sendHtml(toEmail, subject, templateService.render("store-access.html", lang, vars));
            log.warn("╔═══════════════════════════════════════════════════════════════════════════╗");
            log.warn("║ ✅ MAIL ERFOLGREICH VERSENDET                                              ║");
            log.warn("╠═══════════════════════════════════════════════════════════════════════════╣");
            log.warn("║ Typ:                 Store Access Email                                   ║");
            log.warn("║ Empfänger:           {}                                           ║", toEmail);
            log.warn("║ Store:               {}                                           ║", storeName);
            log.warn("║ Timestamp:           {}                                   ║", java.time.LocalDateTime.now());
            log.warn("╚═══════════════════════════════════════════════════════════════════════════╝");
        } catch (Exception e) {
            log.error("❌ Failed to send store access email to: {}", toEmail, e);
        }
    }

    public void sendPasswordResetEmail(String toEmail, String token) {
        sendPasswordResetEmail(toEmail, token, "en");
    }

    public void sendPasswordResetEmail(String toEmail, String token, String lang) {
        // EMERGENCY KILL SWITCH
        if (!passwordResetEmailEnabled) {
            log.error("🚨 EMERGENCY: Password Reset Email DISABLED via feature flag (to: {})", toEmail);
            return;
        }
        
        if (!mailEnabled) {
            log.info("Mail disabled – reset URL: {}/reset-password?token={}", baseUrl, token);
            return;
        }
        
        // Circuit Breaker Check
        if (!circuitBreakerService.allowEmail("password-reset")) {
            log.error("🚨 Circuit Breaker: Password reset email to {} blocked (rate limit exceeded)", toEmail);
            return;
        }
        
        try {
            Map<String, Object> vars = new HashMap<>();
            vars.put("resetUrl",  baseUrl + "/reset-password?token=" + token);
            vars.put("greeting",  buildGreeting(lang, null));
            vars.put("title",     t(lang, "passwordReset.title",  "Reset Your Password"));
            vars.put("intro",     t(lang, "passwordReset.intro",  "We received a reset request."));
            vars.put("btnLabel",  t(lang, "passwordReset.button", "Reset Password"));
            vars.put("expiry",    t(lang, "passwordReset.expiry", "This link expires in 1 hour."));
            vars.put("ignore",    t(lang, "passwordReset.ignore", ""));
            addFooter(lang, vars);

            String subject = templateService.renderSubject(
                t(lang, "passwordReset.subject", "Reset your password - Markt.ma"), vars);
            sendHtml(toEmail, subject, templateService.render("password-reset.html", lang, vars));
            log.info("Password reset email (HTML/{}) sent to: {}", lang, toEmail);
        } catch (Exception e) {
            log.error("Failed to send password reset email to: {}", toEmail, e);
        }
    }

    /**
     * Sendet Password-Reset-E-Mail und gibt Result zurück
     * Verwendet zentralen EmailDeliveryService für einheitliche Fehlerbehandlung
     * 
     * @return EmailDeliveryResult mit Status, ErrorCode und User-Message
     */
    public EmailDeliveryResult sendPasswordResetEmailWithResult(String toEmail, String token, String lang) {
        // EMERGENCY KILL SWITCH
        if (!passwordResetEmailEnabled) {
            log.error("🚨 EMERGENCY: Password Reset Email DISABLED via feature flag (to: {})", toEmail);
            return EmailDeliveryResult.permanentFailure(
                "EMAIL_FEATURE_DISABLED",
                "Der E-Mail-Versand ist derzeit deaktiviert."
            );
        }
        
        if (!mailEnabled) {
            log.info("Mail disabled – reset URL: {}/reset-password?token={}", baseUrl, token);
            return EmailDeliveryResult.permanentFailure(
                "EMAIL_FEATURE_DISABLED",
                "Der E-Mail-Versand ist derzeit deaktiviert."
            );
        }
        
        // Circuit Breaker Check
        if (!circuitBreakerService.allowEmail("password-reset")) {
            log.error("🚨 Circuit Breaker: Password reset email to {} blocked (rate limit exceeded)", toEmail);
            return EmailDeliveryResult.temporaryFailure(
                "RATE_LIMIT_EXCEEDED",
                "Zu viele E-Mails wurden versendet. Bitte später erneut versuchen."
            );
        }
        
        try {
            Map<String, Object> vars = new HashMap<>();
            vars.put("resetUrl",  baseUrl + "/reset-password?token=" + token);
            vars.put("greeting",  buildGreeting(lang, null));
            vars.put("title",     t(lang, "passwordReset.title",  "Reset Your Password"));
            vars.put("intro",     t(lang, "passwordReset.intro",  "We received a reset request."));
            vars.put("btnLabel",  t(lang, "passwordReset.button", "Reset Password"));
            vars.put("expiry",    t(lang, "passwordReset.expiry", "This link expires in 1 hour."));
            vars.put("ignore",    t(lang, "passwordReset.ignore", ""));
            addFooter(lang, vars);

            String subject = templateService.renderSubject(
                t(lang, "passwordReset.subject", "Reset your password - Markt.ma"), vars);
            
            // Build message without sending
            MimeMessage message = buildHtmlMessage(toEmail, subject, 
                templateService.render("password-reset.html", lang, vars));
            
            // Send via centralized EmailDeliveryService
            EmailDeliveryResult result = emailDeliveryService.send(message, "password-reset");
            
            if (result.isSent()) {
                log.info("✅ Password reset email (HTML/{}) sent to: {}", lang, toEmail);
            } else {
                log.warn("⚠️ Password reset email to {} failed: {}", toEmail, result.errorCode());
            }
            
            return result;
            
        } catch (Exception e) {
            log.error("❌ Failed to build password reset email for: {}", toEmail, e);
            return EmailDeliveryResult.temporaryFailure(
                "TEMPLATE_ERROR",
                "Die E-Mail konnte nicht erstellt werden."
            );
        }
    }

    public void sendPasswordResetConfirmationEmail(String toEmail, String name) {
        sendPasswordResetConfirmationEmail(toEmail, name, "en");
    }

    public void sendPasswordResetConfirmationEmail(String toEmail, String name, String lang) {
        if (!mailEnabled) { log.info("Mail disabled – password reset confirm to: {}", toEmail); return; }
        try {
            Map<String, Object> vars = new HashMap<>();
            vars.put("greeting", buildGreeting(lang, name));
            vars.put("title",    t(lang, "passwordChanged.title",   "Password Changed"));
            vars.put("intro",    t(lang, "passwordChanged.intro",   "Your password has been changed."));
            vars.put("warning",  t(lang, "passwordChanged.warning", "If you did not do this, contact support immediately."));
            addFooter(lang, vars);

            String subject = templateService.renderSubject(
                t(lang, "passwordChanged.subject", "Your password has been changed - Markt.ma"), vars);
            sendHtml(toEmail, subject, templateService.render("password-reset-confirm.html", lang, vars));
            log.info("Password reset confirm (HTML/{}) sent to: {}", lang, toEmail);
        } catch (Exception e) {
            log.error("Failed to send password reset confirmation to: {}", toEmail, e);
        }
    }

    // ==================================================================================
    // TEAM INVITATIONS
    // ==================================================================================

    /**
     * Team-Einladungs-E-Mail versenden und Result zurückgeben
     * Verwendet zentralen EmailDeliveryService für einheitliche Fehlerbehandlung
     * 
     * @return EmailDeliveryResult mit Status, ErrorCode und User-Message
     */
    public EmailDeliveryResult sendTeamInvitationEmailWithResult(
            String recipientEmail, 
            String plainToken, 
            String storeName, 
            String role, 
            String lang
    ) {
        if (!mailEnabled) {
            log.info("📧 Mail disabled – team invitation would be sent to: {}", recipientEmail);
            return EmailDeliveryResult.permanentFailure(
                "EMAIL_FEATURE_DISABLED",
                "Der E-Mail-Versand ist derzeit deaktiviert."
            );
        }

        try {
            // Accept-URL mit Token
            String acceptUrl = baseUrl + "/invitations/accept?token=" + plainToken;

            // Rolle übersetzen
            String roleTranslated = translateRole(role, lang != null ? lang : "en");

            Map<String, Object> vars = new HashMap<>();
            vars.put("storeName", storeName);
            vars.put("role", roleTranslated);
            vars.put("acceptUrl", acceptUrl);
            vars.put("expiryDays", "7");
            vars.put("greeting", buildGreeting(lang, null));
            vars.put("title", t(lang, "teamInvitation.title", "Team Invitation"));
            vars.put("intro", t(lang, "teamInvitation.intro", "You have been invited to join"));
            vars.put("roleLabel", t(lang, "teamInvitation.roleLabel", "Role"));
            vars.put("btnLabel", t(lang, "teamInvitation.button", "Accept Invitation"));
            vars.put("expiry", t(lang, "teamInvitation.expiry", "This invitation expires in 7 days."));
            vars.put("emailNote", t(lang, "teamInvitation.emailNote", "This invitation is only valid for this email address."));
            vars.put("securityNote", t(lang, "teamInvitation.securityNote", "We will never send passwords via email."));
            addFooter(lang, vars);

            String subject = templateService.renderSubject(
                t(lang, "teamInvitation.subject", "Team Invitation - {{storeName}}"), vars);

            // Build message without sending
            MimeMessage message = buildHtmlMessage(recipientEmail, subject, 
                templateService.render("team-invitation.html", lang, vars));
            
            // Send via centralized EmailDeliveryService
            EmailDeliveryResult result = emailDeliveryService.send(message, "team-invitation");
            
            if (result.isSent()) {
                log.info("✅ Team invitation email sent: to={}, store={}, role={}", 
                        recipientEmail, storeName, role);
            } else {
                log.warn("⚠️ Team invitation email to {} failed: {}", recipientEmail, result.errorCode());
            }
            
            return result;

        } catch (Exception e) {
            log.error("❌ Failed to build team invitation email: to={}, store={}", 
                    recipientEmail, storeName, e);
            return EmailDeliveryResult.temporaryFailure(
                "TEMPLATE_ERROR",
                "Die E-Mail konnte nicht erstellt werden."
            );
        }
    }

    private String translateRole(String role, String lang) {
        return switch (role) {
            case "STORE_OWNER" -> t(lang, "roles.owner", "Owner");
            case "STORE_ADMIN" -> t(lang, "roles.admin", "Administrator");
            case "STORE_MANAGER" -> t(lang, "roles.manager", "Manager");
            case "STORE_STAFF" -> t(lang, "roles.staff", "Staff");
            case "STORE_EMPLOYEE" -> t(lang, "roles.employee", "Employee");
            default -> role;
        };
    }

    // ==================================================================================
    // STORE OWNER NOTIFICATIONS
    // ==================================================================================

    /**
     * Benachrichtigt den Store-Owner über eine neue Bestellung.
     * Wird asynchron aufgerufen sobald eine Bestellung den Status PENDING erhält.
     *
     * @param ownerEmail     E-Mail des Store-Owners
     * @param ownerLang      Bevorzugte Sprache des Owners (de/en/ar)
     * @param orderNumber    Bestellnummer
     * @param storeName      Name des Stores
     * @param storeLogo      Logo-URL (optional)
     * @param totalAmount    Gesamtbetrag
     * @param customerEmail  E-Mail des Kunden
     * @param customerName   Name des Kunden (optional)
     * @param paymentMethod  Zahlungsmethode (optional)
     * @param items          Bestellte Artikel
     */
    public void sendNewOrderNotificationToOwner(String ownerEmail, String ownerLang,
                                                String orderNumber, String storeName,
                                                String storeLogo, Double totalAmount,
                                                String customerEmail, String customerName,
                                                String paymentMethod, List<OrderItem> items) {
        if (!mailEnabled) {
            log.info("Mail disabled – new order notification to owner: {} order: {}", ownerEmail, orderNumber);
            return;
        }
        if (ownerEmail == null || ownerEmail.isBlank()) {
            log.warn("Cannot send owner notification – owner email is null for order: {}", orderNumber);
            return;
        }
        try {
            String lang = ownerLang != null ? ownerLang : "en";
            Map<String, Object> vars = new HashMap<>();
            vars.put("orderNumber",      orderNumber);
            vars.put("storeName",        storeName);
            vars.put("storeLogo",        storeLogo);
            vars.put("totalAmount",      String.format("%.2f", totalAmount));
            vars.put("currency",         "MAD");
            vars.put("customerEmail",    customerEmail);
            vars.put("customerName",     customerName);
            vars.put("paymentMethod",    paymentMethod != null ? paymentMethod : "-");
            vars.put("orderManageUrl",   baseUrl + "/stores");
            vars.put("greeting",         buildGreeting(lang, null));
            vars.put("title",            t(lang, "newOrderNotification.title",            "New Order Received!"));
            vars.put("intro",            t(lang, "newOrderNotification.intro",            "You have received a new order."));
            vars.put("labelOrderNumber", t(lang, "newOrderNotification.labelOrderNumber", "Order Number"));
            vars.put("labelTotal",       t(lang, "newOrderNotification.labelTotal",       "Total Amount"));
            vars.put("labelPayment",     t(lang, "newOrderNotification.labelPayment",     "Payment Method"));
            vars.put("labelCustomer",    t(lang, "newOrderNotification.labelCustomer",    "Customer"));
            vars.put("labelItems",       t(lang, "newOrderNotification.labelItems",       "Ordered Items"));
            vars.put("labelShipping",    t(lang, "newOrderNotification.labelShipping",    "Shipping Address"));
            vars.put("labelProduct",     t(lang, "newOrderNotification.labelProduct",     "Item"));
            vars.put("labelQty",         t(lang, "newOrderNotification.labelQty",         "Qty"));
            vars.put("labelPrice",       t(lang, "newOrderNotification.labelPrice",       "Price"));
            vars.put("labelItemTotal",   t(lang, "newOrderNotification.labelItemTotal",   "Total"));
            vars.put("outro",            t(lang, "newOrderNotification.outro",            "Log in to manage this order."));
            vars.put("btnManageOrder",   t(lang, "newOrderNotification.btnManageOrder",   "Manage Order"));
            addFooter(lang, vars);

            if (items != null && !items.isEmpty()) {
                vars.put("hasItems", true);
                List<Map<String, Object>> itemList = new ArrayList<>();
                for (OrderItem item : items) {
                    Map<String, Object> row = new HashMap<>();
                    row.put("name",         item.getName() != null ? item.getName() : item.getProductName());
                    row.put("variantTitle", item.getVariantTitle());
                    row.put("quantity",     item.getQuantity());
                    row.put("price",        item.getPrice() != null ? String.format("%.2f", item.getPrice()) : "-");
                    row.put("total",        item.getTotal() != null ? String.format("%.2f", item.getTotal()) : "-");
                    row.put("currency",     "MAD");
                    itemList.add(row);
                }
                vars.put("items", itemList);
            }

            String subjectTpl = t(lang, "newOrderNotification.subject",
                    "🛒 New Order #{{orderNumber}} - {{storeName}}");
            sendHtml(ownerEmail, templateService.renderSubject(subjectTpl, vars),
                     templateService.render("new-order-notification.html", lang, vars));
            log.info("New order notification (HTML/{}) sent to owner: {} order: {}", lang, ownerEmail, orderNumber);
        } catch (Exception e) {
            log.error("Failed to send new order notification to owner: {}", ownerEmail, e);
        }
    }

    // ==================================================================================
    // ORDER E-MAILS
    // ==================================================================================

    /**
     * Order Confirmation mit strukturiertem Delivery-Result.
     * Verwendet den zentralen EmailDeliveryService für Fehlerklassifizierung.
     */
    public EmailDeliveryResult sendOrderConfirmationWithResult(
            String toEmail, String orderNumber, String storeName,
            Double totalAmount, List<OrderItem> items,
            String storeLogo, String lang) {
        
        if (!mailEnabled) {
            log.info("Mail disabled – order confirmation to masked recipient");
            return EmailDeliveryResult.success();
        }

        try {
            Map<String, Object> vars = new HashMap<>();
            vars.put("orderNumber",       orderNumber);
            vars.put("storeName",         storeName);
            vars.put("totalAmount",       String.format("%.2f", totalAmount));
            vars.put("currency",          "MAD");
            vars.put("storeLogo",         storeLogo);
            vars.put("orderUrl",          baseUrl + "/customer/orders");
            vars.put("greeting",          buildGreeting(lang, null));
            vars.put("title",             t(lang, "orderConfirmation.title",            "Order Confirmed!"));
            vars.put("intro",             t(lang, "orderConfirmation.intro",            "Thank you for your order!"));
            vars.put("labelOrderNumber",  t(lang, "orderConfirmation.labelOrderNumber", "Order Number"));
            vars.put("labelStore",        t(lang, "orderConfirmation.labelStore",       "Store"));
            vars.put("labelTotal",        t(lang, "orderConfirmation.labelTotal",       "Total"));
            vars.put("labelItems",        t(lang, "orderConfirmation.labelItems",       "Items"));
            vars.put("labelShipping",     t(lang, "orderConfirmation.labelShipping",    "Shipping Address"));
            vars.put("labelProduct",      t(lang, "orderConfirmation.labelProduct",     "Item"));
            vars.put("labelQty",          t(lang, "orderConfirmation.labelQty",         "Qty"));
            vars.put("labelPrice",        t(lang, "orderConfirmation.labelPrice",       "Price"));
            vars.put("labelItemTotal",    t(lang, "orderConfirmation.labelItemTotal",   "Total"));
            vars.put("outro",             t(lang, "orderConfirmation.outro",            "You will be notified when shipped."));
            vars.put("btnViewOrder",      t(lang, "btnViewOrder",                       "View Order"));
            addFooter(lang, vars);

            if (items != null && !items.isEmpty()) {
                vars.put("hasItems", true);
                List<Map<String, Object>> itemList = new ArrayList<>();
                for (OrderItem item : items) {
                    Map<String, Object> row = new HashMap<>();
                    row.put("name",         item.getName() != null ? item.getName() : item.getProductName());
                    row.put("variantTitle", item.getVariantTitle());
                    row.put("quantity",     item.getQuantity());
                    row.put("price",        item.getPrice() != null ? String.format("%.2f", item.getPrice()) : "-");
                    row.put("total",        item.getTotal() != null ? String.format("%.2f", item.getTotal()) : "-");
                    row.put("currency",     "MAD");
                    itemList.add(row);
                }
                vars.put("items", itemList);
            }

            String subjectTpl = t(lang, "orderConfirmation.subject",
                    "Order Confirmation #{{orderNumber}} - {{storeName}}");
            String subject = templateService.renderSubject(subjectTpl, vars);
            String htmlBody = templateService.render("order-confirmation.html", lang, vars);

            MimeMessage message = buildHtmlMessage(toEmail, subject, htmlBody);
            EmailDeliveryResult result = emailDeliveryService.send(message, "ORDER_CONFIRMATION");

            if (result.isSent()) {
                log.info("Order confirmation sent: order={}, lang={}", 
                    orderNumber, lang);
            } else {
                log.warn("Order confirmation failed: order={}, errorCode={}", 
                    orderNumber, result.errorCode());
            }

            return result;

        } catch (Exception e) {
            log.error("Order confirmation preparation failed: order={}", 
                orderNumber, e);
            return EmailDeliveryResult.temporaryFailure(
                "TEMPLATE_ERROR",
                "Die E-Mail konnte nicht vorbereitet werden."
            );
        }
    }

    /** Rückwärtskompatibel – delegiert an WithResult-Methode */
    @Deprecated
    public void sendOrderConfirmation(String toEmail, String orderNumber, String storeName,
                                      Double totalAmount, List<OrderItem> items,
                                      String storeLogo, String lang) {
        EmailDeliveryResult result = sendOrderConfirmationWithResult(
            toEmail, orderNumber, storeName, totalAmount, items, storeLogo, lang
        );
        if (!result.isSent()) {
            log.warn("Order confirmation delivery failed (deprecated method): order={}, errorCode={}", 
                orderNumber, result.errorCode());
        }
    }

    /** Rückwärtskompatibel */
    @Deprecated
    public void sendOrderConfirmation(String toEmail, String orderNumber, String storeName, Double totalAmount) {
        sendOrderConfirmation(toEmail, orderNumber, storeName, totalAmount, new ArrayList<>(), null, "en");
    }

    /**
     * Shipping Notification mit strukturiertem Delivery-Result.
     * Verwendet den zentralen EmailDeliveryService für Fehlerklassifizierung.
     */
    public EmailDeliveryResult sendShippingNotificationWithResult(
            String toEmail, String orderNumber, String storeName,
            String trackingNumber, String trackingUrl,
            String carrier, String storeLogo, String lang) {
        
        if (!mailEnabled) {
            log.info("Mail disabled – shipping notification to masked recipient");
            return EmailDeliveryResult.success();
        }

        try {
            Map<String, Object> vars = new HashMap<>();
            vars.put("orderNumber",      orderNumber);
            vars.put("storeName",        storeName);
            vars.put("trackingNumber",   trackingNumber);
            vars.put("trackingUrl",      trackingUrl);
            vars.put("carrier",          carrier);
            vars.put("storeLogo",        storeLogo);
            vars.put("orderUrl",         baseUrl + "/customer/orders");
            vars.put("hasTracking",      trackingNumber != null && !trackingNumber.isBlank());
            vars.put("greeting",         buildGreeting(lang, null));
            vars.put("title",            t(lang, "shipping.title",            "Your Order Is On Its Way!"));
            vars.put("intro",            t(lang, "shipping.intro",            "Your order has been shipped."));
            vars.put("labelOrderNumber", t(lang, "shipping.labelOrderNumber", "Order Number"));
            vars.put("labelStore",       t(lang, "orderConfirmation.labelStore", "Store"));
            vars.put("labelTracking",    t(lang, "shipping.labelTracking",    "Tracking Number"));
            vars.put("labelCarrier",     t(lang, "shipping.labelCarrier",     "Carrier"));
            vars.put("outro",            t(lang, "shipping.outro",            "Your package is on its way."));
            vars.put("noTracking",       t(lang, "shipping.noTracking",       "Tracking info coming soon."));
            vars.put("btnTrack",         t(lang, "shipping.btnTrack",         "Track Shipment"));
            vars.put("btnViewOrder",     t(lang, "btnViewOrder",              "View Order"));
            addFooter(lang, vars);

            String subjectTpl = t(lang, "shipping.subject",
                    "Your Order #{{orderNumber}} Has Been Shipped - {{storeName}}");
            String subject = templateService.renderSubject(subjectTpl, vars);
            String htmlBody = templateService.render("shipping-notification.html", lang, vars);

            MimeMessage message = buildHtmlMessage(toEmail, subject, htmlBody);
            EmailDeliveryResult result = emailDeliveryService.send(message, "SHIPPING_NOTIFICATION");

            if (result.isSent()) {
                log.info("Shipping notification sent: order={}, lang={}", 
                    orderNumber, lang);
            } else {
                log.warn("Shipping notification failed: order={}, errorCode={}", 
                    orderNumber, result.errorCode());
            }

            return result;

        } catch (Exception e) {
            log.error("Shipping notification preparation failed: order={}", 
                orderNumber, e);
            return EmailDeliveryResult.temporaryFailure(
                "TEMPLATE_ERROR",
                "Die E-Mail konnte nicht vorbereitet werden."
            );
        }
    }

    /** Rückwärtskompatibel – delegiert an WithResult-Methode */
    @Deprecated
    public void sendShippingNotification(String toEmail, String orderNumber, String storeName,
                                         String trackingNumber, String trackingUrl,
                                         String carrier, String storeLogo, String lang) {
        EmailDeliveryResult result = sendShippingNotificationWithResult(
            toEmail, orderNumber, storeName, trackingNumber, trackingUrl, carrier, storeLogo, lang
        );
        if (!result.isSent()) {
            log.warn("Shipping notification delivery failed (deprecated method): order={}, errorCode={}", 
                orderNumber, result.errorCode());
        }
    }

    /** Rückwärtskompatibel */
    @Deprecated
    public void sendShippingNotification(String toEmail, String orderNumber, String storeName, String trackingNumber) {
        sendShippingNotification(toEmail, orderNumber, storeName, trackingNumber, null, null, null, "en");
    }

    public void sendDeliveryConfirmation(String toEmail, String orderNumber, String storeName,
                                         String storeLogo, String lang) {
        if (!mailEnabled) { log.info("Mail disabled – delivery confirmation to: {}", toEmail); return; }
        try {
            Map<String, Object> vars = new HashMap<>();
            vars.put("orderNumber",      orderNumber);
            vars.put("storeName",        storeName);
            vars.put("storeLogo",        storeLogo);
            vars.put("orderUrl",         baseUrl + "/customer/orders");
            vars.put("greeting",         buildGreeting(lang, null));
            vars.put("title",            t(lang, "delivery.title",            "Order Delivered!"));
            vars.put("intro",            t(lang, "delivery.intro",            "Your order has been delivered."));
            vars.put("labelOrderNumber", t(lang, "delivery.labelOrderNumber", "Order Number"));
            vars.put("labelStore",       t(lang, "orderConfirmation.labelStore", "Store"));
            vars.put("rating",           t(lang, "delivery.rating",           "How was your experience?"));
            vars.put("outro",            templateService.renderSubject(
                                             t(lang, "delivery.outro", "Thank you for shopping at {{storeName}}!"), vars));
            vars.put("btnViewOrder",     t(lang, "btnViewOrder", "View Order"));
            addFooter(lang, vars);

            String subjectTpl = t(lang, "delivery.subject",
                    "Your Order #{{orderNumber}} Has Been Delivered - {{storeName}}");
            sendHtml(toEmail, templateService.renderSubject(subjectTpl, vars),
                     templateService.render("delivery-confirmation.html", lang, vars));
            log.info("Delivery confirmation (HTML/{}) sent to: {} order: {}", lang, toEmail, orderNumber);
        } catch (Exception e) {
            log.error("Failed to send delivery confirmation to: {}", toEmail, e);
        }
    }

    /** Rückwärtskompatibel */
    public void sendOrderCancellation(String toEmail, String orderNumber, String storeName, String reason) {
        sendOrderCancellation(toEmail, orderNumber, storeName, reason, null, "en");
    }

    public void sendOrderCancellation(String toEmail, String orderNumber, String storeName,
                                      String reason, String storeLogo, String lang) {
        if (!mailEnabled) { log.info("Mail disabled – order cancellation to: {}", toEmail); return; }
        try {
            Map<String, Object> vars = new HashMap<>();
            vars.put("orderNumber",      orderNumber);
            vars.put("storeName",        storeName);
            vars.put("storeLogo",        storeLogo);
            vars.put("reason",           reason);
            vars.put("greeting",         buildGreeting(lang, null));
            vars.put("title",            t(lang, "cancellation.title",            "Order Cancelled"));
            vars.put("intro",            t(lang, "cancellation.intro",            "Your order has been cancelled."));
            vars.put("labelOrderNumber", t(lang, "cancellation.labelOrderNumber", "Order Number"));
            vars.put("labelStore",       t(lang, "orderConfirmation.labelStore",  "Store"));
            vars.put("labelReason",      t(lang, "cancellation.labelReason",      "Reason"));
            vars.put("outro",            t(lang, "cancellation.outro",            "Contact support for questions."));
            vars.put("btnSupport",       t(lang, "btnSupport",                    "Contact Support"));
            addFooter(lang, vars);

            String subjectTpl = t(lang, "cancellation.subject",
                    "Order #{{orderNumber}} Cancelled - {{storeName}}");
            sendHtml(toEmail, templateService.renderSubject(subjectTpl, vars),
                     templateService.render("order-cancellation.html", lang, vars));
            log.info("Order cancellation (HTML/{}) sent to: {} order: {}", lang, toEmail, orderNumber);
        } catch (Exception e) {
            log.error("Failed to send order cancellation to: {}", toEmail, e);
        }
    }

    // ==================================================================================
    // SUBSCRIPTION E-MAILS
    // ==================================================================================

    public void sendSubscriptionRenewalReminder(String toEmail, String name, String planName,
                                                long daysLeft, Double amount, String currency,
                                                java.time.LocalDateTime renewalDate, String lang) {
        if (!mailEnabled) { log.info("Mail disabled – renewal reminder to: {}", toEmail); return; }
        try {
            Map<String, Object> vars = new HashMap<>();
            vars.put("planName",     planName);
            vars.put("daysLeft",     daysLeft);
            vars.put("amount",       amount != null ? String.format("%.2f", amount) : "-");
            vars.put("currency",     currency != null ? currency : "EUR");
            vars.put("renewalDate",  renewalDate != null ? renewalDate.toLocalDate().toString() : "-");
            vars.put("manageUrl",    baseUrl + "/subscription");
            vars.put("greeting",     buildGreeting(lang, name));
            vars.put("title",        t(lang, "subscription.reminder.title", "Your subscription renews soon"));
            vars.put("intro",        t(lang, "subscription.reminder.intro", "Your subscription will renew automatically."));
            vars.put("labelPlan",    t(lang, "subscription.labelPlan",      "Plan"));
            vars.put("labelDaysLeft",t(lang, "subscription.labelDaysLeft",  "Days left"));
            vars.put("labelAmount",  t(lang, "subscription.labelAmount",    "Amount"));
            vars.put("labelRenewal", t(lang, "subscription.labelRenewal",   "Renewal date"));
            vars.put("outro",        t(lang, "subscription.reminder.outro", "You can cancel anytime in your account."));
            vars.put("btnManage",    t(lang, "subscription.btnManage",      "Manage Subscription"));
            addFooter(lang, vars);

            String subject = templateService.renderSubject(
                t(lang, "subscription.reminder.subject", "Your subscription renews in {{daysLeft}} days"), vars);
            sendHtml(toEmail, subject, templateService.render("subscription-renewal-reminder.html", lang, vars));
            log.info("Subscription reminder (HTML/{}) sent to: {} ({} days left)", lang, toEmail, daysLeft);
        } catch (Exception e) {
            log.error("Failed to send renewal reminder to: {}", toEmail, e);
        }
    }

    public void sendSubscriptionRenewed(String toEmail, String name, String planName,
                                        Double amount, String currency,
                                        java.time.LocalDateTime nextRenewalDate, String lang) {
        if (!mailEnabled) { log.info("Mail disabled – subscription renewed to: {}", toEmail); return; }
        try {
            Map<String, Object> vars = new HashMap<>();
            vars.put("planName",     planName);
            vars.put("amount",       amount != null ? String.format("%.2f", amount) : "-");
            vars.put("currency",     currency != null ? currency : "EUR");
            vars.put("nextRenewal",  nextRenewalDate != null ? nextRenewalDate.toLocalDate().toString() : "-");
            vars.put("manageUrl",    baseUrl + "/subscription");
            vars.put("greeting",     buildGreeting(lang, name));
            vars.put("title",        t(lang, "subscription.renewed.title", "Subscription renewed"));
            vars.put("intro",        t(lang, "subscription.renewed.intro", "Your subscription has been renewed successfully."));
            vars.put("labelPlan",    t(lang, "subscription.labelPlan",     "Plan"));
            vars.put("labelAmount",  t(lang, "subscription.labelAmount",   "Amount"));
            vars.put("labelNext",    t(lang, "subscription.labelNext",     "Next renewal"));
            vars.put("outro",        t(lang, "subscription.renewed.outro", "Thank you for staying with us!"));
            vars.put("btnManage",    t(lang, "subscription.btnManage",     "Manage Subscription"));
            addFooter(lang, vars);

            String subject = templateService.renderSubject(
                t(lang, "subscription.renewed.subject", "Your {{planName}} subscription has been renewed"), vars);
            sendHtml(toEmail, subject, templateService.render("subscription-renewed.html", lang, vars));
            log.info("Subscription renewed mail (HTML/{}) sent to: {}", lang, toEmail);
        } catch (Exception e) {
            log.error("Failed to send renewal mail to: {}", toEmail, e);
        }
    }

    public void sendSubscriptionExpired(String toEmail, String name, String planName, String lang) {
        if (!mailEnabled) { log.info("Mail disabled – subscription expired to: {}", toEmail); return; }
        try {
            Map<String, Object> vars = new HashMap<>();
            vars.put("planName",     planName);
            vars.put("upgradeUrl",   baseUrl + "/subscription");
            vars.put("greeting",     buildGreeting(lang, name));
            vars.put("title",        t(lang, "subscription.expired.title",  "Subscription expired"));
            vars.put("intro",        t(lang, "subscription.expired.intro",  "Your subscription has expired. You have been moved to the Free plan."));
            vars.put("outro",        t(lang, "subscription.expired.outro",  "Re-activate anytime to regain premium features."));
            vars.put("btnUpgrade",   t(lang, "subscription.btnUpgrade",     "Upgrade Now"));
            addFooter(lang, vars);

            String subject = templateService.renderSubject(
                t(lang, "subscription.expired.subject", "Your {{planName}} subscription has expired"), vars);
            sendHtml(toEmail, subject, templateService.render("subscription-expired.html", lang, vars));
            log.info("Subscription expired mail (HTML/{}) sent to: {}", lang, toEmail);
        } catch (Exception e) {
            log.error("Failed to send expired mail to: {}", toEmail, e);
        }
    }

    public void sendSubscriptionCancelled(String toEmail, String name, String planName,
                                          java.time.LocalDateTime endDate, String lang) {
        if (!mailEnabled) { log.info("Mail disabled – subscription cancelled to: {}", toEmail); return; }
        try {
            Map<String, Object> vars = new HashMap<>();
            vars.put("planName",      planName);
            vars.put("endDate",       endDate != null ? endDate.toLocalDate().toString() : "-");
            vars.put("reactivateUrl", baseUrl + "/subscription");
            vars.put("greeting",      buildGreeting(lang, name));
            vars.put("title",         t(lang, "subscription.cancelled.title",  "Subscription cancelled"));
            vars.put("intro",         t(lang, "subscription.cancelled.intro",  "Your subscription has been cancelled as requested."));
            vars.put("labelPlan",     t(lang, "subscription.labelPlan",        "Plan"));
            vars.put("labelEnd",      t(lang, "subscription.labelEnd",         "End date"));
            vars.put("outro",         t(lang, "subscription.cancelled.outro",  "We'd love to have you back anytime!"));
            vars.put("btnReactivate", t(lang, "subscription.btnReactivate",    "Reactivate"));
            addFooter(lang, vars);

            String subject = templateService.renderSubject(
                t(lang, "subscription.cancelled.subject", "Your {{planName}} subscription has been cancelled"), vars);
            sendHtml(toEmail, subject, templateService.render("subscription-cancelled.html", lang, vars));
            log.info("Subscription cancelled mail (HTML/{}) sent to: {}", lang, toEmail);
        } catch (Exception e) {
            log.error("Failed to send cancelled mail to: {}", toEmail, e);
        }
    }

    public void sendSubscriptionUpgraded(String toEmail, String name, String oldPlanName,
                                         String newPlanName, String lang) {
        if (!mailEnabled) { log.info("Mail disabled – subscription upgraded to: {}", toEmail); return; }
        try {
            Map<String, Object> vars = new HashMap<>();
            vars.put("oldPlanName", oldPlanName);
            vars.put("newPlanName", newPlanName);
            vars.put("dashboardUrl", baseUrl + "/dashboard");
            vars.put("greeting",     buildGreeting(lang, name));
            vars.put("title",        t(lang, "subscription.upgraded.title", "Welcome to {{newPlanName}}!"));
            vars.put("intro",        t(lang, "subscription.upgraded.intro", "Your subscription has been upgraded successfully."));
            vars.put("labelOldPlan", t(lang, "subscription.labelOldPlan",   "Previous plan"));
            vars.put("labelNewPlan", t(lang, "subscription.labelNewPlan",   "New plan"));
            vars.put("outro",        t(lang, "subscription.upgraded.outro", "Enjoy your new features!"));
            vars.put("btnDashboard", t(lang, "subscription.btnDashboard",   "Go to Dashboard"));
            addFooter(lang, vars);

            String subject = templateService.renderSubject(
                t(lang, "subscription.upgraded.subject", "Welcome to {{newPlanName}}!"), vars);
            sendHtml(toEmail, subject, templateService.render("subscription-upgraded.html", lang, vars));
            log.info("Subscription upgraded mail (HTML/{}) sent to: {}", lang, toEmail);
        } catch (Exception e) {
            log.error("Failed to send upgraded mail to: {}", toEmail, e);
        }
    }

    // ==================================================================================
    // CART E-MAILS (Abandoned Cart Reminder)
    // ==================================================================================

    /**
     * Sendet eine Erinnerung an einen verlassenen Warenkorb.
     * @param items Liste von Maps mit Keys: name, variantTitle, quantity, price, total, currency
     */
    public void sendAbandonedCartReminder(String toEmail, String name, String storeName,
                                          String storeLogo, int itemCount, Double totalAmount,
                                          String currency, java.util.List<Map<String, Object>> items,
                                          String cartUrl, String lang) {
        if (!mailEnabled) { log.info("Mail disabled – abandoned cart reminder to: {}", toEmail); return; }
        try {
            Map<String, Object> vars = new HashMap<>();
            vars.put("storeName",        storeName);
            vars.put("storeLogo",        storeLogo);
            vars.put("itemCount",        itemCount);
            vars.put("totalAmount",      totalAmount != null ? String.format("%.2f", totalAmount) : "-");
            vars.put("currency",         currency != null ? currency : "MAD");
            vars.put("cartUrl",          cartUrl != null ? cartUrl : (baseUrl + "/cart"));
            vars.put("greeting",         buildGreeting(lang, name));
            vars.put("title",            t(lang, "cart.abandoned.title",         "You left items in your cart"));
            vars.put("intro",            t(lang, "cart.abandoned.intro",         "Your cart is still waiting for you!"));
            vars.put("labelStore",       t(lang, "orderConfirmation.labelStore", "Store"));
            vars.put("labelItems",       t(lang, "cart.abandoned.labelItems",    "Items"));
            vars.put("labelTotal",       t(lang, "orderConfirmation.labelTotal", "Total"));
            vars.put("labelProduct",     t(lang, "orderConfirmation.labelProduct","Item"));
            vars.put("labelQty",         t(lang, "orderConfirmation.labelQty",   "Qty"));
            vars.put("labelPrice",       t(lang, "orderConfirmation.labelPrice", "Price"));
            vars.put("labelItemTotal",   t(lang, "orderConfirmation.labelItemTotal","Total"));
            vars.put("outro",            t(lang, "cart.abandoned.outro",         "Complete your order before items sell out."));
            vars.put("btnCheckout",      t(lang, "cart.abandoned.btnCheckout",   "Return to Cart"));
            addFooter(lang, vars);

            if (items != null && !items.isEmpty()) {
                vars.put("hasItems", true);
                vars.put("items", items);
            }

            String subjectTpl = t(lang, "cart.abandoned.subject",
                    "You left {{itemCount}} items in your cart - {{storeName}}");
            sendHtml(toEmail, templateService.renderSubject(subjectTpl, vars),
                     templateService.render("cart-abandoned.html", lang, vars));
            log.info("Abandoned cart reminder (HTML/{}) sent to: {} ({} items)", lang, toEmail, itemCount);
        } catch (Exception e) {
            log.error("Failed to send abandoned cart reminder to: {}", toEmail, e);
        }
    }

    // ==================================================================================
    // Private Helpers
    // ==================================================================================

    private void sendHtml(String to, String subject, String html) throws Exception {
        MimeMessage mime = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(mime, true, "UTF-8");
        helper.setFrom(fromEmail);
        helper.setTo(to);
        helper.setSubject(subject);
        helper.setText(html, true);
        mailSender.send(mime);
    }
    
    /**
     * Erstellt MimeMessage ohne zu senden (für EmailDeliveryService)
     */
    private MimeMessage buildHtmlMessage(String to, String subject, String html) throws Exception {
        MimeMessage mime = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(mime, true, "UTF-8");
        helper.setFrom(fromEmail);
        helper.setTo(to);
        helper.setSubject(subject);
        helper.setText(html, true);
        return mime;
    }

    /** Baut die Begrüßungszeile je Sprache */
    private String buildGreeting(String lang, String name) {
        Map<String, Object> vars = new HashMap<>();
        vars.put("name", name != null ? name : "");
        String template = (name != null && !name.isBlank())
            ? t(lang, "greeting",      "Hello {{name}},")
            : t(lang, "greetingGuest", "Hello,");
        return templateService.renderSubject(template, vars);
    }

    /** Footer-Variablen befüllen */
    private void addFooter(String lang, Map<String, Object> vars) {
        vars.put("footerTeam",        t(lang, "footerTeam",        "Your Markt.ma Team"));
        vars.put("footerSupport",     t(lang, "footerSupport",     "support@markt.ma"));
        vars.put("footerUnsubscribe", t(lang, "footerUnsubscribe", ""));
        vars.put("logoUrl",           baseUrl + "/assets/images/logo.svg");
    }

    /**
     * Holt einen i18n-Wert aus dem EmailTemplateService.
     * Der Key ist relativ zum "email"-Block (z.B. "verification.title").
     * Nutzt einen Mini-Render mit 1x1-Map um den Wert zu extrahieren.
     */
    private String t(String lang, String key, String fallback) {
        return templateService.getI18nValue(lang, key, fallback);
    }
}
