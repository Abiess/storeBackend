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
     * @param orderId Order ID
     * @param currentUser Aktuell eingeloggter User
     * @return DHL Validation Response
     */
    public DhlShipmentResponse validateShipment(Long orderId, User currentUser) {
        // 1. Security: Store Owner Check
        Order order = dhlSecurityHelper.checkOrderOwnership(orderId, currentUser);
        
        log.info("🔍 Validating DHL shipment for order {}", orderId);
        
        // 2. Build DHL Request
        DhlShipmentRequest request = buildShipmentRequest(order, false);
        
        // 3. Call DHL Validate API
        DhlShipmentResponse response = dhlShippingClient.validateShipment(request);
        
        log.info("✅ DHL validation completed for order {}", orderId);
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
        
        // Build Request
        return DhlShipmentRequest.builder()
            .profile(dhlProperties.getDefaultProfile())
            .shipment(shipment)
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
            
            return DhlShipmentRequest.Address.builder()
                .name1(dhlProperties.getSandboxShipperName())
                .addressStreet(dhlProperties.getSandboxShipperStreet())
                .addressHouse(dhlProperties.getSandboxShipperHouseNumber())
                .postalCode(dhlProperties.getSandboxShipperPostalCode())
                .city(dhlProperties.getSandboxShipperCity())
                .country(DhlShipmentRequest.Country.builder()
                    .countryISOCode(dhlProperties.getSandboxShipperCountry())
                    .build())
                .contactName(store.getOwner().getName())
                .email(store.getOwner().getEmail())
                .build();
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
        
        return DhlShipmentRequest.Address.builder()
            .name1(fullName)
            .name2(shippingAddress.getAddress2()) // Optional: Firma/Zusatz
            .addressStreet(street)
            .addressHouse(houseNumber)
            .additionalAddressInformation1(shippingAddress.getAddress2())
            .postalCode(shippingAddress.getPostalCode())
            .city(shippingAddress.getCity())
            .country(DhlShipmentRequest.Country.builder()
                .countryISOCode(shippingAddress.getCountry()) // "DE", "AT", etc.
                .build())
            .contactName(fullName)
            .email(order.getCustomerEmail())
            .phone(shippingAddress.getPhone())
            .build();
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
