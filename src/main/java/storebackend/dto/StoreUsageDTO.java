package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class StoreUsageDTO {
    private Long id;
    private Long storeId;
    private Long storageBytes;
    private Long storageMb;
    private Integer imageCount;
    private Integer productCount;
    private Long maxStorageMb;
    private Integer maxImageCount;
    private Integer maxProducts;
    private Double storageUsagePercent;
    private Double imageUsagePercent;
    private Double productUsagePercent;
}

