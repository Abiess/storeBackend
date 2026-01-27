package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class LanguageConfigDTO {
    private String resolvedLanguage;
    private List<String> supportedLanguages;
    private String direction;
}

