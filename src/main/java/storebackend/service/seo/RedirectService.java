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
                return new RedirectResolveResponse(rule.getTargetUrl(), rule.getHttpCode(), true);
            }
        }

        return new RedirectResolveResponse(null, null, false);
    }

    public Page<RedirectRuleDTO> getRules(Long storeId, Long domainId, String query, Pageable pageable) {
        return redirectRuleRepository.findByStoreIdAndFilters(storeId, domainId, query, pageable)
                .map(this::mapToDTO);
    }

    @Transactional
    @CacheEvict(value = "redirectRules", key = "#dto.storeId + '_' + (#dto.domainId ?: 'default')")
    public RedirectRuleDTO createRule(RedirectRuleDTO dto) {
        validateRule(dto);

        RedirectRule entity = new RedirectRule();
        entity.setStoreId(dto.getStoreId());
        entity.setDomainId(dto.getDomainId());
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
        if (rule.getRegex()) {
            try {
                Pattern pattern = Pattern.compile(rule.getSourcePath());
                return pattern.matcher(path).matches();
            } catch (PatternSyntaxException e) {
                log.warn("Invalid regex pattern in rule {}: {}", rule.getId(), rule.getSourcePath());
                return false;
            }
        } else {
            return rule.getSourcePath().equals(path);
        }
    }

    private void validateRule(RedirectRuleDTO dto) {
        if (dto.getSourcePath() == null || dto.getSourcePath().isBlank()) {
            throw new IllegalArgumentException("Source path is required");
        }

        if (dto.getTargetUrl() == null || dto.getTargetUrl().isBlank()) {
            throw new IllegalArgumentException("Target URL is required");
        }

        if (dto.getHttpCode() != 301 && dto.getHttpCode() != 302) {
            throw new IllegalArgumentException("HTTP code must be 301 or 302");
        }
    }

    private RedirectRuleDTO mapToDTO(RedirectRule entity) {
        RedirectRuleDTO dto = new RedirectRuleDTO();
        dto.setId(entity.getId());
        dto.setStoreId(entity.getStoreId());
        dto.setDomainId(entity.getDomainId());
        dto.setSourcePath(entity.getSourcePath());
        dto.setTargetUrl(entity.getTargetUrl());
        dto.setHttpCode(entity.getHttpCode());
        dto.setIsRegex(entity.getIsRegex());
        dto.setPriority(entity.getPriority());
        dto.setIsActive(entity.getIsActive());
        dto.setComment(entity.getComment());
        dto.setTag(entity.getTag());
        dto.setCreatedAt(entity.getCreatedAt());
        dto.setUpdatedAt(entity.getUpdatedAt());
        return dto;
    }
}
