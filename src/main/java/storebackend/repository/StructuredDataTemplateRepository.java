package storebackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import storebackend.entity.StructuredDataTemplate;

import java.util.List;
import java.util.Optional;

@Repository
public interface StructuredDataTemplateRepository extends JpaRepository<StructuredDataTemplate, Long> {

    List<StructuredDataTemplate> findByStoreIdOrderByTypeAsc(Long storeId);

    Optional<StructuredDataTemplate> findByStoreIdAndType(Long storeId, StructuredDataTemplate.TemplateType type);

    List<StructuredDataTemplate> findByStoreIdAndIsActiveTrue(Long storeId);
}

