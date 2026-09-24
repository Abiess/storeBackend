package storebackend.dto.seo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SitemapConfigDTO {
    private Long id;
    private Long storeId;
    private Long domainId;
    private Boolean includeProducts;
    private Boolean includeCollections;
    private Boolean includeBlog;
    private Boolean includePages;
    private Integer splitThreshold;
}

