package storebackend.service.seo;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.github.mustachejava.DefaultMustacheFactory;
import com.github.mustachejava.Mustache;
import com.github.mustachejava.MustacheFactory;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import storebackend.dto.seo.StructuredDataTemplateDTO;
import storebackend.entity.StructuredDataTemplate;
import storebackend.repository.StructuredDataTemplateRepository;

import java.io.StringReader;
import java.io.StringWriter;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class StructuredDataService {

    private final StructuredDataTemplateRepository templateRepository;
    private final MustacheFactory mustacheFactory = new DefaultMustacheFactory();
    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Get all templates for a store.
     */
    public List<StructuredDataTemplateDTO> getTemplates(Long storeId) {
        List<StructuredDataTemplate> templates = templateRepository.findByStoreIdOrderByTypeAsc(storeId);
        return templates.stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    /**
     * Save or update a template.
     */
    @Transactional
    public StructuredDataTemplateDTO saveTemplate(StructuredDataTemplateDTO dto) {
        StructuredDataTemplate entity;

        if (dto.getId() != null) {
            entity = templateRepository.findById(dto.getId())
                    .orElseThrow(() -> new IllegalArgumentException("Template not found: " + dto.getId()));
            entity.setType(dto.getType());
            entity.setTemplateJson(dto.getTemplateJson());
            entity.setIsActive(dto.getIsActive());
        } else {
            entity = StructuredDataTemplate.builder()
                    .storeId(dto.getStoreId())
                    .type(dto.getType())
                    .templateJson(dto.getTemplateJson())
                    .isActive(dto.getIsActive() != null ? dto.getIsActive() : true)
                    .build();
        }

        StructuredDataTemplate saved = templateRepository.save(entity);
        return toDTO(saved);
    }

    /**
     * Delete a template.
     */
    @Transactional
    public void deleteTemplate(Long id) {
        templateRepository.deleteById(id);
    }

    /**
     * Render a template with context variables using Mustache.
     */
    public String render(String templateJson, Map<String, Object> context) {
        try {
            // Parse and re-serialize the template JSON to ensure it's valid
            Object jsonObject = objectMapper.readValue(templateJson, Object.class);
            String normalizedJson = objectMapper.writeValueAsString(jsonObject);

            // Render with Mustache
            Mustache mustache = mustacheFactory.compile(new StringReader(normalizedJson), "template");
            StringWriter writer = new StringWriter();
            mustache.execute(writer, context).flush();

            return writer.toString();
        } catch (Exception e) {
            log.error("Failed to render structured data template", e);
            throw new RuntimeException("Failed to render template: " + e.getMessage(), e);
        }
    }

    /**
     * Get active templates for a store and type.
     */
    public StructuredDataTemplateDTO getActiveTemplate(Long storeId, StructuredDataTemplate.TemplateType type) {
        return templateRepository.findByStoreIdAndType(storeId, type)
                .filter(StructuredDataTemplate::getIsActive)
                .map(this::toDTO)
                .orElse(null);
    }

    /**
     * Convert entity to DTO.
     */
    private StructuredDataTemplateDTO toDTO(StructuredDataTemplate entity) {
        return StructuredDataTemplateDTO.builder()
                .id(entity.getId())
                .storeId(entity.getStoreId())
                .type(entity.getType())
                .templateJson(entity.getTemplateJson())
                .isActive(entity.getIsActive())
                .build();
    }
}

