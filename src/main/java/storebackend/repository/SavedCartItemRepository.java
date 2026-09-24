package storebackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import storebackend.entity.SavedCartItem;

import java.util.List;

@Repository
public interface SavedCartItemRepository extends JpaRepository<SavedCartItem, Long> {

    List<SavedCartItem> findBySavedCartId(Long savedCartId);

    void deleteBySavedCartId(Long savedCartId);
}
