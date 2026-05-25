package storebackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import storebackend.entity.TelegramSyncNotification;

import java.util.List;

@Repository
public interface TelegramSyncNotificationRepository extends JpaRepository<TelegramSyncNotification, Long> {

    List<TelegramSyncNotification> findByStoreIdOrderByCreatedAtDesc(Long storeId);

    List<TelegramSyncNotification> findByStoreIdAndReadFalseOrderByCreatedAtDesc(Long storeId);

    long countByStoreIdAndReadFalse(Long storeId);

    @Modifying
    @Query("UPDATE TelegramSyncNotification n SET n.read = true WHERE n.storeId = :storeId")
    void markAllReadByStoreId(Long storeId);

    @Modifying
    @Query("DELETE FROM TelegramSyncNotification n WHERE n.storeId = :storeId AND n.read = true")
    void deleteReadByStoreId(Long storeId);
}

