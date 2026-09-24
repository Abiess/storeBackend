package storebackend.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import storebackend.entity.DhlActivityLog;
import storebackend.enums.DhlActivityAction;
import storebackend.repository.DhlActivityLogRepository;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Test für DhlActivityLogService
 * 
 * Phase 3A.3 Fix - Specification-basierte Queries
 * 
 * Test-Scenarios:
 * 1. Keine optionalen Filter (nur storeId)
 * 2. today Filter
 * 3. action Filter
 * 4. user Filter
 * 5. Alle Filter kombiniert
 */
class DhlActivityLogServiceTest {
    
    @Mock
    private DhlActivityLogRepository repository;
    
    @InjectMocks
    private DhlActivityLogService service;
    
    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }
    
    /**
     * Test 1: Keine optionalen Filter
     * 
     * GET /api/stores/121/dhl/activity-log?page=0&size=20
     * → WHERE store_id = 121
     */
    @Test
    void testFindWithFilters_NoOptionalFilters() {
        // Arrange
        Long storeId = 121L;
        Pageable pageable = PageRequest.of(0, 20);
        
        DhlActivityLog log1 = createActivityLog(1L, storeId, DhlActivityAction.STORED);
        DhlActivityLog log2 = createActivityLog(2L, storeId, DhlActivityAction.PICKED_UP);
        Page<DhlActivityLog> mockPage = new PageImpl<>(List.of(log1, log2));
        
        when(repository.findAll(any(Specification.class), eq(pageable)))
            .thenReturn(mockPage);
        
        // Act
        Page<DhlActivityLog> result = service.findWithFilters(storeId, null, null, null, pageable);
        
        // Assert
        assertNotNull(result);
        assertEquals(2, result.getTotalElements());
        verify(repository, times(1)).findAll(any(Specification.class), eq(pageable));
    }
    
    /**
     * Test 2: today Filter
     * 
     * → WHERE store_id = 121
     *   AND created_at >= startOfToday
     */
    @Test
    void testFindWithFilters_TodayOnly() {
        // Arrange
        Long storeId = 121L;
        LocalDateTime startOfToday = LocalDateTime.now().withHour(0).withMinute(0).withSecond(0);
        Pageable pageable = PageRequest.of(0, 20);
        
        DhlActivityLog log1 = createActivityLog(1L, storeId, DhlActivityAction.STORED);
        Page<DhlActivityLog> mockPage = new PageImpl<>(List.of(log1));
        
        when(repository.findAll(any(Specification.class), eq(pageable)))
            .thenReturn(mockPage);
        
        // Act
        Page<DhlActivityLog> result = service.findWithFilters(storeId, null, null, startOfToday, pageable);
        
        // Assert
        assertNotNull(result);
        assertEquals(1, result.getTotalElements());
        verify(repository, times(1)).findAll(any(Specification.class), eq(pageable));
    }
    
    /**
     * Test 3: action Filter
     * 
     * → WHERE store_id = 121
     *   AND action = STORED
     */
    @Test
    void testFindWithFilters_ActionOnly() {
        // Arrange
        Long storeId = 121L;
        DhlActivityAction action = DhlActivityAction.STORED;
        Pageable pageable = PageRequest.of(0, 20);
        
        DhlActivityLog log1 = createActivityLog(1L, storeId, action);
        Page<DhlActivityLog> mockPage = new PageImpl<>(List.of(log1));
        
        when(repository.findAll(any(Specification.class), eq(pageable)))
            .thenReturn(mockPage);
        
        // Act
        Page<DhlActivityLog> result = service.findWithFilters(storeId, action, null, null, pageable);
        
        // Assert
        assertNotNull(result);
        assertEquals(1, result.getTotalElements());
        assertEquals(action, result.getContent().get(0).getAction());
        verify(repository, times(1)).findAll(any(Specification.class), eq(pageable));
    }
    
    /**
     * Test 4: user Filter
     * 
     * → WHERE store_id = 121
     *   AND user_id = 1
     */
    @Test
    void testFindWithFilters_UserOnly() {
        // Arrange
        Long storeId = 121L;
        Long userId = 1L;
        Pageable pageable = PageRequest.of(0, 20);
        
        DhlActivityLog log1 = createActivityLog(1L, storeId, DhlActivityAction.STORED);
        log1.setUserId(userId);
        Page<DhlActivityLog> mockPage = new PageImpl<>(List.of(log1));
        
        when(repository.findAll(any(Specification.class), eq(pageable)))
            .thenReturn(mockPage);
        
        // Act
        Page<DhlActivityLog> result = service.findWithFilters(storeId, null, userId, null, pageable);
        
        // Assert
        assertNotNull(result);
        assertEquals(1, result.getTotalElements());
        assertEquals(userId, result.getContent().get(0).getUserId());
        verify(repository, times(1)).findAll(any(Specification.class), eq(pageable));
    }
    
    /**
     * Test 5: Alle Filter kombiniert
     * 
     * → WHERE store_id = 121
     *   AND action = STORED
     *   AND user_id = 1
     *   AND created_at >= startOfToday
     */
    @Test
    void testFindWithFilters_AllFiltersCombined() {
        // Arrange
        Long storeId = 121L;
        DhlActivityAction action = DhlActivityAction.STORED;
        Long userId = 1L;
        LocalDateTime startOfToday = LocalDateTime.now().withHour(0).withMinute(0).withSecond(0);
        Pageable pageable = PageRequest.of(0, 20);
        
        DhlActivityLog log1 = createActivityLog(1L, storeId, action);
        log1.setUserId(userId);
        log1.setCreatedAt(LocalDateTime.now());
        Page<DhlActivityLog> mockPage = new PageImpl<>(List.of(log1));
        
        when(repository.findAll(any(Specification.class), eq(pageable)))
            .thenReturn(mockPage);
        
        // Act
        Page<DhlActivityLog> result = service.findWithFilters(storeId, action, userId, startOfToday, pageable);
        
        // Assert
        assertNotNull(result);
        assertEquals(1, result.getTotalElements());
        assertEquals(action, result.getContent().get(0).getAction());
        assertEquals(userId, result.getContent().get(0).getUserId());
        verify(repository, times(1)).findAll(any(Specification.class), eq(pageable));
    }
    
    /**
     * Test: storeId null → Exception
     */
    @Test
    void testFindWithFilters_StoreIdNull_ThrowsException() {
        // Arrange
        Pageable pageable = PageRequest.of(0, 20);
        
        // Act & Assert
        assertThrows(IllegalArgumentException.class, () -> {
            service.findWithFilters(null, null, null, null, pageable);
        });
        
        verify(repository, never()).findAll(any(Specification.class), any(Pageable.class));
    }
    
    // Helper
    private DhlActivityLog createActivityLog(Long id, Long storeId, DhlActivityAction action) {
        DhlActivityLog log = new DhlActivityLog();
        log.setId(id);
        log.setStoreId(storeId);
        log.setAction(action);
        log.setTrackingCode("TEST123");
        log.setCreatedAt(LocalDateTime.now());
        return log;
    }
}
