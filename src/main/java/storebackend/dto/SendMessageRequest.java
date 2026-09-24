package storebackend.dto;

import lombok.Data;

@Data
public class SendMessageRequest {
    private Long sessionId;
    private String sessionToken;
    private String message;
    private String content;
    private String messageType = "TEXT";
    private String metadata;
}

