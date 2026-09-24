-- ════════════════════════════════════════════════════════════════
-- Migration V025: App-Entitlement-Konzept (Phase 1)
-- ════════════════════════════════════════════════════════════════
-- ZWECK:
--   Additives, rückwärtskompatibles App-Zugriffs-Konzept für die
--   geplante Multi-App-Plattform (SHOP, DHL, MARITIME, LOYALTY,
--   ISSUE_ANALYSIS). Steuert AUSSCHLIESSLICH, ob ein User eine App
--   überhaupt öffnen/nutzen darf - NICHT Store-Zugriff
--   (storebackend.util.StoreAccessChecker) und NICHT fachliche
--   Aktionen innerhalb einer App (store_roles.permissions).
--
-- LEGACY/MANAGED (userweit, siehe storebackend.enums.AppAccessMode):
--   - User hat KEINEN Eintrag in user_app_entitlements (für keine App)
--     -> LEGACY -> Zugriff auf ALLE Apps bleibt exakt wie bisher.
--   - User hat MINDESTENS EINEN Eintrag -> MANAGED für den GESAMTEN
--     User -> ab sofort gilt nur noch die explizite Positivliste
--     (enabled=true); fehlende App/fehlender Store/enabled=false
--     -> kein Zugriff.
--   Diese Logik lebt ausschließlich im Anwendungscode
--   (storebackend.util.AppAccessChecker), NICHT in der DB.
--
-- SCOPE-KONSISTENZ (siehe storebackend.enums.AppScope):
--   - STORE-Apps  (SHOP, DHL, LOYALTY)        -> store_id NOT NULL
--   - GLOBAL-Apps (MARITIME, ISSUE_ANALYSIS)  -> store_id NULL
--   Wird zusätzlich per CHECK-Constraint in der DB abgesichert
--   (siehe ck_user_app_entitlement_scope unten).
--
-- TABELLE: user_app_entitlements
--   id            BIGSERIAL PRIMARY KEY
--   user_id       BIGINT NOT NULL REFERENCES users(id)
--   store_id      BIGINT NULL REFERENCES stores(id)
--   app           VARCHAR(30) NOT NULL, CHECK IN
--                 (SHOP, DHL, MARITIME, LOYALTY, ISSUE_ANALYSIS)
--   enabled       BOOLEAN NOT NULL DEFAULT true
--   created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
--   updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
--
-- UNIQUENESS - bewusst ZWEI PARTIELLE Unique-Indizes statt einem
-- einzelnen UNIQUE(user_id, store_id, app):
--   Grund: In Postgres gilt NULL <> NULL, ein normaler Unique-Constraint
--   über (user_id, store_id, app) würde bei GLOBAL-Apps (store_id NULL)
--   mehrere Einträge für denselben User/dieselbe App NICHT verhindern.
--   Analog zum bewusst gewählten Muster bei dhl_parcels
--   (siehe DhlParcel-Entity-Kommentar sowie Migrationen V017/V020)
--   lebt die Unique-Regel daher AUSSCHLIESSLICH hier in der SQL-Migration,
--   NICHT als JPA @UniqueConstraint auf der Entity (würde bei
--   ddl-auto=update sonst einen kollidierenden unconditional Constraint
--   erzeugen).
--
-- HINWEIS ZUM MIGRATIONSPFAD (siehe V021/V023/V024):
--   Das produktive Deployment (scripts/deploy.sh) führt ausschließlich
--   SQL-Dateien aus scripts/db/migrations/ aus (alphabetisch sortiert,
--   via `sudo -u postgres psql -f`). Flyway ist projektweit NICHT auf
--   dem Classpath (keine flyway-core-Dependency in pom.xml) und daher
--   auch in Tests faktisch wirkungslos; diese Datei ist die einzige
--   aktive Migration für user_app_entitlements.
-- ════════════════════════════════════════════════════════════════

BEGIN;

