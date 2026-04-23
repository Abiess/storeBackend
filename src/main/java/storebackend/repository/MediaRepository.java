package storebackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import storebackend.entity.Media;
import storebackend.entity.Store;

import java.util.List;

@Repository
public interface MediaRepository extends JpaRepository<Media, Long> {
    List<Media> findByStore(Store store);
    List<Media> findByStoreId(Long storeId);
    long countByStore(Store store);

    /** Summe aller Datei-Bytes über alle Stores eines Owners. */
    @Query("SELECT COALESCE(SUM(m.sizeBytes), 0) FROM Media m WHERE m.store.owner.id = :ownerId")
    long sumSizeBytesByOwnerId(@Param("ownerId") Long ownerId);

    /** Anzahl aller Medien über alle Stores eines Owners. */
    @Query("SELECT COUNT(m) FROM Media m WHERE m.store.owner.id = :ownerId")
    long countByOwnerId(@Param("ownerId") Long ownerId);
}

