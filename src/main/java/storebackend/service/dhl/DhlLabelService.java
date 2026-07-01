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
        
        log.info("📦 Creating DHL label for order {}", order.getId());
        
        // 2. Build DHL Request (mit Label-Erstellung)
        DhlShipmentRequest request = buildShipmentRequest(order, true);
        
        // 3. Call DHL Create Label API
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
        
        // Ship Date (heute oder morgen)
        String shipDate = LocalDate.now().plusDays(1).format(DateTimeFormatter.ISO_LOCAL_DATE);
        
        // Reference Number (für Tracking)
        String refNo = "MARKTMA-" + order.getId();
        
        // Build Shipment
        DhlShipmentRequest.Shipment shipment = DhlShipmentRequest.Shipment.builder()
            .product(dhlProperties.getDefaultProduct())
            .billingNumber(dhlProperties.getDefaultBillingNumber())
            .refNo(refNo)
            .shipDate(shipDate)
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
     * Falls Store keine Adresse hat → Sandbox Fallback
     */
    private DhlShipmentRequest.Address buildShipperAddress(Store store) {
        // TODO: Store Entity hat noch keine Address-Felder!
        // Für jetzt: Sandbox Fallback verwenden
        
        if (dhlProperties.isSandbox()) {
            log.warn("⚠️ Using sandbox shipper address for store {} (no real address configured)", 
                store.getId());
            
            DhlShipmentRequest.Address.AddressBuilder builder = DhlShipmentRequest.Address.builder()
                .name1(dhlProperties.getSandboxShipperName())
                .addressStreet(dhlProperties.getSandboxShipperStreet())
                .addressHouse(dhlProperties.getSandboxShipperHouseNumber())
                .postalCode(dhlProperties.getSandboxShipperPostalCode())
                .city(dhlProperties.getSandboxShipperCity())
                .country(DhlShipmentRequest.Country.builder()
                    .countryISOCode(dhlProperties.getSandboxShipperCountry())
                    .build());
            
            // Optional: contactName nur wenn vorhanden
            if (store.getOwner() != null && store.getOwner().getName() != null) {
                builder.contactName(store.getOwner().getName());
            }
            
            // Optional: email nur wenn vorhanden
            if (store.getOwner() != null && store.getOwner().getEmail() != null) {
                builder.email(store.getOwner().getEmail());
            }
            
            return builder.build();
        }
        
        // Production: Echte Store-Adresse erforderlich
        throw new IllegalStateException(
            "Store address not configured. Please add address fields to Store entity " +
            "or enable sandbox mode for testing."
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
        
        // DHL Builder - NUR nicht-null Werte setzen!
        DhlShipmentRequest.Address.AddressBuilder builder = DhlShipmentRequest.Address.builder()
            .name1(fullName)
            .addressStreet(street)
            .addressHouse(houseNumber)
            .postalCode(shippingAddress.getPostalCode())
            .city(shippingAddress.getCity())
            .country(DhlShipmentRequest.Country.builder()
                .countryISOCode(shippingAddress.getCountry()) // "DE", "AT", etc.
                .build())
            .contactName(fullName);
        
        // Optional: name2 (nur wenn vorhanden)
        if (shippingAddress.getAddress2() != null && !shippingAddress.getAddress2().isBlank()) {
            builder.name2(shippingAddress.getAddress2());
        }
        
        // Optional: Email (nur wenn vorhanden)
        if (order.getCustomerEmail() != null && !order.getCustomerEmail().isBlank()) {
            builder.email(order.getCustomerEmail());
        }
        
        // Optional: Phone (nur wenn vorhanden UND gültiges Format)
        if (shippingAddress.getPhone() != null && !shippingAddress.getPhone().isBlank()) {
            String phone = normalizePhoneNumber(shippingAddress.getPhone());
            if (phone != null) {
                builder.phone(phone);
            }
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
        
        DhlShipmentRequest.Weight weight = DhlShipmentRequest.Weight.builder()
            .uom("g") // Gramm
            .value(dhlProperties.getDefaultWeightGrams())
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
}
