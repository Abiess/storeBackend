-- Migration V016: LoyaltyAccount.customer_profile_id wird optional
--
-- Ermöglicht anonyme Bonuskarten fuer Laufkundschaft ohne Konto/CustomerProfile
-- ("Neue Bonuskarte ausgeben" im POS-Loyalty-Flow). Der Account kann spaeter
-- ueber "Kunde verknuepfen" einem CustomerProfile zugeordnet werden, ohne dass
-- Punkte verloren gehen (dieselbe Zeile bekommt lediglich die FK gesetzt).
--
-- Die bestehende unique-Constraint uq_loyalty_account_store_customer
-- (store_id, customer_profile_id) bleibt unveraendert: NULL-Werte gelten in
-- Postgres als paarweise verschieden, daher koennen beliebig viele anonyme
-- Accounts pro Store nebeneinander existieren.

ALTER TABLE loyalty_accounts
    ALTER COLUMN customer_profile_id DROP NOT NULL;

COMMENT ON COLUMN loyalty_accounts.customer_profile_id IS
    'Optionales CustomerProfile. NULL = anonyme Bonuskarte (Laufkundschaft ohne Konto), kann spaeter per "Kunde verknuepfen" nachtraeglich gesetzt werden.';
