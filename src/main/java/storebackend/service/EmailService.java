package storebackend.service;

import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
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

    @Value("${spring.mail.from:noreply@markt.ma}")
    private String fromEmail;

    @Value("${app.base-url:https://markt.ma}")
    private String baseUrl;

    @Value("${mail.enabled:false}")
    private boolean mailEnabled;

    // ==================================================================================
    // AUTH E-MAILS
    // ==================================================================================

    /** Rückwärtskompatibel – Default-Sprache "en" */
    public void sendVerificationEmail(String toEmail, String token) {
        sendVerificationEmail(toEmail, token, "en");
    }

    public void sendVerificationEmail(String toEmail, String token, String lang) {
        if (!mailEnabled) {
            log.info("Mail disabled – verification URL: {}/verify?token={}", baseUrl, token);
            return;
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
            sendHtml(toEmail, subject, templateService.render("email-verification.html", lang, vars));
            log.info("Verification email (HTML/{}) sent to: {}", lang, toEmail);
        } catch (Exception e) {
            log.error("Failed to send verification email to: {}", toEmail, e);
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

    public void sendPasswordResetEmail(String toEmail, String token) {
        sendPasswordResetEmail(toEmail, token, "en");
    }

    public void sendPasswordResetEmail(String toEmail, String token, String lang) {
        if (!mailEnabled) {
            log.info("Mail disabled – reset URL: {}/reset-password?token={}", baseUrl, token);
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
    // ORDER E-MAILS
    // ==================================================================================

    /** Rückwärtskompatibel */
    public void sendOrderConfirmation(String toEmail, String orderNumber, String storeName, Double totalAmount) {
        sendOrderConfirmation(toEmail, orderNumber, storeName, totalAmount, new ArrayList<>(), null, "en");
    }

    public void sendOrderConfirmation(String toEmail, String orderNumber, String storeName,
                                      Double totalAmount, List<OrderItem> items,
                                      String storeLogo, String lang) {
        if (!mailEnabled) { log.info("Mail disabled – order confirmation to: {}", toEmail); return; }
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
            sendHtml(toEmail, templateService.renderSubject(subjectTpl, vars),
                     templateService.render("order-confirmation.html", lang, vars));
            log.info("Order confirmation (HTML/{}) sent to: {} order: {}", lang, toEmail, orderNumber);
        } catch (Exception e) {
            log.error("Failed to send order confirmation to: {}", toEmail, e);
        }
    }

    /** Rückwärtskompatibel */
    public void sendShippingNotification(String toEmail, String orderNumber, String storeName, String trackingNumber) {
        sendShippingNotification(toEmail, orderNumber, storeName, trackingNumber, null, null, null, "en");
    }

    public void sendShippingNotification(String toEmail, String orderNumber, String storeName,
                                         String trackingNumber, String trackingUrl,
                                         String carrier, String storeLogo, String lang) {
        if (!mailEnabled) { log.info("Mail disabled – shipping notification to: {}", toEmail); return; }
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
            sendHtml(toEmail, templateService.renderSubject(subjectTpl, vars),
                     templateService.render("shipping-notification.html", lang, vars));
            log.info("Shipping notification (HTML/{}) sent to: {} order: {}", lang, toEmail, orderNumber);
        } catch (Exception e) {
            log.error("Failed to send shipping notification to: {}", toEmail, e);
        }
    }

    /** Rückwärtskompatibel */
    public void sendDeliveryConfirmation(String toEmail, String orderNumber, String storeName) {
        sendDeliveryConfirmation(toEmail, orderNumber, storeName, null, "en");
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
