-- ════════════════════════════════════════════════════════════════
-- Migration V023: Customer Credit (Anschreiben) - Grundstruktur
-- ════════════════════════════════════════════════════════════════
-- ZWECK:
--   Ermöglicht "Später bezahlen" (Anschreiben/Kredit) pro Kunde, OHNE
--   ein neues Karten-/Identifier-Konzept einzuführen. Credit ist fachlich
--   getrennt von Loyalty (eigene Tabellen, eigener Audit-Trail), aber
--   UX-seitig und strukturell 1:1 an den bestehenden LoyaltyAccount
--   gebunden - dieselbe Karte/derselbe Identifier (LoyaltyIdentifier),
--   die für Bonuspunkte verwendet wird, dient auch für Credit-Lookups.
--
--   Kein neues Karten-/Kundenkonzept: customer_credit_accounts.
--   loyalty_account_id verweist 1:1 auf eine bestehende Zeile in
--   loyalty_accounts. Ein CustomerCreditAccount wird lazy angelegt
--   (erst bei erster Credit-Nutzung), NICHT automatisch für jeden
--   LoyaltyAccount.
--
-- TABELLE: customer_credit_accounts
--   id                  BIGSERIAL PRIMARY KEY
--   store_id            BIGINT NOT NULL (Multi-Tenant, denormalisiert
--                        analog zu loyalty_accounts/loyalty_transactions)
--   loyalty_account_id  BIGINT NOT NULL, UNIQUE (1:1 zu loyalty_accounts)
--   balance_owed        NUMERIC(15,2) NOT NULL DEFAULT 0, CHECK >= 0
--   credit_limit        NUMERIC(15,2) NULL (optional, kein Limit falls NULL)
--   created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
--   updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
--
-- TABELLE: credit_transactions
--   id                  BIGSERIAL PRIMARY KEY
--   credit_account_id   BIGINT NOT NULL (FK -> customer_credit_accounts)
--   store_id            BIGINT NOT NULL (denormalisiert, analog zu
--                        loyalty_transactions.store_id)
--   order_id            BIGINT NULL (optionaler Bezug zu einer Order)
--   type                VARCHAR(20) NOT NULL, CHECK IN
--                        (CHARGE, PAYMENT, ADJUSTMENT, REVERSAL)
--                        [4 Typen von Anfang an, um eine erneute
--                        Migration bei Storno/Retoure zu vermeiden]
--   amount              NUMERIC(15,2) NOT NULL
--   resulting_balance   NUMERIC(15,2) NOT NULL (Snapshot NACH Buchung,
--                        analog zu loyalty_transactions.resulting_balance)
--   note                VARCHAR(500) NULL
--   created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
--
-- DUPLICATE-CHARGE-PREVENTION (WICHTIG):
--   Eine Order darf nicht zweimal als CHARGE verbucht werden. Anstatt
--   dafür bereits Service-Logik zu bauen, wird die Garantie auf DB-Ebene
--   vorbereitet - analog zum bestehenden Precedent
--   idx_dhl_parcels_active_tracking (V017, partial unique index):
--
--     CREATE UNIQUE INDEX ... ON credit_transactions (order_id)
--         WHERE type = 'CHARGE' AND order_id IS NOT NULL;
--
--   Dadurch kann JEDE Order höchstens einmal eine CHARGE-Zeile mit
--   nicht-NULL order_id haben. PAYMENT/ADJUSTMENT/REVERSAL-Zeilen mit
--   demselben order_id sind davon nicht betroffen (kein Konflikt), und
--   CHARGE-Zeilen ohne Order-Bezug (order_id IS NULL, z.B. manuelle
--   Anschreiben-Buchung ohne Kauf) sind beliebig oft möglich. Diese
--   Migration legt NUR den Constraint an - die Service-Schicht, die ihn
--   nutzt (z.B. per DataIntegrityViolationException-Handling), folgt
--   erst mit der eigentlichen Charge-Implementierung.
--
-- HINWEIS ZUM MIGRATIONSPFAD (siehe V021/V022):
--   Das produktive Deployment (scripts/deploy.sh) führt ausschließlich
--   SQL-Dateien aus scripts/db/migrations/ aus (alphabetisch sortiert,
--   via `sudo -u postgres psql -f`). Die Ordner scripts/db/migration/
--   (Singular) und src/main/resources/db/migration/ werden vom
--   Deployment NICHT verwendet (Flyway ist projektweit deaktiviert).
--   Diese V023-Datei hier ist die einzige aktive Migration für Customer
--   Credit. Hibernate ddl-auto=update übernimmt KEIN CREATE TABLE für
--   diese beiden Tabellen (anders als bei den ursprünglichen
--   Loyalty-Tabellen) - beide werden bewusst vollständig über diese
--   SQL-Migration angelegt, inkl. FKs/Indizes/CHECK-Constraints.
-- ════════════════════════════════════════════════════════════════

