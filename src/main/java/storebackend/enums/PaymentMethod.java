package storebackend.enums;

public enum PaymentMethod {
    BANK_TRANSFER,
    CREDIT_CARD,
    PAYPAL,
    STRIPE,
    CASH_ON_DELIVERY,
    ORDER_REQUEST,  // Invite-only storefront: submit cart for store confirmation
    
    // POS Payment Methods
    CASH,           // POS Barzahlung vor Ort
    CARD_EXTERNAL,  // POS Kartenzahlung am externen Terminal
    PAY_LATER       // POS "Später bezahlen" (Anschreiben/Credit) - erfordert loyaltyCode, siehe PosOrderService
}
