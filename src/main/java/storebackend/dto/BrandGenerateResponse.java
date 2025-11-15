package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BrandGenerateResponse {
    private Map<String, String> assets; // key: asset type, value: presigned URL
    private Map<String, String> paletteTokens; // CSS variable name -> color value
    private String initials;
}

