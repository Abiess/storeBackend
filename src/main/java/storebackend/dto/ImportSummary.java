package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Phase 4A: Import-Zusammenfassung.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ImportSummary {
    
    private int totalLines;
    private int readyToCreate;      // neue Produkte (wenn User Kategorie/Preis ergänzt)
    private int readyToUpdate;      // bestehende Produkte
    private int needsDecision;      // nicht geprüft oder kein Mapping
    private int skipped;            // bereits importiert oder Fehler
    private int alreadyImported;    // davon: bereits importiert
}
