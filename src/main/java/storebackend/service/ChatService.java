package storebackend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import storebackend.dto.ChatMessageDTO;
import storebackend.dto.ChatSessionDTO;
import storebackend.dto.SendMessageRequest;
import storebackend.entity.ChatMessage;
import storebackend.entity.ChatSession;
import storebackend.entity.User;
import storebackend.enums.ChatMessageType;
import storebackend.enums.ChatSenderType;
import storebackend.enums.ChatSessionStatus;
import storebackend.repository.ChatMessageRepository;
import storebackend.repository.ChatSessionRepository;
import storebackend.repository.UserRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ChatService {

    private final ChatSessionRepository chatSessionRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<ChatSessionDTO> getActiveSessions(Long storeId) {
        List<ChatSession> sessions = chatSessionRepository.findByStoreIdAndStatus(
                storeId, ChatSessionStatus.ACTIVE);

        return sessions.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ChatSessionDTO> getTransferredSessions(Long storeId) {
        List<ChatSession> sessions = chatSessionRepository.findByStoreIdAndStatus(
                storeId, ChatSessionStatus.TRANSFERRED);

        return sessions.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ChatSessionDTO> getAllSessions(Long storeId) {
        List<ChatSession> sessions = chatSessionRepository.findByStoreIdOrderByUpdatedAtDesc(storeId);

        return sessions.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ChatSessionDTO getSessionById(Long sessionId, Long storeId) {
        ChatSession session = chatSessionRepository.findById(sessionId)
                .orElseThrow(() -> new RuntimeException("Session not found"));

        if (!session.getStore().getId().equals(storeId)) {
            throw new RuntimeException("Unauthorized access to session");
        }

        return convertToDTO(session);
    }

    @Transactional(readOnly = true)
    public List<ChatMessageDTO> getSessionMessages(Long sessionId, Long storeId, int page, int size) {
        ChatSession session = chatSessionRepository.findById(sessionId)
                .orElseThrow(() -> new RuntimeException("Session not found"));

        if (!session.getStore().getId().equals(storeId)) {
            throw new RuntimeException("Unauthorized access to session");
        }

        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").ascending());
        Page<ChatMessage> messages = chatMessageRepository.findBySessionIdOrderByCreatedAtAsc(
                sessionId, pageable);

        return messages.getContent().stream()
                .map(this::convertMessageToDTO)
                .collect(Collectors.toList());
    }

    @Transactional
    public void assignAgent(Long sessionId, Long agentId, Long storeId) {
        ChatSession session = chatSessionRepository.findById(sessionId)
                .orElseThrow(() -> new RuntimeException("Session not found"));

        if (!session.getStore().getId().equals(storeId)) {
            throw new RuntimeException("Unauthorized access to session");
        }

        User agent = userRepository.findById(agentId)
                .orElseThrow(() -> new RuntimeException("Agent not found"));

        session.setAssignedAgent(agent);
        session.setStatus(ChatSessionStatus.TRANSFERRED);
        chatSessionRepository.save(session);

        // Send system message
        ChatMessage systemMessage = new ChatMessage();
        systemMessage.setSession(session);
        systemMessage.setSenderType(ChatSenderType.SYSTEM);
        systemMessage.setSenderName("System");
        systemMessage.setMessageType(ChatMessageType.SYSTEM);
        systemMessage.setContent(agent.getFirstName() + " " + agent.getLastName() + " ist dem Chat beigetreten.");
        systemMessage.setIsRead(false);
        systemMessage.setCreatedAt(LocalDateTime.now());
        chatMessageRepository.save(systemMessage);

        log.info("Agent {} assigned to session {}", agentId, sessionId);
    }

    @Transactional
    public ChatMessageDTO sendMessage(SendMessageRequest request, User sender) {
        ChatSession session = chatSessionRepository.findById(request.getSessionId())
                .orElseThrow(() -> new RuntimeException("Session not found"));

        // Authorization check: sender must be assigned agent or store owner
        if (session.getAssignedAgent() == null || !session.getAssignedAgent().getId().equals(sender.getId())) {
            // Check if sender is store owner
            if (!session.getStore().getOwner().getId().equals(sender.getId())) {
                throw new RuntimeException("Unauthorized access to session");
            }
        }

        ChatMessage message = new ChatMessage();
        message.setSession(session);
        message.setSenderType(ChatSenderType.AGENT);
        message.setSender(sender);
        message.setSenderName(sender.getFirstName() + " " + sender.getLastName());
        message.setMessageType(ChatMessageType.TEXT);
        message.setContent(request.getMessage());
        message.setIsRead(false);
        message.setCreatedAt(LocalDateTime.now());

        message = chatMessageRepository.save(message);

        session.setUpdatedAt(LocalDateTime.now());
        chatSessionRepository.save(session);

        return convertMessageToDTO(message);
    }

    @Transactional
    public void closeSession(Long sessionId, Long storeId) {
        ChatSession session = chatSessionRepository.findById(sessionId)
                .orElseThrow(() -> new RuntimeException("Session not found"));

        if (!session.getStore().getId().equals(storeId)) {
            throw new RuntimeException("Unauthorized access to session");
        }

        session.setStatus(ChatSessionStatus.CLOSED);
        session.setClosedAt(LocalDateTime.now());
        chatSessionRepository.save(session);

        log.info("Session {} closed", sessionId);
    }

    @Transactional
    public void markMessagesAsRead(Long sessionId, Long storeId) {
        ChatSession session = chatSessionRepository.findById(sessionId)
                .orElseThrow(() -> new RuntimeException("Session not found"));

        if (!session.getStore().getId().equals(storeId)) {
            throw new RuntimeException("Unauthorized access to session");
        }

        chatMessageRepository.markSessionMessagesAsRead(sessionId);
        log.info("Messages in session {} marked as read", sessionId);
    }

    @Transactional(readOnly = true)
    public long getUnreadMessageCount(Long storeId) {
        return chatMessageRepository.countUnreadByStoreId(storeId);
    }

    @Transactional(readOnly = true)
    public long getActiveSessionCount(Long storeId) {
        return chatSessionRepository.countByStoreIdAndStatus(storeId, ChatSessionStatus.ACTIVE);
    }

    private ChatSessionDTO convertToDTO(ChatSession session) {
        ChatSessionDTO dto = new ChatSessionDTO();
        dto.setId(session.getId());
        dto.setSessionToken(session.getSessionToken());
        dto.setCustomerName(session.getCustomerName());
        dto.setCustomerEmail(session.getCustomerEmail());
        dto.setStatus(session.getStatus().name());
        dto.setChannel(session.getChannel().name());
        dto.setLanguage(session.getLanguage());
        dto.setCreatedAt(session.getCreatedAt());
        dto.setUpdatedAt(session.getUpdatedAt());
        dto.setClosedAt(session.getClosedAt());

        if (session.getAssignedAgent() != null) {
            dto.setAssignedAgentName(session.getAssignedAgent().getFirstName() + " " +
                    session.getAssignedAgent().getLastName());
        }

        // Get unread count
        long unreadCount = chatMessageRepository.countUnreadBySessionId(session.getId());
        dto.setUnreadCount((int) unreadCount);

        // Get last message
        List<ChatMessage> lastMessages = chatMessageRepository.findTopBySessionIdOrderByCreatedAtDesc(
                session.getId(), PageRequest.of(0, 1));
        if (!lastMessages.isEmpty()) {
            ChatMessage lastMsg = lastMessages.get(0);
            dto.setLastMessage(lastMsg.getContent());
            dto.setLastMessageTime(lastMsg.getCreatedAt());
        }

        return dto;
    }

    private ChatMessageDTO convertMessageToDTO(ChatMessage message) {
        ChatMessageDTO dto = new ChatMessageDTO();
        dto.setId(message.getId());
        dto.setSessionId(message.getSession().getId());
        dto.setSenderType(message.getSenderType().name());
        dto.setSenderName(message.getSenderName());
        dto.setMessageType(message.getMessageType().name());
        dto.setContent(message.getContent());
        dto.setMetadata(message.getMetadata());
        dto.setIsRead(message.getIsRead());
        dto.setCreatedAt(message.getCreatedAt());
        return dto;
    }
}

