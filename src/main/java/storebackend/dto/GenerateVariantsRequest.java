package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

/**
 * Request zum automatischen Generieren aller Varianten-Kombinationen
 * basierend auf den Product Options
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class GenerateVariantsRequest {
    private Long productId;
    private BigDecimal basePrice; // Basispreis für alle Varianten
    private Integer baseStock; // Standard-Lagerbestand
    private List<ProductOptionDTO> options; // Die Optionen mit ihren Werten
}

