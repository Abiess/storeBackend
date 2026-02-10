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

    @Value("${spring.mail.from:noreply@example.com}")
    private String fromEmail;

    @Value("${app.base-url:http://localhost:4200}")
    private String baseUrl;

    /**
     * Sendet eine Email-Verification-Email an den User
     */
    public void sendVerificationEmail(String toEmail, String token) {
        try {
            String verificationUrl = baseUrl + "/verify?token=" + token;

            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(toEmail);
            message.setSubject("Verify your email address");
            message.setText(
                "Welcome to our platform!\n\n" +
                "Please verify your email address by clicking the link below:\n\n" +
                verificationUrl + "\n\n" +
                "This link will expire in 24 hours.\n\n" +
                "If you did not create an account, please ignore this email.\n\n" +
                "Best regards,\n" +
                "Your Team"
            );

            mailSender.send(message);
            log.info("Verification email sent successfully to: {}", toEmail);
        } catch (Exception e) {
            log.error("Failed to send verification email to: {}", toEmail, e);
            throw new RuntimeException("Failed to send verification email: " + e.getMessage());
        }
    }

    /**
     * Sendet eine Bestätigungs-Email nach erfolgreicher Verification
     */
    public void sendWelcomeEmail(String toEmail, String name) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(toEmail);
            message.setSubject("Welcome! Your email has been verified");
            message.setText(
                "Hi " + (name != null ? name : "there") + ",\n\n" +
                "Your email address has been successfully verified!\n\n" +
                "You can now log in and enjoy all features of our platform.\n\n" +
                "Best regards,\n" +
                "Your Team"
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
        try {
            String resetUrl = baseUrl + "/reset-password?token=" + token;

            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(toEmail);
            message.setSubject("Reset your password");
            message.setText(
                "Hello,\n\n" +
                "We received a request to reset your password.\n\n" +
                "Click the link below to reset your password:\n\n" +
                resetUrl + "\n\n" +
                "This link will expire in 1 hour.\n\n" +
                "If you did not request a password reset, please ignore this email. " +
                "Your password will remain unchanged.\n\n" +
                "Best regards,\n" +
                "Your Team"
            );

            mailSender.send(message);
            log.info("Password reset email sent successfully to: {}", toEmail);
        } catch (Exception e) {
            log.error("Failed to send password reset email to: {}", toEmail, e);
            throw new RuntimeException("Failed to send password reset email: " + e.getMessage());
        }
    }

    /**
     * Sendet eine Bestätigungs-Email nach erfolgreichem Password-Reset
     */
    public void sendPasswordResetConfirmationEmail(String toEmail, String name) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(toEmail);
            message.setSubject("Your password has been changed");
            message.setText(
                "Hi " + (name != null ? name : "there") + ",\n\n" +
                "This is a confirmation that your password has been successfully changed.\n\n" +
                "If you did not make this change, please contact our support immediately.\n\n" +
                "Best regards,\n" +
                "Your Team"
            );

            mailSender.send(message);
            log.info("Password reset confirmation email sent successfully to: {}", toEmail);
        } catch (Exception e) {
            log.error("Failed to send password reset confirmation email to: {}", toEmail, e);
            // Don't throw exception here - confirmation email is optional
        }
    }
}
