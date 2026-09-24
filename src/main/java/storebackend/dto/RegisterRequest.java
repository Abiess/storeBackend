package storebackend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;
import lombok.ToString;
import storebackend.util.EmailNormalizer;

@Data
public class RegisterRequest {
    @NotBlank(message = "Email is required")
    @Email(message = "Email must be valid")
    private String email;

    @NotBlank(message = "Password is required")
    @Size(min = 12, message = "Password must be at least 12 characters")
    @ToString.Exclude
    private String password;

    // Optional: Für Warenkorb-Migration von Gast zu User
    private String sessionId;

    // Optional: Bevorzugte Sprache des Users (de/en/ar) – Default "en"
    private String lang;

    // Optional: CAPTCHA Token (hCaptcha oder reCAPTCHA)
    @ToString.Exclude
    private String captchaToken;

    /**
     * Normalisiert die E-Mail zentral (trim + lowercase) direkt beim
     * JSON-Binding - siehe LoginRequest#setEmail / EmailNormalizer. Damit
     * greifen Rate-Limiting, Duplikat-Check (AuthService#register) und
     * spätere Speicherung durchgängig auf dieselbe normalisierte E-Mail zu.
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

    public String getLang() {
        return lang;
    }

    public String getCaptchaToken() {
        return captchaToken;
    }
}
