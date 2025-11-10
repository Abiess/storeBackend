package storebackend.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import storebackend.dto.CreateDomainRequest;
import storebackend.dto.DomainDTO;
import storebackend.entity.Domain;
import storebackend.entity.User;
import storebackend.service.DomainService;

import jakarta.validation.Valid;
import java.util.List;

@RestController
@RequestMapping("/api/stores/{storeId}/domains")
@RequiredArgsConstructor
public class DomainController {

    private final DomainService domainService;

    @GetMapping
    public ResponseEntity<List<DomainDTO>> getDomains(
            @PathVariable Long storeId,
            Authentication authentication) {

        User currentUser = (User) authentication.getPrincipal();
        List<Domain> domains = domainService.getDomainsForStore(storeId, currentUser);

        List<DomainDTO> domainDTOs = domains.stream()
            .map(this::convertToDTO)
            .toList();

        return ResponseEntity.ok(domainDTOs);
    }

    @PostMapping("/subdomain")
    public ResponseEntity<DomainDTO> createSubdomain(
            @PathVariable Long storeId,
            Authentication authentication) {

        User currentUser = (User) authentication.getPrincipal();
        Domain domain = domainService.createSubdomain(storeId, currentUser);

        return ResponseEntity.ok(convertToDTO(domain));
    }

    @PostMapping("/custom")
    public ResponseEntity<DomainDTO> createCustomDomain(
            @PathVariable Long storeId,
            @RequestBody @Valid CreateDomainRequest request,
            Authentication authentication) {

        User currentUser = (User) authentication.getPrincipal();
        Domain domain = domainService.createCustomDomain(storeId, request.getHost(), currentUser);

        return ResponseEntity.ok(convertToDTO(domain));
    }

    @GetMapping("/{domainId}/verification-instructions")
    public ResponseEntity<String> getVerificationInstructions(
            @PathVariable Long storeId,
            @PathVariable Long domainId,
            Authentication authentication) {

        User currentUser = (User) authentication.getPrincipal();
        String instructions = domainService.getVerificationInstructions(domainId, currentUser);

        return ResponseEntity.ok(instructions);
    }

    @PostMapping("/{domainId}/verify")
    public ResponseEntity<DomainDTO> verifyDomain(
            @PathVariable Long storeId,
            @PathVariable Long domainId,
            Authentication authentication) {

        User currentUser = (User) authentication.getPrincipal();
        boolean verified = domainService.verifyDomain(domainId, currentUser);

        if (!verified) {
            return ResponseEntity.badRequest().build();
        }

        // Domain neu laden um aktuellen Status zu bekommen
        List<Domain> domains = domainService.getDomainsForStore(storeId, currentUser);
        Domain domain = domains.stream()
            .filter(d -> d.getId().equals(domainId))
            .findFirst()
            .orElseThrow();

        return ResponseEntity.ok(convertToDTO(domain));
    }

    @PostMapping("/{domainId}/set-primary")
    public ResponseEntity<Void> setPrimaryDomain(
            @PathVariable Long storeId,
            @PathVariable Long domainId,
            Authentication authentication) {

        User currentUser = (User) authentication.getPrincipal();
        domainService.setPrimaryDomain(domainId, currentUser);

        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{domainId}")
    public ResponseEntity<Void> deleteDomain(
            @PathVariable Long storeId,
            @PathVariable Long domainId,
            Authentication authentication) {

        User currentUser = (User) authentication.getPrincipal();
        domainService.deleteDomain(domainId, currentUser);

        return ResponseEntity.ok().build();
    }

    private DomainDTO convertToDTO(Domain domain) {
        DomainDTO dto = new DomainDTO();
        dto.setId(domain.getId());
        dto.setHost(domain.getHost());
        dto.setType(domain.getType()); // Direkt DomainType enum setzen
        dto.setIsPrimary(domain.getIsPrimary());
        dto.setIsVerified(domain.getIsVerified());
        dto.setCreatedAt(domain.getCreatedAt());
        return dto;
    }
}
