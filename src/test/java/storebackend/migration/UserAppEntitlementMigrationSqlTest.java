package storebackend.migration;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Textueller Regressionstest für scripts/db/migrations/V025__create_user_app_entitlements.sql
 * (App-Entitlement-Konzept, Phase 1).
 *
 * WARUM ein reiner Text-Test statt einer echten DB-Ausführung:
 * - Flyway ist projektweit NICHT auf dem Classpath (keine flyway-core-Dependency
 *   in pom.xml) - die Migration wird produktiv ausschließlich manuell via
 *   scripts/deploy.sh + psql gegen echtes PostgreSQL ausgeführt.
 * - H2 (Test-Datenbank, ddl-auto=create-drop) unterstützt KEINE partiellen
 *   Unique-Indizes ("CREATE UNIQUE INDEX ... WHERE ..."), daher kann die
 *   tatsächliche Durchsetzung der beiden partiellen Indizes nicht per
 *   Standard-JUnit-Testsuite gegen H2 verifiziert werden (siehe
 *   UserAppEntitlementRepositoryTest).
 * - Dieser Test stellt daher als Regressionsschutz sicher, dass die
 *   Migrationsdatei weiterhin GENAU die beiden im finalen Plan geforderten
 *   partiellen Unique-Indizes sowie die Scope-CHECK-Constraint enthält.
 *   Die tatsächliche Durchsetzung in Produktion/Staging wird durch die
 *   DO-$$-Validierung am Ende der Migration selbst abgesichert (schlägt
 *   beim Deployment fehl, falls Indizes/Constraint nicht angelegt wurden).
 */
class UserAppEntitlementMigrationSqlTest {

    private static final Path MIGRATION_FILE = Paths.get(
        "scripts", "db", "migrations", "V025__create_user_app_entitlements.sql");

    private String readMigrationSql() throws IOException {
        assertTrue(Files.exists(MIGRATION_FILE),
            "Migration V025 nicht gefunden unter: " + MIGRATION_FILE.toAbsolutePath());
        return Files.readString(MIGRATION_FILE);
    }

    @Test
    @DisplayName("Partial Unique Index für GLOBAL-Apps (store_id IS NULL) ist vorhanden")
    void globalPartialUniqueIndex_isPresent() throws IOException {
        String sql = readMigrationSql();
        assertTrue(sql.contains("CREATE UNIQUE INDEX IF NOT EXISTS uq_user_app_entitlement_global"));
        assertTrue(sql.contains("ON user_app_entitlements (user_id, app)"));
        assertTrue(sql.contains("WHERE store_id IS NULL"));
    }

    @Test
    @DisplayName("Partial Unique Index für STORE-Apps (store_id IS NOT NULL) ist vorhanden")
    void storePartialUniqueIndex_isPresent() throws IOException {
        String sql = readMigrationSql();
        assertTrue(sql.contains("CREATE UNIQUE INDEX IF NOT EXISTS uq_user_app_entitlement_store"));
        assertTrue(sql.contains("ON user_app_entitlements (user_id, store_id, app)"));
        assertTrue(sql.contains("WHERE store_id IS NOT NULL"));
    }

    @Test
    @DisplayName("Scope-CHECK-Constraint (STORE-Apps benötigen store_id, GLOBAL-Apps verbieten sie) ist vorhanden")
    void scopeCheckConstraint_isPresent() throws IOException {
        String sql = readMigrationSql();
        assertTrue(sql.contains("CONSTRAINT ck_user_app_entitlement_scope"));
        assertTrue(sql.contains("app IN ('SHOP', 'DHL', 'LOYALTY') AND store_id IS NOT NULL"));
        assertTrue(sql.contains("app IN ('MARITIME', 'ISSUE_ANALYSIS') AND store_id IS NULL"));
    }

    @Test
    @DisplayName("Migration validiert sich selbst am Ende (DO $$ ... RAISE EXCEPTION bei Fehlern)")
    void selfValidationBlock_isPresent() throws IOException {
        String sql = readMigrationSql();
        assertTrue(sql.contains("RAISE EXCEPTION 'Migration V025 fehlgeschlagen"));
    }
}
