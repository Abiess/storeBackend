package storebackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import storebackend.entity.CartItem;

import java.util.List;
import java.util.Optional;

@Repository
public interface CartItemRepository extends JpaRepository<CartItem, Long> {

    @Query("SELECT ci FROM CartItem ci " +
           "LEFT JOIN FETCH ci.product p " +
           "LEFT JOIN FETCH ci.variant v " +
           "LEFT JOIN FETCH v.product " +
           "WHERE ci.cart.id = :cartId")
    List<CartItem> findByCartId(@Param("cartId") Long cartId);

    Optional<CartItem> findByCartIdAndVariantId(Long cartId, Long variantId);
    Optional<CartItem> findByCartIdAndProductIdAndVariantIsNull(Long cartId, Long productId);
    void deleteByCartId(Long cartId);
}
