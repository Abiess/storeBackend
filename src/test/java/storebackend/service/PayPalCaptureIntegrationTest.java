package storebackend.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.transaction.annotation.Transactional;
import storebackend.dto.EmailDeliveryResult;
import storebackend.entity.*;
import storebackend.enums.*;
import storebackend.payment.*;
import storebackend.payment.paypal.PayPalPaymentGateway;
import storebackend.repository.*;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Integration-Tests für PayPal-Capture-Flow mit OrderCompletionService
 * 
 * Testet den kompletten Flow:
 * - Payment erstellen
 * - Capture durchführen
 * - OrderCompletionService wird aufgerufen
 * - Idempotenz bei doppeltem Capture
 * - Race-Safety bei Webhook + Capture
 */
@SpringBootTest
@Transactional
class PayPalCaptureIntegrationTest {

    @Autowired
    private PaymentService paymentService;
    
    @Autowired
    private OrderCompletionService orderCompletionService;
    
    @Autowired
    private OrderRepository orderRepository;
    
    @Autowired
    private PaymentTransactionRepository paymentTransactionRepository;
    
    @Autowired
    private StoreRepository storeRepository;
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private ProductRepository productRepository;
    
    @Autowired
    private ProductVariantRepository productVariantRepository;
    
    @MockBean
    private PayPalPaymentGateway payPalGateway;
    
    @MockBean
    private EmailService emailService;
    
    private Store testStore;
    private User testOwner;
    private User testCustomer;
    private Order testOrder;
    private ProductVariant testVariant;
    
    @BeforeEach
    void setUp() {
        // Mock E-Mail-Service (immer erfolgreich)
        when(emailService.sendOrderConfirmationWithResult(
            anyString(), anyString(), anyString(), anyDouble(), anyList(), anyString(), anyString()
        )).thenReturn(EmailDeliveryResult.success());
        
        doNothing().when(emailService).sendNewOrderNotificationToOwner(
            anyString(), anyString(), anyString(), anyString(), anyString(), anyDouble(),
            anyString(), anyString(), anyString(), anyList()
        );
        
        // Test-Owner erstellen
        testOwner = new User();
        testOwner.setEmail("owner@test.com");
        testOwner.setPasswordHash("$2a$10$dummyHashForTesting");
        testOwner.setName("Test Owner");
        testOwner.getRoles().add(Role.ROLE_RESELLER);
        testOwner.setEmailVerified(true);
        testOwner.setPreferredLanguage("de");
        testOwner = userRepository.save(testOwner);
        
        // Test-Store erstellen
        testStore = new Store();
        testStore.setName("Test Store");
        testStore.setOwner(testOwner);
        testStore.setSlug("test-store");
        testStore = storeRepository.save(testStore);
        
        // Test-Product und Variant erstellen
        Product product = new Product();
        product.setStore(testStore);
        product.setTitle("Test Product");
        product.setStatus(ProductStatus.ACTIVE);
        product = productRepository.save(product);
        
        testVariant = new ProductVariant();
        testVariant.setProduct(product);
        testVariant.setSku("TEST-VAR-001");
        testVariant.setPrice(BigDecimal.valueOf(50.00));
        testVariant.setStockQuantity(100);  // Genug Bestand
        testVariant = productVariantRepository.save(testVariant);
        
        // Test-Customer (User) erstellen
        testCustomer = new User();
        testCustomer.setEmail("customer@test.com");
        testCustomer.setPasswordHash("$2a$10$dummyHashForTesting");
        testCustomer.setName("Test Customer");
        testCustomer.getRoles().add(Role.USER);
        testCustomer.setEmailVerified(true);
        testCustomer.setPreferredLanguage("en");
        testCustomer = userRepository.save(testCustomer);
        
        // Test-Order erstellen
        testOrder = new Order();
        testOrder.setStore(testStore);
        testOrder.setCustomer(testCustomer);
        testOrder.setCustomerEmail("customer@test.com");
        testOrder.setOrderNumber("TEST-ORDER-" + System.currentTimeMillis());
        testOrder.setStatus(OrderStatus.PENDING_PAYMENT);
        testOrder.setPaymentStatus(PaymentStatus.CREATED);
        testOrder.setPaymentMethod(PaymentMethod.PAYPAL);
        testOrder.setCurrencyCode(CurrencyCode.EUR);
        testOrder.setTotalAmount(BigDecimal.valueOf(100.00));
        testOrder.setTotalGross(BigDecimal.valueOf(100.00));
        testOrder.setInventoryAdjusted(false);
        testOrder.setConfirmationEmailSent(false);
        
        // OrderItem erstellen
        OrderItem item = new OrderItem();
        item.setOrder(testOrder);
        item.setVariant(testVariant);
        item.setProduct(product);
        item.setQuantity(2);
        item.setPrice(BigDecimal.valueOf(50.00));
        item.setName("Test Product");
        testOrder.setOrderItems(List.of(item));
        
        testOrder = orderRepository.save(testOrder);
    }
    
