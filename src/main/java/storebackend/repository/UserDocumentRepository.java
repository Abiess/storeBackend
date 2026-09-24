package storebackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import storebackend.entity.UserDocument;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserDocumentRepository extends JpaRepository<UserDocument, Long> {

    /** Alle eigenen Dokumente eines Users (Version 1: PERSONAL, kein storeId). */
    @Query("SELECT d FROM UserDocument d WHERE d.owner.id = :ownerUserId ORDER BY d.createdAt DESC")
    List<UserDocument> findByOwnerId(@Param("ownerUserId") Long ownerUserId);

    /** Multi-Tenant-sichere Einzelabfrage: nur der tatsächliche Owner darf so laden. */
    @Query("SELECT d FROM UserDocument d WHERE d.id = :documentId AND d.owner.id = :ownerUserId")
    Optional<UserDocument> findByIdAndOwnerId(@Param("documentId") Long documentId, @Param("ownerUserId") Long ownerUserId);
}
