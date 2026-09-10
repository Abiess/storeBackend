package storebackend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import jakarta.websocket.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import storebackend.dto.VesselDTO;

import java.net.URI;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.atomic.AtomicReference;

/**
 * Live-AIS-Integration für das Maritime-Feature (MVP: Tanger Med, Marokko).
 *
 * Architektur (bewusst so gehalten, siehe Aufgabenstellung):
 *   AISStream (wss://stream.aisstream.io/v0/stream)
 *     → GENAU EINE dauerhafte, ausgehende WebSocket-Verbindung pro Backend-Instanz
 *     → aktueller Vessel-State im Speicher (ConcurrentHashMap, Key = MMSI)
 *     → REST-Endpoints ({@link storebackend.controller.MaritimeController}) lesen nur den Cache
 *
 * WICHTIG (Memory/OOM):
 *  - Es wird NIEMALS eine Historie gehalten – jede neue Position überschreibt
 *    den vorherigen Zustand desselben Schiffes (MMSI).
 *  - Harte Obergrenze {@link #MAX_VESSELS} – bei Erreichen wird der älteste
 *    (stale-ste) Eintrag zuerst entfernt.
 *  - Regelmäßiger Cleanup entfernt Schiffe, die länger als
 *    {@link #STALE_AFTER_MINUTES} Minuten nicht mehr gemeldet wurden
 *    (aufgerufen durch {@link storebackend.scheduler.MaritimeCleanupScheduler}).
 *
 * WICHTIG (Security):
 *  - Der API-Key wird NIEMALS geloggt und NIEMALS über REST zurückgegeben.
 *  - Es wird KEIN neuer öffentlicher WebSocket-Endpoint auf markt.ma geöffnet –
 *    die Verbindung ist ausschließlich ausgehend vom Backend zu AISStream.
 *  - TLS-Zertifikatsprüfung wird nicht deaktiviert (Standard-jakarta.websocket/JVM-Truststore).
 *
 * WICHTIG (Stabilität):
 *  - Reconnect mit exponentiellem Backoff (1s, 2s, 5s, 10s, 30s-Cap), Reset nach
 *    erfolgreichem Connect.
 *  - Parserfehler bei einzelnen AIS-Messages beenden den Listener nicht.
 *  - Ein AISStream-Ausfall darf markt.ma nicht destabilisieren – bei fehlendem
 *    Key oder Verbindungsproblemen liefert die REST-API einfach connected=false.
 */
@Service
@Slf4j
public class AisStreamClientService {

    private static final String AISSTREAM_URL = "wss://stream.aisstream.io/v0/stream";

    /** Bounding Box Tanger Med, Marokko (MVP – weitere Häfen später möglich) */
    private static final double[][] TANGER_MED_BBOX = {
            {35.75, -5.65},
            {36.05, -5.20}
    };

    /** Absolute Obergrenze für den Vessel-Cache – verhindert unbegrenztes Wachstum (OOM-Schutz) */
    private static final int MAX_VESSELS = 5000;

    /** Schiffe werden nach dieser Inaktivität als "stale" betrachtet und entfernt */
    static final long STALE_AFTER_MINUTES = 30;

    /** Exponential-Backoff-Stufen für Reconnect (Sekunden), letzter Wert = Cap */
    private static final int[] BACKOFF_SECONDS = {1, 2, 5, 10, 30};

    /** Nur jede Nte fehlerhafte Message wird geloggt – verhindert Log-Flut bei Massenfehlern */
    private static final int MALFORMED_LOG_EVERY_N = 50;

    @Value("${aisstream.api-key:}")
    private String apiKey;

    private final ObjectMapper objectMapper;

    /** Aktueller Live-Zustand pro Schiff – Key = MMSI. KEINE Historie! */
    private final Map<Long, VesselDTO> vessels = new ConcurrentHashMap<>();

    private final ScheduledExecutorService executor =
            Executors.newSingleThreadScheduledExecutor(r -> {
                Thread t = new Thread(r, "aisstream-client");
                t.setDaemon(true);
                return t;
            });

