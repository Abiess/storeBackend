package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class PublicStoreDTO {
    private Long storeId;
    private String name;
    private String slug;
    private String primaryDomain;
    private String status;
}

