package storebackend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import storebackend.dto.ChatbotRequest;
import storebackend.dto.ChatbotResponse;
import storebackend.entity.*;
import storebackend.enums.ChatChannel;
import storebackend.enums.ChatMessageType;
import storebackend.enums.ChatSenderType;
import storebackend.enums.ChatSessionStatus;
import storebackend.repository.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class ChatbotService {

    private final ChatSessionRepository chatSessionRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final ChatbotIntentRepository chatbotIntentRepository;
    private final FaqItemRepository faqItemRepository;
    private final StoreRepository storeRepository;
    private final OrderRepository orderRepository;
    private final ObjectMapper objectMapper;

    @Transactional
    public ChatbotResponse processMessage(ChatbotRequest request) {
        log.info("Processing chatbot message for store {} with token {}",
                request.getStoreId(), request.getSessionToken());

        // 1. Get or create session
        ChatSession session = getOrCreateSession(request);

        // 2. Save customer message
        saveMessage(session, ChatSenderType.CUSTOMER, request.getMessage(), null);

        // 3. Process message and generate response
        String normalizedMessage = normalizeMessage(request.getMessage());
        ChatbotResponse response = generateResponse(session, normalizedMessage, request.getLanguage());

        // 4. Save bot response
        saveMessage(session, ChatSenderType.BOT, response.getResponse(), response.getAction());

        response.setSessionToken(session.getSessionToken());
        return response;
    }

    private ChatSession getOrCreateSession(ChatbotRequest request) {
        if (request.getSessionToken() != null) {
            Optional<ChatSession> existing = chatSessionRepository.findBySessionToken(request.getSessionToken());
            if (existing.isPresent() && existing.get().getStatus() == ChatSessionStatus.ACTIVE) {
                return existing.get();
            }
        }

        // Create new session
        ChatSession session = new ChatSession();
        session.setStore(storeRepository.findById(request.getStoreId())
                .orElseThrow(() -> new RuntimeException("Store not found")));
        session.setSessionToken(UUID.randomUUID().toString());
        session.setCustomerName(request.getCustomerName());
        session.setCustomerEmail(request.getCustomerEmail());
        session.setStatus(ChatSessionStatus.ACTIVE);
        session.setChannel(ChatChannel.CHATBOT);
        session.setLanguage(request.getLanguage());
        session.setCreatedAt(LocalDateTime.now());
        session.setUpdatedAt(LocalDateTime.now());

        return chatSessionRepository.save(session);
    }

    private void saveMessage(ChatSession session, ChatSenderType senderType, String content, String action) {
        ChatMessage message = new ChatMessage();
        message.setSession(session);
        message.setSenderType(senderType);
        message.setSenderName(senderType == ChatSenderType.BOT ? "Bot" : session.getCustomerName());
        message.setMessageType(ChatMessageType.TEXT);
        message.setContent(content);
        message.setIsRead(false);
        message.setCreatedAt(LocalDateTime.now());

        if (action != null) {
            try {
                Map<String, String> metadata = new HashMap<>();
                metadata.put("action", action);
                message.setMetadata(objectMapper.writeValueAsString(metadata));
            } catch (Exception e) {
                log.error("Error serializing metadata", e);
            }
        }

        chatMessageRepository.save(message);
    }

    private String normalizeMessage(String message) {
        return message.toLowerCase().trim();
    }

    private ChatbotResponse generateResponse(ChatSession session, String normalizedMessage, String language) {
        // 1. Check for greeting
        if (isGreeting(normalizedMessage)) {
            return new ChatbotResponse(null, getGreetingMessage(language));
        }

        // 2. Check for goodbye
        if (isGoodbye(normalizedMessage)) {
            session.setStatus(ChatSessionStatus.CLOSED);
            session.setClosedAt(LocalDateTime.now());
            chatSessionRepository.save(session);
            return new ChatbotResponse(null, getGoodbyeMessage(language));
        }

        // 3. Check for order tracking
        if (isOrderTracking(normalizedMessage)) {
            return handleOrderTracking(session, normalizedMessage, language);
        }

        // 4. Check for FAQ request
        if (isFaqRequest(normalizedMessage)) {
            return handleFaqSearch(session, normalizedMessage, language);
        }

        // 5. Check for human agent request
        if (isHumanRequest(normalizedMessage)) {
            return handleHumanTransfer(session, language);
        }

        // 6. Try to match custom intents
        ChatbotResponse intentResponse = matchCustomIntent(session, normalizedMessage, language);
        if (intentResponse != null) {
            return intentResponse;
        }

        // 7. Default fallback - suggest FAQ or human agent
        return getFallbackResponse(session, language);
    }

    private boolean isGreeting(String message) {
        String[] greetings = {"hallo", "hi", "hey", "guten tag", "servus", "moin",
                             "hello", "good morning", "مرحبا", "أهلا", "السلام عليكم"};
        return Arrays.stream(greetings).anyMatch(message::contains);
    }

    private boolean isGoodbye(String message) {
        String[] goodbyes = {"tschüss", "auf wiedersehen", "bye", "goodbye", "ciao",
                            "danke das war alles", "مع السلامة", "وداعا"};
        return Arrays.stream(goodbyes).anyMatch(message::contains);
    }

    private boolean isOrderTracking(String message) {
        String[] keywords = {"bestellung", "order", "tracking", "lieferung", "paket",
                            "status", "wo ist", "طلب", "توصيل"};
        return Arrays.stream(keywords).anyMatch(message::contains) || message.matches(".*\\b[A-Z0-9-]{8,}\\b.*");
    }

    private boolean isFaqRequest(String message) {
        String[] keywords = {"frage", "faq", "hilfe", "wie", "was", "wann", "kann ich",
                            "help", "question", "how", "what", "when", "سؤال", "مساعدة", "كيف"};
        return Arrays.stream(keywords).anyMatch(message::contains);
    }

    private boolean isHumanRequest(String message) {
        String[] keywords = {"mitarbeiter", "mensch", "person", "sprechen", "human",
                            "agent", "support", "موظف", "شخص"};
        return Arrays.stream(keywords).anyMatch(message::contains);
    }

    private ChatbotResponse handleOrderTracking(ChatSession session, String message, String language) {
        // Extract potential order number
        String orderNumber = extractOrderNumber(message);

        if (orderNumber == null) {
            return new ChatbotResponse(null, getOrderRequestMessage(language), "ORDER_REQUEST", null);
        }

        // Search for order
        Optional<Order> orderOpt = orderRepository.findByOrderNumber(orderNumber);

        if (orderOpt.isEmpty()) {
            return new ChatbotResponse(null, getOrderNotFoundMessage(language, orderNumber));
        }

        Order order = orderOpt.get();
        String statusMessage = getOrderStatusMessage(order, language);

        return new ChatbotResponse(null, statusMessage, "ORDER_STATUS",
                Map.of("orderId", order.getId(), "orderNumber", order.getOrderNumber(),
                       "status", order.getStatus().name()));
    }

    private String extractOrderNumber(String message) {
        // Try to find order number pattern (ORD-YYYY-XXXXXX or similar)
        java.util.regex.Pattern pattern = java.util.regex.Pattern.compile("\\b([A-Z]{3}-\\d{4}-\\d{6})\\b");
        java.util.regex.Matcher matcher = pattern.matcher(message.toUpperCase());

        if (matcher.find()) {
            return matcher.group(1);
        }

        return null;
    }

    private ChatbotResponse handleFaqSearch(ChatSession session, String message, String language) {
        // Search FAQ items
        List<FaqItem> faqs = faqItemRepository.searchByKeyword(session.getStore().getId(), message);

        if (faqs.isEmpty()) {
            return new ChatbotResponse(null, getFaqNotFoundMessage(language));
        }

        // Return top 3 results
        List<FaqItem> topResults = faqs.stream().limit(3).toList();

        StringBuilder response = new StringBuilder(getFaqFoundMessage(language, topResults.size()));
        response.append("\n\n");

        for (int i = 0; i < topResults.size(); i++) {
            FaqItem faq = topResults.get(i);
            response.append(String.format("%d. **%s**\n%s\n\n",
                    i + 1, faq.getQuestion(), faq.getAnswer()));

            // Increment view count
            faq.setViewCount(faq.getViewCount() + 1);
            faqItemRepository.save(faq);
        }

        response.append(getMoreHelpMessage(language));

        return new ChatbotResponse(null, response.toString(), "FAQ_RESULTS",
                topResults.stream().map(f -> Map.of(
                        "id", f.getId(),
                        "question", f.getQuestion(),
                        "answer", f.getAnswer()
                )).toList());
    }

    private ChatbotResponse handleHumanTransfer(ChatSession session, String language) {
        session.setStatus(ChatSessionStatus.TRANSFERRED);
        session.setChannel(ChatChannel.LIVE_CHAT);
        chatSessionRepository.save(session);

        return new ChatbotResponse(null, getTransferMessage(language), "TRANSFER_TO_AGENT", null);
    }

    private ChatbotResponse matchCustomIntent(ChatSession session, String message, String language) {
        List<ChatbotIntent> intents = chatbotIntentRepository.findByStoreIdAndIsActiveTrue(session.getStore().getId());

        ChatbotIntent bestMatch = null;
        BigDecimal bestScore = BigDecimal.ZERO;

        for (ChatbotIntent intent : intents) {
            BigDecimal score = calculateIntentScore(message, intent);
            if (score.compareTo(intent.getConfidenceThreshold()) >= 0 &&
                score.compareTo(bestScore) > 0) {
                bestMatch = intent;
                bestScore = score;
            }
        }

        if (bestMatch != null) {
            return new ChatbotResponse(null, bestMatch.getResponseTemplate(),
                    bestMatch.getAction(), null);
        }

        return null;
    }

    private BigDecimal calculateIntentScore(String message, ChatbotIntent intent) {
        try {
            String[] phrases = objectMapper.readValue(intent.getTrainingPhrases(), String[].class);
            int matches = 0;
            int total = phrases.length;

            for (String phrase : phrases) {
                if (message.contains(phrase.toLowerCase())) {
                    matches++;
                }
            }

            return BigDecimal.valueOf(matches).divide(BigDecimal.valueOf(total), 2,
                    java.math.RoundingMode.HALF_UP);
        } catch (Exception e) {
            log.error("Error calculating intent score", e);
            return BigDecimal.ZERO;
        }
    }

    private ChatbotResponse getFallbackResponse(ChatSession session, String language) {
        String message = switch (language) {
            case "en" -> "I'm not sure I understood that. Would you like to:\n" +
                        "1. Search our FAQ\n" +
                        "2. Track your order\n" +
                        "3. Speak with a human agent";
            case "ar" -> "لم أفهم ذلك. هل تريد:\n" +
                        "1. البحث في الأسئلة الشائعة\n" +
                        "2. تتبع طلبك\n" +
                        "3. التحدث مع موظف";
            default -> "Ich habe das nicht ganz verstanden. Möchten Sie:\n" +
                       "1. FAQ durchsuchen\n" +
                       "2. Bestellung verfolgen\n" +
                       "3. Mit einem Mitarbeiter sprechen";
        };

        return new ChatbotResponse(null, message, "SHOW_MENU", null);
    }

    // Message templates
    private String getGreetingMessage(String language) {
        return switch (language) {
            case "en" -> "Hello! 👋 How can I help you today?";
            case "ar" -> "مرحبا! 👋 كيف يمكنني مساعدتك اليوم؟";
            default -> "Hallo! 👋 Wie kann ich Ihnen heute helfen?";
        };
    }

    private String getGoodbyeMessage(String language) {
        return switch (language) {
            case "en" -> "Thank you! If you need help later, just start a new chat. 😊";
            case "ar" -> "شكرا لك! إذا كنت بحاجة إلى مساعدة لاحقا، ابدأ محادثة جديدة. 😊";
            default -> "Vielen Dank! Falls Sie später Hilfe benötigen, starten Sie einfach einen neuen Chat. 😊";
        };
    }

    private String getOrderRequestMessage(String language) {
        return switch (language) {
            case "en" -> "I'd be happy to help track your order. Please provide your order number (format: ORD-YYYY-XXXXXX).";
            case "ar" -> "يسعدني مساعدتك في تتبع طلبك. يرجى تقديم رقم الطلب (الصيغة: ORD-YYYY-XXXXXX).";
            default -> "Gerne helfe ich bei der Verfolgung. Bitte geben Sie Ihre Bestellnummer ein (Format: ORD-YYYY-XXXXXX).";
        };
    }

    private String getOrderNotFoundMessage(String language, String orderNumber) {
        return switch (language) {
            case "en" -> String.format("I couldn't find order %s. Please check the number and try again.", orderNumber);
            case "ar" -> String.format("لم أتمكن من العثور على الطلب %s. يرجى التحقق من الرقم والمحاولة مرة أخرى.", orderNumber);
            default -> String.format("Ich konnte die Bestellung %s nicht finden. Bitte überprüfen Sie die Nummer.", orderNumber);
        };
    }

    private String getOrderStatusMessage(Order order, String language) {
        String status = switch (language) {
            case "en" -> order.getStatus().name();
            case "ar" -> translateStatusToArabic(order.getStatus().name());
            default -> translateStatusToGerman(order.getStatus().name());
        };

        return switch (language) {
            case "en" -> String.format("📦 Your order %s:\nStatus: %s\nCreated: %s",
                    order.getOrderNumber(), status, order.getCreatedAt().toLocalDate());
            case "ar" -> String.format("📦 طلبك %s:\nالحالة: %s\nتم الإنشاء: %s",
                    order.getOrderNumber(), status, order.getCreatedAt().toLocalDate());
            default -> String.format("📦 Ihre Bestellung %s:\nStatus: %s\nErstellt: %s",
                    order.getOrderNumber(), status, order.getCreatedAt().toLocalDate());
        };
    }

    private String getFaqFoundMessage(String language, int count) {
        return switch (language) {
            case "en" -> String.format("I found %d relevant answers:", count);
            case "ar" -> String.format("وجدت %d إجابات ذات صلة:", count);
            default -> String.format("Ich habe %d relevante Antworten gefunden:", count);
        };
    }

    private String getFaqNotFoundMessage(String language) {
        return switch (language) {
            case "en" -> "I couldn't find an answer to that. Would you like to speak with a human agent?";
            case "ar" -> "لم أتمكن من العثور على إجابة لذلك. هل تريد التحدث مع موظف؟";
            default -> "Ich konnte keine passende Antwort finden. Möchten Sie mit einem Mitarbeiter sprechen?";
        };
    }

    private String getMoreHelpMessage(String language) {
        return switch (language) {
            case "en" -> "Was this helpful? Feel free to ask more questions!";
            case "ar" -> "هل كان هذا مفيدا؟ لا تتردد في طرح المزيد من الأسئلة!";
            default -> "War das hilfreich? Stellen Sie gerne weitere Fragen!";
        };
    }

    private String getTransferMessage(String language) {
        return switch (language) {
            case "en" -> "I'm connecting you with a team member. Please wait a moment... ⏳";
            case "ar" -> "أقوم بتوصيلك مع أحد أعضاء الفريق. يرجى الانتظار لحظة... ⏳";
            default -> "Ich verbinde Sie mit einem Mitarbeiter. Einen Moment bitte... ⏳";
        };
    }

    private String translateStatusToGerman(String status) {
        return switch (status) {
            case "PENDING" -> "Ausstehend";
            case "CONFIRMED" -> "Bestätigt";
            case "PROCESSING" -> "In Bearbeitung";
            case "SHIPPED" -> "Versandt";
            case "DELIVERED" -> "Zugestellt";
            case "CANCELLED" -> "Storniert";
            default -> status;
        };
    }

    private String translateStatusToArabic(String status) {
        return switch (status) {
            case "PENDING" -> "قيد الانتظار";
            case "CONFIRMED" -> "مؤكد";
            case "PROCESSING" -> "قيد المعالجة";
            case "SHIPPED" -> "تم الشحن";
            case "DELIVERED" -> "تم التوصيل";
            case "CANCELLED" -> "ملغى";
            default -> status;
        };
    }
}

