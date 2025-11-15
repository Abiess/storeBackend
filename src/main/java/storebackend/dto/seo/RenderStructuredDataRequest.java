package storebackend.dto.seo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RenderStructuredDataRequest {
    private String templateJson;
    private Map<String, Object> context;
}

