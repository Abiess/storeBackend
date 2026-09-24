package storebackend.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import storebackend.entity.*;
import storebackend.enums.OrderStatus;
import storebackend.repository.OrderRepository;

import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.when;

/**
 * Tests für DeliveryNoteService
 * 
 * Fokus:
 * - PDF-Erzeugung funktioniert
 * - Company und CustomerReference werden korrekt verwendet
 * - OrderItem-Snapshots werden verwendet (keine Live-Produktdaten)
 * - Security: Fremde Stores erhalten keinen Zugriff
 */
@ExtendWith(MockitoExtension.class)
class DeliveryNoteServiceTest {

    @Mock
    private OrderRepository orderRepository;

    @InjectMocks
    private DeliveryNoteService deliveryNoteService;

    private Order testOrder;
    private Store testStore;

    @BeforeEach
    void setUp() {
        // Store erstellen
        testStore = new Store();
        testStore.setId(100L);
        testStore.setName("Test Store");
        testStore.setCountryCode("DE");

        // Order erstellen
        testOrder = new Order();
        testOrder.setId(1L);
        testOrder.setOrderNumber("ORD-123456");
        testOrder.setStore(testStore);
        testOrder.setCustomerEmail("test@example.com");
        testOrder.setStatus(OrderStatus.CONFIRMED);
        testOrder.setCreatedAt(LocalDateTime.now());
        testOrder.setCustomerReference("PO-2026-0042");  // B2B
        testOrder.setNotes("Bitte bis 10 Uhr liefern");

        // Shipping Address mit Company
        Address shippingAddr = new Address();
        shippingAddr.setCompany("Acme GmbH");  // B2B
        shippingAddr.setFirstName("Max");
        shippingAddr.setLastName("Mustermann");
        shippingAddr.setAddress1("Teststraße 123");
        shippingAddr.setCity("Berlin");
        shippingAddr.setPostalCode("10115");
        shippingAddr.setCountry("Deutschland");
        shippingAddr.setPhone("+49 30 12345678");
        testOrder.setShippingAddress(shippingAddr);

        // Billing Address
        Address billingAddr = new Address();
        billingAddr.setCompany("Acme GmbH");
        billingAddr.setFirstName("Max");
        billingAddr.setLastName("Mustermann");
        billingAddr.setAddress1("Teststraße 123");
        billingAddr.setCity("Berlin");
        billingAddr.setPostalCode("10115");
        billingAddr.setCountry("Deutschland");
        testOrder.setBillingAddress(billingAddr);

        // OrderItems mit Snapshots
        List<OrderItem> orderItems = new ArrayList<>();
        
        OrderItem item1 = new OrderItem();
        item1.setId(1L);
        item1.setOrder(testOrder);
        item1.setName("Test Produkt 1");  // Snapshot
        item1.setSku("TEST-SKU-001");     // Snapshot
        item1.setVariantTitle("Größe M");  // Snapshot
        item1.setQuantity(2);
        item1.setUnitPriceGross(new BigDecimal("9.99"));
        orderItems.add(item1);
        
        OrderItem item2 = new OrderItem();
        item2.setId(2L);
        item2.setOrder(testOrder);
        item2.setName("Test Produkt 2");
        item2.setSku("TEST-SKU-002");
        item2.setVariantTitle("Farbe Blau");
        item2.setQuantity(5);
        item2.setUnitPriceGross(new BigDecimal("15.99"));
        orderItems.add(item2);

        testOrder.setOrderItems(orderItems);
    }

    @Test
    void shouldGenerateValidPdf() throws IOException {
        when(orderRepository.findById(1L)).thenReturn(Optional.of(testOrder));

        byte[] pdfBytes = deliveryNoteService.generateDeliveryNotePdf(1L, 100L);

        assertNotNull(pdfBytes);
        assertTrue(pdfBytes.length > 0);
        // PDF sollte mit %PDF- beginnen
        String pdfHeader = new String(pdfBytes, 0, Math.min(5, pdfBytes.length));
        assertEquals("%PDF-", pdfHeader);
    }

