package storebackend.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import storebackend.dto.TierPriceCalculationResult;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Unit-Test: TierPriceCalculationResult Factory-Methoden
 * 
 * Testet die DTO-Factory-Methoden und BigDecimal-Vergleiche.
 * KEINE echten Service- oder Controller-Tests.
 */
@ExtendWith(MockitoExtension.class)
public class TierPriceCalculationResultTest {

    @Test
    public void testTierPriceCalculationResult_WithTierPrice() {
        TierPriceCalculationResult result = TierPriceCalculationResult.withTierPrice(
            new BigDecimal("10.00"),
            new BigDecimal("8.00"),
            10
        );

        assertThat(result.getBaseUnitPrice()).isEqualByComparingTo(new BigDecimal("10.00"));
        assertThat(result.getEffectiveUnitPrice()).isEqualByComparingTo(new BigDecimal("8.00"));
        assertThat(result.getTierPriceApplied()).isTrue();
        assertThat(result.getAppliedTierMinimumQuantity()).isEqualTo(10);

        System.out.println("✅ Test: TierPriceCalculationResult.withTierPrice() funktioniert");
    }

    @Test
    public void testTierPriceCalculationResult_WithoutTierPrice() {
        TierPriceCalculationResult result = TierPriceCalculationResult.withoutTierPrice(
            new BigDecimal("10.00")
        );

        assertThat(result.getBaseUnitPrice()).isEqualByComparingTo(new BigDecimal("10.00"));
        assertThat(result.getEffectiveUnitPrice()).isEqualByComparingTo(new BigDecimal("10.00"));
        assertThat(result.getTierPriceApplied()).isFalse();
        assertThat(result.getAppliedTierMinimumQuantity()).isNull();

        System.out.println("✅ Test: TierPriceCalculationResult.withoutTierPrice() funktioniert");
    }

    @Test
    public void testBigDecimalComparison() {
        BigDecimal price1 = new BigDecimal("2.90");
        BigDecimal price2 = new BigDecimal("2.900");
        
        // compareTo() erkennt fachliche Gleichheit
        assertThat(price1.compareTo(price2)).isEqualTo(0);
        
        // equals() erkennt NICHT die Gleichheit (aufgrund scale-Unterschied)
        assertThat(price1.equals(price2)).isFalse();

        System.out.println("✅ Test: BigDecimal.compareTo() korrekt (2.90 == 2.900)");
    }
}
