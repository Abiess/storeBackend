package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UploadMediaResponse {
    private Long mediaId;
    private String filename;
    private String url;
    private Long sizeBytes;
    private String contentType;
    private String message;
}
