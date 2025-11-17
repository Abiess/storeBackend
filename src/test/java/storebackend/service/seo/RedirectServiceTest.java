package storebackend.service.seo;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import storebackend.dto.seo.RedirectResolveResponse;
import storebackend.entity.RedirectRule;
import storebackend.repository.RedirectRuleRepository;

import java.util.Arrays;
import java.util.Collections;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.when;

/**
 * Unit tests for RedirectService - focus on regex and priority logic.
 */
@ExtendWith(MockitoExtension.class)
class RedirectServiceTest {

    @Mock
    private RedirectRuleRepository redirectRuleRepository;

    @InjectMocks
    private RedirectService redirectService;

    private Long testStoreId = 1L;
    private Long testDomainId = 10L;

    @BeforeEach
    void setUp() {
        // Mock cache behavior - return rules directly
    }

    @Test
    void testExactMatch() {
        RedirectRule rule = RedirectRule.builder()
                .id(1L)
                .storeId(testStoreId)
                .sourcePath("/old-product")
                .targetUrl("/new-product")
                .httpCode(301)
                .isRegex(false)
                .priority(100)
                .isActive(true)
                .build();

        when(redirectRuleRepository.findActiveRulesForStoreAndDomain(anyLong(), anyLong()))
                .thenReturn(Collections.singletonList(rule));

        RedirectResolveResponse response = redirectService.resolve(testStoreId, testDomainId, "/old-product");

        assertTrue(response.isFound());
        assertEquals("/new-product", response.getTargetUrl());
        assertEquals(301, response.getHttpCode());
    }

    @Test
    void testRegexMatch() {
        RedirectRule rule = RedirectRule.builder()
                .id(2L)
                .storeId(testStoreId)
                .sourcePath("/products/(\\d+).*")
                .targetUrl("/p/$1")
                .httpCode(302)
                .isRegex(true)
                .priority(50)
                .isActive(true)
                .build();

        when(redirectRuleRepository.findActiveRulesForStoreAndDomain(anyLong(), anyLong()))
                .thenReturn(Collections.singletonList(rule));

        RedirectResolveResponse response = redirectService.resolve(testStoreId, testDomainId, "/products/123/cool-hoodie");

        assertTrue(response.isFound());
        assertEquals("/p/$1", response.getTargetUrl());
        assertEquals(302, response.getHttpCode());
    }

    @Test
    void testPriorityOrdering() {
        RedirectRule lowPriority = RedirectRule.builder()
                .id(1L)
                .sourcePath("/sale")
                .targetUrl("/clearance")
                .httpCode(301)
                .isRegex(false)
                .priority(200)
                .isActive(true)
                .build();

        RedirectRule highPriority = RedirectRule.builder()
                .id(2L)
                .sourcePath("/sale")
                .targetUrl("/special-offer")
                .httpCode(302)
                .isRegex(false)
                .priority(10)
                .isActive(true)
                .build();

        when(redirectRuleRepository.findActiveRulesForStoreAndDomain(anyLong(), anyLong()))
                .thenReturn(Arrays.asList(highPriority, lowPriority));

        RedirectResolveResponse response = redirectService.resolve(testStoreId, testDomainId, "/sale");

        assertTrue(response.isFound());
        assertEquals("/special-offer", response.getTargetUrl());
        assertEquals(302, response.getHttpCode());
    }

    @Test
    void testNoMatch() {
        when(redirectRuleRepository.findActiveRulesForStoreAndDomain(anyLong(), anyLong()))
                .thenReturn(Collections.emptyList());

        RedirectResolveResponse response = redirectService.resolve(testStoreId, testDomainId, "/nonexistent");

        assertFalse(response.isFound());
    }

    @Test
    void testInvalidRegexHandledGracefully() {
        RedirectRule badRegex = RedirectRule.builder()
                .id(3L)
                .sourcePath("[invalid(regex")
                .targetUrl("/fallback")
                .httpCode(301)
                .isRegex(true)
                .priority(100)
                .isActive(true)
                .build();

        when(redirectRuleRepository.findActiveRulesForStoreAndDomain(anyLong(), anyLong()))
                .thenReturn(Collections.singletonList(badRegex));

        RedirectResolveResponse response = redirectService.resolve(testStoreId, testDomainId, "/test");

        assertFalse(response.isFound());
    }
}

