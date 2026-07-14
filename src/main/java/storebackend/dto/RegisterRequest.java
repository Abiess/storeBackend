package storebackend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;
import lombok.ToString;

@Data
public class RegisterRequest {
    @NotBlank(message = "Email is required")
    @Email(message = "Email must be valid")
    private String email;

    @NotBlank(message = "Password is required")
    @Size(min = 6, message = "Password must be at least 6 characters")
    @ToString.Exclude
    private String password;

    // Optional: Für Warenkorb-Migration von Gast zu User
    private String sessionId;

    // Optional: Bevorzugte Sprache des Users (de/en/ar) – Default "en"
    private String lang;

    // Optional: CAPTCHA Token (hCaptcha oder reCAPTCHA)
    @ToString.Exclude
    private String captchaToken;

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
