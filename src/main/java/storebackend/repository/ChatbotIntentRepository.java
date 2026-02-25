package storebackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import storebackend.entity.ChatbotIntent;

import java.util.List;

@Repository
public interface ChatbotIntentRepository extends JpaRepository<ChatbotIntent, Long> {
    List<ChatbotIntent> findByStoreIdAndIsActiveTrueOrderByIntentNameAsc(Long storeId);

    List<ChatbotIntent> findByStoreIdAndIsActiveTrue(Long storeId);

    List<ChatbotIntent> findByStoreIdIsNullAndIsActiveTrueOrderByIntentNameAsc();

    List<ChatbotIntent> findByStoreIdOrderByCreatedAtDesc(Long storeId);
}

