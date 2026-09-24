package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import storebackend.enums.ConnectionStatus;
import storebackend.enums.PaymentMode;
import storebackend.enums.PaymentProvider;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentSettingsDTO {
    
    private Long id;
    private PaymentProvider provider;
    private boolean enabled;
    private PaymentMode mode;
    private ConnectionStatus connectionStatus;
    private String merchantAccountId;
    private Boolean onboardingCompleted;
    private Boolean permissionsGranted;
    private Boolean emailConfirmed;
    private LocalDateTime lastCheckedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    
    // Display-only fields (nicht in Entity)
    private String displayMode;
    private String displayStatus;
}
