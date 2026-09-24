package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class HomepageSectionDTO {
    private Long id;
    private Long storeId;
    private String sectionType;
    private Integer sortOrder;
    private Boolean isActive;
    private String settings;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}

