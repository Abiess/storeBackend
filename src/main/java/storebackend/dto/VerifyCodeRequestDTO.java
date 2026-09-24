package storebackend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.Data;


/**
 * DTO für Code-Verifizierung
 */
@Data
public class VerifyCodeRequestDTO {

    @NotNull(message = "Verifizierungs-ID ist erforderlich")
    private Long verificationId;

    @NotBlank(message = "Code ist erforderlich")
    @Pattern(regexp = "^\\d{6}$", message = "Code muss 6 Ziffern enthalten")
    private String code;
}

