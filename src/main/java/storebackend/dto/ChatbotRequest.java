package storebackend.dto;

import lombok.Data;

@Data
public class ChatbotRequest {
    private Long storeId;
    private String sessionToken;
    private String message;
    private String language = "de";
    private String customerName;
    private String customerEmail;
}

