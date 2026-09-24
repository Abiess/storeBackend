package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PlanDetails {
    private String plan;
    private String name;
    private String description;
    private Double monthlyPrice;
    private Double yearlyPrice;
    private Boolean popular;
    private Map<String, Object> features;
}

