package storebackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import storebackend.entity.SecurityEvent;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface SecurityEventRepository extends JpaRepository<SecurityEvent, Long> {

    /**
     * Findet blockierte Events in einem Zeitraum
     */
    List<SecurityEvent> findByBlockedTrueAndCreatedAtAfter(LocalDateTime after);

    /**
     * Findet Events für eine bestimmte IP
     */
    List<SecurityEvent> findByClientIpAndCreatedAtAfterOrderByCreatedAtDesc(String clientIp, LocalDateTime after);

    /**
     * Findet Events für eine Domain
     */
    List<SecurityEvent> findByEmailDomainAndCreatedAtAfterOrderByCreatedAtDesc(String emailDomain, LocalDateTime after);

    /**
     * Findet Events für einen Endpoint
     */
    List<SecurityEvent> findByEndpointAndCreatedAtAfterOrderByCreatedAtDesc(String endpoint, LocalDateTime after);

    /**
     * Zählt blockierte Events in letzter Stunde (für Monitoring)
     */
    @Query("SELECT COUNT(e) FROM SecurityEvent e WHERE e.blocked = true AND e.createdAt > :since")
    long countBlockedSince(@Param("since") LocalDateTime since);

    /**
     * Zählt Events mit ausgelösten Honeypots (für Alarm)
     */
    @Query("SELECT COUNT(e) FROM SecurityEvent e WHERE e.honeypotTriggered = true AND e.createdAt > :since")
    long countHoneypotTriggersSince(@Param("since") LocalDateTime since);

    /**
     * Cleanup alter Events (älter als X Tage)
     */
    void deleteByCreatedAtBefore(LocalDateTime before);
}
