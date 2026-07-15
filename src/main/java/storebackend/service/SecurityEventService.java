package storebackend.service;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import storebackend.entity.SecurityEvent;
import storebackend.repository.SecurityEventRepository;
import storebackend.util.IpAddressUtil;
import storebackend.enums.EventType;
import storebackend.enums.MailType;
import storebackend.enums.BlockReason;
import storebackend.enums.RateLimitType;

import java.time.LocalDateTime;

/**
 * Security Event Service - Tracking von sicherheitsrelevanten Vorgängen
 * 
 * Alle Events werden asynchron gespeichert, um die Request-Performance nicht zu beeinträchtigen.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class SecurityEventService {

    private final SecurityEventRepository securityEventRepository;

    /**
     * Speichert Security Event asynchron
     */
    @Async
    @Transactional
    public void logEvent(SecurityEventBuilder builder) {
        try {
            SecurityEvent event = builder.build();
            securityEventRepository.save(event);
            
            // Bei kritischen Events zusätzlich loggen
            if (Boolean.TRUE.equals(event.getBlocked())) {
                log.warn("🚨 Security Event: {} blocked on {} - Reason: {} - IP: {}", 
                    event.getEmailMasked() != null ? event.getEmailMasked() : event.getPhoneMasked(),
                    event.getEndpoint(), 
                    event.getBlockReason(),
                    event.getClientIp());
            }
            
            // Honeypot-Trigger = kritischer Alarm
            if (Boolean.TRUE.equals(event.getHoneypotTriggered())) {
                log.error("🍯 HONEYPOT TRIGGERED: IP {} on {} - UA: {}", 
                    event.getClientIp(), 
                    event.getEndpoint(),
                    event.getUserAgent());
            }
        } catch (Exception e) {
            log.error("Failed to save security event", e);
        }
    }

    /**
     * Builder für Security Events
     */
    public static class SecurityEventBuilder {
        private final SecurityEvent event;

        public SecurityEventBuilder(String endpoint) {
            this.event = new SecurityEvent();
            this.event.setEndpoint(endpoint);
            this.event.setBlocked(false); // Default: nicht blockiert
        }

        public SecurityEventBuilder request(HttpServletRequest request) {
            if (request != null) {
                this.event.setClientIp(IpAddressUtil.getClientIpAddress(request));
                this.event.setRemoteAddr(request.getRemoteAddr());
                this.event.setXForwardedFor(request.getHeader("X-Forwarded-For"));
                this.event.setXRealIp(request.getHeader("X-Real-IP"));
                this.event.setUserAgent(request.getHeader("User-Agent"));
            }
            return this;
        }

        public SecurityEventBuilder requestId(String requestId) {
            this.event.setRequestId(requestId);
            return this;
        }

        public SecurityEventBuilder email(String email) {
            if (email != null) {
                this.event.setEmailMasked(SecurityEvent.maskEmail(email));
                this.event.setEmailDomain(SecurityEvent.extractDomain(email));
            }
            return this;
        }

        public SecurityEventBuilder phone(String phone) {
            if (phone != null) {
                this.event.setPhoneMasked(SecurityEvent.maskPhone(phone));
            }
            return this;
        }

        public SecurityEventBuilder captcha(boolean present, boolean valid) {
            this.event.setCaptchaPresent(present);
            this.event.setCaptchaValid(valid);
            return this;
        }

        public SecurityEventBuilder honeypot(boolean triggered) {
            this.event.setHoneypotTriggered(triggered);
            return this;
        }

        public SecurityEventBuilder rateLimit(RateLimitType type) {
            this.event.setRateLimitType(type);
            return this;
        }

        public SecurityEventBuilder blocked(boolean blocked, BlockReason reason) {
            this.event.setBlocked(blocked);
            this.event.setBlockReason(reason);
            return this;
        }

        public SecurityEventBuilder mailSent(boolean sent) {
            this.event.setMailTriggered(sent);
            return this;
        }

        public SecurityEventBuilder httpStatus(int status) {
            this.event.setHttpStatus(status);
            return this;
        }

        public SecurityEventBuilder store(Long storeId) {
            this.event.setStoreId(storeId);
            return this;
        }

        public SecurityEventBuilder user(Long userId) {
            this.event.setUserId(userId);
            return this;
        }
        
        public SecurityEventBuilder eventType(EventType eventType) {
            this.event.setEventType(eventType);
            return this;
        }
        
        public SecurityEventBuilder httpMethod(String method) {
            this.event.setHttpMethod(method);
            return this;
        }
        
        public SecurityEventBuilder mailType(MailType mailType) {
            this.event.setMailType(mailType);
            this.event.setMailTriggered(true); // implizit
            return this;
        }
        
        public SecurityEventBuilder mailActuallySent(boolean sent) {
            this.event.setMailSent(sent);
            return this;
        }
        
        public SecurityEventBuilder killSwitch(boolean triggered) {
            this.event.setKillSwitchTriggered(triggered);
            return this;
        }
        
        public SecurityEventBuilder circuitBreaker(boolean triggered) {
            this.event.setCircuitBreakerTriggered(triggered);
            return this;
        }
        
        public SecurityEventBuilder loginSuccess(boolean success) {
            this.event.setLoginSuccess(success);
            this.event.setEventType(success ? EventType.LOGIN_SUCCESS : EventType.LOGIN_FAILED);
            return this;
        }
        
        public SecurityEventBuilder riskScore(int score) {
            this.event.setRiskScore(score);
            return this;
        }
        
        public SecurityEventBuilder headers(HttpServletRequest request) {
            if (request != null) {
                this.event.setOrigin(request.getHeader("Origin"));
                this.event.setReferer(request.getHeader("Referer"));
            }
            return this;
        }

        public SecurityEvent build() {
            return this.event;
        }
    }

    /**
     * Erstellt neuen Event-Builder
     */
    public SecurityEventBuilder builder(String endpoint) {
        return new SecurityEventBuilder(endpoint);
    }

    /**
     * Cleanup alte Events (für Scheduled Task)
     */
    @Transactional
    public void cleanupOldEvents(int daysToKeep) {
        LocalDateTime cutoff = LocalDateTime.now().minusDays(daysToKeep);
        securityEventRepository.deleteByCreatedAtBefore(cutoff);
        log.info("Security events older than {} days cleaned up", daysToKeep);
    }

    /**
     * Zählt blockierte Events in letzter Stunde (für Monitoring)
     */
    public long countRecentBlocks() {
        return securityEventRepository.countBlockedSince(LocalDateTime.now().minusHours(1));
    }

    /**
     * Zählt Honeypot-Trigger in letzter Stunde (für Alarm)
     */
    public long countRecentHoneypots() {
        return securityEventRepository.countHoneypotTriggersSince(LocalDateTime.now().minusHours(1));
    }
}
