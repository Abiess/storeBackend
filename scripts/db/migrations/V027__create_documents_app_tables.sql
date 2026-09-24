-- ════════════════════════════════════════════════════════════════
-- Migration V027: DOCUMENTS-App (Phase 1) - persönlicher Dokumenten-Tresor
-- ════════════════════════════════════════════════════════════════
-- ZWECK:
--   Additive, rückwärtskompatible Erweiterung des bestehenden
--   App-Entitlement-Konzepts (siehe V025) um die neue GLOBAL-Scope-App
--   DOCUMENTS (storebackend.enums.AppKey#DOCUMENTS), sowie die Tabellen
--   für den persönlichen Dokumenten-Tresor selbst.
--
--   WICHTIG: DOCUMENTS ist bewusst PERSONAL (Version 1):
--   - user_documents.owner_user_id (kein store_id, kein Business-Kontext)
--   - document_shares: Teilen mit einem anderen bestehenden markt.ma-User
--     (documentId, sharedWithUserId, permission) - kein öffentlicher Link.
--
-- HINWEIS ZUM MIGRATIONSPFAD (siehe V025-Kommentar): Flyway ist projektweit
-- NICHT auf dem Classpath; das produktive Deployment führt diese Datei
-- manuell/alphabetisch sortiert aus (scripts/deploy.sh). Lokal übernimmt
-- Hibernate ddl-auto=update das Schema für die neuen Entities automatisch -
-- diese Migration ist ausschließlich für die produktive PostgreSQL-Instanz
-- nötig (CHECK-Constraint-Erweiterung + explizite Tabellen-Doku).
-- ════════════════════════════════════════════════════════════════

BEGIN;

-- ─── 1. DOCUMENTS zur bestehenden AppKey-CHECK-Constraint hinzufügen ──

ALTER TABLE user_app_entitlements
    DROP CONSTRAINT IF EXISTS ck_user_app_entitlement_app;

ALTER TABLE user_app_entitlements
    ADD CONSTRAINT ck_user_app_entitlement_app
        CHECK (app IN ('SHOP', 'DHL', 'MARITIME', 'LOYALTY', 'ISSUE_ANALYSIS', 'DOCUMENTS'));

ALTER TABLE user_app_entitlements
    DROP CONSTRAINT IF EXISTS ck_user_app_entitlement_scope;

ALTER TABLE user_app_entitlements
    ADD CONSTRAINT ck_user_app_entitlement_scope
        CHECK (
            (app IN ('SHOP', 'DHL', 'LOYALTY') AND store_id IS NOT NULL)
            OR
            (app IN ('MARITIME', 'ISSUE_ANALYSIS', 'DOCUMENTS') AND store_id IS NULL)
        );

-- ─── 2. user_documents ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_documents (
    id BIGSERIAL PRIMARY KEY,
    owner_user_id BIGINT NOT NULL REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    note TEXT,
    document_date DATE,
    expiry_date DATE,
    object_key VARCHAR(500),
    original_filename VARCHAR(255),
    mime_type VARCHAR(100),
    file_size BIGINT,
    extracted_text TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_documents_owner
    ON user_documents (owner_user_id);

CREATE INDEX IF NOT EXISTS idx_user_documents_expiry
    ON user_documents (expiry_date)
    WHERE expiry_date IS NOT NULL;

-- ─── 3. document_shares ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS document_shares (
    id BIGSERIAL PRIMARY KEY,
    document_id BIGINT NOT NULL REFERENCES user_documents(id) ON DELETE CASCADE,
    shared_with_user_id BIGINT NOT NULL REFERENCES users(id),
    permission VARCHAR(20) NOT NULL DEFAULT 'VIEW',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT ck_document_share_permission CHECK (permission IN ('VIEW')),
    CONSTRAINT uq_document_share_target UNIQUE (document_id, shared_with_user_id)
);

CREATE INDEX IF NOT EXISTS idx_document_shares_shared_with
    ON document_shares (shared_with_user_id);

COMMENT ON TABLE user_documents IS
    'DOCUMENTS-App (Phase 1): persönlicher Dokumenten-Tresor, ausschließlich owner_user_id-gebunden (GLOBAL-Scope, kein store_id).';
COMMENT ON TABLE document_shares IS
    'DOCUMENTS-App (Phase 1): Teilen eines user_documents-Eintrags mit einem anderen bestehenden markt.ma-User (kein öffentlicher Link, MVP nur VIEW).';

-- ─── Validierung ──────────────────────────────────────────────────

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_documents') THEN
        RAISE EXCEPTION 'Migration V027 fehlgeschlagen: user_documents wurde nicht angelegt';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'document_shares') THEN
        RAISE EXCEPTION 'Migration V027 fehlgeschlagen: document_shares wurde nicht angelegt';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_user_app_entitlement_app') THEN
        RAISE EXCEPTION 'Migration V027 fehlgeschlagen: ck_user_app_entitlement_app fehlt';
    END IF;

    RAISE NOTICE 'Migration V027 validation successful ✅ - DOCUMENTS-App inkl. user_documents/document_shares angelegt';
END $$;

COMMIT;

-- ════════════════════════════════════════════════════════════════
-- Migration abgeschlossen
-- ════════════════════════════════════════════════════════════════