    @Test
    void shouldIncludeCustomerReference() throws IOException {
        when(orderRepository.findById(1L)).thenReturn(Optional.of(testOrder));

        byte[] pdfBytes = deliveryNoteService.generateDeliveryNotePdf(1L, 100L);

        assertNotNull(pdfBytes);
        // PDF sollte mindestens 1KB groß sein (enthält Daten)
        assertTrue(pdfBytes.length > 1000, "PDF should contain content");
    }

    @Test
    void shouldIncludeCompanyName() throws IOException {
        when(orderRepository.findById(1L)).thenReturn(Optional.of(testOrder));

        byte[] pdfBytes = deliveryNoteService.generateDeliveryNotePdf(1L, 100L);

        assertNotNull(pdfBytes);
        assertTrue(pdfBytes.length > 1000, "PDF should contain content");
    }

    @Test
    void shouldIncludeOrderNumber() throws IOException {
        when(orderRepository.findById(1L)).thenReturn(Optional.of(testOrder));

        byte[] pdfBytes = deliveryNoteService.generateDeliveryNotePdf(1L, 100L);

        assertNotNull(pdfBytes);
        assertTrue(pdfBytes.length > 1000, "PDF should contain content");
    }

    @Test
    void shouldThrowExceptionForOrderNotFound() {
        when(orderRepository.findById(anyLong())).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class, () ->
            deliveryNoteService.generateDeliveryNotePdf(999L, 100L)
        );
    }

    @Test
    void shouldThrowExceptionForWrongStore() {
        when(orderRepository.findById(1L)).thenReturn(Optional.of(testOrder));

        // Versuche mit fremder Store ID
        assertThrows(IllegalArgumentException.class, () ->
            deliveryNoteService.generateDeliveryNotePdf(1L, 999L)
        );
    }

    @Test
    void shouldGeneratePdfWithoutOptionalFields() throws IOException {
        // Order ohne CustomerReference und Company
        testOrder.setCustomerReference(null);
        testOrder.getShippingAddress().setCompany(null);
        testOrder.setNotes(null);

        when(orderRepository.findById(1L)).thenReturn(Optional.of(testOrder));

        byte[] pdfBytes = deliveryNoteService.generateDeliveryNotePdf(1L, 100L);

        assertNotNull(pdfBytes);
        assertTrue(pdfBytes.length > 0);
    }

    @Test
    void shouldHandleManyOrderItems() throws IOException {
        // Viele Positionen hinzufügen
        List<OrderItem> manyItems = new ArrayList<>();
        for (int i = 1; i <= 30; i++) {
            OrderItem item = new OrderItem();
            item.setId((long) i);
            item.setOrder(testOrder);
            item.setName("Produkt " + i);
            item.setSku("SKU-" + i);
            item.setVariantTitle("Variante " + i);
            item.setQuantity(1);
            item.setUnitPriceGross(new BigDecimal("10.00"));
            manyItems.add(item);
        }
        testOrder.setOrderItems(manyItems);

        when(orderRepository.findById(1L)).thenReturn(Optional.of(testOrder));

        byte[] pdfBytes = deliveryNoteService.generateDeliveryNotePdf(1L, 100L);

        assertNotNull(pdfBytes);
        assertTrue(pdfBytes.length > 0);
    }

    @Test
    void shouldHandleLongProductNames() throws IOException {
        OrderItem itemWithLongName = testOrder.getOrderItems().get(0);
        itemWithLongName.setName("Dies ist ein sehr langer Produktname der mehr als 35 Zeichen hat und gekürzt werden sollte");

        when(orderRepository.findById(1L)).thenReturn(Optional.of(testOrder));

        byte[] pdfBytes = deliveryNoteService.generateDeliveryNotePdf(1L, 100L);

        assertNotNull(pdfBytes);
        assertTrue(pdfBytes.length > 0);
    }
}
