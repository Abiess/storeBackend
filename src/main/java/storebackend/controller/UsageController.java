package storebackend.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import storebackend.dto.UsageStatsDTO;
import storebackend.entity.User;
import storebackend.service.UsageService;

/**
 * Liefert die Plan-bezogene Verbrauchsstatistik des aktuellen Users.
 * Wird vom Frontend (Subscription-Page / Dashboard-Widget) konsumiert,
 * um "X von Y verbraucht"-Anzeigen mit Progress-Bars zu rendern.
 */
@RestController
@RequestMapping("/api/usage")
@RequiredArgsConstructor
@Slf4j
public class UsageController {

    private final UsageService usageService;

    /** Aktuelle Nutzung des eingeloggten Users. */
    @GetMapping("/me")
    public ResponseEntity<UsageStatsDTO> getMyUsage(@AuthenticationPrincipal User user) {
        if (user == null) return ResponseEntity.status(401).build();
        return ResponseEntity.ok(usageService.getUsageForUser(user.getId()));
    }

    /** Admin: Nutzung eines beliebigen Users abfragen. */
    @GetMapping("/user/{userId}")
    public ResponseEntity<UsageStatsDTO> getUsageForUser(@PathVariable Long userId) {
        return ResponseEntity.ok(usageService.getUsageForUser(userId));
    }
}

