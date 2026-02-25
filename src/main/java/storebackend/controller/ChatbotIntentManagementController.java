package storebackend.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import storebackend.dto.ChatbotIntentDTO;
import storebackend.dto.ChatbotStatisticsDTO;
import storebackend.entity.ChatbotIntent;
import storebackend.entity.User;
import storebackend.service.ChatbotIntentService;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/stores/{storeId}/chatbot/intents")
@RequiredArgsConstructor
@Slf4j
@PreAuthorize("hasAnyRole('STORE_MANAGER', 'STORE_OWNER')")
public class ChatbotIntentManagementController {

    private final ChatbotIntentService intentService;

    @GetMapping
    public ResponseEntity<List<ChatbotIntent>> getIntents(
            @PathVariable Long storeId,
            @AuthenticationPrincipal User user) {
        log.info("Getting chatbot intents for store {}", storeId);

        try {
            List<ChatbotIntent> intents = intentService.getAllIntents(storeId);
            return ResponseEntity.ok(intents);
        } catch (Exception e) {
            log.error("Error getting intents", e);
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/active")
    public ResponseEntity<List<ChatbotIntent>> getActiveIntents(
            @PathVariable Long storeId,
            @AuthenticationPrincipal User user) {
        log.info("Getting active chatbot intents for store {}", storeId);

        try {
            List<ChatbotIntent> intents = intentService.getStoreIntents(storeId);
            return ResponseEntity.ok(intents);
        } catch (Exception e) {
            log.error("Error getting active intents", e);
            return ResponseEntity.internalServerError().build();
        }
    }

    @PostMapping
    public ResponseEntity<ChatbotIntent> createIntent(
            @PathVariable Long storeId,
            @RequestBody Map<String, Object> request,
            @AuthenticationPrincipal User user) {
        log.info("Creating chatbot intent for store {}", storeId);

        try {
            ChatbotIntent intent = intentService.createIntent(storeId, request);
            return ResponseEntity.ok(intent);
        } catch (Exception e) {
            log.error("Error creating intent", e);
            return ResponseEntity.badRequest().build();
        }
    }

    @PutMapping("/{intentId}")
    public ResponseEntity<ChatbotIntent> updateIntent(
            @PathVariable Long storeId,
            @PathVariable Long intentId,
            @RequestBody Map<String, Object> request,
            @AuthenticationPrincipal User user) {
        log.info("Updating chatbot intent {} for store {}", intentId, storeId);

        try {
            ChatbotIntent intent = intentService.updateIntent(intentId, storeId, request);
            return ResponseEntity.ok(intent);
        } catch (RuntimeException e) {
            log.error("Error updating intent", e);
            return ResponseEntity.status(403).build();
        } catch (Exception e) {
            log.error("Error updating intent", e);
            return ResponseEntity.badRequest().build();
        }
    }

    @DeleteMapping("/{intentId}")
    public ResponseEntity<Map<String, String>> deleteIntent(
            @PathVariable Long storeId,
            @PathVariable Long intentId,
            @AuthenticationPrincipal User user) {
        log.info("Deleting chatbot intent {} for store {}", intentId, storeId);

        try {
            intentService.deleteIntent(intentId, storeId);
            return ResponseEntity.ok(Map.of("message", "Intent erfolgreich gelöscht"));
        } catch (RuntimeException e) {
            log.error("Error deleting intent", e);
            return ResponseEntity.status(403).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            log.error("Error deleting intent", e);
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/{intentId}/toggle")
    public ResponseEntity<Map<String, String>> toggleIntent(
            @PathVariable Long storeId,
            @PathVariable Long intentId,
            @AuthenticationPrincipal User user) {
        log.info("Toggling chatbot intent {} for store {}", intentId, storeId);

        try {
            intentService.toggleIntent(intentId, storeId);
            return ResponseEntity.ok(Map.of("message", "Intent-Status erfolgreich geändert"));
        } catch (RuntimeException e) {
            log.error("Error toggling intent", e);
            return ResponseEntity.status(403).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            log.error("Error toggling intent", e);
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/statistics")
    public ResponseEntity<ChatbotStatisticsDTO> getStatistics(
            @PathVariable Long storeId,
            @AuthenticationPrincipal User user) {
        log.info("Getting chatbot statistics for store {}", storeId);

        try {
            ChatbotStatisticsDTO stats = intentService.getStatistics(storeId);
            return ResponseEntity.ok(stats);
        } catch (Exception e) {
            log.error("Error getting chatbot statistics", e);
            return ResponseEntity.internalServerError().build();
        }
    }

    @PostMapping("/{intentId}/test")
    public ResponseEntity<Map<String, Object>> testIntent(
            @PathVariable Long storeId,
            @PathVariable Long intentId,
            @RequestBody Map<String, String> request,
            @AuthenticationPrincipal User user) {
        log.info("Testing chatbot intent {} for store {}", intentId, storeId);

        String testMessage = request.get("message");
        if (testMessage == null || testMessage.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Message is required"));
        }

        try {
            Map<String, Object> testResult = intentService.testIntent(intentId, testMessage, storeId);
            return ResponseEntity.ok(testResult);
        } catch (RuntimeException e) {
            log.error("Error testing intent", e);
            return ResponseEntity.status(403).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            log.error("Error testing intent", e);
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/bulk-import")
    public ResponseEntity<Map<String, Object>> bulkImportIntents(
            @PathVariable Long storeId,
            @RequestBody List<ChatbotIntentDTO> intents,
            @AuthenticationPrincipal User user) {
        log.info("Bulk importing {} intents for store {}", intents.size(), storeId);

        try {
            List<ChatbotIntent> imported = intentService.bulkImportIntents(storeId, intents);
            return ResponseEntity.ok(Map.of(
                    "message", "Intents erfolgreich importiert",
                    "count", imported.size(),
                    "intents", imported
            ));
        } catch (Exception e) {
            log.error("Error bulk importing intents", e);
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}

