package storebackend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.from:noreply@markt.ma}")
    private String fromEmail;

    @Value("${app.base-url:http://localhost:4200}")
    private String baseUrl;

    @Value("${mail.enabled:false}")
    private boolean mailEnabled;

    /**
     * Sendet eine Email-Verification-Email an den User
     * WICHTIG: Diese Methode wirft KEINE Exceptions mehr,
     * um Transaktions-Rollbacks zu vermeiden
     */
    public void sendVerificationEmail(String toEmail, String token) {
        if (!mailEnabled) {
            log.info("Mail disabled - skipping verification email to: {}", toEmail);
            log.info("Verification URL (for testing): {}/verify?token={}", baseUrl, token);
            return;
        }

        try {
            String verificationUrl = baseUrl + "/verify?token=" + token;

            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(toEmail);
            message.setSubject("Verify your email address - Markt.ma");
            message.setText(
                "Welcome to Markt.ma!\n\n" +
                "Please verify your email address by clicking the link below:\n\n" +
                verificationUrl + "\n\n" +
                "This link will expire in 24 hours.\n\n" +
                "If you did not create an account, please ignore this email.\n\n" +
                "Best regards,\n" +
                "Your Markt.ma Team"
            );

            mailSender.send(message);
            log.info("Verification email sent successfully to: {}", toEmail);
        } catch (Exception e) {
            log.error("Failed to send verification email to: {}", toEmail, e);
            // ❌ NICHT mehr werfen - nur loggen
        }
    }

    /**
     * Sendet eine Bestätigungs-Email nach erfolgreicher Verification
     */
    public void sendWelcomeEmail(String toEmail, String name) {
        if (!mailEnabled) {
            log.info("Mail disabled - skipping welcome email to: {}", toEmail);
            return;
        }

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(toEmail);
            message.setSubject("Welcome! Your email has been verified - Markt.ma");
            message.setText(
                "Hi " + (name != null ? name : "there") + ",\n\n" +
                "Your email address has been successfully verified!\n\n" +
                "You can now log in and enjoy all features of Markt.ma.\n\n" +
                "Best regards,\n" +
                "Your Markt.ma Team"
            );

            mailSender.send(message);
            log.info("Welcome email sent successfully to: {}", toEmail);
        } catch (Exception e) {
            log.error("Failed to send welcome email to: {}", toEmail, e);
            // Don't throw exception here - welcome email is optional
        }
    }

    /**
     * Sendet eine Password-Reset-Email mit Token-Link
     */
    public void sendPasswordResetEmail(String toEmail, String token) {
        if (!mailEnabled) {
            log.info("Mail disabled - skipping password reset email to: {}", toEmail);
            log.info("Password reset URL (for testing): {}/reset-password?token={}", baseUrl, token);
            return;
        }

        try {
            String resetUrl = baseUrl + "/reset-password?token=" + token;

            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(toEmail);
            message.setSubject("Reset your password - Markt.ma");
            message.setText(
                "Hello,\n\n" +
                "We received a request to reset your password.\n\n" +
                "Click the link below to reset your password:\n\n" +
                resetUrl + "\n\n" +
                "This link will expire in 1 hour.\n\n" +
                "If you did not request a password reset, please ignore this email. " +
                "Your password will remain unchanged.\n\n" +
                "Best regards,\n" +
                "Your Markt.ma Team"
            );

            mailSender.send(message);
            log.info("Password reset email sent successfully to: {}", toEmail);
        } catch (Exception e) {
            log.error("Failed to send password reset email to: {}", toEmail, e);
            // ❌ NICHT mehr werfen - auch hier nur loggen
        }
    }

    /**
     * Sendet eine Bestätigungs-Email nach erfolgreichem Password-Reset
     */
    public void sendPasswordResetConfirmationEmail(String toEmail, String name) {
        if (!mailEnabled) {
            log.info("Mail disabled - skipping password reset confirmation email to: {}", toEmail);
            return;
        }

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(toEmail);
            message.setSubject("Your password has been changed - Markt.ma");
            message.setText(
                "Hi " + (name != null ? name : "there") + ",\n\n" +
                "This is a confirmation that your password has been successfully changed.\n\n" +
                "If you did not make this change, please contact our support immediately.\n\n" +
                "Best regards,\n" +
                "Your Markt.ma Team"
            );

            mailSender.send(message);
            log.info("Password reset confirmation email sent successfully to: {}", toEmail);
        } catch (Exception e) {
            log.error("Failed to send password reset confirmation email to: {}", toEmail, e);
            // Don't throw exception here - confirmation email is optional
        }
    }

    /**
     * Sendet eine Bestellbestätigung an den Kunden
     */
    public void sendOrderConfirmation(String toEmail, String orderNumber, String storeName, Double totalAmount) {
        if (!mailEnabled) {
            log.info("Mail disabled - skipping order confirmation to: {}", toEmail);
            return;
        }

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(toEmail);
            message.setSubject("Bestellbestätigung #" + orderNumber + " - " + storeName);
            message.setText(
                "Vielen Dank für Ihre Bestellung!\n\n" +
                "Ihre Bestellung wurde erfolgreich aufgegeben:\n\n" +
                "Bestellnummer: " + orderNumber + "\n" +
                "Shop: " + storeName + "\n" +
                "Gesamtbetrag: " + String.format("%.2f", totalAmount) + " €\n\n" +
                "Sie erhalten eine weitere E-Mail, sobald Ihre Bestellung versendet wird.\n\n" +
                "Sie können den Status Ihrer Bestellung hier verfolgen:\n" +
                baseUrl + "/customer/orders\n\n" +
                "Bei Fragen stehen wir Ihnen gerne zur Verfügung.\n\n" +
                "Mit freundlichen Grüßen,\n" +
                storeName
            );

            mailSender.send(message);
            log.info("Order confirmation sent to: {} for order: {}", toEmail, orderNumber);
        } catch (Exception e) {
            log.error("Failed to send order confirmation to: {}", toEmail, e);
        }
    }

    /**
     * Sendet eine Versandbenachrichtigung an den Kunden
     */
    public void sendShippingNotification(String toEmail, String orderNumber, String storeName, String trackingNumber) {
        if (!mailEnabled) {
            log.info("Mail disabled - skipping shipping notification to: {}", toEmail);
            return;
        }

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(toEmail);
            message.setSubject("Ihre Bestellung wurde versendet #" + orderNumber + " - " + storeName);

            String trackingInfo = trackingNumber != null && !trackingNumber.isEmpty()
                ? "Sendungsverfolgungsnummer: " + trackingNumber + "\n\n"
                : "";

            message.setText(
                "Gute Nachrichten!\n\n" +
                "Ihre Bestellung wurde versendet:\n\n" +
                "Bestellnummer: " + orderNumber + "\n" +
                "Shop: " + storeName + "\n" +
                trackingInfo +
                "Sie sollten Ihr Paket in den nächsten Tagen erhalten.\n\n" +
                "Status verfolgen:\n" +
                baseUrl + "/customer/orders\n\n" +
                "Mit freundlichen Grüßen,\n" +
                storeName
            );

            mailSender.send(message);
            log.info("Shipping notification sent to: {} for order: {}", toEmail, orderNumber);
        } catch (Exception e) {
            log.error("Failed to send shipping notification to: {}", toEmail, e);
        }
    }

    /**
     * Sendet eine Lieferbestätigung an den Kunden
     */
    public void sendDeliveryConfirmation(String toEmail, String orderNumber, String storeName) {
        if (!mailEnabled) {
            log.info("Mail disabled - skipping delivery confirmation to: {}", toEmail);
            return;
        }

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(toEmail);
            message.setSubject("Ihre Bestellung wurde zugestellt #" + orderNumber + " - " + storeName);
            message.setText(
                "Ihre Bestellung wurde erfolgreich zugestellt!\n\n" +
                "Bestellnummer: " + orderNumber + "\n" +
                "Shop: " + storeName + "\n\n" +
                "Wir hoffen, dass Sie mit Ihrer Bestellung zufrieden sind.\n\n" +
                "Falls Sie Fragen oder Probleme haben, kontaktieren Sie uns bitte.\n\n" +
                "Vielen Dank für Ihren Einkauf!\n\n" +
                "Mit freundlichen Grüßen,\n" +
                storeName
            );

            mailSender.send(message);
            log.info("Delivery confirmation sent to: {} for order: {}", toEmail, orderNumber);
        } catch (Exception e) {
            log.error("Failed to send delivery confirmation to: {}", toEmail, e);
        }
    }

    /**
     * Sendet eine Stornierungsbenachrichtigung an den Kunden
     */
    public void sendOrderCancellation(String toEmail, String orderNumber, String storeName, String reason) {
        if (!mailEnabled) {
            log.info("Mail disabled - skipping order cancellation to: {}", toEmail);
            return;
        }

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(toEmail);
            message.setSubject("Bestellung storniert #" + orderNumber + " - " + storeName);

            String reasonText = reason != null && !reason.isEmpty()
                ? "\n\nGrund: " + reason + "\n"
                : "";

            message.setText(
                "Ihre Bestellung wurde storniert.\n\n" +
                "Bestellnummer: " + orderNumber + "\n" +
                "Shop: " + storeName +
                reasonText + "\n" +
                "Falls Sie Fragen zur Stornierung haben, kontaktieren Sie uns bitte.\n\n" +
                "Mit freundlichen Grüßen,\n" +
                storeName
            );

            mailSender.send(message);
            log.info("Order cancellation sent to: {} for order: {}", toEmail, orderNumber);
        } catch (Exception e) {
            log.error("Failed to send order cancellation to: {}", toEmail, e);
        }
    }
}
