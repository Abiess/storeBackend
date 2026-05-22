package storebackend.dto.seo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SeoSettingsDTO {

    private Long id;
    private Long storeId;

    // Grundeinstellungen
    private String siteName;
    private String metaTitle;
    private String defaultTitleTemplate;
    private String defaultMetaDescription;
    private String defaultMetaKeywords;
    private String canonicalBaseUrl;

    // Open Graph / Social
    private String ogDefaultImageUrl;
    private String ogDefaultImagePath;
    private String twitterHandle;
    private String facebookPageUrl;
    private String instagramUrl;
    private String youtubeUrl;
    private String linkedinUrl;

    // Technical
    private Boolean robotsIndex;
    private Boolean enableSitemapXml;
    private String robotsTxtContent;

    // Hreflang als JSON-String (Frontend parst/serialisiert selbst)
    private String hreflangConfigJson;
}

