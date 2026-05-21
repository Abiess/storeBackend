package storebackend.dto;

import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO für Telegram-Bot-Konfiguration.
 * Bot-Token wird im GET-Response gemaskiert zurückgegeben.
 */
@Data
@NoArgsConstructor
public class TelegramConfigDto {
    private Long id;
    private Long storeId;

    /**
     * Im GET masked: "****abcd" (letzte 4 Zeichen sichtbar).
     * Im PUT/POST: vollständiger Token.
     */
    private String botToken;
    private String channelId;

    private boolean notifyNewOrders = true;
    private boolean notifyLowStock  = false;
    private boolean postNewProducts = false;
    private int lowStockThreshold   = 5;
    private int importLimit         = 50;
    private boolean active          = false;

    /** Nur im Response: zeigt ob Bot konfiguriert und erreichbar */
    private Boolean connected;
}

