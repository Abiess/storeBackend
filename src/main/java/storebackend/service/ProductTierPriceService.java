package storebackend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import storebackend.dto.ProductTierPriceDTO;
import storebackend.dto.TierPriceCalculationResult;
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
 * Zentrale Preisberechnung: calculateWithDetails(product, basePrice, quantity)
 * - Verwendet höchste erreichte Mindestmenge
 * - Fallback auf basePrice wenn keine Staffelung erreicht
 * - Gibt TierPriceCalculationResult mit allen Metadaten zurück
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ProductTierPriceService {

    private final ProductTierPriceRepository tierPriceRepository;
    private final ProductRepository productRepository;

    /**
     * Berechnet den wirksamen Preis mit allen Details (ZENTRALE METHODE).
     * 
     * Wird verwendet in:
     * - CartService (addItem, updateQuantity)
     * - OrderService (createOrderFromCart - Checkout-Absicherung)
     * - CartItemDTO-Mapping
     * 
     * @param product Produkt
     * @param basePrice Basispreis (product.basePrice oder variant.price)
     * @param quantity Bestellmenge
     * @return TierPriceCalculationResult mit baseUnitPrice, effectiveUnitPrice, tierPriceApplied, appliedTierMinimumQuantity
     */
    public TierPriceCalculationResult calculateWithDetails(Product product, BigDecimal basePrice, int quantity) {
        if (product == null || basePrice == null || quantity < 1) {
            return TierPriceCalculationResult.withoutTierPrice(
                basePrice != null ? basePrice : BigDecimal.ZERO);
        }

        // Hole alle aktiven Preisstufen, aufsteigend sortiert
        List<ProductTierPrice> tierPrices = tierPriceRepository
                .findByProductIdAndActiveTrueOrderByMinimumQuantityAsc(product.getId());

        if (tierPrices.isEmpty()) {
            return TierPriceCalculationResult.withoutTierPrice(basePrice);
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
            log.debug("✅ Staffelpreis angewendet: product={}, quantity={}, tier={}, price={}", 
                product.getId(), quantity, applicableTier.getMinimumQuantity(), 
                applicableTier.getUnitPrice());
            
            return TierPriceCalculationResult.withTierPrice(
                basePrice,
                applicableTier.getUnitPrice(),
                applicableTier.getMinimumQuantity()
            );
        }

        // Keine Stufe erreicht → Basispreis
        return TierPriceCalculationResult.withoutTierPrice(basePrice);
    }
    
    /**
     * Legacy-Methode: Berechnet nur den effektiven Preis (ohne Metadaten).
     * Wrapper um calculateWithDetails() für Rückwärtskompatibilität.
     * 
     * @deprecated Verwende calculateWithDetails() für vollständige Informationen
     */
    public BigDecimal calculateEffectiveUnitPrice(Product product, int quantity) {
        TierPriceCalculationResult result = calculateWithDetails(product, product.getBasePrice(), quantity);
        return result.getEffectiveUnitPrice();
    }

    /**
     * Erstellt eine neue Preisstufe.
     */
    @Transactional
    public ProductTierPriceDTO createTierPrice(Long productId, ProductTierPriceDTO dto) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new RuntimeException("Product not found: " + productId));

        // Validierung
        if (dto.getMinimumQuantity() == null || dto.getMinimumQuantity() <= 1) {
            throw new IllegalArgumentException("Minimum quantity must be greater than 1");
        }
        if (dto.getUnitPrice() == null) {
            throw new IllegalArgumentException("Unit price is required");
        }
        if (dto.getUnitPrice().signum() < 0) {
            throw new IllegalArgumentException("Unit price cannot be negative");
        }
        if (dto.getLabel() != null && dto.getLabel().length() > 100) {
            throw new IllegalArgumentException("Label cannot exceed 100 characters");
        }

        // BigDecimal-Scale auf 2 Nachkommastellen normalisieren (DB ist NUMERIC(10,2))
        BigDecimal normalizedPrice = dto.getUnitPrice().setScale(2, java.math.RoundingMode.HALF_UP);

        // Prüfe auf Duplikate
        boolean duplicateExists = tierPriceRepository.existsByProductIdAndMinimumQuantity(
                productId, dto.getMinimumQuantity());
        if (duplicateExists) {
            throw new IllegalStateException("Tier price with minimum quantity " + 
                dto.getMinimumQuantity() + " already exists for this product");
        }

        ProductTierPrice tierPrice = new ProductTierPrice();
        tierPrice.setProduct(product);
        tierPrice.setMinimumQuantity(dto.getMinimumQuantity());
        tierPrice.setUnitPrice(normalizedPrice);
        tierPrice.setLabel(dto.getLabel());
        tierPrice.setActive(dto.getActive() != null ? dto.getActive() : true);
        tierPrice.setSortOrder(dto.getSortOrder() != null ? dto.getSortOrder() : dto.getMinimumQuantity());

        tierPrice = tierPriceRepository.save(tierPrice);
        log.info("✅ Tier price created: id={}, productId={}, minQty={}, price={} (normalized from {})", 
            tierPrice.getId(), productId, tierPrice.getMinimumQuantity(), 
            tierPrice.getUnitPrice(), dto.getUnitPrice());

        return toDTO(tierPrice);
    }

    /**
     * Aktualisiert eine Preisstufe.
     */
    @Transactional
    /**
     * Aktualisiert eine bestehende Preisstufe.
     * 
     * @throws IllegalArgumentException bei ungültigen Daten (400)
     * @throws IllegalStateException bei Duplikat (409)
     * @throws RuntimeException bei nicht gefundener Entity (404)
     */
    public ProductTierPriceDTO updateTierPrice(Long id, ProductTierPriceDTO dto) {
        ProductTierPrice tierPrice = tierPriceRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Tier price not found: " + id));

        // Validierung: minimumQuantity
        if (dto.getMinimumQuantity() == null || dto.getMinimumQuantity() <= 1) {
            throw new IllegalArgumentException("Minimum quantity must be greater than 1");
        }

        // Validierung: unitPrice
        if (dto.getUnitPrice() == null) {
            throw new IllegalArgumentException("Unit price is required");
        }
        if (dto.getUnitPrice().signum() < 0) {
            throw new IllegalArgumentException("Unit price cannot be negative");
        }

        // BigDecimal-Scale auf 2 Nachkommastellen normalisieren (DB ist NUMERIC(10,2))
        BigDecimal normalizedPrice = dto.getUnitPrice().setScale(2, java.math.RoundingMode.HALF_UP);
        
        // Validierung: label max 100 Zeichen
        if (dto.getLabel() != null && dto.getLabel().length() > 100) {
            throw new IllegalArgumentException("Label cannot exceed 100 characters");
        }

        // Wenn minimumQuantity geändert wird, prüfe auf Duplikate
        if (!tierPrice.getMinimumQuantity().equals(dto.getMinimumQuantity())) {
            boolean duplicateExists = tierPriceRepository.existsByProductIdAndMinimumQuantity(
                    tierPrice.getProduct().getId(), dto.getMinimumQuantity());
            if (duplicateExists) {
                throw new IllegalStateException("Tier price with minimum quantity " + 
                    dto.getMinimumQuantity() + " already exists for this product");
            }
        }

        // Update nur erlaubte Felder - product, id, createdAt bleiben unverändert
        tierPrice.setMinimumQuantity(dto.getMinimumQuantity());
        tierPrice.setUnitPrice(normalizedPrice);
        tierPrice.setLabel(dto.getLabel());
        tierPrice.setActive(dto.getActive() != null ? dto.getActive() : true);
        tierPrice.setSortOrder(dto.getSortOrder() != null ? dto.getSortOrder() : dto.getMinimumQuantity());

        tierPrice = tierPriceRepository.save(tierPrice);
        log.info("✅ Tier price updated: id={}, minQty={}, price={} (normalized from {})", 
            id, tierPrice.getMinimumQuantity(), tierPrice.getUnitPrice(), dto.getUnitPrice());

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
