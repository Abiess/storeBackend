package storebackend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import storebackend.util.EmailNormalizer;

@Data
public class LoginRequest {
    @NotBlank
    @Email
    private String email;

    @NotBlank
    private String password;

    // Optional: Für Warenkorb-Migration von Gast zu User
    private String sessionId;

    // Optional: CAPTCHA Token (hCaptcha oder reCAPTCHA)
    private String captchaToken;

    /**
     * Normalisiert die E-Mail zentral (trim + lowercase) direkt beim
     * JSON-Binding, damit ALLE Konsumenten dieses Requests (Rate-Limiting,
     * CAPTCHA-Schwelle, Security-Event-Logging, AuthService.login) automatisch
     * dieselbe normalisierte E-Mail sehen - siehe EmailNormalizer.
     */
    public void setEmail(String email) {
        this.email = EmailNormalizer.normalize(email);
    }

    // Explizite Getter für Lombok-Kompatibilität
    public String getEmail() {
        return email;
    }

    public String getPassword() {
        return password;
    }

    public String getSessionId() {
        return sessionId;
    }

    public String getCaptchaToken() {
        return captchaToken;
    }
}
