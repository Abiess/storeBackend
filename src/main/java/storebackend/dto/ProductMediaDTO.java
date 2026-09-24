package storebackend.dto;

import lombok.Data;

@Data
public class ProductMediaDTO {
    private Long id;
    private Long productId;
    private Long mediaId;
    private String url;
    private String filename;
    private String contentType;
    private Long sizeBytes;
    private Integer sortOrder;
    private Boolean isPrimary;
}

