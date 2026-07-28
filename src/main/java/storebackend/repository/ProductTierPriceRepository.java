package storebackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import storebackend.entity.ProductTierPrice;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProductTierPriceRepository extends JpaRepository<ProductTierPrice, Long> {
    
    /**
     * Findet alle Preisstufen für ein Produkt, aufsteigend sortiert nach minimumQuantity.
     */
    List<ProductTierPrice> findByProductIdOrderByMinimumQuantityAsc(Long productId);
    
    /**
     * Findet alle aktiven Preisstufen für ein Produkt, aufsteigend sortiert.
     */
    List<ProductTierPrice> findByProductIdAndActiveTrueOrderByMinimumQuantityAsc(Long productId);
    
    /**
     * Findet eine spezifische Preisstufe für ein Produkt und eine Mindestmenge.
     */
    Optional<ProductTierPrice> findByProductIdAndMinimumQuantity(Long productId, Integer minimumQuantity);
    
    /**
     * Prüft ob eine Preisstufe für ein Produkt und eine Mindestmenge bereits existiert.
     */
    boolean existsByProductIdAndMinimumQuantity(Long productId, Integer minimumQuantity);
    
    /**
     * Löscht alle Preisstufen für ein Produkt.
     */
    void deleteByProductId(Long productId);
    
    /**
     * Zählt aktive Preisstufen für ein Produkt.
     */
    long countByProductIdAndActiveTrue(Long productId);
}
