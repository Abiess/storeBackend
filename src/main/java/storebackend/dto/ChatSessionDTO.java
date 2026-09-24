package storebackend.dto;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Data
public class ChatSessionDTO {
    private Long id;
    private Long storeId;
    private Long customerId;
    private String sessionToken;
    private String customerName;
    private String customerEmail;
    private String status; // String instead of Enum for API
    private String channel; // String instead of Enum for API
    private Long assignedAgentId;
    private String assignedAgentName;
    private String language;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime closedAt;
    private Integer unreadCount;
    private String lastMessage;
    private LocalDateTime lastMessageTime;
    private List<ChatMessageDTO> messages = new ArrayList<>();
}

