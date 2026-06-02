package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PublicStoreDTO {
    private Long storeId;
    private Long domainId;
    private String name;
    private String slug;
    private String description;  // ✅ Neu hinzugefügt
    private String logoUrl;      // ✅ Store-Logo URL
    private String primaryDomain;
    private String status;
    private String whatsappNumber;
    private String greetingMessage;
    // ─── Social & Kontakt ─────────────────────────────────
    private String contactEmail;
    private String contactPhone;
    private String telegramUrl;
    private String facebookUrl;
    private String instagramUrl;
    private String tiktokUrl;
    private String footerText;
}
