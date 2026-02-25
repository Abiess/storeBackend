package storebackend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import storebackend.dto.ChatbotIntentDTO;
import storebackend.dto.ChatbotStatisticsDTO;
import storebackend.entity.ChatbotIntent;
import storebackend.entity.Store;
import storebackend.enums.ChatSessionStatus;
import storebackend.repository.ChatbotIntentRepository;
import storebackend.repository.ChatMessageRepository;
import storebackend.repository.ChatSessionRepository;
import storebackend.repository.StoreRepository;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ChatbotIntentService {

    private final ChatbotIntentRepository intentRepository;
    private final StoreRepository storeRepository;
    private final ChatSessionRepository chatSessionRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final ObjectMapper objectMapper;

    @Transactional(readOnly = true)
    public List<ChatbotIntent> getStoreIntents(Long storeId) {
        return intentRepository.findByStoreIdAndIsActiveTrue(storeId);
    }

    @Transactional(readOnly = true)
    public List<ChatbotIntent> getAllIntents(Long storeId) {
        return intentRepository.findByStoreIdOrderByCreatedAtDesc(storeId);
    }

    @Transactional
    public ChatbotIntent createIntent(Long storeId, Map<String, Object> request) {
        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new RuntimeException("Store not found"));

        ChatbotIntent intent = new ChatbotIntent();
        intent.setStore(store);
        intent.setIntentName((String) request.get("intentName"));
        intent.setDescription((String) request.get("description"));

        try {
            // Convert training phrases array to JSON string
            List<String> phrases = (List<String>) request.get("trainingPhrases");
            intent.setTrainingPhrases(objectMapper.writeValueAsString(phrases));
        } catch (Exception e) {
            throw new RuntimeException("Invalid training phrases format");
        }

        intent.setResponseTemplate((String) request.get("responseTemplate"));
        intent.setAction((String) request.get("action"));

        if (request.containsKey("confidenceThreshold")) {
            intent.setConfidenceThreshold(new BigDecimal(request.get("confidenceThreshold").toString()));
        } else {
            intent.setConfidenceThreshold(new BigDecimal("0.70"));
        }

        intent.setIsActive(true);
        intent.setCreatedAt(LocalDateTime.now());

        intent = intentRepository.save(intent);
        log.info("Created chatbot intent {} for store {}", intent.getId(), storeId);

        return intent;
    }

    @Transactional
    public ChatbotIntent updateIntent(Long intentId, Long storeId, Map<String, Object> request) {
        ChatbotIntent intent = intentRepository.findById(intentId)
                .orElseThrow(() -> new RuntimeException("Intent not found"));

        // Verify ownership
        if (intent.getStore() == null || !intent.getStore().getId().equals(storeId)) {
            throw new RuntimeException("Unauthorized: Cannot edit global or other store's intent");
        }

        if (request.containsKey("intentName")) {
            intent.setIntentName((String) request.get("intentName"));
        }

        if (request.containsKey("description")) {
            intent.setDescription((String) request.get("description"));
        }

        if (request.containsKey("trainingPhrases")) {
            try {
                List<String> phrases = (List<String>) request.get("trainingPhrases");
                intent.setTrainingPhrases(objectMapper.writeValueAsString(phrases));
            } catch (Exception e) {
                throw new RuntimeException("Invalid training phrases format");
            }
        }

        if (request.containsKey("responseTemplate")) {
            intent.setResponseTemplate((String) request.get("responseTemplate"));
        }

        if (request.containsKey("action")) {
            intent.setAction((String) request.get("action"));
        }

        if (request.containsKey("confidenceThreshold")) {
            intent.setConfidenceThreshold(new BigDecimal(request.get("confidenceThreshold").toString()));
        }

        if (request.containsKey("isActive")) {
            intent.setIsActive((Boolean) request.get("isActive"));
        }

        intent = intentRepository.save(intent);
        log.info("Updated chatbot intent {}", intentId);

        return intent;
    }

    @Transactional
    public void deleteIntent(Long intentId, Long storeId) {
        ChatbotIntent intent = intentRepository.findById(intentId)
                .orElseThrow(() -> new RuntimeException("Intent not found"));

        // Verify ownership
        if (intent.getStore() == null || !intent.getStore().getId().equals(storeId)) {
            throw new RuntimeException("Unauthorized: Cannot delete global or other store's intent");
        }

        intentRepository.delete(intent);
        log.info("Deleted chatbot intent {}", intentId);
    }

    @Transactional
    public void toggleIntent(Long intentId, Long storeId) {
        ChatbotIntent intent = intentRepository.findById(intentId)
                .orElseThrow(() -> new RuntimeException("Intent not found"));

        // Verify ownership
        if (intent.getStore() == null || !intent.getStore().getId().equals(storeId)) {
            throw new RuntimeException("Unauthorized");
        }

        intent.setIsActive(!intent.getIsActive());
        intentRepository.save(intent);

        log.info("Toggled intent {} to {}", intentId, intent.getIsActive());
    }

    @Transactional(readOnly = true)
    public ChatbotStatisticsDTO getStatistics(Long storeId) {
        ChatbotStatisticsDTO stats = new ChatbotStatisticsDTO();

        LocalDate today = LocalDate.now();
        LocalDateTime startOfDay = today.atStartOfDay();

        // Total sessions
        Long totalSessions = chatSessionRepository.countByStoreId(storeId);
        stats.setTotalSessions(totalSessions != null ? totalSessions.intValue() : 0);

        // Today's sessions
        Long todaySessions = chatSessionRepository.countByStoreIdAndCreatedAtAfter(storeId, startOfDay);
        stats.setTodaySessions(todaySessions != null ? todaySessions.intValue() : 0);

        // Active sessions now
        Long activeSessions = chatSessionRepository.countByStoreIdAndStatus(storeId, ChatSessionStatus.ACTIVE);
        stats.setActiveSessionsNow(activeSessions != null ? activeSessions.intValue() : 0);

        // Bot resolved vs agent transferred
        Long botResolved = chatSessionRepository.countByStoreIdAndStatus(storeId, ChatSessionStatus.CLOSED);
        Long agentTransferred = chatSessionRepository.countByStoreIdAndStatus(storeId, ChatSessionStatus.AGENT_HANDLING);

        stats.setBotResolved(botResolved != null ? botResolved.intValue() : 0);
        stats.setAgentTransferred(agentTransferred != null ? agentTransferred.intValue() : 0);

        // Resolution rate
        if (totalSessions > 0) {
            BigDecimal resolutionRate = BigDecimal.valueOf(botResolved)
                    .divide(BigDecimal.valueOf(totalSessions), 2, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100));
            stats.setResolutionRate(resolutionRate);
        } else {
            stats.setResolutionRate(BigDecimal.ZERO);
        }

        // Placeholder for avg response time and satisfaction (would need more complex queries)
        stats.setAvgResponseTimeSeconds(5);
        stats.setCustomerSatisfactionScore(new BigDecimal("4.50"));

        return stats;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> testIntent(Long intentId, String testMessage, Long storeId) {
        ChatbotIntent intent = intentRepository.findById(intentId)
                .orElseThrow(() -> new RuntimeException("Intent not found"));

        // Verify ownership
        if (intent.getStore() == null || !intent.getStore().getId().equals(storeId)) {
            throw new RuntimeException("Unauthorized");
        }

        Map<String, Object> result = new HashMap<>();
        result.put("intentId", intent.getId());
        result.put("intentName", intent.getIntentName());
        result.put("testMessage", testMessage);

        try {
            List<String> trainingPhrases = objectMapper.readValue(
                    intent.getTrainingPhrases(),
                    objectMapper.getTypeFactory().constructCollectionType(List.class, String.class)
            );

            // Simple matching logic (in production, use ML)
            String normalizedMessage = testMessage.toLowerCase();
            boolean matched = trainingPhrases.stream()
                    .anyMatch(phrase -> normalizedMessage.contains(phrase.toLowerCase()));

            result.put("matched", matched);
            result.put("confidence", matched ? 0.85 : 0.15);
            result.put("responseTemplate", intent.getResponseTemplate());
            result.put("action", intent.getAction());
            result.put("trainingPhrases", trainingPhrases);

        } catch (Exception e) {
            log.error("Error testing intent", e);
            result.put("error", "Could not parse training phrases");
        }

        return result;
    }

    @Transactional
    public List<ChatbotIntent> bulkImportIntents(Long storeId, List<ChatbotIntentDTO> intentsDTO) {
        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new RuntimeException("Store not found"));

        List<ChatbotIntent> imported = new ArrayList<>();

        for (ChatbotIntentDTO dto : intentsDTO) {
            try {
                ChatbotIntent intent = new ChatbotIntent();
                intent.setStore(store);
                intent.setIntentName(dto.getIntentName());
                intent.setDescription(dto.getDescription());
                intent.setTrainingPhrases(objectMapper.writeValueAsString(dto.getTrainingPhrases()));
                intent.setResponseTemplate(dto.getResponseTemplate());
                intent.setAction(dto.getAction());
                intent.setConfidenceThreshold(dto.getConfidenceThreshold() != null ?
                        dto.getConfidenceThreshold() : new BigDecimal("0.70"));
                intent.setIsActive(dto.getIsActive() != null ? dto.getIsActive() : true);
                intent.setCreatedAt(LocalDateTime.now());

                imported.add(intentRepository.save(intent));
            } catch (Exception e) {
                log.error("Error importing intent: {}", dto.getIntentName(), e);
            }
        }

        log.info("Bulk imported {} intents for store {}", imported.size(), storeId);
        return imported;
    }
}

