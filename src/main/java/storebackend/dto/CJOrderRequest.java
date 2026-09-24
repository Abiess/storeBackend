package storebackend.dto;

/**
 * Request für CJ Order Placement
 */
public record CJOrderRequest(
        Long orderItemId,
        String shippingFirstName,
        String shippingLastName,
        String shippingAddress,
        String shippingCity,
        String shippingPostalCode,
        String shippingCountryCode,
        String shippingPhone
) {
    public void validate() {
        if (orderItemId == null) {
            throw new IllegalArgumentException("Order item ID is required");
        }
        if (shippingAddress == null || shippingAddress.isBlank()) {
            throw new IllegalArgumentException("Shipping address is required");
        }
        if (shippingCountryCode == null || shippingCountryCode.isBlank()) {
            throw new IllegalArgumentException("Country code is required");
        }
    }
}

