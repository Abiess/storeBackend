package storebackend.dto.seo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RedirectRuleDTO {
    private Long id;
    private Long storeId;
    private Long domainId;
    private String sourcePath;
    private String targetUrl;
    private Integer httpCode;
    private Boolean isRegex;
    private Integer priority;
    private Boolean isActive;
    private String comment;
    private String tag;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}

