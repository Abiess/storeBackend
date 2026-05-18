package storebackend.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * DTO für Store-Updates
 * Im Gegensatz zu CreateStoreRequest ist das slug-Feld optional,
 * da es normalerweise nicht nachträglich geändert wird
 */
@Data
public class UpdateStoreRequest {
    @NotBlank(message = "Name darf nicht leer sein")
    private String name;

    // Slug ist optional beim Update - wird nur geändert wenn explizit gesetzt
    private String slug;

    // Beschreibung ist optional
    private String description;

    // WhatsApp-Kontaktdaten – optional, null = nicht ändern
    private String whatsappNumber;
    private Boolean whatsappNotificationsEnabled;

    private String greetingMessage;
}