BEGIN;

-- ─── 1. customer_credit_accounts ──────────────────────────────────

CREATE TABLE IF NOT EXISTS customer_credit_accounts (
    id BIGSERIAL PRIMARY KEY,
    store_id BIGINT NOT NULL,
    loyalty_account_id BIGINT NOT NULL,
    balance_owed NUMERIC(15, 2) NOT NULL DEFAULT 0,
    credit_limit NUMERIC(15, 2),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_credit_account_store
        FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
    CONSTRAINT fk_credit_account_loyalty_account
        FOREIGN KEY (loyalty_account_id) REFERENCES loyalty_accounts(id) ON DELETE CASCADE,
    CONSTRAINT uq_credit_account_loyalty_account
        UNIQUE (loyalty_account_id),
    CONSTRAINT ck_credit_account_balance_non_negative
        CHECK (balance_owed >= 0),
    CONSTRAINT ck_credit_account_limit_non_negative
        CHECK (credit_limit IS NULL OR credit_limit >= 0)
);

CREATE INDEX IF NOT EXISTS idx_credit_account_store
    ON customer_credit_accounts(store_id);

COMMENT ON TABLE customer_credit_accounts IS
    'Customer Credit (Anschreiben) - 1:1 an einen bestehenden LoyaltyAccount gebunden. Lazy angelegt bei erster Credit-Nutzung. Fachlich getrennt von Loyalty, aber UX-seitig unter Bonus/Kundenkarte integriert (kein eigenes Karten-/Identifier-Konzept).';
COMMENT ON COLUMN customer_credit_accounts.store_id IS
    'Multi-Tenant: Store ID, MUSS zum Store des referenzierten loyalty_account passen (Service-Schicht validiert dies bei Erstellung).';
COMMENT ON COLUMN customer_credit_accounts.loyalty_account_id IS
    'FK auf loyalty_accounts - kein neues Karten-/Kundenkonzept. UNIQUE: genau ein CreditAccount pro LoyaltyAccount.';
COMMENT ON COLUMN customer_credit_accounts.balance_owed IS
    'Offener Betrag (Guthaben-Schulden des Kunden). Darf nie negativ werden (CHECK-Constraint) - Änderungen ausschließlich über credit_transactions (Audit-Trail, analog zu loyalty_transactions/pointsBalance).';
COMMENT ON COLUMN customer_credit_accounts.credit_limit IS
    'Optionales Kreditlimit. NULL = kein Limit.';

