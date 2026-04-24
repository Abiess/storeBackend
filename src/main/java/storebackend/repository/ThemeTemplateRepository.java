package storebackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import storebackend.entity.ThemeTemplate;

import java.util.List;
import java.util.Optional;

@Repository
public interface ThemeTemplateRepository extends JpaRepository<ThemeTemplate, Long> {

    List<ThemeTemplate> findByIsActiveTrueOrderBySortOrderAscIdAsc();

    List<ThemeTemplate> findByIsFreeTrueAndIsActiveTrueOrderBySortOrderAscIdAsc();

    Optional<ThemeTemplate> findByCode(String code);
}

