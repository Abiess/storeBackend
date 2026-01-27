package storebackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import storebackend.entity.PhoneVerification;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface PhoneVerificationRepository extends JpaRepository<PhoneVerification, Long> {

    @Query("SELECT v FROM PhoneVerification v WHERE v.phoneNumber = :phoneNumber ORDER BY v.createdAt DESC")
    Optional<PhoneVerification> findMostRecentByPhoneNumber(@Param("phoneNumber") String phoneNumber);

    @Query("SELECT v FROM PhoneVerification v WHERE v.phoneNumber = :phoneNumber AND v.verified = true AND v.createdAt > :since ORDER BY v.createdAt DESC")
    Optional<PhoneVerification> findRecentVerifiedByPhoneNumber(
        @Param("phoneNumber") String phoneNumber,
        @Param("since") LocalDateTime since
    );

    int deleteByCreatedAtBefore(LocalDateTime cutoff);
}

