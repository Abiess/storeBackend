package storebackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import storebackend.entity.ChatbotIntent;

import java.util.List;

@Repository
public interface ChatbotIntentRepository extends JpaRepository<ChatbotIntent, Long> {

    @Query("SELECT ci FROM ChatbotIntent ci WHERE ci.store.id = :storeId AND ci.isActive = true ORDER BY ci.intentName ASC")
    List<ChatbotIntent> findByStoreIdAndIsActiveTrueOrderByIntentNameAsc(@Param("storeId") Long storeId);

    @Query("SELECT ci FROM ChatbotIntent ci WHERE ci.store.id = :storeId AND ci.isActive = true")
    List<ChatbotIntent> findByStoreIdAndIsActiveTrue(@Param("storeId") Long storeId);

    @Query("SELECT ci FROM ChatbotIntent ci WHERE ci.store IS NULL AND ci.isActive = true ORDER BY ci.intentName ASC")
    List<ChatbotIntent> findByStoreIdIsNullAndIsActiveTrueOrderByIntentNameAsc();

    @Query("SELECT ci FROM ChatbotIntent ci WHERE ci.store.id = :storeId ORDER BY ci.createdAt DESC")
    List<ChatbotIntent> findByStoreIdOrderByCreatedAtDesc(@Param("storeId") Long storeId);
}
