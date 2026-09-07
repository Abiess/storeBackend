package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

/**
 * TEMPORÄRES Test-DTO für die OpenRouter-Vision-Analyse eines Reparatur-/Schadensbildes.
 * Kein Persistenz-Bezug, keine Businesslogik – dient nur der Machbarkeitsprüfung.
 *
 * Erlaubte category-Werte: SANITARY, ELECTRICAL, HEATING, APPLIANCE, DOOR_WINDOW,
 *                          WALL_CEILING, FLOOR, ROOF, OTHER
 * Erlaubte urgency-Werte:  LOW, MEDIUM, HIGH, EMERGENCY
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class IssueImageAnalysisDTO {
    private String category;
    private String problem;
    private String urgency;
    private Double confidence;
    private List<String> questions;
}
