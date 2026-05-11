package storebackend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "cart_items")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CartItem {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cart_id", nullable = false)
    private Cart cart;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id")
    private Product product;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "variant_id") // FIXED: nullable = true (default)
    private ProductVariant variant;

    @Column(nullable = false)
    private Integer quantity = 1;

    // Beide Preisspalten mappen – DB hat 'price' (alt) UND 'price_snapshot' (neu), beide NOT NULL
    @Column(name = "price_snapshot", nullable = false, precision = 10, scale = 2)
    private BigDecimal priceSnapshot;

    @Column(name = "price", nullable = false, precision = 10, scale = 2)
    private BigDecimal price;

    public BigDecimal getPriceSnapshot() {
        return priceSnapshot != null ? priceSnapshot : price;
    }

    public void setPriceSnapshot(BigDecimal priceSnapshot) {
        this.priceSnapshot = priceSnapshot;
        this.price = priceSnapshot; // price-Spalte immer synchron halten
    }

    public BigDecimal getPrice() {
        return price != null ? price : priceSnapshot;
    }

    public void setPrice(BigDecimal price) {
        this.price = price;
        this.priceSnapshot = price; // price_snapshot immer synchron halten
    }

    @Column(name = "added_at", updatable = false)
    private LocalDateTime addedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (addedAt == null) addedAt = now;
        if (createdAt == null) createdAt = now;
        if (updatedAt == null) updatedAt = now;
        // Beide Preisspalten synchron halten
        if (priceSnapshot == null && price != null) priceSnapshot = price;
        if (price == null && priceSnapshot != null) price = priceSnapshot;
        if (price == null) price = java.math.BigDecimal.ZERO;
        if (priceSnapshot == null) priceSnapshot = java.math.BigDecimal.ZERO;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
        // Beide Preisspalten synchron halten
        if (priceSnapshot == null && price != null) priceSnapshot = price;
        if (price == null && priceSnapshot != null) price = priceSnapshot;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    // Explizite Getter/Setter für Lombok-Kompatibilität
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Cart getCart() {
        return cart;
    }

    public void setCart(Cart cart) {
        this.cart = cart;
    }

    public Product getProduct() {
        return product;
    }

    public void setProduct(Product product) {
        this.product = product;
    }

    public ProductVariant getVariant() {
        return variant;
    }

    public void setVariant(ProductVariant variant) {
        this.variant = variant;
    }

    public Integer getQuantity() {
        return quantity;
    }

    public void setQuantity(Integer quantity) {
        this.quantity = quantity;
    }


    public LocalDateTime getAddedAt() {
        return addedAt;
    }

    public void setAddedAt(LocalDateTime addedAt) {
        this.addedAt = addedAt;
    }
}
