package storebackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import storebackend.entity.TeamInvitation;

import java.util.List;
import java.util.Optional;

@Repository
public interface TeamInvitationRepository extends JpaRepository<TeamInvitation, Long> {

    /** Alle Einladungen eines Stores */
    List<TeamInvitation> findByStoreId(Long storeId);

    /** Einladung per Token-Hash finden */
    Optional<TeamInvitation> findByTokenHash(String tokenHash);

    /** Aktive Einladung für E-Mail und Store */
    Optional<TeamInvitation> findByStoreIdAndEmailAndStatus(
            Long storeId,
            String email,
            TeamInvitation.InvitationStatus status
    );

    /** Alle ausstehenden Einladungen eines Stores */
    List<TeamInvitation> findByStoreIdAndStatus(Long storeId, TeamInvitation.InvitationStatus status);
}
