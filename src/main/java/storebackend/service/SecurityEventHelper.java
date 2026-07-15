package storebackend.service;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import storebackend.dto.GeoIpData;
import storebackend.util.IpAddressUtil;

/**
 * Security Event Helper - Vereinfacht GeoIP-Integration
 * 
 * Bietet Helper-Methoden für häufige Security-Event-Patterns.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class SecurityEventHelper {

    private final SecurityEventService securityEventService;
    private final GeoIpService geoIpService;

    /**
     * Erstellt SecurityEventBuilder mit Request + GeoIP
     * 
     * @param endpoint Endpoint path
     * @param request HTTP request
     * @return Builder mit Request-Daten und GeoIP-Lookup
     */
    public SecurityEventService.SecurityEventBuilder createEvent(String endpoint, HttpServletRequest request) {
        var builder = securityEventService.builder(endpoint)
            .request(request);
        
        // GeoIP-Lookup nur wenn aktiviert
        if (geoIpService.isEnabled() && request != null) {
            String clientIp = IpAddressUtil.getClientIpAddress(request);
            if (clientIp != null) {
                GeoIpData geoIp = geoIpService.lookup(clientIp);
                if (geoIp != null) {
                    builder.geoIp(geoIp);
                    
                    // Log Hosting Provider Attacks
                    if (geoIp.isHostingProvider()) {
                        log.debug("🤖 Hosting provider detected: {} ({})", geoIp.getAsnOrg(), clientIp);
                    }
                }
            }
        }
        
        return builder;
    }
    
    /**
     * Erstellt SecurityEventBuilder mit Request + GeoIP + Email
     */
    public SecurityEventService.SecurityEventBuilder createEventWithEmail(
            String endpoint, 
            HttpServletRequest request, 
            String email) {
        return createEvent(endpoint, request).email(email);
    }
    
    /**
     * Erstellt SecurityEventBuilder mit Request + GeoIP + Phone
     */
    public SecurityEventService.SecurityEventBuilder createEventWithPhone(
            String endpoint, 
            HttpServletRequest request, 
            String phone) {
        return createEvent(endpoint, request).phone(phone);
    }
}
