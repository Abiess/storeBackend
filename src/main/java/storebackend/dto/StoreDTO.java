package storebackend.dto;

import lombok.Data;
import storebackend.enums.StoreStatus;
import storebackend.enums.BusinessType;

import java.time.LocalDateTime;

@Data
public class StoreDTO {
    private Long id;
    private String name;
    private String slug;
    private String description;
    private String logoUrl;
    private String bannerImageUrl;
    private StoreStatus status;
    private LocalDateTime createdAt;
    private String whatsappNumber;
    private boolean whatsappNotificationsEnabled;
    private String greetingMessage;
    // ─── Social & Kontakt ─────────────────────────────────
    private String contactEmail;
    private String contactPhone;
    private String telegramUrl;
    private String facebookUrl;
    private String instagramUrl;
    private String tiktokUrl;
    private String footerText;
    // ─── Business-Typ & Restaurant/Riad-Felder ─────────────
    private BusinessType businessType;
    private String openingHours;
    private String address;
    private String googleMapsUrl;
    private String reservationWhatsappText;

    // ─── Bot-Schutz (nur für Admin-Bereich, NICHT öffentlich) ─
    private boolean botProtectionEnabled;
    private storebackend.enums.BotProtectionMode botProtectionMode;
}
