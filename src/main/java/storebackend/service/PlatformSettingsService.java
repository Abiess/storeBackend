package storebackend.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import storebackend.entity.PlatformSetting;
import storebackend.repository.PlatformSettingRepository;

import java.math.BigDecimal;

/**
 * Service for managing platform-wide settings.
 */
@Service
@RequiredArgsConstructor
public class PlatformSettingsService {

    private final PlatformSettingRepository platformSettingRepository;

    /**
     * Get platform commission percentage (default: 5%).
     */
    public BigDecimal getPlatformFeePercentage() {
        return platformSettingRepository.findByKey("platform_fee_percentage")
                .map(s -> new BigDecimal(s.getValue()))
                .orElse(new BigDecimal("0.05"));
    }

    /**
     * Get recommended reseller margin (default: 30%).
     */
    public BigDecimal getRecommendedResellerMargin() {
        return platformSettingRepository.findByKey("recommended_reseller_margin")
                .map(s -> new BigDecimal(s.getValue()))
                .orElse(new BigDecimal("0.30"));
    }

    /**
     * Update platform fee percentage.
     */
    public void updatePlatformFeePercentage(BigDecimal percentage) {
        PlatformSetting setting = platformSettingRepository.findByKey("platform_fee_percentage")
                .orElse(new PlatformSetting());

        setting.setKey("platform_fee_percentage");
        setting.setValue(percentage.toString());
        setting.setDescription("Platform commission percentage");

        platformSettingRepository.save(setting);
    }

    /**
     * Update recommended reseller margin.
     */
    public void updateRecommendedResellerMargin(BigDecimal margin) {
        PlatformSetting setting = platformSettingRepository.findByKey("recommended_reseller_margin")
                .orElse(new PlatformSetting());

        setting.setKey("recommended_reseller_margin");
        setting.setValue(margin.toString());
        setting.setDescription("Recommended reseller markup percentage");

        platformSettingRepository.save(setting);
    }
}