    /**
     * Test 1: Erfolgreicher Capture-Flow
     * → Payment = PAID
     * → Order = CONFIRMED
     * → Bestand reduziert
     * → E-Mails gesendet
     */
    @Test
    void testSuccessfulCaptureFlow() {
        // Arrange: Payment erstellen
        PaymentTransaction payment = createTestPayment();
        
        // Mock: PayPal Capture erfolgreich
        when(payPalGateway.capturePayment(any(PaymentCaptureCommand.class)))
            .thenReturn(PaymentCaptureResult.builder()
                .success(true)
                .status(PaymentStatus.PAID)
                .providerCaptureId("CAPTURE-123")
                .capturedAmount(BigDecimal.valueOf(100.00))
                .currencyCode("EUR")
                .build());
        
        // Act: Capture durchführen
        PaymentTransaction captured = paymentService.capturePayment(payment.getId());
        
        // Assert: Payment
        assertNotNull(captured);
        assertEquals(PaymentStatus.PAID, captured.getStatus());
        assertEquals("CAPTURE-123", captured.getProviderCaptureId());
        assertNotNull(captured.getPaidAt());
        
        // Assert: Order
        Order refreshed = orderRepository.findById(testOrder.getId()).orElseThrow();
        assertEquals(OrderStatus.CONFIRMED, refreshed.getStatus());
        assertEquals(PaymentStatus.PAID, refreshed.getPaymentStatus());
        assertTrue(refreshed.getInventoryAdjusted());
        assertTrue(refreshed.getConfirmationEmailSent());
        
        // Assert: Bestand reduziert
        ProductVariant refreshedVariant = productVariantRepository.findById(testVariant.getId()).orElseThrow();
        assertEquals(98, refreshedVariant.getStockQuantity());  // 100 - 2
        
        // Assert: E-Mails
        verify(emailService, times(1)).sendOrderConfirmationWithResult(
            eq("customer@test.com"), anyString(), anyString(), anyDouble(), anyList(), isNull(), eq("en")
        );
        verify(emailService, times(1)).sendNewOrderNotificationToOwner(
            eq("owner@test.com"), eq("de"), anyString(), anyString(), isNull(), anyDouble(),
            eq("customer@test.com"), eq("Test Customer"), eq("PAYPAL"), anyList()
        );
    }
    
