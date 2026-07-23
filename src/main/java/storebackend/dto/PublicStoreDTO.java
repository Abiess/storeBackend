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
    // ─── Business-Typ & Restaurant/Riad-Felder ─────────────
    private String businessType;
    private String openingHours;
    private String address;
    private String googleMapsUrl;
    private String reservationWhatsappText;
    
    // ─── DHL Shipping (Public Info Only - NO SECRETS) ──────
    private Boolean dhlShippingEnabled;       // DHL als Versandoption verfügbar
    private String dhlShippingLabel;          // "DHL Versand"
    private String dhlShippingDescription;    // "Lieferung mit DHL Paket"
    private Double dhlShippingPrice;          // Optional: Versandkosten

    // ─── Währung & Steuern (Public) ─────────────────────────
    private String currencyCode;              // EUR, MAD, USD, GBP
    private String countryCode;               // DE, MA, etc.
    private String priceMode;                 // GROSS oder NET

    // ─── Legal/Impressum (PUBLIC - für öffentliche Seiten) ─────
    private String legalName;                 // Offizieller Firmenname
    private String legalForm;                 // GmbH, UG, Einzelunternehmen, ...
    private String authorizedRepresentative;  // Vertretungsberechtigte Person
    private String commercialRegister;        // Registergericht
    private String registerNumber;            // Registernummer
    private String vatId;                     // USt-IdNr. (DE123...)
    private Boolean imprintComplete;          // Ist Impressum vollständig?


    // ─── Legal Texts (store-specific, PUBLIC) ──────────────────────
    /** AGB des Stores (öffentlich) - NUR wenn Status = PUBLISHED */
    private String termsAndConditionsText;
    /** Datenschutzerklärung des Stores (öffentlich) - NUR wenn Status = PUBLISHED */
    private String privacyPolicyText;
    /** Rückgaberecht / Widerrufsbelehrung (öffentlich) - NUR wenn Status = PUBLISHED */
    private String returnPolicyText;
    /** Versandinformationen / Lieferbedingungen (öffentlich) - NUR wenn Status = PUBLISHED */
    private String shippingPolicyText;
}