    private final AtomicBoolean shuttingDown = new AtomicBoolean(false);
    private final AtomicBoolean connected = new AtomicBoolean(false);
    private final AtomicReference<Instant> lastMessageAt = new AtomicReference<>();
    private final AtomicInteger backoffIndex = new AtomicInteger(0);
    private final AtomicInteger malformedMessageCount = new AtomicInteger(0);
    private final AtomicReference<Session> currentSession = new AtomicReference<>();
    private final AtomicLong evictionCounter = new AtomicLong(0);
    private final AtomicBoolean everConnected = new AtomicBoolean(false);
    /** Verhindert doppelte Reconnect-Scheduling, falls onClose/onError unerwartet mehrfach feuern. */
    private final AtomicBoolean reconnectScheduled = new AtomicBoolean(false);

    public AisStreamClientService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    /** true wenn AISSTREAM_API_KEY gesetzt ist (unabhängig vom aktuellen Verbindungsstatus) */
    public boolean isConfigured() {
        return apiKey != null && !apiKey.isBlank();
    }

    public boolean isConnected() {
        return connected.get();
    }

    public Instant getLastMessageAt() {
        return lastMessageAt.get();
    }

    /** Liefert die aktuellen Schiffe, sortiert nach zuletzt gesehen (neueste zuerst) */
    public List<VesselDTO> getVessels() {
        return vessels.values().stream()
                .sorted((a, b) -> b.getLastSeen().compareTo(a.getLastSeen()))
                .toList();
    }

    public int getVesselCount() {
        return vessels.size();
    }

    @PostConstruct
    void init() {
        if (!isConfigured()) {
            log.warn("AISStream integration disabled because API key is not configured");
            return;
        }
        executor.execute(this::connect);
    }

    @PreDestroy
    void shutdown() {
        shuttingDown.set(true);
        Session session = currentSession.get();
        if (session != null && session.isOpen()) {
            try {
                session.close();
            } catch (Exception e) {
                log.debug("Error while closing AIS WebSocket session on shutdown: {}", e.getMessage());
            }
        }
        executor.shutdownNow();
    }

    /** Regelmäßiger Cleanup – entfernt Schiffe, die länger als STALE_AFTER_MINUTES nicht gesehen wurden. */
    public void cleanupStaleVessels() {
        Instant threshold = Instant.now().minus(STALE_AFTER_MINUTES, ChronoUnit.MINUTES);
        int before = vessels.size();
        vessels.values().removeIf(v -> v.getLastSeen() == null || v.getLastSeen().isBefore(threshold));
        int removed = before - vessels.size();
        if (removed > 0) {
            log.debug("Maritime cleanup: removed {} stale vessel(s), {} remaining", removed, vessels.size());
        }
    }

    // ─────────────────────────────────────────────────────────────
    //  Connection-Handling (ein einziger Connect-Versuch + Reconnect-Loop)
    // ─────────────────────────────────────────────────────────────

    private void connect() {
        reconnectScheduled.set(false);
        if (shuttingDown.get() || !isConfigured()) {
            return;
        }
        try {
            WebSocketContainer container = ContainerProvider.getWebSocketContainer();
            container.connectToServer(new AisEndpoint(), URI.create(AISSTREAM_URL));
        } catch (Exception e) {
            log.warn("AIS connection attempt failed: {}", e.getMessage());
            scheduleReconnect();
        }
    }

    private void scheduleReconnect() {
        if (shuttingDown.get()) {
            return;
        }
        if (!reconnectScheduled.compareAndSet(false, true)) {
            // Reconnect bereits geplant (defensive Guard gegen doppelte onClose/onError-Events) – nichts tun.
            return;
        }
        int idx = Math.min(backoffIndex.getAndIncrement(), BACKOFF_SECONDS.length - 1);
        int delaySeconds = BACKOFF_SECONDS[idx];
        log.info("AIS reconnect attempt in {}s", delaySeconds);
        executor.schedule(this::connect, delaySeconds, TimeUnit.SECONDS);
    }