    /**
     * Test 2: Doppelter Capture
     * → Keine doppelte Verarbeitung
     * → Idempotent
     */
    @Test
    void testDoubleCapture_Idempotent() {
        // Arrange: Payment erstellen
        PaymentTransaction payment = createTestPayment();
        
        // Mock: PayPal Capture erfolgreich
        when(payPalGateway.capturePayment(any(PaymentCaptureCommand.class)))
            .thenReturn(PaymentCaptureResult.builder()
                .success(true)
                .status(PaymentStatus.PAID)
                .providerCaptureId("CAPTURE-123")
                .capturedAmount(BigDecimal.valueOf(100.00))
                .currencyCode("EUR")
                .build());
        
        // Act: Erster Capture
        paymentService.capturePayment(payment.getId());
        
        // Act: Zweiter Capture (sollte idempotent sein)
        PaymentTransaction secondCapture = paymentService.capturePayment(payment.getId());
        
        // Assert: Payment bleibt PAID
        assertEquals(PaymentStatus.PAID, secondCapture.getStatus());
        
        // Assert: Order
        Order refreshed = orderRepository.findById(testOrder.getId()).orElseThrow();
        assertEquals(OrderStatus.CONFIRMED, refreshed.getStatus());
        assertTrue(refreshed.getInventoryAdjusted());
        assertTrue(refreshed.getConfirmationEmailSent());
        
        // Assert: Bestand nur EINMAL reduziert
        ProductVariant refreshedVariant = productVariantRepository.findById(testVariant.getId()).orElseThrow();
        assertEquals(98, refreshedVariant.getStockQuantity());  // 100 - 2 (nicht 100 - 4)
        
        // Assert: E-Mails nur EINMAL gesendet
        verify(emailService, times(1)).sendOrderConfirmationWithResult(
            anyString(), anyString(), anyString(), anyDouble(), anyList(), isNull(), anyString()
        );
    }
    
    /**
     * Test 3: Webhook nach erfolgreichem Capture
     * → Keine doppelte Verarbeitung
     */
    @Test
    void testWebhookAfterCapture_Idempotent() {
        // Arrange: Payment erstellen und capturen
        PaymentTransaction payment = createTestPayment();
        
        when(payPalGateway.capturePayment(any(PaymentCaptureCommand.class)))
            .thenReturn(PaymentCaptureResult.builder()
                .success(true)
                .status(PaymentStatus.PAID)
                .providerCaptureId("CAPTURE-123")
                .capturedAmount(BigDecimal.valueOf(100.00))
                .currencyCode("EUR")
                .build());
        
        paymentService.capturePayment(payment.getId());
        
        // Act: Webhook kommt (simuliert)
        paymentService.processProviderStatusUpdate(
            PaymentProvider.PAYPAL,
            payment.getProviderOrderId(),
            "CAPTURE-123",
            PaymentStatus.PAID
        );
        
        // Assert: Order bleibt korrekt
        Order refreshed = orderRepository.findById(testOrder.getId()).orElseThrow();
        assertEquals(OrderStatus.CONFIRMED, refreshed.getStatus());
        assertTrue(refreshed.getInventoryAdjusted());
        assertTrue(refreshed.getConfirmationEmailSent());
        
        // Assert: Bestand nur EINMAL reduziert
        ProductVariant refreshedVariant = productVariantRepository.findById(testVariant.getId()).orElseThrow();
        assertEquals(98, refreshedVariant.getStockQuantity());
        
        // Assert: E-Mails nur EINMAL gesendet
        verify(emailService, times(1)).sendOrderConfirmationWithResult(
            anyString(), anyString(), anyString(), anyDouble(), anyList(), isNull(), anyString()
        );
    }
    
