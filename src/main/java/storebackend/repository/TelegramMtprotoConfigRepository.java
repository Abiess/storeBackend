package storebackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import storebackend.entity.TelegramMtprotoConfig;

import java.util.List;
import java.util.Optional;

@Repository
public interface TelegramMtprotoConfigRepository extends JpaRepository<TelegramMtprotoConfig, Long> {
    Optional<TelegramMtprotoConfig> findByStoreId(Long storeId);
    boolean existsByStoreId(Long storeId);
    List<TelegramMtprotoConfig> findAllByAuthenticatedTrueAndActiveTrue();
}

