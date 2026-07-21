package storebackend.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import storebackend.dto.EmailDeliveryResult;
import storebackend.entity.*;
import storebackend.enums.OrderStatus;
import storebackend.enums.PaymentStatus;
import storebackend.repository.OrderRepository;
import storebackend.repository.TelegramStoreConfigRepository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit-Tests für OrderCompletionService
 * 
 * Testet:
 * - Idempotenz (keine doppelten E-Mails/Bestandsabzüge)
 * - Fehlerbehandlung (E-Mail-Fehler, Inventory-Fehler)
 * - PaymentStatus-Prüfung
 * - Flag-basierte Completion
 */
@ExtendWith(MockitoExtension.class)
class OrderCompletionServiceTest {

    @Mock
    private OrderRepository orderRepository;
    
    @Mock
    private InventoryService inventoryService;
    
    @Mock
    private EmailService emailService;
    
    @Mock
    private WhatsAppService whatsAppService;
    
    @Mock
    private TelegramBotService telegramBotService;
    
    @Mock
    private TelegramStoreConfigRepository telegramConfigRepository;
    
    @InjectMocks
    private OrderCompletionService orderCompletionService;
    
    private Order testOrder;
    private Store testStore;
    private User testUser;
    
    @BeforeEach
    void setUp() {
        // Test-Store
        testStore = new Store();
        testStore.setId(1L);
        testStore.setName("Test Store");
        testStore.setLogoUrl("https://example.com/logo.png");
        
        // Test-User (Owner)
        testUser = new User();
        testUser.setId(1L);
        testUser.setEmail("owner@example.com");
        testUser.setPreferredLanguage("de");
        testStore.setOwner(testUser);
        
        // Test-Order
        testOrder = new Order();
        testOrder.setId(100L);
        testOrder.setOrderNumber("ORDER-100");
        testOrder.setStore(testStore);
        testOrder.setStatus(OrderStatus.CONFIRMED);
        testOrder.setPaymentStatus(PaymentStatus.PAID);
        testOrder.setCustomerEmail("customer@example.com");
        testOrder.setTotalAmount(BigDecimal.valueOf(100.00));
        testOrder.setInventoryAdjusted(false);
        testOrder.setConfirmationEmailSent(false);
        
        // Test-OrderItems
        OrderItem item1 = new OrderItem();
        item1.setId(1L);
        item1.setQuantity(2);
        item1.setName("Test Product");
        item1.setPrice(BigDecimal.valueOf(50.00));
        ProductVariant variant1 = new ProductVariant();
        variant1.setId(1L);
        variant1.setStockQuantity(10);
        item1.setVariant(variant1);
        testOrder.setOrderItems(List.of(item1));
        
        // Set customer email on order (no customerName field in Order entity)
        testOrder.setCustomerEmail("customer@test.com");
    }
    
    /**
     * Test 1: PAID + noch nicht verarbeitet
     * → Bestand einmal reduzieren
     * → E-Mail einmal senden
     * → beide Flags true
     */
    @Test
    void testSuccessfulOrderCompletion_FirstTime() {
        // Arrange
        when(orderRepository.findByIdForUpdate(100L)).thenReturn(Optional.of(testOrder));
        when(orderRepository.save(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));
        when(emailService.sendOrderConfirmationWithResult(
            anyString(), anyString(), anyString(), anyDouble(), anyList(), anyString(), anyString()
        )).thenReturn(EmailDeliveryResult.success());
        doNothing().when(inventoryService).adjustForOrder(any(Order.class));
        doNothing().when(emailService).sendNewOrderNotificationToOwner(
            anyString(), anyString(), anyString(), anyString(), anyString(), any(Double.class), 
            anyString(), anyString(), anyString(), anyList()
        );
        
        // Act
        orderCompletionService.completePaidOrder(100L);
        
        // Assert
        verify(inventoryService, times(1)).adjustForOrder(testOrder);
        verify(emailService, times(1)).sendOrderConfirmationWithResult(
            eq("customer@example.com"), eq("ORDER-100"), eq("Test Store"), 
            eq(100.0), anyList(), eq("https://example.com/logo.png"), eq("en")
        );
        verify(emailService, times(1)).sendNewOrderNotificationToOwner(
            eq("owner@example.com"), eq("de"), eq("ORDER-100"), 
            eq("Test Store"), eq("https://example.com/logo.png"), eq(100.0),
            eq("customer@example.com"), isNull(), isNull(), anyList()
        );
        verify(orderRepository, times(2)).save(testOrder);
        assertTrue(testOrder.getInventoryAdjusted());
        assertTrue(testOrder.getConfirmationEmailSent());
    }
    
