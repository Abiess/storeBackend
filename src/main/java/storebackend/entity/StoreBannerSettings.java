package storebackend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

import java.time.LocalDateTime;

/**
 * Ein-Zu-Eins-Zuordnung pro Store.
 * Speichert alle Konfigurationsparameter für das „Breaking News / Promo Banner".
 * Texte werden mehrsprachig als JSON gespeichert: {"de": "...", "en": "...", "ar": "..."}
 *
 * WICHTIG: @Data wird NICHT verwendet – es würde das lazy `store`-Feld in hashCode/equals
 * einbeziehen und Hibernate's Entity-Tracking korrumpieren → StaleObjectStateException.
 */
@Entity
@Table(name = "store_banner_settings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@ToString(exclude = "store")
@EqualsAndHashCode(of = "storeId")
public class StoreBannerSettings {

    @Id
    @Column(name = "store_id")
    private Long storeId;

    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "store_id")
    private Store store;

    /** Ob das Banner im Storefront angezeigt wird */
    @Column(name = "enabled", nullable = false)
    private boolean enabled = false;

    /** Position des Banners: "top" oder "bottom" */
    @Column(name = "position", nullable = false, length = 10)
    private String position = "top";

    /** Hintergrundfarbe des Banners (CSS-Wert, z.B. "#667eea") */
    @Column(name = "bg_color", nullable = false, length = 30)
    private String bgColor = "#667eea";

    /** Textfarbe des Banners (CSS-Wert, z.B. "#ffffff") */
    @Column(name = "text_color", nullable = false, length = 30)
    private String textColor = "#ffffff";

    /**
     * Animationsgeschwindigkeit in Pixel pro Sekunde.
     * 0 = keine Animation (statischer Text).
     * Empfehlung: 40–80 px/s für gute Lesbarkeit.
     */
    @Column(name = "animation_speed", nullable = false)
    private int animationSpeed = 60;

    /**
     * Mehrsprachige Texte als JSON-String.
     * Format: {"de": "🎉 Heute Rabatt!", "en": "🎉 Sale today!", "ar": "🎉 تخفيضات اليوم!"}
     * Fallback-Reihenfolge: angefragte Sprache → "de" → erster verfügbarer Wert
     */
    @Column(name = "texts_json", columnDefinition = "TEXT")
    private String textsJson = "{\"de\":\"🎉 Du erhältst heute Rabatt auf ausgewählte Produkte!\",\"en\":\"🎉 Get a discount on selected products today!\",\"ar\":\"🎉 احصل على خصم على منتجات مختارة اليوم!\"}";

    /** Optional: Emoji oder Icon das vor dem Text angezeigt wird (z.B. "🔥") */
    @Column(name = "icon", length = 50)
    private String icon;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}

