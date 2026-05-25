package storebackend.dto;

import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

/**
 * Ergebnis eines Telegram-Import-Durchlaufs.
 */
@Data
@NoArgsConstructor
public class TelegramImportResultDto {
    private int imported  = 0;
    private int skipped   = 0;   // Duplikate
    private int errors    = 0;
    private int noPriceCount = 0;   // Importiert, aber kein Preis erkannt (basePrice=1)
    private int noImageCount = 0;   // Importiert, aber kein Bild vorhanden
    private List<String> importedTitles  = new ArrayList<>();
    private List<String> errorMessages   = new ArrayList<>();
}
