package storebackend.repository;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.*;
import storebackend.entity.CustomerAppSession;
import java.util.Optional;

public interface CustomerAppSessionRepository extends JpaRepository<CustomerAppSession, Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<CustomerAppSession> findByTokenHash(String tokenHash);
}
