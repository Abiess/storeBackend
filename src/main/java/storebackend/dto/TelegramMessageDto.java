package storebackend.dto;

import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Repräsentiert eine rohe Telegram-Nachricht aus getUpdates/getHistory.
 */
@Data
@NoArgsConstructor
public class TelegramMessageDto {
    private Long messageId;
    private String text;
    private List<String> photoUrls;
    private String date;           // ISO-8601
    private String fromChannel;
}

