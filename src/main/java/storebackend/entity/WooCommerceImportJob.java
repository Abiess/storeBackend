package storebackend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * WooCommerce Import Job.
 * 
 * Ein Job repräsentiert einen kompletten Import-Durchlauf.
 * Status-Tracking für Async-Import mit Fortschritt-Anzeige.
 */
@Entity
@Table(name = "woocommerce_import_jobs")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class WooCommerceImportJob {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "store_id", nullable = false,
        foreignKey = @ForeignKey(name = "fk_woocommerce_job_store",
            foreignKeyDefinition = "FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE"))
    private Store store;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "triggered_by_user_id", nullable = false)
    private User triggeredBy;

    /**
     * Job Status: RUNNING | SUCCESS | FAILED | CANCELLED
     */
    @Column(nullable = false, length = 20)
    private String status = "RUNNING";

    /**
     * WooCommerce Shop URL (für Referenz/Logging)
     */
    @Column(name = "shop_url", length = 500)
    private String shopUrl;

    // ─────────────────────────────────────────────────────────────────────────
    // Statistiken
    // ─────────────────────────────────────────────────────────────────────────

    @Column(name = "total_products", nullable = false)
    private Integer totalProducts = 0;

    @Column(name = "imported_products", nullable = false)
    private Integer importedProducts = 0;

    @Column(name = "skipped_products", nullable = false)
    private Integer skippedProducts = 0;

    @Column(name = "failed_products", nullable = false)
    private Integer failedProducts = 0;

    @Column(name = "total_categories", nullable = false)
    private Integer totalCategories = 0;

    @Column(name = "imported_categories", nullable = false)
    private Integer importedCategories = 0;

    /**
     * Aktuell verarbeitetes Produkt (für Progress-Anzeige)
     */
    @Column(name = "current_product_name", length = 500)
    private String currentProductName;

    /**
     * Fehler-Nachricht falls FAILED
     */
    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    // ─────────────────────────────────────────────────────────────────────────
    // Timestamps
    // ─────────────────────────────────────────────────────────────────────────

    @Column(name = "started_at", nullable = false)
    private LocalDateTime startedAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @PrePersist
    protected void onCreate() {
        if (startedAt == null) {
            startedAt = LocalDateTime.now();
        }
    }

    /**
     * Berechnet Fortschritt in Prozent (0-100)
     */
    public Integer getProgress() {
        if (totalProducts == 0) {
            return 0;
        }
        int processed = importedProducts + skippedProducts + failedProducts;
        return (int) ((processed * 100.0) / totalProducts);
    }

    /**
     * Markiert Job als abgeschlossen
     */
    public void complete(String finalStatus) {
        this.status = finalStatus;
        this.completedAt = LocalDateTime.now();
    }
}
