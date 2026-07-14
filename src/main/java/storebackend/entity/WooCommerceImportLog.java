package storebackend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * WooCommerce Import Log.
 * 
 * Protokolliert jeden Import-Versuch pro Produkt.
 * KEIN Unique Constraint - mehrere Logs pro Produkt/Job erlaubt.
 */
@Entity
@Table(
    name = "woocommerce_import_log",
    indexes = {
        @Index(name = "idx_wc_import_log_job", columnList = "job_id"),
        @Index(name = "idx_wc_import_log_status", columnList = "status"),
        @Index(name = "idx_wc_import_log_sku", columnList = "sku")
    }
)
@Data
@NoArgsConstructor
@AllArgsConstructor
public class WooCommerceImportLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "store_id", nullable = false,
        foreignKey = @ForeignKey(name = "fk_wc_import_log_store",
            foreignKeyDefinition = "FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE"))
    private Store store;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "job_id",
        foreignKey = @ForeignKey(name = "fk_wc_import_log_job",
            foreignKeyDefinition = "FOREIGN KEY (job_id) REFERENCES woocommerce_import_jobs(id) ON DELETE SET NULL"))
    private WooCommerceImportJob job;

    /**
     * WooCommerce Product ID (Original)
     * NULL für Kategorie-Logs, Summary-Logs, Job-Logs ohne Produktbezug
     */
    @Column(name = "woocommerce_product_id")
    private Long woocommerceProductId;

    /**
     * markt.ma Product ID (null wenn SKIPPED/ERROR)
     */
    @Column(name = "product_id")
    private Long productId;

    /**
     * WooCommerce SKU (für Duplikat-Check)
     */
    @Column(name = "sku", length = 255)
    private String sku;

    /**
     * WooCommerce Product Name
     */
    @Column(name = "product_name", length = 500)
    private String productName;

    /**
     * Status: SUCCESS | SKIPPED | ERROR | UPDATED
     */
    @Column(nullable = false, length = 20)
    private String status = "SUCCESS";

    /**
     * Fehler-Nachricht (falls ERROR)
     */
    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    /**
     * Anzahl importierter Varianten
     */
    @Column(name = "variants_imported")
    private Integer variantsImported = 0;

    /**
     * Anzahl importierter Bilder
     */
    @Column(name = "images_imported")
    private Integer imagesImported = 0;

    @Column(name = "imported_at", nullable = false)
    private LocalDateTime importedAt;

    @PrePersist
    protected void onCreate() {
        if (importedAt == null) {
            importedAt = LocalDateTime.now();
        }
    }
}
