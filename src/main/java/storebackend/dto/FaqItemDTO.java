package storebackend.dto;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class FaqItemDTO {
    private Long id;
    private Long categoryId;
    private String categoryName;
    private Long storeId;
    private String question;
    private String answer;
    private String keywords;
    private Integer displayOrder;
    private Integer viewCount;
    private Integer helpfulCount;
    private String language;
    private Boolean isActive;
    private Boolean isGlobal;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}

