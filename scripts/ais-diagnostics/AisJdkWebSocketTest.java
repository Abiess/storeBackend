/*
 * Standalone, dependency-free diagnostic tool for validating java.net.http.WebSocket
 * stability against AISStream, BEFORE trusting the transport swap in production.
 *
 * NOT wired into the Spring Boot build. Compile/run manually on the VPS:
 *
 *   export AISSTREAM_API_KEY=$(grep '^AISSTREAM_API_KEY=' /etc/storebackend.env | cut -d= -f2-)
 *   javac AisJdkWebSocketTest.java
 *   java AisJdkWebSocketTest
 *
 * SAFE: never prints the API key, the full subscription JSON, or raw vessel payloads.
 * Only prints connection lifecycle events, message counts, and message types.
 *
 * Runs for ~90 seconds then exits with a summary. Ctrl+C to stop earlier.
 */

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.WebSocket;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

public class AisJdkWebSocketTest {

    private static final String URL = "wss://stream.aisstream.io/v0/stream";
    private static final double[][] TANGER_MED_BBOX = {
            {35.75, -5.65},
            {36.05, -5.20}
    };

    public static void main(String[] args) throws Exception {
        String apiKey = System.getenv("AISSTREAM_API_KEY");
        if (apiKey == null || apiKey.isBlank()) {
            System.err.println("AISSTREAM_API_KEY environment variable is not set. Aborting.");
            System.exit(1);
        }

        AtomicInteger messageCount = new AtomicInteger(0);
        AtomicInteger binaryCount = new AtomicInteger(0);
        AtomicInteger textCount = new AtomicInteger(0);
        CountDownLatch closedLatch = new CountDownLatch(1);
        Instant start = Instant.now();

        HttpClient client = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();

        StringBuilder textBuffer = new StringBuilder();
        java.io.ByteArrayOutputStream binaryBuffer = new java.io.ByteArrayOutputStream();

        WebSocket.Listener listener = new WebSocket.Listener() {
            @Override
            public void onOpen(WebSocket webSocket) {
                System.out.println("[" + Instant.now() + "] onOpen: connection established");
                String subscription = "{\"APIKey\":\"" + apiKey + "\",\"BoundingBoxes\":[[["
                        + TANGER_MED_BBOX[0][0] + "," + TANGER_MED_BBOX[0][1] + "],["
                        + TANGER_MED_BBOX[1][0] + "," + TANGER_MED_BBOX[1][1] + "]]],"
                        + "\"FilterMessageTypes\":[\"PositionReport\",\"ShipStaticData\"]}";
                webSocket.sendText(subscription, true).whenComplete((ws, err) -> {
                    if (err != null) {
                        System.out.println("[" + Instant.now() + "] subscription send FAILED: " + err.getClass().getSimpleName());
                    } else {
                        System.out.println("[" + Instant.now() + "] subscription sent successfully");
                    }
                });
                webSocket.request(1);
            }

            @Override
            public CompletionStage<?> onText(WebSocket webSocket, CharSequence data, boolean last) {
                textBuffer.append(data);
                webSocket.request(1);
                if (last) {
                    String payload = textBuffer.toString();
                    textBuffer.setLength(0);
                    handleMessage(payload, textCount, messageCount, start);
                }
                return null;
            }

            @Override
            public CompletionStage<?> onBinary(WebSocket webSocket, ByteBuffer data, boolean last) {
                byte[] chunk = new byte[data.remaining()];
                data.get(chunk);
                binaryBuffer.write(chunk, 0, chunk.length);
                webSocket.request(1);
                if (last) {
                    byte[] bytes = binaryBuffer.toByteArray();
                    binaryBuffer.reset();
                    handleMessage(new String(bytes, StandardCharsets.UTF_8), binaryCount, messageCount, start);
                }
                return null;
            }

            @Override
            public CompletionStage<?> onClose(WebSocket webSocket, int statusCode, String reason) {
                System.out.println("[" + Instant.now() + "] onClose: code=" + statusCode + " reason=" + reason
                        + " (connection lived " + Duration.between(start, Instant.now()).getSeconds() + "s)");
                closedLatch.countDown();
                return null;
            }

            @Override
            public void onError(WebSocket webSocket, Throwable error) {
                Throwable root = error;
                while (root.getCause() != null && root.getCause() != root) {
                    root = root.getCause();
                }
                System.out.println("[" + Instant.now() + "] onError: " + error.getClass().getSimpleName()
                        + " (root cause: " + root.getClass().getSimpleName() + ": " + root.getMessage() + ")"
                        + " (connection lived " + Duration.between(start, Instant.now()).getSeconds() + "s)");
                closedLatch.countDown();
            }
        };

        CompletableFuture<WebSocket> wsFuture = client.newWebSocketBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .buildAsync(URI.create(URL), listener);

        WebSocket webSocket;
        try {
            webSocket = wsFuture.get(15, TimeUnit.SECONDS);
        } catch (Exception e) {
            System.err.println("Failed to connect: " + e);
            System.exit(2);
            return;
        }

        // Stay connected for up to 90 seconds, or until closed/errored earlier.
        boolean closedEarly = closedLatch.await(90, TimeUnit.SECONDS);

        System.out.println("=== SUMMARY ===");
        System.out.println("Total runtime: " + Duration.between(start, Instant.now()).getSeconds() + "s");
        System.out.println("Closed/errored early: " + closedEarly);
        System.out.println("Text messages: " + textCount.get());
        System.out.println("Binary messages: " + binaryCount.get());
        System.out.println("Total messages: " + messageCount.get());

        try {
            webSocket.sendClose(WebSocket.NORMAL_CLOSURE, "test complete").get(2, TimeUnit.SECONDS);
        } catch (Exception ignored) {
            webSocket.abort();
        }
        client.close();
    }

    private static void handleMessage(String payload, AtomicInteger typeCounter, AtomicInteger total, Instant start) {
        int n = total.incrementAndGet();
        typeCounter.incrementAndGet();
        // Only extract the message type via simple string search - no JSON parsing dependency needed,
        // and no raw payload printed.
        String messageType = extractMessageType(payload);
        if (n == 1) {
            System.out.println("[" + Instant.now() + "] first message received (type=" + messageType
                    + ") after " + Duration.between(start, Instant.now()).toMillis() + "ms");
        }
        if (n % 20 == 0) {
            System.out.println("[" + Instant.now() + "] " + n + " messages received so far (last type=" + messageType + ")");
        }
    }

    private static String extractMessageType(String payload) {
        int idx = payload.indexOf("\"MessageType\"");
        if (idx < 0) {
            return "unknown";
        }
        int colon = payload.indexOf(':', idx);
        int firstQuote = payload.indexOf('"', colon + 1);
        int secondQuote = payload.indexOf('"', firstQuote + 1);
        if (colon < 0 || firstQuote < 0 || secondQuote < 0) {
            return "unknown";
        }
        return payload.substring(firstQuote + 1, secondQuote);
    }
}
