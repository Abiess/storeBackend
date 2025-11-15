package storebackend.dto.seo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AssetUploadResponse {
    private Long id;
    private String path;
    private String publicUrl;
    private Long sizeBytes;
}
package storebackend.dto.seo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SeoSettingsDTO {
    private Long id;
    private Long storeId;
    private Long domainId;
    private String siteName;
    private String defaultTitleTemplate;
    private String defaultMetaDescription;
    private String canonicalBaseUrl;
    private Boolean robotsIndex;

    // Social
    private String ogDefaultImagePath;
    private String ogDefaultImageUrl; // Presigned URL for frontend
    private String twitterHandle;
    private String facebookPageUrl;
    private String instagramUrl;
    private String youtubeUrl;
    private String linkedinUrl;

    // Hreflang
    @Builder.Default
    private List<HreflangEntryDTO> hreflangConfig = new ArrayList<>();

    private Long version;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class HreflangEntryDTO {
        private String langCode;
        private String absoluteUrlBase;
    }
}

