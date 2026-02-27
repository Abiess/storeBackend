package storebackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import storebackend.entity.Cart;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface CartRepository extends JpaRepository<Cart, Long> {
    Optional<Cart> findBySessionId(String sessionId);
    Optional<Cart> findByUserId(Long userId);
    List<Cart> findByExpiresAtBefore(LocalDateTime dateTime);
    void deleteByExpiresAtBefore(LocalDateTime dateTime);

    // NEUE OPTIMIERTE METHODEN für User + Store
    @Query("SELECT c FROM Cart c WHERE c.user.id = :userId AND c.store.id = :storeId AND c.expiresAt > :now ORDER BY c.updatedAt DESC")
    List<Cart> findByUserIdAndStoreIdAndNotExpired(@Param("userId") Long userId, @Param("storeId") Long storeId, @Param("now") LocalDateTime now);

    @Query("SELECT c FROM Cart c WHERE c.sessionId = :sessionId AND c.store.id = :storeId AND c.expiresAt > :now ORDER BY c.updatedAt DESC")
    List<Cart> findBySessionIdAndStoreIdAndNotExpired(@Param("sessionId") String sessionId, @Param("storeId") Long storeId, @Param("now") LocalDateTime now);

    // For store deletion
    @Query("SELECT c.id FROM Cart c WHERE c.store.id = :storeId")
    List<Long> findCartIdsByStoreId(@Param("storeId") Long storeId);

    void deleteByStoreId(Long storeId);
}
