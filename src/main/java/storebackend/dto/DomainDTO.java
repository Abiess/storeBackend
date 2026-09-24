package storebackend.dto;

import lombok.Data;
import storebackend.enums.DomainType;

import java.time.LocalDateTime;

@Data
public class DomainDTO {
    private Long id;
    private String host;
    private DomainType type;
    private Boolean isPrimary;
    private Boolean isVerified;
    private LocalDateTime createdAt;
}