    private void sendSubscription(Session session) {
        try {
            Map<String, Object> subscription = Map.of(
                    "APIKey", apiKey,
                    "BoundingBoxes", List.of(TANGER_MED_BBOX),
                    "FilterMessageTypes", List.of("PositionReport", "ShipStaticData")
            );
            // WICHTIG: Niemals das komplette Subscription-JSON loggen (enthält den API-Key)!
            session.getBasicRemote().sendText(objectMapper.writeValueAsString(subscription));
        } catch (Exception e) {
            log.warn("Failed to send AIS subscription request: {}", e.getMessage());
        }
    }

    // ─────────────────────────────────────────────────────────────
    //  Message-Handling
    // ─────────────────────────────────────────────────────────────

    private void handleMessage(String payload) {
        lastMessageAt.set(Instant.now());
        try {
            JsonNode root = objectMapper.readTree(payload);
            String messageType = root.path("MessageType").asText("");
            JsonNode message = root.path("Message");
            JsonNode metaData = root.path("MetaData");

            switch (messageType) {
                case "PositionReport" -> handlePositionReport(message.path("PositionReport"), metaData);
                case "ShipStaticData" -> handleStaticData(message.path("ShipStaticData"), metaData);
                default -> {
                    // Unbekannte (oder bewusst nicht ausgewertete) Message-Typen werden ignoriert (defensiv, kein Absturz).
                    // StaticDataReport wird bewusst NICHT ausgewertet: seine Felder (ReportA/ReportB,
                    // AIS Typ 24 Part A/B) unterscheiden sich strukturell von ShipStaticData und würden
                    // hier keine sauber passenden Felder liefern (siehe AISStream-Schema).
                }
            }
        } catch (Exception e) {
            logMalformedMessage(e);
        }
    }

    private void handlePositionReport(JsonNode pos, JsonNode metaData) {
        long mmsi = metaData.path("MMSI").asLong(0);
        if (mmsi <= 0) {
            return;
        }
        // Message.PositionReport.Latitude/Longitude ist laut AISStream-Schema ein Pflichtfeld;
        // MetaData.Latitude/Longitude (Großschreibung!) dient nur als defensiver Fallback.
        double lat = pos.has("Latitude") ? pos.path("Latitude").asDouble() : metaData.path("Latitude").asDouble();
        double lon = pos.has("Longitude") ? pos.path("Longitude").asDouble() : metaData.path("Longitude").asDouble();

        VesselDTO existing = vessels.get(mmsi);
        VesselDTO.VesselDTOBuilder builder = existing != null ? copyOf(existing) : VesselDTO.builder().mmsi(mmsi);

        builder.latitude(lat)
                .longitude(lon)
                .speed(pos.has("Sog") ? pos.path("Sog").asDouble() : null)
                .course(pos.has("Cog") ? pos.path("Cog").asDouble() : null)
                .lastSeen(Instant.now());

        int heading = pos.path("TrueHeading").asInt(511);
        builder.heading(heading != 511 ? heading : (existing != null ? existing.getHeading() : null));

        String shipName = metaData.path("ShipName").asText("").trim();
        if (!shipName.isEmpty()) {
            builder.shipName(shipName);
        } else if (existing != null) {
            builder.shipName(existing.getShipName());
        }

        putVessel(mmsi, builder.build());
    }

    private void handleStaticData(JsonNode staticData, JsonNode metaData) {
        long mmsi = metaData.path("MMSI").asLong(0);
        if (mmsi <= 0) {
            return;
        }
        VesselDTO existing = vessels.get(mmsi);
        // Nur ergänzen, wenn bereits ein Positions-Datensatz existiert (kein "leeres" Schiff ohne Position anlegen)
        if (existing == null) {
            return;
        }
        VesselDTO.VesselDTOBuilder builder = copyOf(existing);

        String callSign = staticData.path("CallSign").asText("").trim();
        if (!callSign.isEmpty()) {
            builder.callSign(callSign);
        }
        long imo = staticData.path("ImoNumber").asLong(0);
        if (imo > 0) {
            builder.imo(imo);
        }
        if (staticData.has("Type")) {
            builder.shipType(staticData.path("Type").asInt());
        }
        String destination = staticData.path("Destination").asText("").trim();
        if (!destination.isEmpty()) {
            builder.destination(destination);
        }
        if (staticData.has("MaximumStaticDraught")) {
            builder.draught(staticData.path("MaximumStaticDraught").asDouble());
        }
        String shipName = staticData.path("Name").asText("").trim();
        if (!shipName.isEmpty()) {
            builder.shipName(shipName);
        }

        putVessel(mmsi, builder.build());
    }

