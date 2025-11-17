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
}
