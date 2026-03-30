package storebackend.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import storebackend.dto.WizardProgressDTO;
import storebackend.entity.User;
import storebackend.repository.UserRepository;
import storebackend.service.WizardProgressService;

/**
 * REST Controller für Store-Creation-Wizard Fortschritt
 */
@RestController
@RequestMapping("/api/wizard-progress")
@CrossOrigin(origins = "*", maxAge = 3600)
@RequiredArgsConstructor
@Slf4j
public class WizardProgressController {

    private final WizardProgressService wizardProgressService;
    private final UserRepository userRepository;

    /**
     * GET /api/wizard-progress
     * Hole aktuellen Wizard-Fortschritt des eingeloggten Users
     */
    @GetMapping
    public ResponseEntity<?> getProgress(@AuthenticationPrincipal UserDetails userDetails) {
        User user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

        return wizardProgressService.getProgress(user.getId())
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.noContent().build());
    }

    /**
     * POST /api/wizard-progress
     * Speichere/Update Wizard-Fortschritt
     */
    @PostMapping
    public ResponseEntity<WizardProgressDTO> saveProgress(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody WizardProgressDTO progressDTO) {
        
        User user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

        log.info("💾 Saving wizard progress for user {}: Step {}", 
                user.getEmail(), progressDTO.getCurrentStep());

        WizardProgressDTO saved = wizardProgressService.saveProgress(user.getId(), progressDTO);
        return ResponseEntity.ok(saved);
    }

    /**
     * POST /api/wizard-progress/skip
     * Markiere Wizard als übersprungen
     */
    @PostMapping("/skip")
    public ResponseEntity<Void> skipWizard(@AuthenticationPrincipal UserDetails userDetails) {
        User user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

        log.info("⏭️ User {} skipping wizard", user.getEmail());
        wizardProgressService.markAsSkipped(user.getId());
        
        return ResponseEntity.ok().build();
    }

    /**
     * POST /api/wizard-progress/complete
     * Markiere Wizard als abgeschlossen (nach Store-Erstellung)
     */
    @PostMapping("/complete")
    public ResponseEntity<Void> completeWizard(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam Long storeId) {
        
        User user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

        log.info("✅ User {} completed wizard - Store {} created", user.getEmail(), storeId);
        wizardProgressService.markAsCompleted(user.getId(), storeId);
        
        return ResponseEntity.ok().build();
    }

    /**
     * DELETE /api/wizard-progress
     * Lösche Wizard-Fortschritt
     */
    @DeleteMapping
    public ResponseEntity<Void> deleteProgress(@AuthenticationPrincipal UserDetails userDetails) {
        User user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

        log.info("🗑️ Deleting wizard progress for user {}", user.getEmail());
        wizardProgressService.deleteProgress(user.getId());
        
        return ResponseEntity.ok().build();
    }

    /**
     * GET /api/wizard-progress/has-active
     * Prüfe ob User einen aktiven Wizard-Fortschritt hat
     */
    @GetMapping("/has-active")
    public ResponseEntity<Boolean> hasActiveProgress(@AuthenticationPrincipal UserDetails userDetails) {
        User user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

        boolean hasActive = wizardProgressService.hasActiveProgress(user.getId());
        return ResponseEntity.ok(hasActive);
    }
}

