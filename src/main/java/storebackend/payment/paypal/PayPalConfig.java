package storebackend.payment.paypal;

import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConfigurationProperties(prefix = "paypal")
@Data
@Slf4j
public class PayPalConfig {
    
    private String clientId;
    private String clientSecret;
    private String mode = "sandbox";
    
    public boolean isSandbox() {
        return "sandbox".equalsIgnoreCase(mode);
    }
    
    public String getApiBase() {
        return isSandbox() 
            ? "https://api-m.sandbox.paypal.com" 
            : "https://api-m.paypal.com";
    }
    
    public boolean isConfigured() {
        boolean configured = clientId != null && !clientId.isBlank() 
            && clientSecret != null && !clientSecret.isBlank();
        if (!configured) {
            log.warn("PayPal not configured - clientId or clientSecret missing");
        }
        return configured;
    }
    
    public String getMode() {
        return mode;
    }
}
