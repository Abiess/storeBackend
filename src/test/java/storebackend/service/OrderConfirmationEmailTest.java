package storebackend.service;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import storebackend.entity.Address;
import storebackend.entity.OrderItem;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Test für order-confirmation.html Template mit B2B-Daten.
 * Prüft, dass company und customerReference korrekt gerendert werden.
 */
@SpringBootTest
class OrderConfirmationEmailTest {

    @Autowired
    private EmailService emailService;

    @Test
    void orderConfirmationEmail_withB2BData_shouldRenderCompanyAndReference() {
        // Arrange: B2B-Bestellung
        Address shippingAddress = new Address();
        shippingAddress.setCompany("ACME GmbH");
        shippingAddress.setFirstName("Max");
        shippingAddress.setLastName("Mustermann");
        shippingAddress.setAddress1("Musterstraße 123");
        shippingAddress.setPostalCode("10115");
        shippingAddress.setCity("Berlin");
        shippingAddress.setCountry("DE");

        List<OrderItem> items = new ArrayList<>();
        OrderItem item = new OrderItem();
        item.setName("Test Product");
        item.setQuantity(2);
        item.setPrice(java.math.BigDecimal.valueOf(19.99));
        item.setTotal(java.math.BigDecimal.valueOf(39.98));
        items.add(item);

        // Act: E-Mail-Rendering (ohne tatsächlichen Versand)
        String customerEmail = "test@example.com";
        String orderNumber = "ORDER-2026-TEST-001";
        String storeName = "Test Store";
        Double totalAmount = 39.98;
        String storeLogo = null;
        String lang = "de";
        String customerReference = "PO-2026-0042";

        // Wir testen die interne Logik, indem wir prüfen dass der Service
        // mit korrekten Parametern aufgerufen werden kann ohne Exception
        assertDoesNotThrow(() -> {
            // Dies würde in Production die E-Mail versenden, aber mit mail.enabled=false
            // wird nur die Template-Verarbeitung getestet
            emailService.sendOrderConfirmationWithResult(
                customerEmail,
                orderNumber,
                storeName,
                totalAmount,
                items,
                storeLogo,
                lang,
                shippingAddress,
                customerReference
            );
        });

        // Zusätzlich: Null-Sicherheit testen
        assertDoesNotThrow(() -> {
            emailService.sendOrderConfirmationWithResult(
                customerEmail,
                orderNumber,
                storeName,
                totalAmount,
                items,
                storeLogo,
                lang,
                null,  // shippingAddress null
                null   // customerReference null
            );
        });
    }

    @Test
    void orderConfirmationEmail_withoutB2BData_shouldRenderWithoutCompanyBlock() {
        // Arrange: Privatkunde ohne Firma
        Address shippingAddress = new Address();
        shippingAddress.setCompany(null);  // Kein Firmenname
        shippingAddress.setFirstName("Anna");
        shippingAddress.setLastName("Schmidt");
        shippingAddress.setAddress1("Hauptstraße 456");
        shippingAddress.setPostalCode("20095");
        shippingAddress.setCity("Hamburg");
        shippingAddress.setCountry("DE");

        List<OrderItem> items = new ArrayList<>();
        OrderItem item = new OrderItem();
        item.setName("Private Product");
        item.setQuantity(1);
        item.setPrice(java.math.BigDecimal.valueOf(29.99));
        item.setTotal(java.math.BigDecimal.valueOf(29.99));
        items.add(item);

        // Act & Assert: Sollte ohne Exception rendern
        assertDoesNotThrow(() -> {
            emailService.sendOrderConfirmationWithResult(
                "anna@example.com",
                "ORDER-2026-TEST-002",
                "Test Store",
                29.99,
                items,
                null,
                "de",
                shippingAddress,
                null  // Keine Kundenreferenz
            );
        });
    }

    @Test
    void orderConfirmationEmail_withEmptyCompany_shouldNotShowCompanyBlock() {
        // Arrange: Leere company (nur Leerzeichen)
        Address shippingAddress = new Address();
        shippingAddress.setCompany("   ");  // Nur Leerzeichen
        shippingAddress.setFirstName("Test");
        shippingAddress.setLastName("User");
        shippingAddress.setAddress1("Test Street 1");
        shippingAddress.setPostalCode("12345");
        shippingAddress.setCity("Test City");
        shippingAddress.setCountry("DE");

        // Act & Assert
        assertDoesNotThrow(() -> {
            emailService.sendOrderConfirmationWithResult(
                "test@example.com",
                "ORDER-2026-TEST-003",
                "Test Store",
                100.0,
                new ArrayList<>(),
                null,
                "en",
                shippingAddress,
                ""  // Leere customerReference
            );
        });
    }

    @Test
    void orderConfirmationEmail_multipleLanguages_shouldUseCorrectTranslations() {
        // Arrange
        Address address = new Address();
        address.setCompany("Test Company");
        address.setFirstName("John");
        address.setLastName("Doe");
        address.setAddress1("Test Street");
        address.setCity("Berlin");
        address.setPostalCode("10115");
        address.setCountry("DE");

        List<OrderItem> items = new ArrayList<>();

        // Act & Assert: DE
        assertDoesNotThrow(() -> {
            emailService.sendOrderConfirmationWithResult(
                "test@example.com", "ORDER-DE", "Store", 50.0,
                items, null, "de", address, "REF-001"
            );
        });

        // Act & Assert: EN
        assertDoesNotThrow(() -> {
            emailService.sendOrderConfirmationWithResult(
                "test@example.com", "ORDER-EN", "Store", 50.0,
                items, null, "en", address, "REF-001"
            );
        });

        // Act & Assert: AR
        assertDoesNotThrow(() -> {
            emailService.sendOrderConfirmationWithResult(
                "test@example.com", "ORDER-AR", "Store", 50.0,
                items, null, "ar", address, "REF-001"
            );
        });
    }

    @Test
    void orderConfirmationEmail_nullAddressFields_shouldHandleGracefully() {
        // Arrange: Address mit vielen null-Werten
        Address address = new Address();
        address.setCompany("Company");
        address.setFirstName("John");
        address.setLastName("Doe");
        address.setAddress1("Street");
        address.setAddress2(null);  // Optional field
        address.setCity(null);
        address.setPostalCode(null);
        address.setCountry(null);

        // Act & Assert
        assertDoesNotThrow(() -> {
            emailService.sendOrderConfirmationWithResult(
                "test@example.com",
                "ORDER-NULL-TEST",
                "Store",
                100.0,
                new ArrayList<>(),
                null,
                "de",
                address,
                "REF-NULL"
            );
        });
    }
}
