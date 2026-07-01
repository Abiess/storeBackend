package storebackend.service.dhl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import storebackend.config.DhlProperties;
import storebackend.dto.dhl.DhlShipmentRequest;
import storebackend.dto.dhl.DhlShipmentResponse;
import storebackend.entity.Address;
import storebackend.entity.Order;
import storebackend.entity.Store;
import storebackend.entity.User;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * DHL Label Service
 * Business Logic für DHL Shipment Validation und Label Creation
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DhlLabelService {
    
    private final DhlProperties dhlProperties;
    private final DhlSecurityHelper dhlSecurityHelper;
    private final DhlShippingClient dhlShippingClient;
    
    /**
     * Validate Shipment (ohne Label zu erstellen)
     * 
     * @param order Order Entity (mit eager-loaded Store)
     * @param currentUser Aktuell eingeloggter User
     * @return DHL Validation Response
     */
    public DhlShipmentResponse validateShipment(Order order, User currentUser) {
        // 1. Security: Store Owner Check
        dhlSecurityHelper.checkOrderOwnership(order, currentUser);
        
        log.info("🔍 Validating DHL shipment for order {}", order.getId());
        
        // 2. Build DHL Request
        DhlShipmentRequest request = buildShipmentRequest(order, false);
        
        // 3. Call DHL Validate API
        DhlShipmentResponse response = dhlShippingClient.validateShipment(request);
        
        log.info("✅ DHL validation completed for order {}", order.getId());
        return response;
    }
    
    /**
     * Create Shipping Label
     * Erstellt DHL Label und gibt Base64 PDF + Tracking zurück
     * 
     * @param order Order Entity (mit eager-loaded Store)
     * @param currentUser Aktuell eingeloggter User
     * @return DHL Label Response mit PDF
     */
    public DhlShipmentResponse createLabel(Order order, User currentUser) {
        // 1. Security: Store Owner Check
        dhlSecurityHelper.checkOrderOwnership(order, currentUser);
        
        // 2. Validation: PICKUP Orders dürfen kein DHL Label bekommen
        if ("PICKUP".equals(order.getDeliveryType())) {
            throw new IllegalStateException(
                "DHL shipping labels are not available for pickup orders. " +
                "This order is configured for customer pickup (deliveryType=PICKUP)."
            );
        }
        
        log.info("📦 Creating DHL label for order {}", order.getId());
        
        // 3. Build DHL Request (mit Label-Erstellung)
        DhlShipmentRequest request = buildShipmentRequest(order, true);
        
        // 4. Call DHL Create Label API
        DhlShipmentResponse response = dhlShippingClient.createLabel(request);
        
        log.info("✅ DHL label created for order {} → Shipment No: {}", 
            order.getId(), response.getShipmentNo());
        
        return response;
    }
    
    /**
     * Build DHL Shipment Request from Order
     */
    private DhlShipmentRequest buildShipmentRequest(Order order, boolean createLabel) {
        Store store = order.getStore();
        
        // Shipper = Store (Absender)
        DhlShipmentRequest.Address shipper = buildShipperAddress(store);
        
        // Consignee = Customer (Empfänger)
        DhlShipmentRequest.Address consignee = buildConsigneeAddress(order);
        
        // Shipment Details (Gewicht, Dimensionen)
        DhlShipmentRequest.Details details = buildShipmentDetails(order);
        
        // Reference Number (für Tracking)
        String refNo = "MARKTMA-" + order.getId();
        
        // MINIMAL-MODE: Kein shipDate! (funktionierender cURL hatte das nicht)
        // Build Shipment
        DhlShipmentRequest.Shipment shipment = DhlShipmentRequest.Shipment.builder()
            .product(dhlProperties.getDefaultProduct())
            .billingNumber(dhlProperties.getDefaultBillingNumber())
            .refNo(refNo)
            .shipper(shipper)
            .consignee(consignee)
            .details(details)
            .build();
        
        // Build Request (shipments als List/Array!)
        return DhlShipmentRequest.builder()
            .profile(dhlProperties.getDefaultProfile())
            .shipments(List.of(shipment))  // ← Als Array!
            .build();
    }
    
    /**
     * Build Shipper Address (Store als Absender)
     * 1. Wenn Store shipping_address_* Felder gesetzt → diese nutzen
     * 2. Sonst Sandbox Fallback (nur für Dev/Testing)
     * 3. Production: Error wenn Store keine Adresse hat
     */
    private DhlShipmentRequest.Address buildShipperAddress(Store store) {
        // Check: Hat Store vollständige Shipping Address?
        boolean hasShippingAddress = 
            store.getShippingAddressStreet() != null && !store.getShippingAddressStreet().isBlank() &&
            store.getShippingAddressHouseNumber() != null && !store.getShippingAddressHouseNumber().isBlank() &&
            store.getShippingAddressPostalCode() != null && !store.getShippingAddressPostalCode().isBlank() &&
            store.getShippingAddressCity() != null && !store.getShippingAddressCity().isBlank() &&
            store.getShippingAddressCountry() != null && !store.getShippingAddressCountry().isBlank();
        
        if (hasShippingAddress) {
            // ✅ Store hat vollständige Shipping Address → nutzen
            log.info("📦 Using Store shipping address for store {} ({})", 
                store.getId(), store.getName());
            
            return DhlShipmentRequest.Address.builder()
                .name1(store.getName())
                .addressStreet(store.getShippingAddressStreet())
                .addressHouse(store.getShippingAddressHouseNumber())
                .postalCode(store.getShippingAddressPostalCode())
                .city(store.getShippingAddressCity())
                .country(mapCountryCode(store.getShippingAddressCountry()))
                .email(store.getShippingAddressEmail() != null && !store.getShippingAddressEmail().isBlank()
                    ? store.getShippingAddressEmail()
                    : store.getContactEmail())
                .build();
        }
        
        // Sandbox Fallback (nur für Dev/Testing)
        if (dhlProperties.isSandbox()) {
            log.warn("⚠️ Store {} has no shipping address configured! Using sandbox fallback. " +
                    "This is only allowed in sandbox mode. " +
                    "Production requires store.shippingAddress* fields to be set.", 
                store.getId());
            
            // MINIMAL: Nur die Felder aus dem funktionierenden cURL-Test
            return DhlShipmentRequest.Address.builder()
                .name1(dhlProperties.getSandboxShipperName())
                .addressStreet(dhlProperties.getSandboxShipperStreet())
                .addressHouse(dhlProperties.getSandboxShipperHouseNumber())
                .postalCode(dhlProperties.getSandboxShipperPostalCode())
                .city(dhlProperties.getSandboxShipperCity())
                .country(mapCountryCode(dhlProperties.getSandboxShipperCountry()))
                .email(store.getOwner() != null && store.getOwner().getEmail() != null 
                    ? store.getOwner().getEmail() 
                    : "test@example.com")
                .build();
        }
        
        // Production: Shipping Address ist Pflicht!
        throw new IllegalStateException(
            "Store shipping address not configured. " +
            "Please configure shipping address in Store Settings (Store ID: " + store.getId() + "). " +
            "Required fields: street, houseNumber, postalCode, city, country, email."
        );
    }
    
    /**
     * Build Consignee Address (Customer als Empfänger)
     */
    private DhlShipmentRequest.Address buildConsigneeAddress(Order order) {
        Address shippingAddress = order.getShippingAddress();
        
        if (shippingAddress == null) {
            throw new IllegalStateException("Order has no shipping address: " + order.getId());
        }
        
        // Parse street and house number
        // WICHTIG: DHL erwartet getrennte Felder für Straße und Hausnummer!
        String address1 = shippingAddress.getAddress1();
        String street = address1;
        String houseNumber = "";
        
        // Simple Parsing: Letztes Wort als Hausnummer (wenn es Ziffern enthält)
        if (address1 != null && !address1.isBlank()) {
            String[] parts = address1.trim().split("\\s+");
            if (parts.length > 1) {
                String lastPart = parts[parts.length - 1];
                // Wenn letzter Teil Ziffer enthält → Hausnummer
                if (lastPart.matches(".*\\d+.*")) {
                    houseNumber = lastPart;
                    street = address1.substring(0, address1.lastIndexOf(lastPart)).trim();
                }
            }
        }
        
        // Fallback wenn Parsing fehlschlägt
        if (street.isBlank()) {
            street = address1 != null ? address1 : "Unbekannt";
        }
        if (houseNumber.isBlank()) {
            houseNumber = "1"; // Default
        }
        
        String fullName = (shippingAddress.getFirstName() + " " + shippingAddress.getLastName()).trim();
        
        // MINIMAL-MODE: Nur die Felder aus dem funktionierenden cURL-Test
        // Keine optionalen Felder wie name2, contactName, phone!
        DhlShipmentRequest.Address.AddressBuilder builder = DhlShipmentRequest.Address.builder()
            .name1(fullName)
            .addressStreet(street)
            .addressHouse(houseNumber)
            .postalCode(shippingAddress.getPostalCode())
            .city(shippingAddress.getCity())
            .country(mapCountryCode(shippingAddress.getCountry()));
        
        // Email: Nur wenn vorhanden
        if (order.getCustomerEmail() != null && !order.getCustomerEmail().isBlank()) {
            builder.email(order.getCustomerEmail());
        }
        
        return builder.build();
    }
    
    /**
     * Normalisiert Telefonnummer für DHL (Format: +49... oder +43...)
     * DHL mag keine ungültigen Telefonnummern - lieber weglassen als falsch!
     */
    private String normalizePhoneNumber(String phone) {
        if (phone == null || phone.isBlank()) {
            return null;
        }
        
        // Entferne alle Leerzeichen, Klammern, Bindestriche
        String cleaned = phone.replaceAll("[\\s\\-\\(\\)]", "");
        
        // Wenn es mit 0 startet → +49 (Deutschland) voranstellen
        if (cleaned.startsWith("0")) {
            cleaned = "+49" + cleaned.substring(1);
        }
        
        // Prüfe ob es mit + startet und mindestens 10 Ziffern hat
        if (cleaned.startsWith("+") && cleaned.matches("\\+\\d{10,15}")) {
            return cleaned;
        }
        
        // Ungültiges Format → nicht senden (besser als Fehler)
        log.warn("⚠️ Invalid phone number format, omitting from DHL request: {}", phone);
        return null;
    }
    
    /**
     * Build Shipment Details (Gewicht, Dimensionen)
     * Verwendet Default-Werte aus Properties
     */
    private DhlShipmentRequest.Details buildShipmentDetails(Order order) {
        // TODO: Order/Product Entity hat noch keine weight/dimensions Felder!
        // Für jetzt: Default-Werte aus Properties verwenden
        
        // Gewicht: Properties speichert in Gramm, DHL erwartet kg als Integer
        int weightGrams = dhlProperties.getDefaultWeightGrams();
        int weightKg = Math.max(1, weightGrams / 1000); // Gramm → kg, mindestens 1
        
        DhlShipmentRequest.Weight weight = DhlShipmentRequest.Weight.builder()
            .uom("kg") // ← WICHTIG: DHL Sandbox erwartet "kg", nicht "g"!
            .value(weightKg) // DHL erwartet Integer für kg
            .build();
        
        DhlShipmentRequest.Dimensions dimensions = DhlShipmentRequest.Dimensions.builder()
            .uom("mm") // Millimeter
            .length(dhlProperties.getDefaultLengthMm())
            .width(dhlProperties.getDefaultWidthMm())
            .height(dhlProperties.getDefaultHeightMm())
            .build();
        
        return DhlShipmentRequest.Details.builder()
            .weight(weight)
            .dim(dimensions)
            .build();
    }
    
    /**
     * Map country codes to DHL format
     * DHL erwartet ISO 3166-1 alpha-3 Codes (DEU, AUT, CHE)
     * UI speichert ISO 3166-1 alpha-2 (DE, AT, CH)
     */
    private String mapCountryCode(String countryCode) {
        if (countryCode == null || countryCode.isBlank()) {
            return "DEU"; // Default Deutschland
        }
        
        // Map alpha-2 → alpha-3
        return switch (countryCode.toUpperCase()) {
            case "DE" -> "DEU";
            case "AT" -> "AUT";
            case "CH" -> "CHE";
            case "FR" -> "FRA";
            case "NL" -> "NLD";
            case "BE" -> "BEL";
            case "LU" -> "LUX";
            case "IT" -> "ITA";
            case "ES" -> "ESP";
            case "PL" -> "POL";
            case "CZ" -> "CZE";
            case "DK" -> "DNK";
            case "SE" -> "SWE";
            case "NO" -> "NOR";
            default -> {
                log.warn("⚠️ Unknown country code '{}', using DEU as fallback", countryCode);
                yield "DEU";
            }
        };
    }
}
