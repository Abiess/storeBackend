package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/**
 * Schlankes DTO für MHD-Produktliste.
 * Enthält nur die für die Ablaufdatum-Anzeige benötigten Felder.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ExpiryProductDTO {
    
    private Long id;
    private String title;
    private LocalDate expiryDate;
}
