package storebackend.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class ChatbotIntentDTO {
    private Long id;
    private Long storeId;
    private String intentName;
    private String description;
    private List<String> trainingPhrases;
    private String responseTemplate;
    private String action;
    private BigDecimal confidenceThreshold;
    private Boolean isActive;
    private LocalDateTime createdAt;
}

