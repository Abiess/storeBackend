package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ValidateCouponsRequest {
    private String domainHost;
    private CartDTO cart;
    private List<String> appliedCodes = new ArrayList<>();
}

