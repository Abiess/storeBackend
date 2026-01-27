package storebackend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

/**
 * Store-wide delivery configuration settings
 */
@Entity
@Table(name = "store_delivery_settings")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class StoreDeliverySettings {

    @Id
    @Column(name = "store_id")
    private Long storeId;

    @OneToOne
    @MapsId
    @JoinColumn(name = "store_id")
    private Store store;

    @Column(name = "pickup_enabled", nullable = false)
    private Boolean pickupEnabled = true;

    @Column(name = "delivery_enabled", nullable = false)
    private Boolean deliveryEnabled = false;

    @Column(name = "express_enabled", nullable = false)
    private Boolean expressEnabled = false;

    @Column(name = "currency", length = 3, nullable = false)
    private String currency = "EUR";

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
