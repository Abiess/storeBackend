package storebackend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import storebackend.enums.SliderOverrideMode;

import java.time.LocalDateTime;

@Entity
@Table(name = "store_slider_settings")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class StoreSliderSettings {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "store_id", nullable = false, unique = true)
    private Store store;

    @Enumerated(EnumType.STRING)
    @Column(name = "override_mode", nullable = false)
    private SliderOverrideMode overrideMode = SliderOverrideMode.DEFAULT_ONLY;

    @Column(nullable = false)
    private Boolean autoplay = true;

    @Column(name = "duration_ms", nullable = false)
    private Integer durationMs = 5000;

    @Column(name = "transition_ms", nullable = false)
    private Integer transitionMs = 500;

    @Column(name = "loop_enabled", nullable = false)
    private Boolean loopEnabled = true;

    @Column(name = "show_dots", nullable = false)
    private Boolean showDots = true;

    @Column(name = "show_arrows", nullable = false)
    private Boolean showArrows = true;

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

