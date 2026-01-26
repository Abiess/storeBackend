package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PublicStoreDTO {
    private Long storeId;
    private Long domainId;
    private String name;
    private String slug;
    private String primaryDomain;
    private String status;

    // Explizite Getter für Lombok-Kompatibilität
    public Long getStoreId() {
        return storeId;
    }

    public Long getDomainId() {
        return domainId;
    }

    public String getName() {
        return name;
    }

    public String getSlug() {
        return slug;
    }

    public String getPrimaryDomain() {
        return primaryDomain;
    }

    public String getStatus() {
        return status;
    }
}
