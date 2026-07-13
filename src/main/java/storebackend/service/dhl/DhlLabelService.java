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
import storebackend.util.DhlBillingNumberUtil;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * DHL Label Service
 * Business Logic für DHL Shipment Validation und Label Creation
 * 
 * Multi-Store Support:
 * - Nutzt DhlSettingsResolver für SANDBOX | STORE | PLATFORM Credentials
 * - Config-aware API Calls über DhlShippingClient
 * - Idempotenz: Verhindert doppelte Label-Erstellung
 * - PICKUP Orders werden blockiert
 * 
 * Security:
 * - Keine Secrets/Tokens im Log
 * - config.getLoggingInfo() für Audit
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DhlLabelService {
    
    private final DhlProperties dhlProperties;
    private final DhlSecurityHelper dhlSecurityHelper;
    private final DhlShippingClient dhlShippingClient;
    private final DhlSettingsResolver dhlSettingsResolver;
    
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
        
        // 2. Validation: PICKUP Orders dürfen kein DHL Label bekommen
        if ("PICKUP".equals(order.getDeliveryType())) {
            throw new IllegalStateException(
                "DHL shipping labels are not available for pickup orders. " +
                "This order is configured for customer pickup (deliveryType=PICKUP). " +
                "messageKey: shipping.dhl.pickupNotAllowed"
            );
        }
        
        // 3. Country Guard: V01PAK nur für Deutschland
        validateCountryForProduct(order);
        
        // 4. Resolve DHL Config (SANDBOX | STORE | PLATFORM)
        DhlSettingsResolver.ResolvedDhlConfig config = dhlSettingsResolver.resolve(order.getStore().getId());
        
        log.info("🔍 Validating DHL shipment: orderId={}, credentialsSource={}, {}",
            order.getId(),
            config.getCredentialsSource(),
            config.getLoggingInfo()
        );
        
        // 5. Build DHL Request
        DhlShipmentRequest request = buildShipmentRequest(order, config, false);
        
        // DEBUG: Sichere Request-Daten loggen (KEINE Secrets)
        logSafeDhlRequestData(order, config, request);
        
        // 6. Call DHL Validate API (config-aware)
        DhlShipmentResponse response = dhlShippingClient.validateShipment(config, request);
        
        // 7. Enrich Response mit Preview-Daten (sichere Daten für UI Dialog)
        enrichPreviewData(response, order, config);
        
        log.info("✅ DHL validation completed for order {}", order.getId());
        return response;
    }
    
    /**
     * Enriches Response mit sicheren Preview-Daten für UI Dialog
     * KEINE Secrets: kein label.b64, kein Password, kein Client Secret
     */
    private void enrichPreviewData(DhlShipmentResponse response, Order order, DhlSettingsResolver.ResolvedDhlConfig config) {
        // Order Number
        response.setOrderNumber(order.getOrderNumber() != null ? order.getOrderNumber() : "#" + order.getId());
        
        // Consignee (Empfänger)
        Address shipping = order.getShippingAddress();
        if (shipping != null) {
            response.setConsigneeName(
                (shipping.getFirstName() + " " + shipping.getLastName()).trim()
            );
            response.setConsigneeAddress(String.format(
                "%s, %s %s, %s",
                shipping.getAddress1() != null ? shipping.getAddress1() : "",
                shipping.getPostalCode() != null ? shipping.getPostalCode() : "",
                shipping.getCity() != null ? shipping.getCity() : "",
                shipping.getCountry() != null ? shipping.getCountry() : ""
            ));
        }
        
        // Shipper (Absender) - aus config-Feldern
        response.setShipperName(config.getShipperName());
        response.setShipperAddress(String.format(
            "%s %s, %s %s, %s",
            config.getShipperStreet() != null ? config.getShipperStreet() : "",
            config.getShipperHouseNumber() != null ? config.getShipperHouseNumber() : "",
            config.getShipperPostalCode() != null ? config.getShipperPostalCode() : "",
            config.getShipperCity() != null ? config.getShipperCity() : "",
            config.getShipperCountry() != null ? config.getShipperCountry() : ""
        ));
        
        // Product Label
        response.setProductLabel("DHL Paket National (V01PAK)");
        
        // Billing Number maskiert
        response.setBillingNumberMasked(config.getMaskedBillingNumber());
        
        // Weight & Dimensions
        int weightGrams = config.getDefaultWeightGrams();
        double weightKg = weightGrams / 1000.0;
        response.setWeight(String.format("%.2f kg", weightKg));
        
        response.setDimensions(String.format(
            "%d x %d x %d mm",
            config.getDefaultLengthMm(),
            config.getDefaultWidthMm(),
            config.getDefaultHeightMm()
        ));
        
        // Environment & Credentials Source
        response.setEnvironment(config.getEnvironment().toString());
        response.setCredentialsSource(config.getCredentialsSource());
    }
    
    /**
     * Create Shipping Label
     * Erstellt DHL Label und gibt Base64 PDF + Tracking zurück
     * 
     * Idempotenz: Wenn Order bereits ein Label hat, wird keine neue Sendung erstellt.
     * PICKUP: Abholungen werden blockiert (keine Versandlabel nötig).
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
                "This order is configured for customer pickup (deliveryType=PICKUP). " +
                "messageKey: shipping.dhl.pickupNotAllowed"
            );
        }
        
        // 3. Country Guard: V01PAK nur für Deutschland
        validateCountryForProduct(order);
        
        // 4. Idempotenz: Prüfe ob Order bereits ein DHL Label hat
        if (order.getDhlShipmentNo() != null && !order.getDhlShipmentNo().isBlank()) {
            log.info("⚠️ Order {} already has DHL Shipment No: {} - returning existing data (no new label created)",
                order.getId(),
                order.getDhlShipmentNo()
            );
            
            // Baue Response aus vorhandenen Order-Daten
            // WICHTIG: Kein neues DHL API Call, keine Kosten
            DhlShipmentResponse existingResponse = new DhlShipmentResponse();
            
            // Baue items Array mit vorhandenen Daten
            DhlShipmentResponse.ShipmentItem item = new DhlShipmentResponse.ShipmentItem();
            item.setShipmentNo(order.getDhlShipmentNo());
            item.setRoutingCode(order.getDhlRoutingCode());
            item.setUuid(order.getDhlUuid());
            
            existingResponse.setItems(List.of(item));
            
            // Label PDF ist bereits in MinIO gespeichert
            if (order.getDhlLabelUrl() != null && !order.getDhlLabelUrl().isBlank()) {
                // WICHTIG: label.b64 NICHT zurückgeben (zu groß, nicht mehr vorhanden)
                // Frontend nutzt dhlLabelUrl für Download
                log.info("   Existing label URL: {}", order.getDhlLabelUrl());
            }
            
            return existingResponse;
        }
        
        // 4. Resolve DHL Config (SANDBOX | STORE | PLATFORM)
        DhlSettingsResolver.ResolvedDhlConfig config = dhlSettingsResolver.resolve(order.getStore().getId());
        
        log.info("📦 Creating DHL label: orderId={}, credentialsSource={}, {}",
            order.getId(),
            config.getCredentialsSource(),
            config.getLoggingInfo()
        );
        
        // 5. Build DHL Request (mit Label-Erstellung)
        DhlShipmentRequest request = buildShipmentRequest(order, config, true);
        
        // 6. Call DHL Create Label API (config-aware)
        // WICHTIG: Dies erzeugt ein echtes DHL Label und verursacht Kosten!
        DhlShipmentResponse response = dhlShippingClient.createLabel(config, request);
        
        log.info("✅ DHL label created: orderId={}, shipmentNo={}, routingCode={}, uuid={}",
            order.getId(),
            response.getShipmentNo(),
            response.getRoutingCode(),
            response.getUuid()
        );
        // WICHTIG: label.b64 NICHT loggen (zu groß, sensibel)
        
        return response;
    }
    
    /**
     * Build DHL Shipment Request from Order
     * Nutzt resolved config (store-specific oder sandbox fallback)
     */
    private DhlShipmentRequest buildShipmentRequest(
        Order order, 
        DhlSettingsResolver.ResolvedDhlConfig config, 
        boolean createLabel
    ) {
        Store store = order.getStore();
        
        // Billing Number normalisieren und validieren
        // WICHTIG: DHL erwartet exakt 14 Ziffern ohne Leerzeichen/Sonderzeichen!
        String rawBillingNumber = config.getBillingNumber();
        String normalizedBillingNumber = DhlBillingNumberUtil.normalizeAndValidate(rawBillingNumber);
        
        log.debug("DHL billing number normalized: {} → {}",
            DhlBillingNumberUtil.maskForLogging(rawBillingNumber),
            DhlBillingNumberUtil.maskForLogging(normalizedBillingNumber)
        );
        
        // Shipper = Store (Absender) - nutzt config statt direkt properties
        DhlShipmentRequest.Address shipper = buildShipperAddress(store, config);
        
        // Consignee = Customer (Empfänger)
        DhlShipmentRequest.Address consignee = buildConsigneeAddress(order);
        
        // Shipment Details (Gewicht, Dimensionen)
        DhlShipmentRequest.Details details = buildShipmentDetails(config);
        
        // Reference Number (für Tracking)
        String refNo = "MARKTMA-" + order.getId();
        
        // Build Shipment mit resolved config
        DhlShipmentRequest.Shipment shipment = DhlShipmentRequest.Shipment.builder()
            .product(dhlProperties.getDefaultProduct()) // V01PAK = DHL Paket National
            .billingNumber(normalizedBillingNumber) // ✅ Normalisiert und validiert!
            .refNo(refNo)
            .shipper(shipper)
            .consignee(consignee)
            .details(details)
            .build();
        
        // Build Request (shipments als List/Array!)
        return DhlShipmentRequest.builder()
            .profile(dhlProperties.getDefaultProfile())
            .shipments(List.of(shipment))
            .build();
    }
    
    /**
     * Build Shipper Address (Store als Absender)
     * Nutzt resolved config (store-specific oder sandbox fallback)
     */
    private DhlShipmentRequest.Address buildShipperAddress(
        Store store,
        DhlSettingsResolver.ResolvedDhlConfig config
    ) {
        // Nutze resolved shipper address aus config
        return DhlShipmentRequest.Address.builder()
            .name1(config.getShipperName() != null ? config.getShipperName() : store.getName())
            .addressStreet(config.getShipperStreet())
            .addressHouse(config.getShipperHouseNumber())
            .postalCode(config.getShipperPostalCode())
            .city(config.getShipperCity())
            .country(mapCountryCode(config.getShipperCountry()))
            .email(config.getShipperEmail() != null && !config.getShipperEmail().isBlank()
                ? config.getShipperEmail()
                : (store.getContactEmail() != null ? store.getContactEmail() : ""))
            .build();
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
     * Nutzt config defaults
     */
    private DhlShipmentRequest.Details buildShipmentDetails(DhlSettingsResolver.ResolvedDhlConfig config) {
        // TODO: Order/Product Entity hat noch keine weight/dimensions Felder!
        // Für jetzt: Default-Werte aus config verwenden
        
        // Gewicht: Config speichert in Gramm, DHL erwartet kg als Integer
        int weightGrams = config.getDefaultWeightGrams();
        int weightKg = Math.max(1, weightGrams / 1000); // Gramm → kg, mindestens 1
        
        DhlShipmentRequest.Weight weight = DhlShipmentRequest.Weight.builder()
            .uom("kg") // ← WICHTIG: DHL erwartet "kg", nicht "g"!
            .value(weightKg) // DHL erwartet Integer für kg
            .build();
        
        DhlShipmentRequest.Dimensions dimensions = DhlShipmentRequest.Dimensions.builder()
            .uom("mm") // Millimeter
            .length(config.getDefaultLengthMm())
            .width(config.getDefaultWidthMm())
            .height(config.getDefaultHeightMm())
            .build();
        
        return DhlShipmentRequest.Details.builder()
            .weight(weight)
            .dim(dimensions)
            .build();
    }
    
    /**
     * Map country codes to DHL format
     * DHL erwartet ISO 3166-1 alpha-3 Codes (DEU, AUT, CHE)
     * UI speichert ISO 3166-1 alpha-2 (DE, AT, CH) oder Ländernamen
     */
    private String mapCountryCode(String countryCode) {
        if (countryCode == null || countryCode.isBlank()) {
            return "DEU"; // Default Deutschland
        }
        
        // Normalisieren: trim + uppercase
        String normalized = countryCode.trim().toUpperCase();
        
        // Map alpha-2 → alpha-3
        return switch (normalized) {
            // Deutschland
            case "DE", "DEU", "DEUTSCHLAND", "GERMANY" -> "DEU";
            
            // Europa
            case "AT", "AUT", "ÖSTERREICH", "AUSTRIA" -> "AUT";
            case "CH", "CHE", "SCHWEIZ", "SWITZERLAND" -> "CHE";
            case "FR", "FRA", "FRANKREICH", "FRANCE" -> "FRA";
            case "NL", "NLD", "NIEDERLANDE", "NETHERLANDS" -> "NLD";
            case "BE", "BEL", "BELGIEN", "BELGIUM" -> "BEL";
            case "LU", "LUX", "LUXEMBURG", "LUXEMBOURG" -> "LUX";
            case "IT", "ITA", "ITALIEN", "ITALY" -> "ITA";
            case "ES", "ESP", "SPANIEN", "SPAIN" -> "ESP";
            case "PL", "POL", "POLEN", "POLAND" -> "POL";
            case "CZ", "CZE", "TSCHECHIEN", "CZECH REPUBLIC" -> "CZE";
            case "DK", "DNK", "DÄNEMARK", "DENMARK" -> "DNK";
            case "SE", "SWE", "SCHWEDEN", "SWEDEN" -> "SWE";
            case "NO", "NOR", "NORWEGEN", "NORWAY" -> "NOR";
            
            // Afrika / MENA
            case "MA", "MAR", "MAROKKO", "MOROCCO" -> "MAR";
            case "DZ", "DZA", "ALGERIEN", "ALGERIA" -> "DZA";
            case "TN", "TUN", "TUNESIEN", "TUNISIA" -> "TUN";
            case "EG", "EGY", "ÄGYPTEN", "EGYPT" -> "EGY";
            
            default -> {
                log.warn("⚠️ Unknown country code '{}', using DEU as fallback", countryCode);
                yield "DEU";
            }
        };
    }
    
    /**
     * Validates Country for Product V01PAK (DHL Paket National)
     * V01PAK ist NUR für Sendungen innerhalb Deutschlands!
     * 
     * @throws IllegalStateException wenn Empfängerland nicht Deutschland ist
     */
    private void validateCountryForProduct(Order order) {
        Address shippingAddress = order.getShippingAddress();
        if (shippingAddress == null) {
            throw new IllegalStateException("Order has no shipping address: " + order.getId());
        }
        
        String country = mapCountryCode(shippingAddress.getCountry());
        
        // V01PAK = DHL Paket National → nur DEU
        if (!"DEU".equals(country)) {
            String countryDisplay = shippingAddress.getCountry() != null ? 
                shippingAddress.getCountry() : "unbekannt";
            
            log.warn("⚠️ DHL Paket National (V01PAK) nicht verfügbar für Land: {} (mapped: {})", 
                countryDisplay, country);
            
            throw new IllegalStateException(
                "DHL Paket National (V01PAK) ist nur für Sendungen innerhalb Deutschlands verfügbar. " +
                "Empfängerland: " + countryDisplay + ". " +
                "messageKey: shipping.dhl.countryNotSupportedForProduct"
            );
        }
    }
    
    /**
     * Loggt sichere DHL Request-Daten für Debugging (KEINE Secrets!)
     */
    private void logSafeDhlRequestData(Order order, DhlSettingsResolver.ResolvedDhlConfig config, 
                                       DhlShipmentRequest request) {
        Address shipping = order.getShippingAddress();
        
        log.info("🔍 DHL Request Data (SAFE): orderId={}, refNo={}, product={}, country={}, " +
                 "postalCode={}, city={}, weight={}kg, dimensions={}x{}x{}mm, billingNumber={}",
            order.getId(),
            request.getShipments() != null && !request.getShipments().isEmpty() ? 
                request.getShipments().get(0).getRefNo() : "N/A",
            request.getShipments() != null && !request.getShipments().isEmpty() ? 
                request.getShipments().get(0).getProduct() : "N/A",
            shipping != null ? shipping.getCountry() : "N/A",
            shipping != null ? shipping.getPostalCode() : "N/A",
            shipping != null ? shipping.getCity() : "N/A",
            request.getShipments() != null && !request.getShipments().isEmpty() &&
                request.getShipments().get(0).getDetails() != null &&
                request.getShipments().get(0).getDetails().getWeight() != null ?
                request.getShipments().get(0).getDetails().getWeight().getValue() : 0,
            request.getShipments() != null && !request.getShipments().isEmpty() &&
                request.getShipments().get(0).getDetails() != null &&
                request.getShipments().get(0).getDetails().getDim() != null ?
                request.getShipments().get(0).getDetails().getDim().getLength() : 0,
            request.getShipments() != null && !request.getShipments().isEmpty() &&
                request.getShipments().get(0).getDetails() != null &&
                request.getShipments().get(0).getDetails().getDim() != null ?
                request.getShipments().get(0).getDetails().getDim().getWidth() : 0,
            request.getShipments() != null && !request.getShipments().isEmpty() &&
                request.getShipments().get(0).getDetails() != null &&
                request.getShipments().get(0).getDetails().getDim() != null ?
                request.getShipments().get(0).getDetails().getDim().getHeight() : 0,
            config.getMaskedBillingNumber()
        );
    }
}
