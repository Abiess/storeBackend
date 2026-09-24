package storebackend.dto;

/**
 * Response von CJ Order Placement
 */
public record CJOrderResponse(
        boolean success,
        String cjOrderId,
        String message,
        String errorCode
) {
    public static CJOrderResponse success(String cjOrderId) {
        return new CJOrderResponse(true, cjOrderId, "Order placed successfully", null);
    }

    public static CJOrderResponse error(String message, String errorCode) {
        return new CJOrderResponse(false, null, message, errorCode);
    }
}

