package storebackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import storebackend.entity.DocumentShare;

import java.util.List;
import java.util.Optional;

@Repository
public interface DocumentShareRepository extends JpaRepository<DocumentShare, Long> {

    List<DocumentShare> findByDocumentId(Long documentId);

    Optional<DocumentShare> findByDocumentIdAndSharedWithUserId(Long documentId, Long sharedWithUserId);

    boolean existsByDocumentIdAndSharedWithUserId(Long documentId, Long sharedWithUserId);

    /** "Mit mir geteilt"-Tab: alle Dokumente, die für den aktuellen User freigegeben wurden. */
    @Query("SELECT s.document FROM DocumentShare s WHERE s.sharedWithUser.id = :userId ORDER BY s.createdAt DESC")
    List<storebackend.entity.UserDocument> findSharedDocumentsForUser(@Param("userId") Long userId);

    void deleteByDocumentIdAndSharedWithUserId(Long documentId, Long sharedWithUserId);
}
