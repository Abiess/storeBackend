package storebackend.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import storebackend.dto.PublicStoreDTO;
import storebackend.service.PublicStoreService;

@RestController
@RequestMapping("/public/store")
public class PublicStoreController {

    private final PublicStoreService publicStoreService;

    public PublicStoreController(PublicStoreService publicStoreService) {
        this.publicStoreService = publicStoreService;
    }

    @GetMapping("/resolve")
    public ResponseEntity<PublicStoreDTO> resolveStore(@RequestParam String host) {
        try {
            return ResponseEntity.ok(publicStoreService.resolveStoreByHost(host));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }
}
