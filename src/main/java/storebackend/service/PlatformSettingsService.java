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
        return platformSettingRepository.findBySettingKey("platform_fee_percentage")
                .map(s -> new BigDecimal(s.getSettingValue()))
                .orElse(new BigDecimal("0.05"));
    }

    /**
     * Get recommended reseller margin (default: 30%).
     */
    public BigDecimal getRecommendedResellerMargin() {
        return platformSettingRepository.findBySettingKey("recommended_reseller_margin")
                .map(s -> new BigDecimal(s.getSettingValue()))
                .orElse(new BigDecimal("0.30"));
    }

    /**
     * Update platform fee percentage.
     */
    public void updatePlatformFeePercentage(BigDecimal percentage) {
        PlatformSetting setting = platformSettingRepository.findBySettingKey("platform_fee_percentage")
                .orElse(new PlatformSetting());

        setting.setSettingKey("platform_fee_percentage");
        setting.setSettingValue(percentage.toString());
        setting.setDescription("Platform commission percentage");

        platformSettingRepository.save(setting);
    }

    /**
     * Update recommended reseller margin.
     */
    public void updateRecommendedResellerMargin(BigDecimal margin) {
        PlatformSetting setting = platformSettingRepository.findBySettingKey("recommended_reseller_margin")
                .orElse(new PlatformSetting());

        setting.setSettingKey("recommended_reseller_margin");
        setting.setSettingValue(margin.toString());
        setting.setDescription("Recommended reseller markup percentage");

        platformSettingRepository.save(setting);
    }
}

