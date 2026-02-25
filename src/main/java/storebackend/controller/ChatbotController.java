package storebackend.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import storebackend.dto.ChatbotRequest;
import storebackend.dto.ChatbotResponse;
import storebackend.dto.ChatSessionDTO;
import storebackend.dto.FaqCategoryDTO;
import storebackend.dto.FaqItemDTO;
import storebackend.entity.ChatSession;
import storebackend.repository.ChatSessionRepository;
import storebackend.service.ChatbotService;
import storebackend.service.FaqService;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/public/chatbot")
@RequiredArgsConstructor
@Slf4j
public class ChatbotController {

    private final ChatbotService chatbotService;
    private final FaqService faqService;
    private final ChatSessionRepository chatSessionRepository;

    @PostMapping("/message")
    public ResponseEntity<ChatbotResponse> sendMessage(@RequestBody ChatbotRequest request) {
        log.info("Received chatbot message for store {}", request.getStoreId());

        try {
            ChatbotResponse response = chatbotService.processMessage(request);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error processing chatbot message", e);
            return ResponseEntity.internalServerError()
                    .body(new ChatbotResponse(null, "Es ist ein Fehler aufgetreten. Bitte versuchen Sie es später erneut."));
        }
    }

    @GetMapping("/session/{sessionToken}")
    public ResponseEntity<ChatSessionDTO> getSession(@PathVariable String sessionToken) {
        log.info("Getting session with token {}", sessionToken);

        ChatSession session = chatSessionRepository.findBySessionToken(sessionToken)
                .orElse(null);

        if (session == null) {
            return ResponseEntity.notFound().build();
        }

        ChatSessionDTO dto = new ChatSessionDTO();
        dto.setId(session.getId());
        dto.setSessionToken(session.getSessionToken());
        dto.setStatus(session.getStatus().name());
        dto.setCreatedAt(session.getCreatedAt());

        return ResponseEntity.ok(dto);
    }

    @GetMapping("/stores/{storeId}/faq/categories")
    public ResponseEntity<List<FaqCategoryDTO>> getFaqCategories(@PathVariable Long storeId) {
        log.info("Getting FAQ categories for store {}", storeId);

        try {
            List<FaqCategoryDTO> categories = faqService.getCategories(storeId);
            return ResponseEntity.ok(categories);
        } catch (Exception e) {
            log.error("Error getting FAQ categories", e);
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/stores/{storeId}/faq/search")
    public ResponseEntity<List<FaqItemDTO>> searchFaq(
            @PathVariable Long storeId,
            @RequestParam String q) {
        log.info("Searching FAQ for store {} with keyword: {}", storeId, q);

        try {
            List<FaqItemDTO> results = faqService.searchFaq(storeId, q);
            return ResponseEntity.ok(results);
        } catch (Exception e) {
            log.error("Error searching FAQ", e);
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/stores/{storeId}/faq/categories/{categoryId}")
    public ResponseEntity<List<FaqItemDTO>> getFaqByCategory(
            @PathVariable Long storeId,
            @PathVariable Long categoryId) {
        log.info("Getting FAQ items for store {} category {}", storeId, categoryId);

        try {
            List<FaqItemDTO> items = faqService.getFaqsByCategory(categoryId, storeId);
            return ResponseEntity.ok(items);
        } catch (Exception e) {
            log.error("Error getting FAQ by category", e);
            return ResponseEntity.internalServerError().build();
        }
    }

    @PostMapping("/faq/{faqId}/helpful")
    public ResponseEntity<Map<String, String>> markFaqHelpful(@PathVariable Long faqId) {
        log.info("Marking FAQ {} as helpful", faqId);

        try {
            faqService.markHelpful(faqId);
            return ResponseEntity.ok(Map.of("message", "Vielen Dank für Ihr Feedback!"));
        } catch (Exception e) {
            log.error("Error marking FAQ helpful", e);
            return ResponseEntity.internalServerError().build();
        }
    }
}