    /**
     * Test 2: inventoryAdjusted=true
     * → Bestand nicht erneut reduzieren
     */
    @Test
    void testOrderCompletion_InventoryAlreadyAdjusted() {
        // Arrange
        testOrder.setInventoryAdjusted(true);  // Bereits reduziert
        when(orderRepository.findByIdForUpdate(100L)).thenReturn(Optional.of(testOrder));
        when(orderRepository.save(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));
        when(emailService.sendOrderConfirmationWithResult(
            anyString(), anyString(), anyString(), anyDouble(), anyList(), anyString(), anyString()
        )).thenReturn(EmailDeliveryResult.success());
        
        // Act
        orderCompletionService.completePaidOrder(100L);
        
        // Assert
        verify(inventoryService, never()).adjustForOrder(any(Order.class));  // Nicht erneut aufgerufen
        verify(emailService, times(1)).sendOrderConfirmationWithResult(anyString(), anyString(), anyString(), 
            anyDouble(), anyList(), anyString(), anyString());
        assertTrue(testOrder.getConfirmationEmailSent());
    }
    
    /**
     * Test 3: confirmationEmailSent=true
     * → E-Mail nicht erneut senden
     */
    @Test
    void testOrderCompletion_EmailAlreadySent() {
        // Arrange
        testOrder.setConfirmationEmailSent(true);  // Bereits gesendet
        when(orderRepository.findByIdForUpdate(100L)).thenReturn(Optional.of(testOrder));
        when(orderRepository.save(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));
        doNothing().when(inventoryService).adjustForOrder(any(Order.class));
        
        // Act
        orderCompletionService.completePaidOrder(100L);
        
        // Assert
        verify(inventoryService, times(1)).adjustForOrder(testOrder);
        verify(emailService, never()).sendOrderConfirmationWithResult(
            anyString(), anyString(), anyString(), anyDouble(), anyList(), anyString(), anyString()
        );  // Nicht erneut aufgerufen
        assertTrue(testOrder.getInventoryAdjusted());
    }
    
    /**
     * Test 4: Beide Flags bereits true
     * → Keine Verarbeitung
     */
    @Test
    void testOrderCompletion_AlreadyCompleted() {
        // Arrange
        testOrder.setInventoryAdjusted(true);
        testOrder.setConfirmationEmailSent(true);
        when(orderRepository.findByIdForUpdate(100L)).thenReturn(Optional.of(testOrder));
        
        // Act
        orderCompletionService.completePaidOrder(100L);
        
        // Assert
        verify(inventoryService, never()).adjustForOrder(any(Order.class));
        verify(emailService, never()).sendOrderConfirmationWithResult(
            anyString(), anyString(), anyString(), anyDouble(), anyList(), anyString(), anyString()
        );
        verify(orderRepository, never()).save(any(Order.class));
    }
    
