package storebackend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import storebackend.enums.ProductStatus;

import java.math.BigDecimal;

@Data
public class CreateProductRequest {
    @NotBlank
    private String title;

    private String description;

    @NotNull
    private BigDecimal basePrice;

    private ProductStatus status = ProductStatus.DRAFT;
}

