package storebackend.controller;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import storebackend.dto.MarineWeatherDTO;
import storebackend.dto.MaritimePortDto;
import storebackend.dto.MaritimePortSwitchRequest;
import storebackend.dto.MaritimeStatusResponse;
import storebackend.dto.MaritimeVesselsResponse;
import storebackend.dto.VesselPortEventDTO;
import storebackend.dto.VesselPortEventsResponse;
import storebackend.enums.MaritimePort;
import storebackend.service.AisStreamClientService;
import storebackend.service.MarineWeatherService;
import storebackend.service.VesselPortEventService;

import java.util.Arrays;
import java.util.List;

/**
 * Maritime-Feature: Live-AIS-Schiffsdaten für Tanger Med, Nador und Casablanca (Marokko).
 *
 * Liest ausschließlich den In-Memory Vessel-Cache aus {@link AisStreamClientService} –
 * es wird pro Request KEINE neue AISStream-Verbindung aufgebaut (genau eine
 * dauerhafte WebSocket-Verbindung pro Backend-Instanz, siehe Service). Ein Hafenwechsel
 * (PUT /port) aktualisiert nur die Subscription auf dieser einen Verbindung.
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
    private final MarineWeatherService marineWeatherService;
    private final VesselPortEventService vesselPortEventService;

    public MaritimeController(AisStreamClientService aisStreamClientService, MarineWeatherService marineWeatherService,
                               VesselPortEventService vesselPortEventService) {
        this.aisStreamClientService = aisStreamClientService;
        this.marineWeatherService = marineWeatherService;
        this.vesselPortEventService = vesselPortEventService;
    }

    /** Aktuelle Schiffe (Live-State, keine Historie) + Verbindungsstatus. */
    @GetMapping("/vessels")
    public ResponseEntity<MaritimeVesselsResponse> getVessels() {
        MaritimeVesselsResponse response = MaritimeVesselsResponse.builder()
                .connected(aisStreamClientService.isConnected())
                .configured(aisStreamClientService.isConfigured())
                .healthy(aisStreamClientService.isHealthy())
                .selectedPort(aisStreamClientService.getCurrentPort().name())
                .lastMessageAt(aisStreamClientService.getLastMessageAt())
                .vesselCount(aisStreamClientService.getVesselCount())
                .vessels(aisStreamClientService.getVessels())
                .build();
        return ResponseEntity.ok(response);
    }

    /** Leichtgewichtiger Status ohne Vessel-Liste (z. B. für ein Status-Widget). */
    @GetMapping("/status")
    public ResponseEntity<MaritimeStatusResponse> getStatus() {
        return ResponseEntity.ok(buildStatus());
    }

    /** Liste der unterstützten Häfen (für das Segmented-Control im Frontend). */
    @GetMapping("/ports")
    public ResponseEntity<List<MaritimePortDto>> getPorts() {
        List<MaritimePortDto> ports = Arrays.stream(MaritimePort.values())
                .map(p -> new MaritimePortDto(p.name(), p.getDisplayName(), p.getCenter(), p.getPortZoneBox(), p.getApproachZone()))
                .toList();
        return ResponseEntity.ok(ports);
    }

    /**
     * Marine-Wetter-/Ozean-Modelldaten (Open-Meteo, siehe {@link MarineWeatherService}) für den
     * aktuell ausgewählten Hafen. Komplett unabhängig von der AISStream-Verbindung – ein Ausfall
     * hier hat keinen Einfluss auf /vessels, /status etc. Kein API-Key im Spiel (öffentliche API).
     */
    @GetMapping("/weather")
    public ResponseEntity<MarineWeatherDTO> getWeather() {
        return ResponseEntity.ok(marineWeatherService.getWeather(aisStreamClientService.getCurrentPort()));
    }

    /**
     * Wechselt den aktiven Hafen. Baut KEINE neue AISStream-Verbindung auf – aktualisiert nur die
     * Subscription auf der bestehenden Verbindung (siehe AisStreamClientService#switchPort).
     * Unbekannte Port-IDs werden defensiv mit 400 beantwortet statt eine Exception zu werfen.
     */
    @PutMapping("/port")
    public ResponseEntity<MaritimeStatusResponse> switchPort(@RequestBody MaritimePortSwitchRequest request) {
        MaritimePort port = MaritimePort.fromId(request.getPort());
        if (port == null) {
            return ResponseEntity.badRequest().build();
        }
        aisStreamClientService.switchPort(port);
        return ResponseEntity.ok(buildStatus());
    }

    /**
     * Kleine Historie eines Schiffs (Phase 2B) – NUR bei explizitem Öffnen der Detailansicht
     * geladen (nicht Teil des 8s-Vessel-Pollings, siehe MaritimeComponent).
     */
    @GetMapping("/vessels/{mmsi}/events")
    public ResponseEntity<VesselPortEventsResponse> getVesselEvents(@PathVariable long mmsi) {
        return ResponseEntity.ok(vesselPortEventService.getVesselEventsResponse(mmsi));
    }

    /**
     * "Letzte Hafenereignisse" für einen Hafen (Phase 2B), Default: aktuell ausgewählter Hafen.
     * Begrenzte, kleine Anzahl (siehe Repository) – kein Auto-Refresh-Polling nötig, wird bei
     * Bedarf (initial/Portwechsel) vom Frontend neu geladen.
     */
    @GetMapping("/events")
    public ResponseEntity<List<VesselPortEventDTO>> getPortEvents(@RequestParam(required = false) String port) {
        MaritimePort resolvedPort = port != null ? MaritimePort.fromId(port) : aisStreamClientService.getCurrentPort();
        if (resolvedPort == null) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(vesselPortEventService.getRecentEventsForPort(resolvedPort));
    }

    private MaritimeStatusResponse buildStatus() {
        return MaritimeStatusResponse.builder()
                .connected(aisStreamClientService.isConnected())
                .configured(aisStreamClientService.isConfigured())
                .healthy(aisStreamClientService.isHealthy())
                .selectedPort(aisStreamClientService.getCurrentPort().name())
                .lastMessageAt(aisStreamClientService.getLastMessageAt())
                .vesselCount(aisStreamClientService.getVesselCount())
                .build();
    }
}

