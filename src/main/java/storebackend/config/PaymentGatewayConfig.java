package storebackend.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import storebackend.enums.PaymentProvider;
import storebackend.payment.PaymentGateway;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Konfiguration für Payment-Gateways
 * Erstellt eine Map PaymentProvider -> PaymentGateway für einfache Provider-Auswahl
 */
@Configuration
@RequiredArgsConstructor
public class PaymentGatewayConfig {
    
    /**
     * Erstellt eine Map aller verfügbaren PaymentGateways
     * Spring injiziert automatisch alle Beans, die PaymentGateway implementieren
     */
    @Bean
    public Map<PaymentProvider, PaymentGateway> paymentGateways(List<PaymentGateway> gateways) {
        return gateways.stream()
            .collect(Collectors.toMap(
                PaymentGateway::provider,
                gateway -> gateway
            ));
    }
}
