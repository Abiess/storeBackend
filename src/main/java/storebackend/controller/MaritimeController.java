package storebackend.controller;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import storebackend.dto.MaritimeStatusResponse;
import storebackend.dto.MaritimeVesselsResponse;
import storebackend.service.AisStreamClientService;

/**
 * Maritime-Feature (MVP): Live-AIS-Schiffsdaten für Tanger Med, Marokko.
 *
 * Liest ausschließlich den In-Memory Vessel-Cache aus {@link AisStreamClientService} –
 * es wird pro Request KEINE neue AISStream-Verbindung aufgebaut (genau eine
 * dauerhafte WebSocket-Verbindung pro Backend-Instanz, siehe Service).
 *
 * Security: Kein neuer öffentlicher WebSocket-Endpoint, der AISStream-API-Key
 * wird niemals zurückgegeben. Zugriff wie bei anderen /tools-Seiten nur über
 * die Standard-Authentifizierung (siehe SecurityConfig: anyRequest().authenticated()).
 */
@RestController
@RequestMapping("/api/maritime")
@Slf4j
public class MaritimeController {

    private final AisStreamClientService aisStreamClientService;

    public MaritimeController(AisStreamClientService aisStreamClientService) {
        this.aisStreamClientService = aisStreamClientService;
    }

    /** Aktuelle Schiffe (Live-State, keine Historie) + Verbindungsstatus. */
    @GetMapping("/vessels")
    public ResponseEntity<MaritimeVesselsResponse> getVessels() {
        MaritimeVesselsResponse response = MaritimeVesselsResponse.builder()
                .connected(aisStreamClientService.isConnected())
                .configured(aisStreamClientService.isConfigured())
                .lastMessageAt(aisStreamClientService.getLastMessageAt())
                .vesselCount(aisStreamClientService.getVesselCount())
                .vessels(aisStreamClientService.getVessels())
                .build();
        return ResponseEntity.ok(response);
    }

    /** Leichtgewichtiger Status ohne Vessel-Liste (z. B. für ein Status-Widget). */
    @GetMapping("/status")
    public ResponseEntity<MaritimeStatusResponse> getStatus() {
        MaritimeStatusResponse response = MaritimeStatusResponse.builder()
                .connected(aisStreamClientService.isConnected())
                .configured(aisStreamClientService.isConfigured())
                .lastMessageAt(aisStreamClientService.getLastMessageAt())
                .vesselCount(aisStreamClientService.getVesselCount())
                .build();
        return ResponseEntity.ok(response);
    }
}
