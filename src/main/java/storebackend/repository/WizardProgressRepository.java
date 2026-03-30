package storebackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import storebackend.entity.User;
import storebackend.entity.WizardProgress;

import java.util.Optional;

@Repository
public interface WizardProgressRepository extends JpaRepository<WizardProgress, Long> {
    
    /**
     * Finde Wizard-Fortschritt für einen User
     */
    Optional<WizardProgress> findByUser(User user);
    
    /**
     * Finde Wizard-Fortschritt für User-ID
     */
    Optional<WizardProgress> findByUserId(Long userId);
    
    /**
     * Prüfe ob User einen Wizard-Fortschritt hat
     */
    boolean existsByUserId(Long userId);
    
    /**
     * Lösche Wizard-Fortschritt eines Users (nach Store-Erstellung)
     */
    void deleteByUserId(Long userId);
}

