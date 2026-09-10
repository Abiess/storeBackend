package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

/** Eintrag für GET /api/maritime/ports – Liste der unterstützten Häfen. */
@Getter
@AllArgsConstructor
public class MaritimePortDto {
    private String id;
    private String name;
}
