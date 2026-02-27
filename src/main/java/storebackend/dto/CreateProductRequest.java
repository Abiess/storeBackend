package storebackend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import storebackend.enums.ProductStatus;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Data
public class CreateProductRequest {
    @NotBlank
    private String title;

    private String description;

    @NotNull
    private BigDecimal basePrice;

    private ProductStatus status = ProductStatus.DRAFT;

    private Long categoryId;

    /**
     * Optionen für automatische Varianten-Generierung
     * Format: [{"name": "Farbe", "values": ["Rot", "Blau"]}, {"name": "Größe", "values": ["S", "M", "L"]}]
     */
    private List<VariantOptionInput> variantOptions = new ArrayList<>();

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class VariantOptionInput {
        private String name;         // z.B. "Farbe" oder "Größe"
        private List<String> values; // z.B. ["Rot", "Blau", "Grün"]
    }
}
