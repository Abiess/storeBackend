package storebackend.dto;

import lombok.Data;
import storebackend.enums.PaymentMethod;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class PaymentIntentResponse {
    private String id;
    private BigDecimal amount;
    private String currency;
    private String status; // pending, completed, failed
    private PaymentMethod paymentMethod;
    private BankTransferDetails bankTransferDetails;
    private LocalDateTime createdAt;

    public PaymentIntentResponse() {
        this.createdAt = LocalDateTime.now();
    }

    @Data
    public static class BankTransferDetails {
        private String accountHolder;
        private String iban;
        private String bic;
        private String reference;
        private BigDecimal amount;
        private String currency;
    }
}

