package storebackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import storebackend.entity.Media;
import storebackend.entity.Store;

import java.util.List;

@Repository
public interface MediaRepository extends JpaRepository<Media, Long> {
    List<Media> findByStore(Store store);
    List<Media> findByStoreId(Long storeId);
    long countByStore(Store store);
}

