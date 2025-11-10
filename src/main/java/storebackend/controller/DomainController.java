package storebackend.controller;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import storebackend.dto.CreateDomainRequest;
import storebackend.dto.DomainDTO;
import storebackend.entity.Store;
import storebackend.entity.User;
import storebackend.service.DomainService;
import storebackend.service.StoreService;

import java.util.List;

@RestController
@RequestMapping("/stores/{storeId}/domains")
public class DomainController {

    private final DomainService domainService;
    private final StoreService storeService;

    public DomainController(DomainService domainService, StoreService storeService) {
        this.domainService = domainService;
        this.storeService = storeService;
    }

    @GetMapping
    public ResponseEntity<List<DomainDTO>> getDomains(
            @PathVariable Long storeId,
            @AuthenticationPrincipal User user) {
        Store store = storeService.getStoreById(storeId);

        if (!store.getOwner().getId().equals(user.getId())) {
            return ResponseEntity.status(403).build();
        }

        return ResponseEntity.ok(domainService.getDomainsByStore(store));
    }

    @PostMapping
    public ResponseEntity<DomainDTO> createDomain(
            @PathVariable Long storeId,
            @Valid @RequestBody CreateDomainRequest request,
            @AuthenticationPrincipal User user) {
        Store store = storeService.getStoreById(storeId);

        if (!store.getOwner().getId().equals(user.getId())) {
            return ResponseEntity.status(403).build();
        }

        return ResponseEntity.ok(domainService.createDomain(request, store, user));
    }
}

