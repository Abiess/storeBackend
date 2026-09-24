package storebackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import storebackend.entity.DefaultSliderImage;

import java.util.List;

@Repository
public interface DefaultSliderImageRepository extends JpaRepository<DefaultSliderImage, Long> {
    List<DefaultSliderImage> findByCategoryAndIsActiveTrueOrderByDisplayOrderAsc(String category);
    List<DefaultSliderImage> findByIsActiveTrueOrderByDisplayOrderAsc();
}
