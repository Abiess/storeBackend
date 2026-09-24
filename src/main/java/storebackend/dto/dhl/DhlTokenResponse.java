package storebackend.dto.dhl;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DHL OAuth Token Response
 * API: POST /parcel/de/account/auth/ropc/v1/token
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DhlTokenResponse {
    
    @JsonProperty("access_token")
    private String accessToken;
    
    @JsonProperty("expires_in")
    private Integer expiresIn;  // Sekunden bis Token abläuft
    
    @JsonProperty("token_type")
    private String tokenType;   // "Bearer"
    
    /**
     * Timestamp wann Token geholt wurde (für Cache-Verwaltung)
     */
    private transient long fetchedAt = System.currentTimeMillis();
    
    /**
     * Ist der Token noch gültig? (mit 60s Sicherheitspuffer)
     */
    public boolean isValid() {
        if (accessToken == null || expiresIn == null) {
            return false;
        }
        long now = System.currentTimeMillis();
        long expiresAtMillis = fetchedAt + ((long) expiresIn * 1000);
        long bufferMillis = 60 * 1000; // 60 Sekunden Puffer
        return now < (expiresAtMillis - bufferMillis);
    }
}
