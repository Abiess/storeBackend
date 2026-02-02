package storebackend.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CreateStoreRequest {
    @NotBlank
    private String name;

    @NotBlank
    private String slug;

    private String description;

    private String category; // Kategorie für Slider-Initialisierung (z.B. "fashion", "electronics", "food", "general")
}