-- ─── 2. credit_transactions ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS credit_transactions (
    id BIGSERIAL PRIMARY KEY,
    credit_account_id BIGINT NOT NULL,
    store_id BIGINT NOT NULL,
    order_id BIGINT,
    type VARCHAR(20) NOT NULL,
    amount NUMERIC(15, 2) NOT NULL,
    resulting_balance NUMERIC(15, 2) NOT NULL,
    note VARCHAR(500),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_credit_tx_account
        FOREIGN KEY (credit_account_id) REFERENCES customer_credit_accounts(id) ON DELETE CASCADE,
    CONSTRAINT fk_credit_tx_store
        FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
    CONSTRAINT fk_credit_tx_order
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
    CONSTRAINT ck_credit_tx_type
        CHECK (type IN ('CHARGE', 'PAYMENT', 'ADJUSTMENT', 'REVERSAL')),
    CONSTRAINT ck_credit_tx_resulting_balance_non_negative
        CHECK (resulting_balance >= 0)
);

CREATE INDEX IF NOT EXISTS idx_credit_tx_account_created
    ON credit_transactions(credit_account_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_tx_store
    ON credit_transactions(store_id);
CREATE INDEX IF NOT EXISTS idx_credit_tx_order
    ON credit_transactions(order_id);

-- Verhindert doppelte CHARGE-Buchung derselben Order (siehe Doku oben).
-- PAYMENT/ADJUSTMENT/REVERSAL sowie CHARGE ohne Order-Bezug sind
-- von diesem Constraint nicht betroffen.
CREATE UNIQUE INDEX IF NOT EXISTS idx_credit_tx_unique_charge_per_order
    ON credit_transactions (order_id)
    WHERE type = 'CHARGE' AND order_id IS NOT NULL;

COMMENT ON TABLE credit_transactions IS
    'Audit-Trail für customer_credit_accounts.balance_owed - jede Änderung MUSS hier gebucht werden (analog zu loyalty_transactions, keine stille Manipulation von balance_owed).';
COMMENT ON COLUMN credit_transactions.type IS
    'CHARGE (Anschreiben/Kauf auf Kredit), PAYMENT (Zahlung erfasst), ADJUSTMENT (manuelle Korrektur), REVERSAL (Storno/Retoure) - REVERSAL/ADJUSTMENT bereits vorbereitet, auch wenn aktuell nur CHARGE/PAYMENT genutzt werden.';
COMMENT ON COLUMN credit_transactions.amount IS
    'Betragsänderung dieser Buchung (positiv bei CHARGE, negativ bei PAYMENT - Vorzeichen-Konvention wird in der Service-Schicht festgelegt).';
COMMENT ON COLUMN credit_transactions.resulting_balance IS
    'balance_owed NACH dieser Buchung (Snapshot, analog zu loyalty_transactions.resulting_balance).';
COMMENT ON COLUMN credit_transactions.order_id IS
    'Optionaler Bezug zu einer bestehenden Order. Siehe idx_credit_tx_unique_charge_per_order: eine Order darf höchstens eine CHARGE-Zeile haben.';

-- ─── Validierung ──────────────────────────────────────────────────

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'customer_credit_accounts'
    ) THEN
        RAISE EXCEPTION 'Migration V023 fehlgeschlagen: customer_credit_accounts wurde nicht angelegt';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'credit_transactions'
    ) THEN
        RAISE EXCEPTION 'Migration V023 fehlgeschlagen: credit_transactions wurde nicht angelegt';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_credit_account_loyalty_account'
    ) THEN
        RAISE EXCEPTION 'Migration V023 fehlgeschlagen: uq_credit_account_loyalty_account fehlt';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE indexname = 'idx_credit_tx_unique_charge_per_order'
    ) THEN
        RAISE EXCEPTION 'Migration V023 fehlgeschlagen: idx_credit_tx_unique_charge_per_order fehlt';
    END IF;

    RAISE NOTICE 'Migration V023 validation successful ✅ - customer_credit_accounts + credit_transactions angelegt, inkl. CHECK-Constraints und Partial-Unique-Index gegen doppelte Order-Charges';
END $$;

COMMIT;

-- ════════════════════════════════════════════════════════════════
-- Migration abgeschlossen
-- ════════════════════════════════════════════════════════════════
