package storebackend.dto;

import lombok.Data;
import storebackend.enums.Plan;
import storebackend.enums.PaymentMethod;

@Data
public class UpgradeRequest {
    private Long userId;
    private Plan targetPlan;
    private String billingCycle; // MONTHLY or YEARLY
    private PaymentMethod paymentMethod;
}

