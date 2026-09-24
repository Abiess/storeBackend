package storebackend.migration;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Textueller Regressionstest für
 * scripts/db/migrations/V026__unique_index_users_email_lower.sql
 * (E-Mail-Duplikat-Prävention / case-insensitive Unique-Index).
 *
 * WARUM ein reiner Text-Test statt einer echten DB-Ausführung: siehe
 * {@link storebackend.migration.UserAppEntitlementMigrationSqlTest} - Flyway
 * ist projektweit NICHT auf dem Classpath, die Migration läuft produktiv
 * ausschließlich manuell via scripts/deploy.sh + psql gegen echtes
 * PostgreSQL. Zusätzlich verhindert dieser Test, dass die Safety-Query
 * (Duplikat-Check VOR Index-Erstellung) versehentlich aus der Migration
 * entfernt wird - das wäre gleichbedeutend mit einer "automatischen
 * Datenbereinigung ohne Prüfung", was explizit NICHT gewollt ist.
 */
class EmailUniqueIndexMigrationSqlTest {

    private static final Path MIGRATION_FILE = Paths.get(
        "scripts", "db", "migrations", "V026__unique_index_users_email_lower.sql");

    private String readMigrationSql() throws IOException {
        assertTrue(Files.exists(MIGRATION_FILE),
            "Migration V026 nicht gefunden unter: " + MIGRATION_FILE.toAbsolutePath());
        return Files.readString(MIGRATION_FILE);
    }

    @Test
    @DisplayName("Safety-Query (Duplikat-Check) ist vor dem Index-Create vorhanden")
    void safetyCheck_isPresentBeforeIndexCreation() throws IOException {
        String sql = readMigrationSql();
        assertTrue(sql.contains("GROUP BY LOWER(email)"));
        assertTrue(sql.contains("HAVING COUNT(*) > 1"));

        int safetyCheckIndex = sql.indexOf("HAVING COUNT(*) > 1");
        int indexCreateIndex = sql.indexOf("CREATE UNIQUE INDEX IF NOT EXISTS uq_users_email_lower");
        assertTrue(safetyCheckIndex >= 0 && indexCreateIndex >= 0 && safetyCheckIndex < indexCreateIndex,
            "Safety-Query MUSS vor dem Index-Create in der Migration stehen");
    }

    @Test
    @DisplayName("Migration bricht bei gefundenen Duplikaten kontrolliert ab (keine automatische Bereinigung)")
    void migration_abortsOnDuplicates_withoutAutoCleanup() throws IOException {
        String sql = readMigrationSql();
        assertTrue(sql.contains("RAISE EXCEPTION 'Migration V026 abgebrochen"));
        assertTrue(sql.toUpperCase().contains("DELETE") == false || sql.contains("-- KEINE"),
            "Migration darf keine automatische DELETE/Bereinigung bestehender User-Duplikate enthalten");
    }

    @Test
    @DisplayName("Case-insensitiver Unique-Index auf users(LOWER(email)) ist vorhanden")
    void caseInsensitiveUniqueIndex_isPresent() throws IOException {
        String sql = readMigrationSql();
        assertTrue(sql.contains("CREATE UNIQUE INDEX IF NOT EXISTS uq_users_email_lower"));
        assertTrue(sql.contains("ON users (LOWER(email))"));
    }

    @Test
    @DisplayName("Migration validiert sich selbst am Ende (DO $$ ... RAISE EXCEPTION bei Fehlern)")
    void selfValidationBlock_isPresent() throws IOException {
        String sql = readMigrationSql();
        assertTrue(sql.contains("RAISE EXCEPTION 'Migration V026 fehlgeschlagen"));
    }

    @Test
    @DisplayName("Keine bestehenden User-IDs werden verändert (kein UPDATE auf users)")
    void migration_doesNotModifyExistingUserRows() throws IOException {
        String sql = readMigrationSql();
        assertTrue(!sql.contains("UPDATE users"),
            "Migration darf bestehende User-Zeilen nicht verändern (keine automatische Bereinigung)");
    }
}
