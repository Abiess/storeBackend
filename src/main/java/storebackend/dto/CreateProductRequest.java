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

    private String sku;

    private String description;

    @NotNull
    private BigDecimal basePrice;

    /** Lagerbestand für einfache Produkte (ohne Varianten) */
    private Integer stock = 0;

    private ProductStatus status = ProductStatus.DRAFT;

    private Long categoryId;

    /**
     * Optionen für automatische Varianten-Generierung
     * Format: [{"name": "Farbe", "values": ["Rot", "Blau"]}, {"name": "Größe", "values": ["S", "M", "L"]}]
     */
    private List<VariantOptionInput> variantOptions = new ArrayList<>();

    // ─── Steuern (optional - Defaults: STANDARD, 19.00) ─────
    /** Steuerkategorie: STANDARD (19%), REDUCED (7%), ZERO, EXEMPT */
    private String taxCategory;
    /** Steuersatz (wird automatisch aus taxCategory abgeleitet wenn nicht explizit gesetzt) */
    private BigDecimal taxRate;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class VariantOptionInput {
        private String name;         // z.B. "Farbe" oder "Größe"
        private List<String> values; // z.B. ["Rot", "Blau", "Grün"]
    }
}
