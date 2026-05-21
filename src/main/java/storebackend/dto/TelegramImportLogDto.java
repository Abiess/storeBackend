package storebackend.dto;

import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
public class TelegramImportLogDto {
    private Long id;
    private String channelId;
    private Long telegramMsgId;
    private Long productId;
    private String status;         // SUCCESS | SKIPPED | ERROR
    private String errorMessage;
    private LocalDateTime importedAt;
}

