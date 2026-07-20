package storebackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import storebackend.entity.StorePaymentConfiguration;
import storebackend.enums.PaymentProvider;

import java.util.List;
import java.util.Optional;

@Repository
public interface StorePaymentConfigurationRepository extends JpaRepository<StorePaymentConfiguration, Long> {
    
    /**
     * Finde Konfiguration für Store und Provider
     */
    Optional<StorePaymentConfiguration> findByStoreIdAndProvider(
        Long storeId, 
        PaymentProvider provider
    );
    
    /**
     * Finde alle Konfigurationen für einen Store
     */
    List<StorePaymentConfiguration> findByStoreId(Long storeId);
    
    /**
     * Finde alle aktivierten Provider für einen Store
     */
    List<StorePaymentConfiguration> findByStoreIdAndEnabledTrue(Long storeId);
}
