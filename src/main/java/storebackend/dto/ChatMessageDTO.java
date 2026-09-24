package storebackend.dto;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class ChatMessageDTO {
    private Long id;
    private Long sessionId;
    private String senderType; // String instead of Enum for API
    private Long senderId;
    private String senderName;
    private String messageType; // String instead of Enum for API
    private String content;
    private String metadata;
    private Boolean isRead;
    private LocalDateTime createdAt;
}

