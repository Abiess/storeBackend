package storebackend.payment;

import storebackend.enums.PaymentProvider;

public interface PaymentGateway {
    
    PaymentProvider provider();
    
    PaymentCreateResult createPayment(PaymentContext context);
    
    PaymentCaptureResult capturePayment(PaymentCaptureCommand command);
    
    PaymentStatusResult getStatus(String providerOrderId);
}
