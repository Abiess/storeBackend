#!/bin/bash
# Debug-Script für 403 Forbidden Problem
# Prüft DB-Zuordnung und Backend-Version

set -e

echo "=== 403 Forbidden Debug-Script ==="
echo ""

# 1. Datenbank-Name ermitteln
echo "1. Datenbank-Name prüfen:"
DB_NAME=$(sudo -u postgres psql -c "\l" | grep -E "store(backend|db)" | awk '{print $1}' | head -1)
echo "Gefunden: $DB_NAME"
echo ""

# 2. User 1 prüfen
echo "2. User 1 in Datenbank:"
sudo -u postgres psql -d "$DB_NAME" -c "
SELECT id, email, name, 
       CASE WHEN roles::text LIKE '%USER%' THEN 'USER' ELSE 'OTHER' END as role
FROM users
WHERE id = 1;
"
echo ""

# 3. Store 121 prüfen
echo "3. Store 121 in Datenbank:"
sudo -u postgres psql -d "$DB_NAME" -c "
SELECT id, name, slug, owner_id, status
FROM stores
WHERE id = 121;
"
echo ""

# 4. Owner-Zuordnung prüfen
echo "4. Ownership-Check (sollte User 1 = Owner sein):"
sudo -u postgres psql -d "$DB_NAME" -c "
SELECT 
    s.id AS store_id,
    s.name AS store_name,
    s.owner_id,
    u.id AS user_id,
    u.email AS owner_email,
    CASE 
        WHEN s.owner_id = 1 THEN '✅ User 1 ist Owner'
        ELSE '❌ User 1 ist NICHT Owner'
    END AS ownership_status
FROM stores s
LEFT JOIN users u ON s.owner_id = u.id
WHERE s.id = 121;
"
echo ""

# 5. StoreAccessChecker im Backend-Log prüfen
echo "5. Backend-Logs der letzten 5 Minuten (ACCESS-CHECK):"
sudo journalctl -u storebackend --since '5 minutes ago' | grep -E '\[ACCESS-' | tail -20 || echo "Keine ACCESS-Logs gefunden"
echo ""

# 6. Backend-Version prüfen
echo "6. Backend-Version (JAR timestamp):"
ls -lh /opt/storebackend/storeBackend*.jar | tail -1
echo ""

# 7. Backend-Status
echo "7. Backend-Status:"
sudo systemctl status storebackend --no-pager | head -10
echo ""

# 8. Test-Curl (benötigt JWT)
echo "8. API-Test (benötigt gültiges JWT):"
echo "curl -H 'Authorization: Bearer <JWT>' https://api.markt.ma/api/stores/121/admin/payment-settings/paypal"
echo ""

# Zusammenfassung
echo "=== ZUSAMMENFASSUNG ==="
echo ""
echo "Wenn Store 121 owner_id ≠ 1:"
echo "  → Datenbank korrigieren: UPDATE stores SET owner_id = 1 WHERE id = 121;"
echo ""
echo "Wenn keine [ACCESS-CHECK] Logs:"
echo "  → Backend nicht neu gestartet: sudo systemctl restart storebackend"
echo ""
echo "Wenn [ACCESS-DENIED] in Logs:"
echo "  → Backend-Code prüfen oder Logs hier posten"
echo ""
