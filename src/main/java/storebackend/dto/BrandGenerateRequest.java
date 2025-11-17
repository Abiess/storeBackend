package storebackend.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BrandGenerateRequest {

    @NotBlank(message = "Shop name is required")
    private String shopName;

    private String salt;

    private List<String> preferredColors;

    private List<String> forbiddenColors;

    private String style;

    private String slogan;
}

