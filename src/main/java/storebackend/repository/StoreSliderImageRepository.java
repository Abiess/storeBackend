package storebackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import storebackend.entity.StoreSliderImage;
import storebackend.enums.SliderImageType;

import java.util.List;

@Repository
public interface StoreSliderImageRepository extends JpaRepository<StoreSliderImage, Long> {
    List<StoreSliderImage> findByStoreIdOrderByDisplayOrderAsc(Long storeId);

    List<StoreSliderImage> findByStoreIdAndIsActiveTrueOrderByDisplayOrderAsc(Long storeId);

    List<StoreSliderImage> findByStoreIdAndImageTypeOrderByDisplayOrderAsc(Long storeId, SliderImageType imageType);

    @Query("SELECT si FROM StoreSliderImage si WHERE si.store.id = :storeId AND si.isActive = true AND si.imageType IN :types ORDER BY si.displayOrder ASC")
    List<StoreSliderImage> findByStoreIdAndActiveAndImageTypeIn(@Param("storeId") Long storeId, @Param("types") List<SliderImageType> types);

    long countByStoreIdAndImageType(Long storeId, SliderImageType imageType);

    void deleteByStoreId(Long storeId);
}

