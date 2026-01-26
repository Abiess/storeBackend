package storebackend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class LoginRequest {
    @NotBlank
    @Email
    private String email;

    @NotBlank
    private String password;

    // Optional: Für Warenkorb-Migration von Gast zu User
    private String sessionId;

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
}
