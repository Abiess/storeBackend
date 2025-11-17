package storebackend.service.seo;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import storebackend.dto.seo.RedirectResolveResponse;
import storebackend.dto.seo.RedirectRuleDTO;
import storebackend.entity.RedirectRule;
import storebackend.repository.RedirectRuleRepository;

import java.util.List;
import java.util.regex.Pattern;
import java.util.regex.PatternSyntaxException;

@Service
@RequiredArgsConstructor
@Slf4j
public class RedirectService {

    private final RedirectRuleRepository redirectRuleRepository;

    @Cacheable(value = "redirectRules", key = "#storeId + '_' + (#domainId ?: 'default')")
    public List<RedirectRule> getActiveRules(Long storeId, Long domainId) {
        return redirectRuleRepository.findActiveRulesForStoreAndDomain(storeId, domainId);
    }

    public RedirectResolveResponse resolve(Long storeId, Long domainId, String path) {
        List<RedirectRule> rules = getActiveRules(storeId, domainId);

        for (RedirectRule rule : rules) {
            if (matches(rule, path)) {
                log.debug("Redirect match: {} -> {} ({})", path, rule.getTargetUrl(), rule.getHttpCode());
                return RedirectResolveResponse.builder()
                        .targetUrl(rule.getTargetUrl())
                        .httpCode(rule.getHttpCode())
                        .found(true)
                        .build();
            }
        }

        return RedirectResolveResponse.builder()
                .found(false)
                .build();
    }

    public Page<RedirectRuleDTO> getRules(Long storeId, Long domainId, String query, Pageable pageable) {
        return redirectRuleRepository.findByStoreIdAndFilters(storeId, domainId, query, pageable)
                .map(this::mapToDTO);
    }

    @Transactional
    @CacheEvict(value = "redirectRules", key = "#dto.storeId + '_' + (#dto.domainId ?: 'default')")
    public RedirectRuleDTO createRule(RedirectRuleDTO dto) {
        validateRule(dto);

        RedirectRule entity = RedirectRule.builder()
                .storeId(dto.getStoreId())
                .domainId(dto.getDomainId())
                .sourcePath(dto.getSourcePath())
                .targetUrl(dto.getTargetUrl())
                .httpCode(dto.getHttpCode())
                .isRegex(dto.getIsRegex())
                .priority(dto.getPriority())
                .isActive(dto.getIsActive())
                .comment(dto.getComment())
                .tag(dto.getTag())
                .build();

        entity = redirectRuleRepository.save(entity);
        return mapToDTO(entity);
    }

    @Transactional
    @CacheEvict(value = "redirectRules", key = "#dto.storeId + '_' + (#dto.domainId ?: 'default')")
    public RedirectRuleDTO updateRule(Long id, RedirectRuleDTO dto) {
        RedirectRule entity = redirectRuleRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Redirect rule not found: " + id));

        validateRule(dto);

        entity.setSourcePath(dto.getSourcePath());
        entity.setTargetUrl(dto.getTargetUrl());
        entity.setHttpCode(dto.getHttpCode());
        entity.setIsRegex(dto.getIsRegex());
        entity.setPriority(dto.getPriority());
        entity.setIsActive(dto.getIsActive());
        entity.setComment(dto.getComment());
        entity.setTag(dto.getTag());

        entity = redirectRuleRepository.save(entity);
        return mapToDTO(entity);
    }

    @Transactional
    @CacheEvict(value = "redirectRules", allEntries = true)
    public void deleteRule(Long id) {
        redirectRuleRepository.deleteById(id);
    }

    @CacheEvict(value = "redirectRules", allEntries = true)
    public void refreshCache() {
        log.info("Redirect rules cache refreshed");
    }

    private boolean matches(RedirectRule rule, String path) {
        if (rule.getIsRegex()) {
            try {
                Pattern pattern = Pattern.compile(rule.getSourcePath());
                return pattern.matcher(path).matches();
            } catch (PatternSyntaxException e) {
                log.error("Invalid regex pattern in rule {}: {}", rule.getId(), rule.getSourcePath(), e);
                return false;
            }
        } else {
            return rule.getSourcePath().equals(path);
        }
    }

    private void validateRule(RedirectRuleDTO dto) {
        if (!dto.getIsRegex() && !dto.getSourcePath().startsWith("/")) {
            throw new IllegalArgumentException("Source path must start with '/'");
        }

        if (dto.getIsRegex()) {
            try {
                Pattern.compile(dto.getSourcePath());
            } catch (PatternSyntaxException e) {
                throw new IllegalArgumentException("Invalid regex pattern: " + e.getMessage());
            }
        }

        if (dto.getHttpCode() != 301 && dto.getHttpCode() != 302) {
            throw new IllegalArgumentException("HTTP code must be 301 or 302");
        }
    }

    private RedirectRuleDTO mapToDTO(RedirectRule entity) {
        return RedirectRuleDTO.builder()
                .id(entity.getId())
                .storeId(entity.getStoreId())
                .domainId(entity.getDomainId())
                .sourcePath(entity.getSourcePath())
                .targetUrl(entity.getTargetUrl())
                .httpCode(entity.getHttpCode())
                .isRegex(entity.getIsRegex())
                .priority(entity.getPriority())
                .isActive(entity.getIsActive())
                .comment(entity.getComment())
                .tag(entity.getTag())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}

