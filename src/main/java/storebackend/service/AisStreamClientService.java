package storebackend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import storebackend.dto.VesselDTO;

import java.io.ByteArrayOutputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.WebSocket;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletionStage;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
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
 * WICHTIG (WebSocket-Transport):
 *  - Nutzt {@code java.net.http.WebSocket} (JDK-eigener Client, seit Java 11), NICHT
 *    jakarta.websocket/Tomcat. Grund: In Produktion zeigte Tomcats
 *    {@code WsWebSocketContainer}-Client ein reproduzierbares TLS/SSLEngine-Problem
 *    ("Unexpected Status of SSLEngineResult after an unwrap() operation") direkt nach
 *    dem Verbindungsaufbau zu AISStream, das die Verbindung nach &lt;1s wieder abbaute
 *    (Endlos-Reconnect-Loop). Dies ist ein bekanntes Muster bei Tomcats
 *    Non-Blocking-SSL-Implementierung im reinen Client-Betrieb (außerhalb eines
 *    laufenden Tomcat-Servers), u. a. in Kombination mit permessage-deflate, das
 *    AISStream standardmäßig aushandelt. java.net.http.WebSocket ist Teil des JDK,
 *    erfordert KEINE zusätzliche Maven-Dependency und verwendet einen separaten,
 *    ausgereiften TLS-Stack.
 *
 * WICHTIG (Memory/OOM):
 *  - Es wird NIEMALS eine Historie gehalten – jede neue Position überschreibt
 *    den vorherigen Zustand desselben Schiffes (MMSI).
 *  - Harte Obergrenze {@link #MAX_VESSELS} – bei Erreichen wird der älteste
 *    (stale-ste) Eintrag zuerst entfernt.
 *  - Regelmäßiger Cleanup entfernt Schiffe, die länger als
 *    {@link #STALE_AFTER_MINUTES} Minuten nicht mehr gemeldet wurden
 *    (aufgerufen durch {@link storebackend.scheduler.MaritimeCleanupScheduler}).
 *  - Fragmentierte Text-/Binary-Frames werden nur bis zu einer kleinen Sicherheitsgrenze
 *    ({@link #MAX_FRAGMENT_BYTES}) gepuffert – kein unbegrenzter Puffer.
 *
 * WICHTIG (Security):
 *  - Der API-Key wird NIEMALS geloggt und NIEMALS über REST zurückgegeben.
 *  - Es wird KEIN neuer öffentlicher WebSocket-Endpoint auf markt.ma geöffnet –
 *    die Verbindung ist ausschließlich ausgehend vom Backend zu AISStream.
 *  - TLS-Zertifikatsprüfung wird nicht deaktiviert (Standard-JDK-Truststore).
 *
 * WICHTIG (Stabilität):
 *  - Reconnect mit exponentiellem Backoff (1s, 2s, 5s, 10s, 30s-Cap).
 *  - Der Backoff wird NICHT bei jedem bloßen Verbindungsaufbau zurückgesetzt, sondern
 *    erst wenn entweder die erste gültige AIS-Message empfangen wurde ODER die
 *    Verbindung mindestens {@link #STABLE_CONNECTION_SECONDS} Sekunden stand – so wird
 *    verhindert, dass eine Verbindung, die nach Millisekunden sofort wieder abbricht
 *    (z. B. bei TLS-Problemen), den Reconnect-Loop unnötig verschärft.
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

    /**
     * Backoff wird nur zurückgesetzt, wenn entweder eine gültige Message empfangen wurde
     * ODER die Verbindung mindestens so lange stand (Sekunden) – siehe Klassen-Javadoc.
     */
    private static final int STABLE_CONNECTION_SECONDS = 10;

    /** Sicherheitsgrenze für fragmentierte Text-/Binary-Frames (AIS-Messages sind klein, das ist nur ein Schutz). */
    private static final int MAX_FRAGMENT_BYTES = 1_000_000;

    @Value("${aisstream.api-key:}")
    private String apiKey;

    private final ObjectMapper objectMapper;

    /** Aktueller Live-Zustand pro Schiff – Key = MMSI. KEINE Historie! */
    private final Map<Long, VesselDTO> vessels = new ConcurrentHashMap<>();

    /** Für Reconnect-Scheduling (Backoff-Timer) – ein einzelner Daemon-Thread. */
    private final ScheduledExecutorService executor =
            Executors.newSingleThreadScheduledExecutor(r -> {
                Thread t = new Thread(r, "aisstream-client");
                t.setDaemon(true);
                return t;
            });

    /** Kleiner, bounded Daemon-Pool für die asynchronen Callbacks des JDK-WebSocket-Clients. */
    private final ExecutorService wsExecutor = Executors.newFixedThreadPool(2, r -> {
        Thread t = new Thread(r, "aisstream-ws-io");
        t.setDaemon(true);
        return t;
    });

    private final HttpClient httpClient = HttpClient.newBuilder()
            .executor(wsExecutor)
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    private final AtomicBoolean shuttingDown = new AtomicBoolean(false);
    private final AtomicBoolean connected = new AtomicBoolean(false);
    private final AtomicReference<Instant> lastMessageAt = new AtomicReference<>();
    private final AtomicInteger backoffIndex = new AtomicInteger(0);
    private final AtomicInteger malformedMessageCount = new AtomicInteger(0);
    private final AtomicReference<WebSocket> currentWebSocket = new AtomicReference<>();
    private final AtomicLong evictionCounter = new AtomicLong(0);
    private final AtomicBoolean everConnected = new AtomicBoolean(false);
    /** Verhindert doppelte Reconnect-Scheduling, falls onClose/onError unerwartet mehrfach feuern. */
    private final AtomicBoolean reconnectScheduled = new AtomicBoolean(false);
    /** Zeitpunkt des letzten Verbindungsaufbaus – zur Beurteilung, ob die Verbindung "stabil" stand. */
    private final AtomicReference<Instant> connectedSince = new AtomicReference<>();
    /** Verhindert, dass der Backoff mehrfach pro Verbindung zurückgesetzt wird. */
    private final AtomicBoolean healthyResetDone = new AtomicBoolean(false);

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
        WebSocket ws = currentWebSocket.get();
        if (ws != null) {
            try {
                ws.sendClose(WebSocket.NORMAL_CLOSURE, "shutdown")
                        .orTimeout(2, TimeUnit.SECONDS)
                        .join();
            } catch (Exception e) {
                log.debug("Error while closing AIS WebSocket on shutdown: {}", e.getMessage());
                ws.abort();
            }
        }
        executor.shutdownNow();
        wsExecutor.shutdownNow();
        try {
            httpClient.close();
        } catch (Exception e) {
            log.debug("Error while closing AIS HttpClient on shutdown: {}", e.getMessage());
        }
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
        healthyResetDone.set(false);
        httpClient.newWebSocketBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .buildAsync(URI.create(AISSTREAM_URL), new AisWebSocketListener())
                .whenComplete((webSocket, error) -> {
                    if (error != null) {
                        Throwable root = rootCause(error);
                        log.warn("AIS connection attempt failed: {} (root cause: {}: {})",
                                error.getClass().getSimpleName(), root.getClass().getSimpleName(), root.getMessage());
                        scheduleReconnect();
                    }
                    // Erfolgsfall: onOpen() des Listeners übernimmt bereits das Setzen von
                    // currentWebSocket/connected – hier ist nichts weiter zu tun.
                });
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

    /**
     * Setzt den Backoff nur EINMAL pro Verbindung zurück – entweder sobald die erste gültige
     * Message empfangen wurde, oder wenn die Verbindung bereits {@link #STABLE_CONNECTION_SECONDS}s
     * stand. Verhindert, dass eine Verbindung, die sofort wieder abbricht (z. B. TLS-Problem),
     * den Reconnect-Loop auf die minimale 1s-Stufe zurücksetzt und AISStream "hämmert".
     */
    private void markConnectionHealthy() {
        if (healthyResetDone.compareAndSet(false, true)) {
            backoffIndex.set(0);
        }
    }

    private void maybeResetBackoffOnStableClose() {
        Instant since = connectedSince.get();
        if (since != null && Duration.between(since, Instant.now()).getSeconds() >= STABLE_CONNECTION_SECONDS) {
            markConnectionHealthy();
        }
    }

    private static Throwable rootCause(Throwable t) {
        Throwable cause = t;
        while (cause.getCause() != null && cause.getCause() != cause) {
            cause = cause.getCause();
        }
        return cause;
    }

    private void sendSubscription(WebSocket webSocket) {
        try {
            // TEMPORÄRER A/B-TEST (siehe Klassen-Javadoc "Troubleshooting"): Payload wird bewusst als
            // literaler String und NICHT über Map+Jackson gebaut, um jede denkbare Serialisierungs-
            // Abweichung (Feld-Reihenfolge, Zahlenformat, Escaping) gegenüber dem bestätigt funktionierenden
            // Referenz-Client (Python) auszuschließen. "ShipStaticData" ist für diesen Test bewusst aus
            // FilterMessageTypes entfernt (nur PositionReport, wie im Referenz-Payload). Sobald der Verbindungsabbruch
            // (code=1006 ~0.5s nach onOpen) empirisch behoben ist, kann hier wieder auf das reguläre
            // Map+Jackson-Pattern inkl. ShipStaticData zurückgebaut werden.
            String json = "{"
                    + "\"APIKey\":\"" + escapeJson(apiKey) + "\","
                    + "\"BoundingBoxes\":[[["
                    + TANGER_MED_BBOX[0][0] + "," + TANGER_MED_BBOX[0][1] + "],["
                    + TANGER_MED_BBOX[1][0] + "," + TANGER_MED_BBOX[1][1] + "]]],"
                    + "\"FilterMessageTypes\":[\"PositionReport\"]"
                    + "}";
            // WICHTIG: Niemals das komplette Subscription-JSON loggen (enthält den API-Key)! Nur die Länge.
            log.info("AIS subscription send started (payloadLength={})", json.length());
            webSocket.sendText(json, true).whenComplete((ws, err) -> {
                if (err != null) {
                    log.warn("AIS subscription send FAILED: {}: {}", err.getClass().getSimpleName(), err.getMessage());
                } else {
                    log.info("AIS subscription send completed successfully");
                }
            });
        } catch (Exception e) {
            log.warn("Failed to build AIS subscription request: {}", e.getMessage());
        }
    }

    private static String escapeJson(String s) {
        return s == null ? "" : s.replace("\\", "\\\\").replace("\"", "\\\"");
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

            // Erste erfolgreich geparste Message auf dieser Verbindung => Verbindung ist funktional
            // gesund, nicht nur TCP/TLS-technisch offen. Erst jetzt den Backoff zurücksetzen (siehe
            // Klassen-Javadoc "Reconnect-Backoff").
            markConnectionHealthy();

            switch (messageType) {
                case "SubscriptionConfirmation" ->
                        log.info("AIS SubscriptionConfirmation received (parsed successfully)");
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
    //  java.net.http.WebSocket Listener
    //  AISStream liefert Binary-Frames mit UTF-8-JSON-Payload (permessage-deflate) –
    //  daher werden Text- UND Binary-Frames behandelt. Fragmentierte Frames werden bis
    //  zu einer kleinen Sicherheitsgrenze gepuffert (siehe MAX_FRAGMENT_BYTES), niemals
    //  unbegrenzt. Ping-Frames werden vom JDK automatisch mit Pong beantwortet
    //  (Default-Implementierung von WebSocket.Listener#onPing) – kein manuelles
    //  Text-"Ping" nötig.
    // ─────────────────────────────────────────────────────────────

    private final class AisWebSocketListener implements WebSocket.Listener {

        private final StringBuilder textBuffer = new StringBuilder();
        private final ByteArrayOutputStream binaryBuffer = new ByteArrayOutputStream();
        private boolean firstMessageLogged = false;
        private boolean firstFrameLogged = false;

        @Override
        public void onOpen(WebSocket webSocket) {
            currentWebSocket.set(webSocket);
            connected.set(true);
            connectedSince.set(Instant.now());
            boolean firstConnect = everConnected.compareAndSet(false, true);
            log.info(firstConnect ? "AIS connection established" : "AIS connection restored");
            // Flow-Control zuerst freigeben (webSocket.request), danach senden – Reihenfolge hat auf
            // das Senden selbst keinen Einfluss (request() steuert nur eingehende Frames), macht die
            // Absicht aber klarer und entspricht der defensiven Vorgabe.
            webSocket.request(1);
            sendSubscription(webSocket);
        }

        @Override
        public CompletionStage<?> onText(WebSocket webSocket, CharSequence data, boolean last) {
            if (!firstFrameLogged) {
                firstFrameLogged = true;
                log.info("AIS first frame received: type=TEXT, last={}, length={}", last, data.length());
            }
            if (textBuffer.length() + data.length() <= MAX_FRAGMENT_BYTES) {
                textBuffer.append(data);
            } else if (textBuffer.length() <= MAX_FRAGMENT_BYTES) {
                log.warn("AIS text message exceeded fragment safety limit, discarding");
                textBuffer.setLength(0);
            }
            webSocket.request(1);
            if (last) {
                String payload = textBuffer.toString();
                textBuffer.setLength(0);
                onFullMessage(payload);
            }
            return null;
        }

        @Override
        public CompletionStage<?> onBinary(WebSocket webSocket, ByteBuffer data, boolean last) {
            if (!firstFrameLogged) {
                firstFrameLogged = true;
                log.info("AIS first frame received: type=BINARY, last={}, length={}", last, data.remaining());
            }
            byte[] chunk = new byte[data.remaining()];
            data.get(chunk);
            if (binaryBuffer.size() + chunk.length <= MAX_FRAGMENT_BYTES) {
                binaryBuffer.write(chunk, 0, chunk.length);
            } else if (binaryBuffer.size() <= MAX_FRAGMENT_BYTES) {
                log.warn("AIS binary message exceeded fragment safety limit, discarding");
                binaryBuffer.reset();
            }
            webSocket.request(1);
            if (last) {
                byte[] bytes = binaryBuffer.toByteArray();
                binaryBuffer.reset();
                onFullMessage(new String(bytes, StandardCharsets.UTF_8));
            }
            return null;
        }

        private void onFullMessage(String payload) {
            if (!firstMessageLogged) {
                firstMessageLogged = true;
                log.info("AIS first message received after connect");
            }
            handleMessage(payload);
        }

        @Override
        public CompletionStage<?> onClose(WebSocket webSocket, int statusCode, String reason) {
            connected.set(false);
            currentWebSocket.set(null);
            if (!shuttingDown.get()) {
                log.info("AIS connection lost (code={}, reason={}), scheduling reconnect", statusCode, reason);
                maybeResetBackoffOnStableClose();
                scheduleReconnect();
            }
            return null;
        }

        @Override
        public void onError(WebSocket webSocket, Throwable error) {
            Throwable root = rootCause(error);
            log.warn("AIS connection error: {} (root cause: {}: {})",
                    error.getClass().getSimpleName(), root.getClass().getSimpleName(), root.getMessage());
            connected.set(false);
            currentWebSocket.set(null);
            // java.net.http.WebSocket garantiert NICHT zwingend einen zusätzlichen onClose-Aufruf nach
            // onError – daher hier ebenfalls Reconnect anstoßen (reconnectScheduled-Guard verhindert
            // doppeltes Scheduling, falls der Client doch beides aufruft).
            if (!shuttingDown.get()) {
                maybeResetBackoffOnStableClose();
                scheduleReconnect();
            }
        }
    }
}
