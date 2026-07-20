package storebackend.enums;

/**
 * Payment Provider Enum - Zentrale Provider-Abstraction
 * PayPal ist nur eine Implementierung unter vielen
 */
public enum PaymentProvider {
    PAYPAL,
    CASH_ON_DELIVERY,
    BANK_TRANSFER,
    STRIPE
}
