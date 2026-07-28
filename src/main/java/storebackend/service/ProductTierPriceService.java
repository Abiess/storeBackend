package storebackend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import storebackend.dto.ProductTierPriceDTO;
import storebackend.entity.Product;
import storebackend.entity.ProductTierPrice;
import storebackend.repository.ProductRepository;
import storebackend.repository.ProductTierPriceRepository;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Service für Staffelpreise / Mengenpreise.
 * 
 * Zentrale Preisberechnung: effectiveUnitPrice(product, quantity)
 * - Verwendet höchste erreichte Mindestmenge
 * - Fallback auf product.basePrice wenn keine Staffelung erreicht
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ProductTierPriceService {

    private final ProductTierPriceRepository tierPriceRepository;
    private final ProductRepository productRepository;

    /**
     * Berechnet den wirksamen Stückpreis für eine bestimmte Menge.
     * 
     * Regel:
     * 1. Finde alle aktiven Preisstufen für das Produkt
     * 2. Filtere Stufen, deren minimumQuantity <= quantity
     * 3. Wähle die höchste erreichte Stufe (= günstigster Preis)
     * 4. Fallback: product.basePrice
     * 
     * Beispiel: quantity=25, Stufen [12→3.49, 24→2.99, 48→2.49]
     * → Stufe 24 wird verwendet → 2.99 €
     * 
     * @param product Produkt
     * @param quantity Bestellmenge
     * @return Wirksamer Stückpreis
     */
    public BigDecimal calculateEffectiveUnitPrice(Product product, int quantity) {
        if (product == null || quantity < 1) {
            return BigDecimal.ZERO;
        }

        // Hole alle aktiven Preisstufen, aufsteigend sortiert
        List<ProductTierPrice> tierPrices = tierPriceRepository
                .findByProductIdAndActiveTrueOrderByMinimumQuantityAsc(product.getId());

        if (tierPrices.isEmpty()) {
            return product.getBasePrice(); // Keine Staffelung
        }

        // Finde höchste erreichte Stufe (rückwärts iterieren für Effizienz)
        ProductTierPrice applicableTier = null;
        for (int i = tierPrices.size() - 1; i >= 0; i--) {
            ProductTierPrice tier = tierPrices.get(i);
            if (quantity >= tier.getMinimumQuantity()) {
                applicableTier = tier;
                break;
            }
        }

        if (applicableTier != null) {
            log.debug("Tier price applied: product={}, quantity={}, tier={}, price={}", 
                product.getId(), quantity, applicableTier.getMinimumQuantity(), 
                applicableTier.getUnitPrice());
            return applicableTier.getUnitPrice();
        }

        // Keine Stufe erreicht → Standardpreis
        return product.getBasePrice();
    }

    /**
     * Erstellt eine neue Preisstufe.
     */
    @Transactional
    public ProductTierPriceDTO createTierPrice(Long productId, ProductTierPriceDTO dto) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new RuntimeException("Product not found: " + productId));

        // Validierung: Keine doppelten Mindestmengen
        if (tierPriceRepository.existsByProductIdAndMinimumQuantity(productId, dto.getMinimumQuantity())) {
            throw new RuntimeException("Tier price with minimum quantity " + 
                dto.getMinimumQuantity() + " already exists for this product");
        }

        ProductTierPrice tierPrice = new ProductTierPrice();
        tierPrice.setProduct(product);
        tierPrice.setMinimumQuantity(dto.getMinimumQuantity());
        tierPrice.setUnitPrice(dto.getUnitPrice());
        tierPrice.setLabel(dto.getLabel());
        tierPrice.setActive(dto.getActive() != null ? dto.getActive() : true);
        tierPrice.setSortOrder(dto.getSortOrder() != null ? dto.getSortOrder() : dto.getMinimumQuantity());

        tierPrice = tierPriceRepository.save(tierPrice);
        log.info("Tier price created: product={}, minQty={}, price={}", 
            productId, tierPrice.getMinimumQuantity(), tierPrice.getUnitPrice());

        return toDTO(tierPrice);
    }

    /**
     * Aktualisiert eine Preisstufe.
     */
    @Transactional
    public ProductTierPriceDTO updateTierPrice(Long id, ProductTierPriceDTO dto) {
        ProductTierPrice tierPrice = tierPriceRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Tier price not found: " + id));

        // Wenn minimumQuantity geändert wird, prüfe auf Duplikate
        if (!tierPrice.getMinimumQuantity().equals(dto.getMinimumQuantity())) {
            if (tierPriceRepository.existsByProductIdAndMinimumQuantity(
                    tierPrice.getProduct().getId(), dto.getMinimumQuantity())) {
                throw new RuntimeException("Tier price with minimum quantity " + 
                    dto.getMinimumQuantity() + " already exists for this product");
            }
        }

        tierPrice.setMinimumQuantity(dto.getMinimumQuantity());
        tierPrice.setUnitPrice(dto.getUnitPrice());
        tierPrice.setLabel(dto.getLabel());
        tierPrice.setActive(dto.getActive());
        tierPrice.setSortOrder(dto.getSortOrder() != null ? dto.getSortOrder() : dto.getMinimumQuantity());

        tierPrice = tierPriceRepository.save(tierPrice);
        log.info("Tier price updated: id={}, minQty={}, price={}", 
            id, tierPrice.getMinimumQuantity(), tierPrice.getUnitPrice());

        return toDTO(tierPrice);
    }

    /**
     * Löscht eine Preisstufe.
     */
    @Transactional
    public void deleteTierPrice(Long id) {
        ProductTierPrice tierPrice = tierPriceRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Tier price not found: " + id));
        
        tierPriceRepository.delete(tierPrice);
        log.info("Tier price deleted: id={}, product={}", id, tierPrice.getProduct().getId());
    }

    /**
     * Gibt alle Preisstufen für ein Produkt zurück.
     */
    @Transactional(readOnly = true)
    public List<ProductTierPriceDTO> getTierPricesByProduct(Long productId) {
        return tierPriceRepository.findByProductIdOrderByMinimumQuantityAsc(productId).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    /**
     * Gibt nur aktive Preisstufen für ein Produkt zurück.
     */
    @Transactional(readOnly = true)
    public List<ProductTierPriceDTO> getActiveTierPricesByProduct(Long productId) {
        return tierPriceRepository.findByProductIdAndActiveTrueOrderByMinimumQuantityAsc(productId).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    /**
     * Konvertiert Entity zu DTO.
     */
    private ProductTierPriceDTO toDTO(ProductTierPrice entity) {
        ProductTierPriceDTO dto = new ProductTierPriceDTO();
        dto.setId(entity.getId());
        dto.setProductId(entity.getProduct().getId());
        dto.setMinimumQuantity(entity.getMinimumQuantity());
        dto.setUnitPrice(entity.getUnitPrice());
        dto.setLabel(entity.getLabel());
        dto.setActive(entity.getActive());
        dto.setSortOrder(entity.getSortOrder());
        return dto;
    }
}
