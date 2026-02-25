package storebackend.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import storebackend.dto.ChatMessageDTO;
import storebackend.dto.ChatSessionDTO;
import storebackend.dto.SendMessageRequest;
import storebackend.entity.User;
import storebackend.service.ChatService;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/stores/{storeId}/chat")
@RequiredArgsConstructor
@Slf4j
@PreAuthorize("hasAnyRole('STORE_MANAGER', 'STORE_OWNER')")
public class ChatManagementController {

    private final ChatService chatService;

    @GetMapping("/sessions/active")
    public ResponseEntity<List<ChatSessionDTO>> getActiveSessions(
            @PathVariable Long storeId,
            @AuthenticationPrincipal User user) {
        log.info("Getting active chat sessions for store {}", storeId);

        try {
            List<ChatSessionDTO> sessions = chatService.getActiveSessions(storeId);
            return ResponseEntity.ok(sessions);
        } catch (Exception e) {
            log.error("Error getting active sessions", e);
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/sessions/transferred")
    public ResponseEntity<List<ChatSessionDTO>> getTransferredSessions(
            @PathVariable Long storeId,
            @AuthenticationPrincipal User user) {
        log.info("Getting transferred chat sessions for store {}", storeId);

        try {
            List<ChatSessionDTO> sessions = chatService.getTransferredSessions(storeId);
            return ResponseEntity.ok(sessions);
        } catch (Exception e) {
            log.error("Error getting transferred sessions", e);
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/sessions")
    public ResponseEntity<List<ChatSessionDTO>> getAllSessions(
            @PathVariable Long storeId,
            @AuthenticationPrincipal User user) {
        log.info("Getting all chat sessions for store {}", storeId);

        try {
            List<ChatSessionDTO> sessions = chatService.getAllSessions(storeId);
            return ResponseEntity.ok(sessions);
        } catch (Exception e) {
            log.error("Error getting all sessions", e);
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/sessions/{sessionId}")
    public ResponseEntity<ChatSessionDTO> getSession(
            @PathVariable Long storeId,
            @PathVariable Long sessionId,
            @AuthenticationPrincipal User user) {
        log.info("Getting session {} for store {}", sessionId, storeId);

        try {
            ChatSessionDTO session = chatService.getSessionById(sessionId, storeId);
            return ResponseEntity.ok(session);
        } catch (Exception e) {
            log.error("Error getting session", e);
            return ResponseEntity.status(403).build();
        }
    }

    @GetMapping("/sessions/{sessionId}/messages")
    public ResponseEntity<List<ChatMessageDTO>> getSessionMessages(
            @PathVariable Long storeId,
            @PathVariable Long sessionId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size,
            @AuthenticationPrincipal User user) {
        log.info("Getting messages for session {} page {}", sessionId, page);

        try {
            List<ChatMessageDTO> messages = chatService.getSessionMessages(
                    sessionId, storeId, page, size);
            return ResponseEntity.ok(messages);
        } catch (Exception e) {
            log.error("Error getting session messages", e);
            return ResponseEntity.status(403).build();
        }
    }

    @PostMapping("/sessions/{sessionId}/assign")
    public ResponseEntity<Map<String, String>> assignAgent(
            @PathVariable Long storeId,
            @PathVariable Long sessionId,
            @RequestBody Map<String, Long> request,
            @AuthenticationPrincipal User user) {
        Long agentId = request.get("agentId");
        log.info("Assigning agent {} to session {}", agentId, sessionId);

        try {
            chatService.assignAgent(sessionId, agentId, storeId);
            return ResponseEntity.ok(Map.of("message", "Agent erfolgreich zugewiesen"));
        } catch (Exception e) {
            log.error("Error assigning agent", e);
            return ResponseEntity.status(403).body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/messages/send")
    public ResponseEntity<ChatMessageDTO> sendMessage(
            @PathVariable Long storeId,
            @RequestBody SendMessageRequest request,
            @AuthenticationPrincipal User user) {
        log.info("Sending message to session {}", request.getSessionId());

        try {
            ChatMessageDTO message = chatService.sendMessage(request, user);
            return ResponseEntity.ok(message);
        } catch (Exception e) {
            log.error("Error sending message", e);
            return ResponseEntity.status(403).build();
        }
    }

    @PostMapping("/sessions/{sessionId}/close")
    public ResponseEntity<Map<String, String>> closeSession(
            @PathVariable Long storeId,
            @PathVariable Long sessionId,
            @AuthenticationPrincipal User user) {
        log.info("Closing session {}", sessionId);

        try {
            chatService.closeSession(sessionId, storeId);
            return ResponseEntity.ok(Map.of("message", "Chat erfolgreich geschlossen"));
        } catch (Exception e) {
            log.error("Error closing session", e);
            return ResponseEntity.status(403).body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/sessions/{sessionId}/read")
    public ResponseEntity<Map<String, String>> markAsRead(
            @PathVariable Long storeId,
            @PathVariable Long sessionId,
            @AuthenticationPrincipal User user) {
        log.info("Marking messages as read for session {}", sessionId);

        try {
            chatService.markMessagesAsRead(sessionId, storeId);
            return ResponseEntity.ok(Map.of("message", "Nachrichten als gelesen markiert"));
        } catch (Exception e) {
            log.error("Error marking messages as read", e);
            return ResponseEntity.status(403).body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getStats(
            @PathVariable Long storeId,
            @AuthenticationPrincipal User user) {
        log.info("Getting chat stats for store {}", storeId);

        try {
            long unreadCount = chatService.getUnreadMessageCount(storeId);
            long activeCount = chatService.getActiveSessionCount(storeId);

            return ResponseEntity.ok(Map.of(
                    "unreadMessages", unreadCount,
                    "activeSessions", activeCount
            ));
        } catch (Exception e) {
            log.error("Error getting stats", e);
            return ResponseEntity.internalServerError().build();
        }
    }
}

