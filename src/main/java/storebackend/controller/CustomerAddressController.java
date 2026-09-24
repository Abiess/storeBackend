package storebackend.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import storebackend.dto.CustomerAddressDTO;
import storebackend.entity.User;
import storebackend.enums.AddressType;
import storebackend.repository.UserRepository;
import storebackend.service.CustomerAddressService;

import java.util.List;

@RestController
@RequestMapping("/api/customer/addresses")
@RequiredArgsConstructor
public class CustomerAddressController {

    private final CustomerAddressService addressService;
    private final UserRepository userRepository;

    @PostMapping
    public ResponseEntity<CustomerAddressDTO> createAddress(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody CustomerAddressDTO addressDTO) {

        User user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("Benutzer nicht gefunden"));

        CustomerAddressDTO created = addressService.createAddress(user.getId(), addressDTO);
        return ResponseEntity.ok(created);
    }

    @GetMapping
    public ResponseEntity<List<CustomerAddressDTO>> getMyAddresses(
            @AuthenticationPrincipal UserDetails userDetails) {

        User user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("Benutzer nicht gefunden"));

        List<CustomerAddressDTO> addresses = addressService.getAddressesByCustomer(user.getId());
        return ResponseEntity.ok(addresses);
    }

    @GetMapping("/type/{type}")
    public ResponseEntity<List<CustomerAddressDTO>> getAddressesByType(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable AddressType type) {

        User user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("Benutzer nicht gefunden"));

        List<CustomerAddressDTO> addresses = addressService.getAddressesByType(user.getId(), type);
        return ResponseEntity.ok(addresses);
    }

    @GetMapping("/default/{type}")
    public ResponseEntity<CustomerAddressDTO> getDefaultAddress(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable AddressType type) {

        User user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("Benutzer nicht gefunden"));

        CustomerAddressDTO address = addressService.getDefaultAddress(user.getId(), type);
        return address != null ? ResponseEntity.ok(address) : ResponseEntity.notFound().build();
    }

    @PutMapping("/{addressId}")
    public ResponseEntity<CustomerAddressDTO> updateAddress(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long addressId,
            @RequestBody CustomerAddressDTO addressDTO) {

        User user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("Benutzer nicht gefunden"));

        CustomerAddressDTO updated = addressService.updateAddress(addressId, user.getId(), addressDTO);
        return ResponseEntity.ok(updated);
    }

    @PutMapping("/{addressId}/set-default")
    public ResponseEntity<CustomerAddressDTO> setAsDefault(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long addressId) {

        User user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("Benutzer nicht gefunden"));

        CustomerAddressDTO updated = addressService.setAsDefault(addressId, user.getId());
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{addressId}")
    public ResponseEntity<Void> deleteAddress(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long addressId) {

        User user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("Benutzer nicht gefunden"));

        addressService.deleteAddress(addressId, user.getId());
        return ResponseEntity.noContent().build();
    }
}

