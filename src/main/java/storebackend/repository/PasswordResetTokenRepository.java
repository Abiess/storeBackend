package storebackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import storebackend.entity.PasswordResetToken;
import storebackend.entity.User;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, Long> {

    Optional<PasswordResetToken> findByToken(String token);

    Optional<PasswordResetToken> findByUser(User user);

    void deleteByUser(User user);

    // Automatisches Cleanup abgelaufener Tokens
    void deleteByExpiresAtBefore(LocalDateTime dateTime);

    // Cleanup bereits verwendeter Tokens
    void deleteByUsedAtIsNotNull();
}

