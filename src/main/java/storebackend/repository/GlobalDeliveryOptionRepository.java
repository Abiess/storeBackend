package storebackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import storebackend.entity.GlobalDeliveryOption;

import java.util.List;

@Repository
public interface GlobalDeliveryOptionRepository extends JpaRepository<GlobalDeliveryOption, Long> {

    /** All active options sorted by sortOrder ascending */
    List<GlobalDeliveryOption> findByIsActiveTrueOrderBySortOrderAsc();

    /** All options sorted by sortOrder (for admin view) */
    List<GlobalDeliveryOption> findAllByOrderBySortOrderAsc();
}

