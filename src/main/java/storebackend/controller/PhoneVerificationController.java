package storebackend.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import storebackend.dto.PhoneVerificationRequestDTO;
import storebackend.dto.PhoneVerificationResponseDTO;
import storebackend.dto.VerifyCodeRequestDTO;
import storebackend.service.PhoneVerificationService;



/**
 * Controller für Telefonnummer-Verifizierung (Cash on Delivery)
 *
 * Best Practices:
 * - Public API ohne Authentication (für Guest-Checkout)
 * - Rate Limiting implementiert im Service
 * - Mobile-first Design
 * - Klare Fehlermeldungen
 */
@RestController
@RequestMapping("/api/public/phone-verification")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Phone Verification", description = "APIs für Telefonnummer-Verifizierung (Cash on Delivery)")
public class PhoneVerificationController {

    private final PhoneVerificationService phoneVerificationService;

    @PostMapping("/send-code")
    @Operation(
        summary = "Verifizierungscode senden",
        description = "Sendet einen 6-stelligen Code per WhatsApp (mit SMS-Fallback) zur Telefonnummer-Verifizierung für Cash on Delivery Bestellungen. Rate Limiting: 1 Code pro Minute."
    )
    public ResponseEntity<PhoneVerificationResponseDTO> sendVerificationCode(
            @Valid @RequestBody PhoneVerificationRequestDTO request) {

        log.info("📱 Sending verification code to: {}", request.getPhoneNumber());

        try {
            Long storeId = Long.parseLong(request.getStoreId());
            PhoneVerificationService.PhoneVerificationResult result =
                phoneVerificationService.sendVerificationCode(request.getPhoneNumber(), storeId);

            PhoneVerificationResponseDTO response = new PhoneVerificationResponseDTO();
            response.setSuccess(result.isSuccess());
            response.setVerificationId(result.getVerificationId());
            response.setChannel(result.getChannel());
            response.setMessage(result.getMessage());
            response.setExpiresInMinutes(10);
            response.setRemainingAttempts(3);

            if (result.isSuccess()) {
                log.info("✅ Code sent successfully via {}", result.getChannel());
                return ResponseEntity.ok(response);
            } else {
                log.warn("❌ Failed to send code: {}", result.getMessage());
                return ResponseEntity.badRequest().body(response);
            }

        } catch (Exception e) {
            log.error("❌ Error sending verification code", e);
            PhoneVerificationResponseDTO errorResponse = new PhoneVerificationResponseDTO();
            errorResponse.setSuccess(false);
            errorResponse.setMessage("Fehler beim Senden des Codes. Bitte versuchen Sie es später erneut.");
            return ResponseEntity.internalServerError().body(errorResponse);
        }
    }

    @PostMapping("/verify-code")
    @Operation(
        summary = "Code verifizieren",
        description = "Verifiziert den eingegebenen 6-stelligen Code. Maximal 3 Versuche pro Code. Code ist 10 Minuten gültig."
    )
    public ResponseEntity<PhoneVerificationResponseDTO> verifyCode(
            @Valid @RequestBody VerifyCodeRequestDTO request) {

        log.info("🔐 Verifying code for verification ID: {}", request.getVerificationId());

        try {
            PhoneVerificationService.PhoneVerificationResult result =
                phoneVerificationService.verifyCode(request.getVerificationId(), request.getCode());

            PhoneVerificationResponseDTO response = new PhoneVerificationResponseDTO();
            response.setSuccess(result.isSuccess());
            response.setVerificationId(result.getVerificationId());
            response.setChannel(result.getChannel());
            response.setMessage(result.getMessage());

            if (result.isSuccess()) {
                log.info("✅ Code verified successfully");
                return ResponseEntity.ok(response);
            } else {
                log.warn("❌ Code verification failed: {}", result.getMessage());
                return ResponseEntity.badRequest().body(response);
            }

        } catch (Exception e) {
            log.error("❌ Error verifying code", e);
            PhoneVerificationResponseDTO errorResponse = new PhoneVerificationResponseDTO();
            errorResponse.setSuccess(false);
            errorResponse.setMessage("Fehler bei der Verifizierung. Bitte versuchen Sie es erneut.");
            return ResponseEntity.internalServerError().body(errorResponse);
        }
    }

    @GetMapping("/status/{verificationId}")
    @Operation(
        summary = "Verifizierungsstatus prüfen",
        description = "Prüft den Status einer Verifizierung (z.B. ob bereits verifiziert)"
    )
    public ResponseEntity<PhoneVerificationResponseDTO> checkStatus(
            @PathVariable Long verificationId) {

        log.info("📊 Checking verification status for ID: {}", verificationId);

        try {
            // Diese Methode muss noch im Service implementiert werden
            PhoneVerificationResponseDTO response = new PhoneVerificationResponseDTO();
            response.setSuccess(true);
            response.setVerificationId(verificationId);
            response.setMessage("Verifizierung gefunden");

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("❌ Error checking status", e);
            return ResponseEntity.notFound().build();
        }
    }
}
