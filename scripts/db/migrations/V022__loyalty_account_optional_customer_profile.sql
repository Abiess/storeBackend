-- ════════════════════════════════════════════════════════════════
-- Migration V022: Loyalty Account - CustomerProfile optional (anonyme Bonuskarte)
-- ════════════════════════════════════════════════════════════════
-- ZWECK:
--   Erlaubt LoyaltyAccount-Zeilen OHNE CustomerProfile ("anonyme
--   Bonuskarte" für Laufkundschaft ohne Konto, ausgegeben über
--   POST /api/stores/{storeId}/loyalty/issue-card).
--
--   Die Spalte loyalty_accounts.customer_profile_id war ursprünglich
--   NOT NULL (siehe Entity storebackend.entity.LoyaltyAccount). Hibernate
--   ddl-auto=update entfernt bestehende NOT-NULL-Constraints auf bereits
--   vorhandenen Spalten NICHT automatisch, wenn das Java-Feld nullable
--   gemacht wird - ohne diese Migration schlägt
--   LoyaltyService.issueAnonymousCard() auf Production mit einer
--   NOT-NULL-Verletzung fehl (analog zum Regression-Fix in V021).
--
-- VORGEHEN (idempotent, kein Datenverlust):
--   ALTER TABLE ... ALTER COLUMN ... DROP NOT NULL ist auf einer bereits
--   nullable Spalte ein No-Op und kann daher gefahrlos bei jedem Deploy
--   erneut ausgeführt werden.
--
-- HINWEIS:
--   uq_loyalty_account_store_customer (UNIQUE auf store_id,
--   customer_profile_id) muss NICHT geändert werden: PostgreSQL behandelt
--   NULL-Werte in UNIQUE-Constraints als paarweise verschieden, es können
--   also beliebig viele anonyme Accounts (customer_profile_id = NULL) pro
--   Store existieren.
--
-- HINWEIS ZUM MIGRATIONSPFAD (siehe V021 für Details):
--   Das produktive Deployment (scripts/deploy.sh) führt ausschließlich
--   SQL-Dateien aus scripts/db/migrations/ aus (alphabetisch sortiert,
--   via `sudo -u postgres psql -f`). Die Ordner scripts/db/migration/
--   (Singular) und src/main/resources/db/migration/ werden vom
--   Deployment NICHT verwendet (Flyway ist projektweit deaktiviert).
--   Eine zuvor unter src/main/resources/db/migration/ abgelegte Kopie
--   dieser Migration (V016) war daher inert und wurde entfernt - diese
--   V022-Datei hier ist die einzige aktive Migration für diese Änderung.
--
--   DataInitializer.repairLoyaltyAccountCustomerProfileNullable() bleibt
--   zusätzlich als Safety-Net für bereits laufende Instanzen bestehen
--   (z.B. lokale Dev-DBs, die nicht über scripts/deploy.sh migriert
--   werden) - für Production ist diese V022-Migration hier die
--   maßgebliche, tatsächlich ausgeführte Änderung.
-- ════════════════════════════════════════════════════════════════

BEGIN;

ALTER TABLE loyalty_accounts
    ALTER COLUMN customer_profile_id DROP NOT NULL;

COMMENT ON COLUMN loyalty_accounts.customer_profile_id IS
    'Bestehendes Kunden-Profil (store-spezifisch). NULL = anonymer Account (Laufkundschaft ohne Konto, siehe LoyaltyAccount-Klassendoku). Kann später über LoyaltyService.linkCustomerProfile() nachträglich verknüpft werden, ohne Punkte zu verlieren.';

-- ─── Validierung ──────────────────────────────────────────────────

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'loyalty_accounts'
          AND column_name = 'customer_profile_id'
          AND is_nullable = 'NO'
    ) THEN
        RAISE EXCEPTION 'Migration V022 fehlgeschlagen: loyalty_accounts.customer_profile_id ist noch NOT NULL';
    END IF;

    RAISE NOTICE 'Migration V022 validation successful ✅ - loyalty_accounts.customer_profile_id ist nullable (anonyme Bonuskarten möglich)';
END $$;

COMMIT;

-- ════════════════════════════════════════════════════════════════
-- Migration abgeschlossen
-- ════════════════════════════════════════════════════════════════
