package storebackend.controller;

import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import storebackend.dto.BrandAssetsResponse;
import storebackend.dto.BrandGenerateRequest;
import storebackend.dto.BrandGenerateResponse;
import storebackend.service.BrandKitService;

import java.util.Map;

@RestController
@RequestMapping("/api/stores/{storeId}/brand")
@CrossOrigin(origins = "*")
public class BrandKitController {

    @Autowired
    private BrandKitService brandKitService;

    @PostMapping("/generate")
    public ResponseEntity<BrandGenerateResponse> generateBrandKit(
            @PathVariable Long storeId,
            @Valid @RequestBody BrandGenerateRequest request) {

        BrandGenerateResponse response = brandKitService.generateBrandKit(storeId, request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/assets")
    public ResponseEntity<BrandAssetsResponse> getBrandAssets(@PathVariable Long storeId) {
        // This would retrieve existing assets from storage
        // For now, return a placeholder response
        return ResponseEntity.ok(BrandAssetsResponse.builder()
            .assets(Map.of())
            .paletteTokens(Map.of())
            .build());
    }

    @PutMapping("/palette")
    public ResponseEntity<Map<String, String>> updatePalette(
            @PathVariable Long storeId,
            @RequestBody Map<String, String> paletteTokens) {

        // Store updated palette tokens
        // For now, just echo back
        return ResponseEntity.ok(paletteTokens);
    }
}
package storebackend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

@Data
public class BrandGenerateRequest {
    @NotBlank
    private String shopName;

    private String slogan;

    private String industry;

    @NotNull
    private String style; // minimal, playful, geometric, organic

    private List<String> preferredColors; // hex codes

    private List<String> forbiddenColors; // hex codes

    private String salt; // for regeneration
}

