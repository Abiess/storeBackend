package storebackend.migration;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Textueller Regressionstest für scripts/db/migrations/V027__create_documents_app_tables.sql
 * (DOCUMENTS-App, Phase 1) - analog zu {@code UserAppEntitlementMigrationSqlTest} (V025).
 * Siehe dortigen Kommentar zur Begründung, warum ein reiner Text-Test statt
 * einer echten DB-Ausführung verwendet wird (kein Flyway auf dem Classpath).
 */
class DocumentsAppMigrationSqlTest {

    private static final Path MIGRATION_FILE = Paths.get(
            "scripts", "db", "migrations", "V027__create_documents_app_tables.sql");

    private String readMigrationSql() throws IOException {
        assertTrue(Files.exists(MIGRATION_FILE),
                "Migration V027 nicht gefunden unter: " + MIGRATION_FILE.toAbsolutePath());
        return Files.readString(MIGRATION_FILE);
    }

    @Test
    @DisplayName("DOCUMENTS ist in der AppKey-CHECK-Constraint enthalten")
    void documentsAppKey_isInCheckConstraint() throws IOException {
        String sql = readMigrationSql();
        assertTrue(sql.contains("CHECK (app IN ('SHOP', 'DHL', 'MARITIME', 'LOYALTY', 'ISSUE_ANALYSIS', 'DOCUMENTS'))"));
    }

    @Test
    @DisplayName("DOCUMENTS ist als GLOBAL (store_id IS NULL) in der Scope-CHECK-Constraint enthalten")
    void documentsAppKey_isGlobalInScopeConstraint() throws IOException {
        String sql = readMigrationSql();
        assertTrue(sql.contains("app IN ('MARITIME', 'ISSUE_ANALYSIS', 'DOCUMENTS') AND store_id IS NULL"));
    }

    @Test
    @DisplayName("user_documents Tabelle: owner_user_id vorhanden, KEIN store_id (PERSONAL first)")
    void userDocumentsTable_isOwnerBoundNotStoreBound() throws IOException {
        String sql = readMigrationSql();
        assertTrue(sql.contains("CREATE TABLE IF NOT EXISTS user_documents"));
        assertTrue(sql.contains("owner_user_id BIGINT NOT NULL REFERENCES users(id)"));
        assertTrue(!sql.substring(sql.indexOf("CREATE TABLE IF NOT EXISTS user_documents"),
                sql.indexOf("document_shares", sql.indexOf("CREATE TABLE IF NOT EXISTS user_documents")))
                .contains("store_id"));
    }

    @Test
    @DisplayName("document_shares Tabelle: documentId/sharedWithUserId/permission + Unique-Constraint vorhanden")
    void documentSharesTable_hasExpectedColumns() throws IOException {
        String sql = readMigrationSql();
        assertTrue(sql.contains("CREATE TABLE IF NOT EXISTS document_shares"));
        assertTrue(sql.contains("document_id BIGINT NOT NULL REFERENCES user_documents(id)"));
        assertTrue(sql.contains("shared_with_user_id BIGINT NOT NULL REFERENCES users(id)"));
        assertTrue(sql.contains("CONSTRAINT uq_document_share_target UNIQUE (document_id, shared_with_user_id)"));
    }

    @Test
    @DisplayName("Migration validiert sich selbst am Ende (DO $$ ... RAISE EXCEPTION bei Fehlern)")
    void selfValidationBlock_isPresent() throws IOException {
        String sql = readMigrationSql();
        assertTrue(sql.contains("RAISE EXCEPTION 'Migration V027 fehlgeschlagen"));
    }
}
