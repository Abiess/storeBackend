package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CartDTO {
    private String currency;
    private Long subtotalCents;
    private String customerEmail;
    private List<CartItemDTO> items = new ArrayList<>();
}

