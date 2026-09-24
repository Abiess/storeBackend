package storebackend.dto;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class ChatbotStatisticsDTO {
    private Integer totalSessions;
    private Integer botResolved;
    private Integer agentTransferred;
    private Integer avgResponseTimeSeconds;
    private BigDecimal customerSatisfactionScore;
    private Integer activeSessionsNow;
    private Integer todaySessions;
    private BigDecimal resolutionRate;
}

