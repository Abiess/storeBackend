package storebackend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import storebackend.dto.VesselDTO;
import storebackend.enums.MaritimePort;
import storebackend.enums.VesselPortStatus;

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
 * Live-AIS-Integration für das Maritime-Feature (Tanger Med, Nador, Casablanca – siehe {@link storebackend.enums.MaritimePort}).
 *
 * Architektur (bewusst so gehalten, siehe Aufgabenstellung):
 *   AISStream (wss://stream.aisstream.io/v0/stream)
 *     → GENAU EINE dauerhafte, ausgehende WebSocket-Verbindung pro Backend-Instanz
 *     → aktueller Vessel-State im Speicher (ConcurrentHashMap, Key = MMSI)
 *     → REST-Endpoints ({@link storebackend.controller.MaritimeController}) lesen nur den Cache
 *
 * WICHTIG (Mehrere Häfen, EINE Verbindung):
 *  - Der ausgewählte Hafen ({@link #currentPort}) bestimmt nur die BoundingBox der Subscription.
 *  - Beim Hafenwechsel ({@link #switchPort(storebackend.enums.MaritimePort)}) wird KEINE neue
 *    WebSocket-Verbindung aufgebaut, sondern über die bestehende (falls verbunden) eine neue
 *    Subscription-Nachricht gesendet ("ein Update pro Klick", kein Polling-Resend).
 *  - Ist die Verbindung gerade getrennt, wird nur {@link #currentPort} gemerkt – der nächste
 *    erfolgreiche {@code onOpen} sendet automatisch die Subscription für den zuletzt gewählten Hafen.
 *  - Der Vessel-Cache wird bei einem echten Hafenwechsel geleert (sonst blieben alte Schiffe
 *    des vorherigen Hafens sichtbar, bis der stale-Cleanup sie irgendwann entfernt).
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
 *  - "Healthy" (siehe {@link #isHealthy()}) ist bewusst von "connected" getrennt: Nach einem
 *    Hafenwechsel gilt die Subscription erst als gesund, sobald AISStream eine
 *    SubscriptionConfirmation für den NEUEN Hafen bestätigt hat.
 */
@Service
@Slf4j
public class AisStreamClientService {

    private static final String AISSTREAM_URL = "wss://stream.aisstream.io/v0/stream";

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
    /** Aktuell ausgewählter Hafen (bestimmt die BoundingBox der Subscription). Default: Tanger Med (MVP-Startwert). */
    private final AtomicReference<MaritimePort> currentPort = new AtomicReference<>(MaritimePort.TANGER_MED);
    /**
     * true = AISStream hat die Subscription für den AKTUELL ausgewählten Hafen per
     * SubscriptionConfirmation bestätigt. Wird bei jeder neuen Subscription (neuer Connect ODER
     * Hafenwechsel) zurückgesetzt – siehe Klassen-Javadoc "Stabilität".
     */
    private final AtomicBoolean subscriptionHealthy = new AtomicBoolean(false);
    /**
     * TEMPORÄR (Deployment-Diagnose): zählt PositionReports seit der letzten gesendeten Subscription
     * (neuer Connect ODER Hafenwechsel) – hilft zu erkennen, ob AISStream für einen Hafen überhaupt
     * Daten liefert, unabhängig vom Vessel-Cache-Stand. Kein Rohdaten-/Message-Puffer, nur ein Zähler.
     */
    private final AtomicInteger positionReportsSinceSubscription = new AtomicInteger(0);

    /**
     * TEMPORÄR (Deployment-Diagnose, Live-Data-Review): zählt ShipStaticData-Messages seit der
     * letzten Subscription – erlaubt zu verifizieren, dass ShipStaticData (Destination/Name/ETA/...)
     * tatsächlich vom AISStream-Server ankommt. Kein Rohdaten-Puffer, nur ein Zähler.
     */
    private final AtomicInteger staticDataReceivedSinceSubscription = new AtomicInteger(0);

    /** Phase 2B: leitet fachliche Port Events aus Statuswechseln ab (siehe {@link #handlePositionReport}). */
    private final VesselPortEventService portEventService;

    public AisStreamClientService(ObjectMapper objectMapper, VesselPortEventService portEventService) {
        this.objectMapper = objectMapper;
        this.portEventService = portEventService;
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

    /** Aktuell ausgewählter Hafen. */
    public MaritimePort getCurrentPort() {
        return currentPort.get();
    }

    /**
     * "Gesund" = verbunden UND AISStream hat die Subscription für den aktuellen Hafen bereits
     * per SubscriptionConfirmation bestätigt. Getrennt von {@link #isConnected()}, damit das Frontend
     * nach einem Hafenwechsel kurz erkennen kann, dass die neue Subscription noch nicht bestätigt ist.
     */
    public boolean isHealthy() {
        return connected.get() && subscriptionHealthy.get();
    }

    /**
     * Wechselt den aktiven Hafen. Baut KEINE neue AISStream-Verbindung auf – aktualisiert stattdessen
     * die Subscription über die bestehende Verbindung (falls verbunden). Leert den Vessel-Cache bei
     * einem echten Wechsel (sonst blieben Schiffe des vorherigen Hafens sichtbar). Ist die Verbindung
     * gerade getrennt, wird nur der gewünschte Hafen gemerkt – der nächste erfolgreiche Connect sendet
     * automatisch die Subscription für diesen Hafen (siehe {@link #sendSubscription(WebSocket)}).
     */
    public synchronized void switchPort(MaritimePort newPort) {
        if (newPort == null) {
            return;
        }
        MaritimePort previous = currentPort.getAndSet(newPort);
        if (previous == newPort) {
            // Kein echter Wechsel (z.B. Doppel-Klick auf denselben Hafen) – kein Cache-Clear,
            // kein erneutes Subscription-Update ("ein Klick = ein Update").
            return;
        }
        vessels.clear();
        subscriptionHealthy.set(false);
        log.info("Maritime port switched: {} -> {} (vessel cache cleared)", previous, newPort);
        WebSocket ws = currentWebSocket.get();
        if (ws != null) {
            sendSubscription(ws);
        } else {
            log.info("Maritime port switch to {} stored, currently disconnected – subscription will be sent on next connect", newPort);
        }
        // Falls ws == null (aktuell getrennt): nichts weiter zu tun, der nächste onOpen()
        // sendet die Subscription automatisch für den jetzt gespeicherten currentPort.
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
        subscriptionHealthy.set(false);
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
            // Payload wird bewusst als literaler String und NICHT über Map+Jackson gebaut (siehe
            // Klassen-Javadoc "Troubleshooting" zur ursprünglichen A/B-Test-Diagnose des
            // Verbindungsabbruchs code=1006 ~0.5s nach onOpen). Der Verbindungsabbruch ist seither
            // im Live-Betrieb nicht mehr aufgetreten; ShipStaticData wurde daher wieder in
            // FilterMessageTypes aufgenommen (Live-Data-Review: Destination/Name/ETA/CallSign/IMO
            // werden sonst nie empfangen – siehe handleStaticData).
            double[][] bbox = currentPort.get().getBoundingBox();
            String json = "{"
                    + "\"APIKey\":\"" + escapeJson(apiKey) + "\","
                    + "\"BoundingBoxes\":[[["
                    + bbox[0][0] + "," + bbox[0][1] + "],["
                    + bbox[1][0] + "," + bbox[1][1] + "]]],"
                    + "\"FilterMessageTypes\":[\"PositionReport\",\"ShipStaticData\"]"
                    + "}";
            // TEMPORÄR (Deployment-Diagnose): Zähler für "PositionReports/ShipStaticData seit letzter
            // Subscription" zurücksetzen – erlaubt zu beobachten, ob AISStream für DIESEN Hafen
            // überhaupt Daten (inkl. Static Data) liefert.
            positionReportsSinceSubscription.set(0);
            staticDataReceivedSinceSubscription.set(0);
            // WICHTIG: Niemals das komplette Subscription-JSON loggen (enthält den API-Key)! Nur die
            // BoundingBox-Koordinaten (unkritisch, öffentlich bekannte Geo-Region) und die Länge.
            log.info("AIS subscription send started (port={}, boundingBox=[[{},{}],[{},{}]], payloadLength={})",
                    currentPort.get(), bbox[0][0], bbox[0][1], bbox[1][0], bbox[1][1], json.length());
            webSocket.sendText(json, true).whenComplete((ws, err) -> {
                if (err != null) {
                    log.warn("AIS subscription send FAILED: {}: {}", err.getClass().getSimpleName(), err.getMessage());
                } else {
                    log.info("AIS subscription send completed successfully (port={})", currentPort.get());
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
                case "SubscriptionConfirmation" -> {
                    subscriptionHealthy.set(true);
                    log.info("AIS SubscriptionConfirmation received for port={} (parsed successfully)", currentPort.get());
                }
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
        // TEMPORÄR (Deployment-Diagnose): zählt PositionReports seit der letzten Subscription (siehe
        // sendSubscription/positionReportsSinceSubscription) – nur ein Zähler, keine Rohdaten-Speicherung.
        // Log nur bei den ersten paar Nachrichten sowie danach nur noch selten, um Log-Flut zu vermeiden.
        int reportCount = positionReportsSinceSubscription.incrementAndGet();
        if (reportCount <= 3 || reportCount % 50 == 0) {
            log.info("AIS PositionReport #{} received for port={} since last subscription", reportCount, currentPort.get());
        }

        // Message.PositionReport.Latitude/Longitude ist laut AISStream-Schema ein Pflichtfeld;
        // MetaData.Latitude/Longitude (Großschreibung!) dient nur als defensiver Fallback.
        double lat = pos.has("Latitude") ? pos.path("Latitude").asDouble() : metaData.path("Latitude").asDouble();
        double lon = pos.has("Longitude") ? pos.path("Longitude").asDouble() : metaData.path("Longitude").asDouble();

        VesselDTO existing = vessels.get(mmsi);
        VesselDTO.VesselDTOBuilder builder = existing != null ? copyOf(existing) : VesselDTO.builder().mmsi(mmsi);

        Double speed = pos.has("Sog") ? pos.path("Sog").asDouble() : null;
        Double course = pos.has("Cog") ? pos.path("Cog").asDouble() : null;

        builder.latitude(lat)
                .longitude(lon)
                .speed(speed)
                .course(course)
                .lastSeen(Instant.now());

        int heading = pos.path("TrueHeading").asInt(511);
        builder.heading(heading != 511 ? heading : (existing != null ? existing.getHeading() : null));

        // NavigationalStatus (ITU-R M.1371, 0-15): 15 = "nicht definiert" -> wie fehlend behandeln.
        int navStatus = pos.path("NavigationalStatus").asInt(15);
        builder.navigationStatus(navStatus != 15 ? navStatus : null);

        String shipName = metaData.path("ShipName").asText("").trim();
        if (!shipName.isEmpty()) {
            builder.shipName(shipName);
        } else if (existing != null) {
            builder.shipName(existing.getShipName());
        }

        // Port-Status IMMER relativ zum aktuell ausgewählten Hafen neu ableiten (einfache Regeln,
        // keine Historie/Trajektorie – siehe PortStatusCalculator). NavigationalStatus wird mit
        // berücksichtigt (z.B. um "vor Anker außerhalb der Port-Zone" nicht fälschlich als MOORED
        // zu klassifizieren, siehe PortStatusCalculator-Javadoc).
        Integer navStatusForStatusCalc = navStatus != 15 ? navStatus : null;
        VesselPortStatus previousStatus = existing != null && existing.getPortStatus() != null
                ? VesselPortStatus.valueOf(existing.getPortStatus())
                : null;
        VesselPortStatus status = PortStatusCalculator.compute(lat, lon, speed, course, navStatusForStatusCalc, currentPort.get());
        builder.portStatus(status.name());

        VesselDTO vessel = builder.build();
        // Phase 2B: nur bei echtem Statuswechsel wird ein fachliches Port Event persistiert
        // (kein Positions-/AIS-Rohdaten-Historie im Sekundentakt, siehe VesselPortEventService).
        portEventService.recordTransitionIfAny(previousStatus, status, currentPort.get(), vessel);
        putVessel(mmsi, vessel);
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

        // Dimension (A=Bug->Referenzpunkt, B=Referenzpunkt->Heck, C=Backbord->Ref, D=Ref->Steuerbord),
        // laut AISStream-Schema alle vier Pflichtfelder INNERHALB von Dimension, wenn Dimension gesendet wird.
        JsonNode dimension = staticData.path("Dimension");
        if (dimension.has("A") && dimension.has("B")) {
            int length = dimension.path("A").asInt(0) + dimension.path("B").asInt(0);
            if (length > 0) {
                builder.length(length);
            }
        }
        if (dimension.has("C") && dimension.has("D")) {
            int width = dimension.path("C").asInt(0) + dimension.path("D").asInt(0);
            if (width > 0) {
                builder.width(width);
            }
        }

        // Eta enthält laut AISStream-Schema nur Month/Day/Hour/Minute (KEIN Jahr) – Month=0 & Day=0
        // bedeutet "nicht verfügbar" und wird bewusst nicht als Datum dargestellt.
        JsonNode eta = staticData.path("Eta");
        int etaMonth = eta.path("Month").asInt(0);
        int etaDay = eta.path("Day").asInt(0);
        if (etaMonth > 0 && etaDay > 0) {
            builder.eta(String.format("%02d-%02d %02d:%02d",
                    etaMonth, etaDay, eta.path("Hour").asInt(0), eta.path("Minute").asInt(0)));
        }

        // TEMPORÄR (Deployment-Diagnose, Live-Data-Review): bestätigt, dass ShipStaticData ankommt und
        // welche Felder gefüllt sind. NUR MMSI + Boolean-Flags, KEINE Rohdaten/Namen im Log, KEIN API-Key.
        int staticDataCount = staticDataReceivedSinceSubscription.incrementAndGet();
        if (staticDataCount <= 3 || staticDataCount % 50 == 0) {
            log.info("AIS ShipStaticData #{} received for port={} (mmsi={}, hasDestination={}, hasName={}, hasEta={}, hasCallSign={})",
                    staticDataCount, currentPort.get(), mmsi, !destination.isEmpty(), !shipName.isEmpty(),
                    etaMonth > 0 && etaDay > 0, !callSign.isEmpty());
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
                .draught(v.getDraught())
                .navigationStatus(v.getNavigationStatus())
                .eta(v.getEta())
                .length(v.getLength())
                .width(v.getWidth())
                .portStatus(v.getPortStatus());
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
