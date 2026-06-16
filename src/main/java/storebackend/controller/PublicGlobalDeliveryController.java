package storebackend.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import storebackend.dto.GlobalDeliveryOptionDTO;
import storebackend.service.GlobalDeliveryOptionService;

import java.util.List;

/**
 * Public controller for platform-wide global delivery options.
 * No authentication required – used by storefront checkout.
 *
 * GET /api/public/delivery-options → list all active options
 */
@RestController
@RequestMapping("/api/public/delivery-options")
@Tag(name = "Public – Global Delivery Options", description = "Platform-wide delivery options for storefront checkout (no auth)")
@RequiredArgsConstructor
@Slf4j
public class PublicGlobalDeliveryController {

    private final GlobalDeliveryOptionService service;

    @GetMapping
    @Operation(
            summary = "List active global delivery options",
            description = "Returns all active platform-managed delivery options. " +
                    "No authentication required. Used by storefront checkout to show available shipping methods."
    )
    public ResponseEntity<List<GlobalDeliveryOptionDTO>> getActiveOptions() {
        log.debug("📦 Public request: active global delivery options");
        return ResponseEntity.ok(service.getActiveOptions());
    }
}

