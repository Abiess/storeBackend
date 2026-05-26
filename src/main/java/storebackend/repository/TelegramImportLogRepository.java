package storebackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import storebackend.entity.TelegramImportLog;

import java.util.List;

@Repository
public interface TelegramImportLogRepository extends JpaRepository<TelegramImportLog, Long> {
    List<TelegramImportLog> findByStoreIdOrderByImportedAtDesc(Long storeId);

    /** Prüft ob ein Post bereits ERFOLGREICH importiert wurde (Status = SUCCESS). */
    boolean existsByStoreIdAndChannelIdAndTelegramMsgIdAndStatus(
            Long storeId, String channelId, Long telegramMsgId, String status);

    /** Legacy – nicht mehr für Duplikat-Check verwenden */
    boolean existsByStoreIdAndChannelIdAndTelegramMsgId(Long storeId, String channelId, Long telegramMsgId);

    long countByStoreIdAndStatus(Long storeId, String status);
}

