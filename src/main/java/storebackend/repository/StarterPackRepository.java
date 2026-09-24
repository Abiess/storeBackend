package storebackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import storebackend.entity.StarterPack;
import storebackend.enums.BusinessType;

import java.util.Optional;

public interface StarterPackRepository extends JpaRepository<StarterPack, Long> {

    Optional<StarterPack> findByCode(String code);

    Optional<StarterPack> findByBusinessTypeAndActiveTrue(BusinessType businessType);
}

