package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MediaDTO {
    private Long id;
    private Long storeId;
    private String filename;
    private String originalFilename;
    private String contentType;
    private Long sizeBytes;
    private String mediaType;
    private String altText;
    private String url;
    private LocalDateTime createdAt;
}

