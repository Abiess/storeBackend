package storebackend.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "chatbot_intents")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ChatbotIntent {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonIgnore   // open-in-view=false in Production → verhindert LazyInitializationException
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "store_id")
    private Store store; // NULL = global intent

    /** Gibt die Store-ID zurück, ohne die lazy Relation zu initialisieren. */
    @JsonProperty("storeId")
    public Long getStoreId() {
        if (store == null) return null;
        try { return store.getId(); } catch (Exception e) { return null; }
    }

    @Column(name = "intent_name", nullable = false, length = 100)
    private String intentName;

    @Column(length = 500)
    private String description;

    @Column(name = "training_phrases", length = 5000)
    private String trainingPhrases; // JSON array

    @Column(name = "response_template", length = 2000)
    private String responseTemplate;

    @Column(length = 50)
    private String action; // CHECK_ORDER, SHOW_FAQ, TRANSFER_TO_AGENT, etc

    @Column(name = "confidence_threshold", precision = 3, scale = 2)
    private BigDecimal confidenceThreshold = new BigDecimal("0.70");

    @Column(name = "is_active")
    private Boolean isActive = true;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
}

