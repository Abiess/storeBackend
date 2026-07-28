package storebackend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Staffelpreis / Mengenpreis für ein Produkt.
 * 
 * Ermöglicht günstigere Stückpreise ab bestimmten Mindestmengen.
 * 
 * Beispiel:
 * - Standardpreis: 3,99 €
 * - Ab 12 Stück: 3,49 € pro Stück (ProductTierPrice: minimumQuantity=12, unitPrice=3.49)
 * - Ab 24 Stück: 2,99 € pro Stück (ProductTierPrice: minimumQuantity=24, unitPrice=2.99)
 * 
 * Constraints:
 * - minimumQuantity muss > 1 sein (1 = Standardpreis)
 * - unitPrice >= 0
 * - Unique constraint: (product_id, minimum_quantity) - keine doppelten Stufen
 * - Preisberechnung: Höchste erreichte Mindestmenge wird verwendet
 */
@Entity
@Table(name = "product_tier_prices",
       uniqueConstraints = @UniqueConstraint(columnNames = {"product_id", "minimum_quantity"}))
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProductTierPrice {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;
    
    /**
     * Mindestmenge für diese Preisstufe.
     * Muss > 1 sein (1 = Standardpreis des Produkts).
     */
    @Column(name = "minimum_quantity", nullable = false)
    private Integer minimumQuantity;
    
    /**
     * Stückpreis bei Erreichen der Mindestmenge.
     * Wird auf die gesamte Bestellmenge angewendet.
     */
    @Column(name = "unit_price", nullable = false, precision = 10, scale = 2)
    private BigDecimal unitPrice;
    
    /**
     * Optionale Bezeichnung (z.B. "Großhandelsrabatt", "Sammelbestellung").
     * Wird im Frontend angezeigt.
     */
    @Column(name = "label", length = 100)
    private String label;
    
    /**
     * Aktiv/Inaktiv Status.
     * Inaktive Preisstufen werden nicht bei der Berechnung berücksichtigt.
     */
    @Column(name = "active", nullable = false)
    private Boolean active = true;
    
    /**
     * Sortierreihenfolge für die Anzeige.
     * In der Regel aufsteigend nach minimumQuantity.
     */
    @Column(name = "sort_order", nullable = false)
    private Integer sortOrder = 0;
    
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        
        // Validierung: minimumQuantity muss > 1 sein
        if (minimumQuantity != null && minimumQuantity <= 1) {
            throw new IllegalArgumentException(
                "Minimum quantity must be greater than 1. Use product base price for quantity 1.");
        }
        
        // Validierung: unitPrice >= 0
        if (unitPrice != null && unitPrice.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("Unit price cannot be negative");
        }
    }
    
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
