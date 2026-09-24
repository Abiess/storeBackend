-- ════════════════════════════════════════════════════════════════
-- Migration V026: Case-insensitiver Unique-Index auf users(email)
-- ════════════════════════════════════════════════════════════════
-- ZWECK:
--   Verhindert dauerhaft, dass zwei User mit derselben E-Mail-Adresse
--   in unterschiedlicher Groß-/Kleinschreibung existieren können
--   (konkreter Vorfall: "essoudati@hotmail.de" vs.
--   "Essoudati@hotmail.de" - der doppelte User wurde bereits manuell
--   bereinigt, BEVOR diese Migration erstellt wurde).
--
--   Die Anwendungsebene normalisiert E-Mails bereits zentral über
--   storebackend.util.EmailNormalizer (trim + toLowerCase, siehe
--   User#setEmail, AuthService, PasswordResetService,
--   EmailVerificationService, TeamInvitationService,
--   WooCommerceImportService, PublicStoreCreationController). Dieser
--   Index ist die zusätzliche DB-seitige Absicherung (Defense-in-Depth)
--   für den Fall von Bugs, direkten SQL-Inserts oder zukünftigem Code,
--   der die Normalisierung vergisst.
--
-- WICHTIG - KEINE AUTOMATISCHE DATENBEREINIGUNG:
--   Diese Migration verändert und dedupliziert KEINE bestehenden
--   User-Daten und KEINE User-IDs. Falls zum Ausführungszeitpunkt noch
--   Case-Duplikate existieren, bricht die Migration kontrolliert mit
--   einer RAISE EXCEPTION ab (siehe Validierung unten) - der Index wird
--   dann NICHT angelegt. Ein eventueller Fund muss manuell/durch das
--   Team entschieden und bereinigt werden (z.B. welcher der beiden
--   Accounts erhalten bleibt), BEVOR diese Migration erneut läuft.
--
-- SAFETY-QUERY (manuell VOR dieser Migration auf der Ziel-DB prüfen):
--
--   SELECT LOWER(email), COUNT(*)
--   FROM users
--   GROUP BY LOWER(email)
--   HAVING COUNT(*) > 1;
--
--   Falls diese Query Zeilen liefert, MUSS zuerst manuell bereinigt
--   werden (z.B. via Analyse in AppProvisioningService/H2-Console),
--   bevor diese Migration erneut ausgeführt wird. Diese Migration führt
--   dieselbe Prüfung zusätzlich automatisiert aus (siehe DO-Block) und
--   bricht bei Duplikaten OHNE jegliche Datenänderung ab.
--
-- NAMENSKONVENTION (siehe V025 - uq_user_app_entitlement_*):
--   uq_users_email_lower
-- ════════════════════════════════════════════════════════════════

BEGIN;

-- ─── Safety-Check: Abbruch bei bestehenden Case-Duplikaten ─────────
-- (bewusst VOR dem Index-Create, damit bei Duplikaten NICHTS in der
-- DB verändert wird - kein Index, keine Datenbereinigung.)
DO $$
DECLARE
    duplicate_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO duplicate_count
    FROM (
        SELECT LOWER(email)
        FROM users
        GROUP BY LOWER(email)
        HAVING COUNT(*) > 1
    ) AS dupes;

    IF duplicate_count > 0 THEN
        RAISE EXCEPTION 'Migration V026 abgebrochen: % case-insensitive E-Mail-Duplikat(e) in users gefunden - bitte zuerst manuell bereinigen (Safety-Query siehe Migrationskommentar), KEINE automatische Bereinigung durch diese Migration.', duplicate_count;
    END IF;

    RAISE NOTICE 'Migration V026: keine case-insensitiven E-Mail-Duplikate gefunden - Index wird angelegt.';
END $$;

-- ─── Case-insensitiver Unique-Index ─────────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS uq_users_email_lower
    ON users (LOWER(email));

COMMENT ON INDEX uq_users_email_lower IS
    'Verhindert case-insensitive E-Mail-Duplikate in users (z.B. "essoudati@hotmail.de" vs. "Essoudati@hotmail.de"). Anwendungsseitige Normalisierung erfolgt zentral über storebackend.util.EmailNormalizer.';

-- ─── Validierung ─────────────────────────────────────────────────────
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE indexname = 'uq_users_email_lower'
    ) THEN
        RAISE EXCEPTION 'Migration V026 fehlgeschlagen: uq_users_email_lower wurde nicht angelegt';
    END IF;

    RAISE NOTICE 'Migration V026 validation successful ✅ - uq_users_email_lower angelegt';
END $$;

COMMIT;

-- ════════════════════════════════════════════════════════════════
-- Migration abgeschlossen
-- ════════════════════════════════════════════════════════════════
