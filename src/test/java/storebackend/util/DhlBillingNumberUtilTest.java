package storebackend.util;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit Tests für DhlBillingNumberUtil
 */
class DhlBillingNumberUtilTest {
    
    @Test
    void testNormalize_withSpaces() {
        String input = "6385629115 01 01";
        String expected = "63856291150101";
        assertEquals(expected, DhlBillingNumberUtil.normalize(input));
    }
    
    @Test
    void testNormalize_withMultipleSpaces() {
        String input = "6385 6291 15 01 01";
        String expected = "63856291150101";
        assertEquals(expected, DhlBillingNumberUtil.normalize(input));
    }
    
    @Test
    void testNormalize_withHyphens() {
        String input = "6385629115-01-01";
        String expected = "63856291150101";
        assertEquals(expected, DhlBillingNumberUtil.normalize(input));
    }
    
    @Test
    void testNormalize_alreadyNormalized() {
        String input = "63856291150101";
        String expected = "63856291150101";
        assertEquals(expected, DhlBillingNumberUtil.normalize(input));
    }
    
    @Test
    void testNormalize_withMixedSeparators() {
        String input = "6385-6291 15-01 01";
        String expected = "63856291150101";
        assertEquals(expected, DhlBillingNumberUtil.normalize(input));
    }
    
    @Test
    void testNormalize_null() {
        assertNull(DhlBillingNumberUtil.normalize(null));
    }
    
    @Test
    void testNormalize_blank() {
        assertNull(DhlBillingNumberUtil.normalize(""));
        assertNull(DhlBillingNumberUtil.normalize("   "));
    }
    
    @Test
    void testNormalize_onlySpecialChars() {
        assertNull(DhlBillingNumberUtil.normalize("---   ---"));
    }
    
    @Test
    void testValidate_valid14Digits() {
        assertDoesNotThrow(() -> DhlBillingNumberUtil.validate("63856291150101"));
    }
    
    @Test
    void testValidate_tooShort() {
        IllegalArgumentException exception = assertThrows(
            IllegalArgumentException.class,
            () -> DhlBillingNumberUtil.validate("123456789")
        );
        assertTrue(exception.getMessage().contains("must be exactly 14 digits"));
        assertTrue(exception.getMessage().contains("shipping.dhl.invalidBillingNumber"));
    }
    
    @Test
    void testValidate_tooLong() {
        IllegalArgumentException exception = assertThrows(
            IllegalArgumentException.class,
            () -> DhlBillingNumberUtil.validate("123456789012345")
        );
        assertTrue(exception.getMessage().contains("must be exactly 14 digits"));
    }
    
    @Test
    void testValidate_null() {
        IllegalArgumentException exception = assertThrows(
            IllegalArgumentException.class,
            () -> DhlBillingNumberUtil.validate(null)
        );
        assertTrue(exception.getMessage().contains("is required"));
        assertTrue(exception.getMessage().contains("shipping.dhl.invalidBillingNumber"));
    }
    
    @Test
    void testValidate_blank() {
        IllegalArgumentException exception = assertThrows(
            IllegalArgumentException.class,
            () -> DhlBillingNumberUtil.validate("")
        );
        assertTrue(exception.getMessage().contains("is required"));
    }
    
    @Test
    void testValidate_containsLetters() {
        IllegalArgumentException exception = assertThrows(
            IllegalArgumentException.class,
            () -> DhlBillingNumberUtil.validate("6385629115ABC1")
        );
        assertTrue(exception.getMessage().contains("must contain only digits"));
        assertTrue(exception.getMessage().contains("shipping.dhl.invalidBillingNumber"));
    }
    
    @Test
    void testNormalizeAndValidate_validWithSpaces() {
        String input = "6385629115 01 01";
        String expected = "63856291150101";
        assertEquals(expected, DhlBillingNumberUtil.normalizeAndValidate(input));
    }
    
    @Test
    void testNormalizeAndValidate_validWithHyphens() {
        String input = "6385629115-01-01";
        String expected = "63856291150101";
        assertEquals(expected, DhlBillingNumberUtil.normalizeAndValidate(input));
    }
    
    @Test
    void testNormalizeAndValidate_alreadyNormalized() {
        String input = "63856291150101";
        String expected = "63856291150101";
        assertEquals(expected, DhlBillingNumberUtil.normalizeAndValidate(input));
    }
    
    @Test
    void testNormalizeAndValidate_tooShortAfterNormalization() {
        IllegalArgumentException exception = assertThrows(
            IllegalArgumentException.class,
            () -> DhlBillingNumberUtil.normalizeAndValidate("123 456 789")
        );
        assertTrue(exception.getMessage().contains("must be exactly 14 digits"));
    }
    
    @Test
    void testNormalizeAndValidate_tooLongAfterNormalization() {
        IllegalArgumentException exception = assertThrows(
            IllegalArgumentException.class,
            () -> DhlBillingNumberUtil.normalizeAndValidate("1234 5678 9012 3456")
        );
        assertTrue(exception.getMessage().contains("must be exactly 14 digits"));
    }
    
    @Test
    void testNormalizeAndValidate_null() {
        IllegalArgumentException exception = assertThrows(
            IllegalArgumentException.class,
            () -> DhlBillingNumberUtil.normalizeAndValidate(null)
        );
        assertTrue(exception.getMessage().contains("is required"));
    }
    
    @Test
    void testMaskForLogging_valid() {
        String input = "63856291150101";
        String expected = "**********0101";
        assertEquals(expected, DhlBillingNumberUtil.maskForLogging(input));
    }
    
    @Test
    void testMaskForLogging_withSpaces() {
        String input = "6385629115 01 01";
        String expected = "**********0101";
        assertEquals(expected, DhlBillingNumberUtil.maskForLogging(input));
    }
    
    @Test
    void testMaskForLogging_tooShort() {
        String input = "123";
        String expected = "****";
        assertEquals(expected, DhlBillingNumberUtil.maskForLogging(input));
    }
    
    @Test
    void testMaskForLogging_null() {
        String expected = "****";
        assertEquals(expected, DhlBillingNumberUtil.maskForLogging(null));
    }
    
    @Test
    void testMaskForLogging_blank() {
        String expected = "****";
        assertEquals(expected, DhlBillingNumberUtil.maskForLogging(""));
        assertEquals(expected, DhlBillingNumberUtil.maskForLogging("   "));
    }
}
