package storebackend.dto;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class SupplierInvoiceDocumentDTO {
    private Long id;
    private Long storeId;
    private String originalFilename;
    private String mimeType;
    private Long fileSize;
    private Integer pageCount;
    private String uploadStatus;
    private String uploadedByUsername;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
