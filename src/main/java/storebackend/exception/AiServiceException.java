package storebackend.exception;

/**
 * Custom exception for AI service errors
 * Used when AI image captioning or other AI operations fail
 */
public class AiServiceException extends RuntimeException {
    
    public AiServiceException(String message) {
        super(message);
    }
    
    public AiServiceException(String message, Throwable cause) {
        super(message, cause);
    }
}

