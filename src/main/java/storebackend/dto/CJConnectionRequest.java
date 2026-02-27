package storebackend.dto;

import storebackend.enums.SupplierType;

/**
 * Request für CJ Connection
 */
public record CJConnectionRequest(
        String email,
        String password
) {
    public void validate() {
        if (email == null || email.isBlank()) {
            throw new IllegalArgumentException("Email is required");
        }
        if (password == null || password.isBlank()) {
            throw new IllegalArgumentException("Password is required");
        }
    }
}

