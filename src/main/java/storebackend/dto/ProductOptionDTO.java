package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProductOptionDTO {
    private Long id;
    private Long productId;
    private String name; // z.B. "Farbe", "Größe", "Material"
    private List<String> values; // z.B. ["Rot", "Blau", "Grün"]
    private Integer sortOrder;
}