    /**
     * Test 5: Mailversand wirft Exception
     * → confirmationEmailSent bleibt false
     * → inventoryAdjusted bleibt true
     * → Retry bleibt möglich
     */
    @Test
    void testOrderCompletion_EmailFailure() {
        // Arrange
        when(orderRepository.findByIdForUpdate(100L)).thenReturn(Optional.of(testOrder));
        when(orderRepository.save(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));
        doNothing().when(inventoryService).adjustForOrder(any(Order.class));
        when(emailService.sendOrderConfirmationWithResult(
            anyString(), anyString(), anyString(), anyDouble(), anyList(), anyString(), anyString()
        )).thenReturn(EmailDeliveryResult.permanentFailure("SMTP_ERROR", "SMTP connection failed"));
        
        // Act
        orderCompletionService.completePaidOrder(100L);
        
        // Assert
        verify(inventoryService, times(1)).adjustForOrder(testOrder);
        verify(emailService, times(1)).sendOrderConfirmationWithResult(
            eq("customer@example.com"), anyString(), anyString(), anyDouble(), anyList(), anyString(), anyString()
        );
        assertTrue(testOrder.getInventoryAdjusted());   // Bestand wurde reduziert
        assertFalse(testOrder.getConfirmationEmailSent());  // E-Mail-Flag bleibt false
    }
    
    /**
     * Test 6: Inventory-Adjustment wirft Exception
     * → Exception wird durchgeschlagen
     * → E-Mail wird nicht versucht
     */
    @Test
    void testOrderCompletion_InventoryFailure() {
        // Arrange
        when(orderRepository.findByIdForUpdate(100L)).thenReturn(Optional.of(testOrder));
        doThrow(new RuntimeException("Insufficient stock"))
            .when(inventoryService).adjustForOrder(any(Order.class));
        
        // Act & Assert
        RuntimeException exception = assertThrows(RuntimeException.class, () -> {
            orderCompletionService.completePaidOrder(100L);
        });
        
        assertEquals("Failed to adjust inventory for order ORDER-100", exception.getMessage());
        verify(inventoryService, times(1)).adjustForOrder(testOrder);
        verify(emailService, never()).sendOrderConfirmationWithResult(
            anyString(), anyString(), anyString(), anyDouble(), anyList(), anyString(), anyString()
        );
        assertFalse(testOrder.getInventoryAdjusted());
        assertFalse(testOrder.getConfirmationEmailSent());
    }
    
    /**
     * Test 7: Payment nicht PAID
     * → Completion-Service verarbeitet nichts
     */
    @Test
    void testOrderCompletion_PaymentNotPaid() {
        // Arrange
        testOrder.setPaymentStatus(PaymentStatus.PENDING);
        when(orderRepository.findByIdForUpdate(100L)).thenReturn(Optional.of(testOrder));
        
        // Act
        orderCompletionService.completePaidOrder(100L);
        
        // Assert
        verify(inventoryService, never()).adjustForOrder(any(Order.class));
        verify(emailService, never()).sendOrderConfirmationWithResult(
            anyString(), anyString(), anyString(), anyDouble(), anyList(), anyString(), anyString()
        );
        assertFalse(testOrder.getInventoryAdjusted());
        assertFalse(testOrder.getConfirmationEmailSent());
    }
    
    /**
     * Test 8: PaymentStatus = null (COD/Cash)
     * → Completion wird durchgeführt
     */
    @Test
    void testOrderCompletion_PaymentStatusNull_COD() {
        // Arrange
        testOrder.setPaymentStatus(null);  // COD/Cash
        when(orderRepository.findByIdForUpdate(100L)).thenReturn(Optional.of(testOrder));
        
        // Act
        orderCompletionService.completePaidOrder(100L);
        
        // Assert
        verify(inventoryService, never()).adjustForOrder(any(Order.class));
        verify(emailService, never()).sendOrderConfirmationWithResult(
            anyString(), anyString(), anyString(), anyDouble(), anyList(), anyString(), anyString()
        );
        assertFalse(testOrder.getInventoryAdjusted());
        assertFalse(testOrder.getConfirmationEmailSent());
    }
    
    /**
     * Test 9: Order nicht gefunden
     * → RuntimeException
     */
    @Test
    void testOrderCompletion_OrderNotFound() {
        // Arrange
        when(orderRepository.findByIdForUpdate(999L)).thenReturn(Optional.empty());
        
        // Act & Assert
        RuntimeException exception = assertThrows(RuntimeException.class, () -> {
            orderCompletionService.completePaidOrder(999L);
        });
        
        assertEquals("Order not found: 999", exception.getMessage());
    }
}
