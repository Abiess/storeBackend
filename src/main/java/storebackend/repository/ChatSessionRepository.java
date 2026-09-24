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

    @Query("SELECT cs FROM ChatSession cs WHERE cs.store.id = :storeId AND cs.status = :status")
    List<ChatSession> findByStoreIdAndStatus(@Param("storeId") Long storeId, @Param("status") ChatSessionStatus status);

    @Query("SELECT cs FROM ChatSession cs WHERE cs.store.id = :storeId ORDER BY cs.updatedAt DESC")
    List<ChatSession> findByStoreIdOrderByUpdatedAtDesc(@Param("storeId") Long storeId);

    @Query("SELECT cs FROM ChatSession cs WHERE cs.customer.id = :customerId")
    List<ChatSession> findByCustomerId(@Param("customerId") Long customerId);

    @Query("SELECT cs FROM ChatSession cs WHERE cs.assignedAgent.id = :agentId")
    List<ChatSession> findByAssignedAgentId(@Param("agentId") Long agentId);

    @Query("SELECT cs FROM ChatSession cs WHERE cs.store.id = :storeId " +
           "AND cs.status = :status " +
           "AND cs.updatedAt > :since " +
           "ORDER BY cs.updatedAt DESC")
    List<ChatSession> findActiveSessionsSince(
        @Param("storeId") Long storeId,
        @Param("status") ChatSessionStatus status,
        @Param("since") LocalDateTime since
    );

    @Query("SELECT COUNT(cs) FROM ChatSession cs WHERE cs.store.id = :storeId AND cs.status = :status")
    long countByStoreIdAndStatus(@Param("storeId") Long storeId, @Param("status") ChatSessionStatus status);

    @Query("SELECT COUNT(cs) FROM ChatSession cs WHERE cs.store.id = :storeId")
    Long countByStoreId(@Param("storeId") Long storeId);

    @Query("SELECT COUNT(cs) FROM ChatSession cs WHERE cs.store.id = :storeId AND cs.createdAt > :after")
    Long countByStoreIdAndCreatedAtAfter(@Param("storeId") Long storeId, @Param("after") LocalDateTime after);
}
