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

    // FIXED: Map to 'price' column in database (not 'price_snapshot')
    @Column(name = "price", nullable = false, precision = 10, scale = 2)
    private BigDecimal price;

    // Keep price_snapshot as alias for compatibility
    @Transient
    public BigDecimal getPriceSnapshot() {
        return price;
    }

    public void setPriceSnapshot(BigDecimal priceSnapshot) {
        this.price = priceSnapshot;
    }

    @Column(name = "added_at", nullable = false, updatable = false)
    private LocalDateTime addedAt;

    // Keep created_at and updated_at for compatibility
    @Transient
    public LocalDateTime getCreatedAt() {
        return addedAt;
    }

    public void setCreatedAt(LocalDateTime addedAt) {
        this.addedAt = addedAt;
    }

    @Transient
    public LocalDateTime getUpdatedAt() {
        return addedAt;
    }

    public void setUpdatedAt(LocalDateTime addedAt) {
        // Ignore updates for this field
    }

    @PrePersist
    protected void onCreate() {
        addedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        // No update timestamp needed
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

    public BigDecimal getPrice() {
        return price;
    }

    public void setPrice(BigDecimal price) {
        this.price = price;
    }

    public LocalDateTime getAddedAt() {
        return addedAt;
    }

    public void setAddedAt(LocalDateTime addedAt) {
        this.addedAt = addedAt;
    }
}
