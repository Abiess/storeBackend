package storebackend.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import storebackend.entity.ChatMessage;

import java.util.List;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {
    List<ChatMessage> findBySessionIdOrderByCreatedAtAsc(Long sessionId);

    Page<ChatMessage> findBySessionIdOrderByCreatedAtAsc(Long sessionId, Pageable pageable);

    @Query("SELECT cm FROM ChatMessage cm WHERE cm.session.id = :sessionId " +
           "ORDER BY cm.createdAt DESC")
    List<ChatMessage> findRecentMessagesBySessionId(@Param("sessionId") Long sessionId);

    List<ChatMessage> findTopBySessionIdOrderByCreatedAtDesc(Long sessionId, Pageable pageable);

    long countBySessionIdAndIsReadFalse(Long sessionId);

    @Query("SELECT COUNT(cm) FROM ChatMessage cm WHERE cm.session.store.id = :storeId AND cm.isRead = false")
    long countUnreadByStoreId(@Param("storeId") Long storeId);

    long countUnreadBySessionId(Long sessionId);

    @Modifying
    @Query("UPDATE ChatMessage cm SET cm.isRead = true " +
           "WHERE cm.session.id = :sessionId AND cm.isRead = false")
    int markAllAsRead(@Param("sessionId") Long sessionId);

    @Modifying
    @Query("UPDATE ChatMessage cm SET cm.isRead = true " +
           "WHERE cm.session.id = :sessionId AND cm.isRead = false")
    int markSessionMessagesAsRead(@Param("sessionId") Long sessionId);
}