CREATE TABLE IF NOT EXISTS user_app_entitlements (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    store_id BIGINT NULL REFERENCES stores(id),
    app VARCHAR(30) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT ck_user_app_entitlement_app
        CHECK (app IN ('SHOP', 'DHL', 'MARITIME', 'LOYALTY', 'ISSUE_ANALYSIS')),

    -- Scope-Konsistenz: STORE-Apps benötigen store_id, GLOBAL-Apps verbieten sie.
    CONSTRAINT ck_user_app_entitlement_scope
        CHECK (
            (app IN ('SHOP', 'DHL', 'LOYALTY') AND store_id IS NOT NULL)
            OR
            (app IN ('MARITIME', 'ISSUE_ANALYSIS') AND store_id IS NULL)
        )
);

-- Partial Unique Index 1: GLOBAL-Apps (store_id IS NULL) - je User/App nur ein Eintrag.
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_app_entitlement_global
    ON user_app_entitlements (user_id, app)
    WHERE store_id IS NULL;

-- Partial Unique Index 2: STORE-Apps (store_id IS NOT NULL) - je User/Store/App nur ein Eintrag.
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_app_entitlement_store
    ON user_app_entitlements (user_id, store_id, app)
    WHERE store_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_app_entitlements_user
    ON user_app_entitlements (user_id);

COMMENT ON TABLE user_app_entitlements IS
    'App-Entitlement-Konzept (Phase 1): steuert ausschließlich App-Zugriff (LEGACY/MANAGED, userweit). Kein Ersatz für StoreAccessChecker oder store_roles.permissions.';
COMMENT ON COLUMN user_app_entitlements.store_id IS
    'NULL bei GLOBAL-Scope-Apps (MARITIME, ISSUE_ANALYSIS), gesetzt bei STORE-Scope-Apps (SHOP, DHL, LOYALTY). Siehe ck_user_app_entitlement_scope.';
COMMENT ON COLUMN user_app_entitlements.app IS
    'AppKey-Enum-Name: SHOP, DHL, MARITIME, LOYALTY oder ISSUE_ANALYSIS - siehe storebackend.enums.AppKey.';
COMMENT ON COLUMN user_app_entitlements.enabled IS
    'Nur im MANAGED-Modus relevant (User hat mind. einen Entitlement-Eintrag): true = Zugriff erlaubt, false = gesperrt.';
COMMENT ON INDEX uq_user_app_entitlement_global IS
    'Partial Unique Index: je User/App nur ein Eintrag für GLOBAL-Apps (store_id IS NULL).';
COMMENT ON INDEX uq_user_app_entitlement_store IS
    'Partial Unique Index: je User/Store/App nur ein Eintrag für STORE-Apps (store_id IS NOT NULL).';

-- ─── Validierung ──────────────────────────────────────────────────

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'user_app_entitlements'
    ) THEN
        RAISE EXCEPTION 'Migration V025 fehlgeschlagen: user_app_entitlements wurde nicht angelegt';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE indexname = 'uq_user_app_entitlement_global'
    ) THEN
        RAISE EXCEPTION 'Migration V025 fehlgeschlagen: uq_user_app_entitlement_global fehlt';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE indexname = 'uq_user_app_entitlement_store'
    ) THEN
        RAISE EXCEPTION 'Migration V025 fehlgeschlagen: uq_user_app_entitlement_store fehlt';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'ck_user_app_entitlement_scope'
    ) THEN
        RAISE EXCEPTION 'Migration V025 fehlgeschlagen: ck_user_app_entitlement_scope fehlt';
    END IF;

    RAISE NOTICE 'Migration V025 validation successful ✅ - user_app_entitlements angelegt, inkl. Scope-CHECK-Constraint und partiellen Unique-Indizes';
END $$;

COMMIT;

-- ════════════════════════════════════════════════════════════════
-- Migration abgeschlossen
-- ════════════════════════════════════════════════════════════════