    private VesselDTO.VesselDTOBuilder copyOf(VesselDTO v) {
        return VesselDTO.builder()
                .mmsi(v.getMmsi())
                .shipName(v.getShipName())
                .latitude(v.getLatitude())
                .longitude(v.getLongitude())
                .speed(v.getSpeed())
                .course(v.getCourse())
                .heading(v.getHeading())
                .lastSeen(v.getLastSeen())
                .callSign(v.getCallSign())
                .imo(v.getImo())
                .shipType(v.getShipType())
                .destination(v.getDestination())
                .draught(v.getDraught());
    }

    /** Aktualisiert/ergänzt den Cache-Eintrag für eine MMSI, mit harter Obergrenze (MAX_VESSELS). */
    private void putVessel(long mmsi, VesselDTO vessel) {
        if (!vessels.containsKey(mmsi) && vessels.size() >= MAX_VESSELS) {
            evictOldestVessel();
        }
        vessels.put(mmsi, vessel);
    }

    /** Entfernt den Eintrag mit dem ältesten lastSeen-Zeitstempel (nur wenn Obergrenze erreicht ist). */
    private void evictOldestVessel() {
        vessels.values().stream()
                .min((a, b) -> {
                    Instant ai = a.getLastSeen() != null ? a.getLastSeen() : Instant.EPOCH;
                    Instant bi = b.getLastSeen() != null ? b.getLastSeen() : Instant.EPOCH;
                    return ai.compareTo(bi);
                })
                .ifPresent(oldest -> {
                    vessels.remove(oldest.getMmsi());
                    if (evictionCounter.incrementAndGet() % 100 == 1) {
                        log.warn("Maritime vessel cache reached MAX_VESSELS={}, evicting oldest entries", MAX_VESSELS);
                    }
                });
    }

    private void logMalformedMessage(Exception e) {
        int count = malformedMessageCount.incrementAndGet();
        if (count % MALFORMED_LOG_EVERY_N == 1) {
            log.warn("Malformed AIS message ignored ({} total so far): {}", count, e.getMessage());
        }
    }

    // ─────────────────────────────────────────────────────────────
    //  jakarta.websocket Client-Endpoint
    //  AISStream kann Payloads als Binary-Frame senden, obwohl der Inhalt
    //  UTF-8 JSON ist – daher werden beide Frame-Typen behandelt.
    // ─────────────────────────────────────────────────────────────

    @ClientEndpoint
    public class AisEndpoint {

        @OnOpen
        public void onOpen(Session session) {
            currentSession.set(session);
            connected.set(true);
            backoffIndex.set(0);
            boolean firstConnect = everConnected.compareAndSet(false, true);
            log.info(firstConnect ? "AIS connection established" : "AIS connection restored");
            sendSubscription(session);
        }

        @OnMessage
        public void onText(String message) {
            handleMessage(message);
        }

        @OnMessage
        public void onBinary(ByteBuffer buffer) {
            // AISStream liefert gelegentlich Binary-Frames mit UTF-8-JSON-Payload
            byte[] bytes = new byte[buffer.remaining()];
            buffer.get(bytes);
            handleMessage(new String(bytes, StandardCharsets.UTF_8));
        }

        @OnClose
        public void onClose(Session session, CloseReason reason) {
            connected.set(false);
            currentSession.set(null);
            if (!shuttingDown.get()) {
                log.info("AIS connection lost ({}), scheduling reconnect", reason.getReasonPhrase());
                scheduleReconnect();
            }
        }

        @OnError
        public void onError(Session session, Throwable throwable) {
            log.warn("AIS connection error: {}", throwable.getMessage());
            // Reconnect wird von onClose ausgelöst, das der Container danach aufruft
        }
    }
}
