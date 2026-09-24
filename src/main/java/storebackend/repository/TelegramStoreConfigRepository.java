package storebackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import storebackend.entity.TelegramStoreConfig;

import java.util.Optional;

@Repository
public interface TelegramStoreConfigRepository extends JpaRepository<TelegramStoreConfig, Long> {
    Optional<TelegramStoreConfig> findByStoreId(Long storeId);
    boolean existsByStoreId(Long storeId);
}

