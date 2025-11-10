package storebackend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import storebackend.enums.DomainType;

@Data
public class CreateDomainRequest {
    @NotBlank
    private String host;

    @NotNull
    private DomainType type;
}

