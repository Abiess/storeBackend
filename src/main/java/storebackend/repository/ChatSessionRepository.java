package storebackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import storebackend.entity.ChatSession;
import storebackend.enums.ChatSessionStatus;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface ChatSessionRepository extends JpaRepository<ChatSession, Long> {
    Optional<ChatSession> findBySessionToken(String sessionToken);

    List<ChatSession> findByStoreIdAndStatus(Long storeId, ChatSessionStatus status);

    List<ChatSession> findByStoreIdOrderByUpdatedAtDesc(Long storeId);

    List<ChatSession> findByCustomerId(Long customerId);

    List<ChatSession> findByAssignedAgentId(Long agentId);

    @Query("SELECT cs FROM ChatSession cs WHERE cs.store.id = :storeId " +
           "AND cs.status = :status " +
           "AND cs.updatedAt > :since " +
           "ORDER BY cs.updatedAt DESC")
    List<ChatSession> findActiveSessionsSince(
        @Param("storeId") Long storeId,
        @Param("status") ChatSessionStatus status,
        @Param("since") LocalDateTime since
    );

    long countByStoreIdAndStatus(Long storeId, ChatSessionStatus status);

    Long countByStoreId(Long storeId);

    Long countByStoreIdAndCreatedAtAfter(Long storeId, LocalDateTime after);
}