    /**
     * Test 4: Capture-Fehler
     * → Order bleibt PENDING_PAYMENT
     * → Kein Bestandsabzug
     * → Keine E-Mails
     */
    @Test
    void testCaptureFailure() {
        // Arrange: Payment erstellen
        PaymentTransaction payment = createTestPayment();
        
        // Mock: PayPal Capture fehlgeschlagen
        when(payPalGateway.capturePayment(any(PaymentCaptureCommand.class)))
            .thenReturn(PaymentCaptureResult.builder()
                .success(false)
                .status(PaymentStatus.FAILED)
                .errorCode("PAYMENT_CAPTURE_FAILED")
                .errorMessage("Insufficient funds")
                .build());
        
        // Act: Capture durchführen
        PaymentTransaction failed = paymentService.capturePayment(payment.getId());
        
        // Assert: Payment
        assertEquals(PaymentStatus.FAILED, failed.getStatus());
        assertEquals("PAYMENT_CAPTURE_FAILED", failed.getFailureCode());
        assertNull(failed.getPaidAt());
        
        // Assert: Order bleibt PENDING_PAYMENT
        Order refreshed = orderRepository.findById(testOrder.getId()).orElseThrow();
        assertEquals(OrderStatus.PENDING_PAYMENT, refreshed.getStatus());
        assertFalse(refreshed.getInventoryAdjusted());
        assertFalse(refreshed.getConfirmationEmailSent());
        
        // Assert: Bestand NICHT reduziert
        ProductVariant refreshedVariant = productVariantRepository.findById(testVariant.getId()).orElseThrow();
        assertEquals(100, refreshedVariant.getStockQuantity());  // Unverändert
        
        // Assert: Keine E-Mails
        verify(emailService, never()).sendOrderConfirmationWithResult(
            anyString(), anyString(), anyString(), anyDouble(), anyList(), isNull(), anyString()
        );
    }
    
    /**
     * Test 5: E-Mail-Fehler während Completion
     * → Payment = PAID
     * → Order = CONFIRMED
     * → Bestand reduziert
     * → confirmationEmailSent = false (Retry möglich)
     */
    @Test
    void testCaptureWithEmailFailure() {
        // Arrange: Payment erstellen
        PaymentTransaction payment = createTestPayment();
        
        // Mock: PayPal Capture erfolgreich
        when(payPalGateway.capturePayment(any(PaymentCaptureCommand.class)))
            .thenReturn(PaymentCaptureResult.builder()
                .success(true)
                .status(PaymentStatus.PAID)
                .providerCaptureId("CAPTURE-123")
                .capturedAmount(BigDecimal.valueOf(100.00))
                .currencyCode("EUR")
                .build());
        
        // Mock: E-Mail-Fehler
        when(emailService.sendOrderConfirmationWithResult(
            anyString(), anyString(), anyString(), anyDouble(), anyList(), isNull(), anyString()
        )).thenReturn(EmailDeliveryResult.permanentFailure("SMTP_ERROR", "Connection timeout"));
        
        // Act: Capture durchführen
        PaymentTransaction captured = paymentService.capturePayment(payment.getId());
        
        // Assert: Payment = PAID
        assertEquals(PaymentStatus.PAID, captured.getStatus());
        
        // Assert: Order = CONFIRMED
        Order refreshed = orderRepository.findById(testOrder.getId()).orElseThrow();
        assertEquals(OrderStatus.CONFIRMED, refreshed.getStatus());
        assertEquals(PaymentStatus.PAID, refreshed.getPaymentStatus());
        
        // Assert: Bestand reduziert
        assertTrue(refreshed.getInventoryAdjusted());
        ProductVariant refreshedVariant = productVariantRepository.findById(testVariant.getId()).orElseThrow();
        assertEquals(98, refreshedVariant.getStockQuantity());
        
        // Assert: E-Mail-Flag = false (Retry möglich)
        assertFalse(refreshed.getConfirmationEmailSent());
    }
    
    // Helper: Payment erstellen
    private PaymentTransaction createTestPayment() {
        PaymentTransaction payment = new PaymentTransaction();
        payment.setStore(testStore);
        payment.setOrder(testOrder);
        payment.setProvider(PaymentProvider.PAYPAL);
        payment.setStatus(PaymentStatus.APPROVED);
        payment.setAmount(BigDecimal.valueOf(100.00));
        payment.setCurrencyCode("EUR");
        payment.setProviderOrderId("PAYPAL-ORDER-123");
        payment.setIdempotencyKey("test-idempotency-key-" + System.currentTimeMillis());
        payment.setApprovalUrl("https://paypal.com/checkout");
        return paymentTransactionRepository.save(payment);
    }
}
