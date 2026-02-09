#!/bin/bash
# ==================================================================================
# FULL SYSTEM CHECK - Umfassende Diagnose des gesamten Stacks
# ==================================================================================
# Verwendung: sudo ./full-system-check.sh
# ==================================================================================

set +e  # Fehler nicht sofort abbrechen, um alle Checks zu sehen

echo "╔════════════════════════════════════════════════════════════════════════════╗"
echo "║                     🔍 FULL SYSTEM CHECK GESTARTET                         ║"
echo "╚════════════════════════════════════════════════════════════════════════════╝"
echo ""
echo "Timestamp: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# ==================================================================================
# 1. SYSTEMD SERVICE STATUS
# ==================================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1️⃣  SYSTEMD SERVICE STATUS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "📦 storebackend.service:"
sudo systemctl status storebackend --no-pager --lines=10 | head -20
if sudo systemctl is-active --quiet storebackend; then
    echo "✅ Service läuft"
else
    echo "❌ Service läuft NICHT"
fi
echo ""

echo "📦 postgresql.service:"
if sudo systemctl is-active --quiet postgresql; then
    echo "✅ PostgreSQL läuft"
    sudo systemctl status postgresql --no-pager --lines=5 | grep -E "Active:|Main PID:"
else
    echo "❌ PostgreSQL läuft NICHT"
fi
echo ""

echo "📦 nginx.service:"
if sudo systemctl is-active --quiet nginx; then
    echo "✅ Nginx läuft"
    sudo systemctl status nginx --no-pager --lines=5 | grep -E "Active:|Main PID:"
else
    echo "❌ Nginx läuft NICHT"
fi
echo ""

echo "📦 minio.service (optional):"
if sudo systemctl list-unit-files | grep -q minio.service; then
    if sudo systemctl is-active --quiet minio; then
        echo "✅ MinIO läuft"
        sudo systemctl status minio --no-pager --lines=5 | grep -E "Active:|Main PID:"
    else
        echo "❌ MinIO installiert aber läuft NICHT"
    fi
else
    echo "⚠️  MinIO nicht installiert"
fi
echo ""

# ==================================================================================
# 2. NETZWERK & PORTS
# ==================================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2️⃣  NETZWERK & PORTS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "🔌 Listening Ports:"
sudo ss -tlnp | grep -E ":(8080|5432|9000|80|443)" || echo "⚠️  Keine relevanten Ports gefunden"
echo ""

echo "🌐 Localhost Health Check (Port 8080):"
if curl -f -s http://localhost:8080/actuator/health > /dev/null 2>&1; then
    echo "✅ Backend erreichbar auf Port 8080"
    curl -s http://localhost:8080/actuator/health | jq '.' 2>/dev/null || curl -s http://localhost:8080/actuator/health
else
    echo "❌ Backend NICHT erreichbar auf Port 8080"
fi
echo ""

echo "🔥 Firewall Status:"
if command -v ufw &> /dev/null; then
    sudo ufw status | head -20
else
    echo "⚠️  UFW nicht installiert"
fi
echo ""

# ==================================================================================
# 3. POSTGRESQL STATUS
# ==================================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3️⃣  POSTGRESQL STATUS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "📊 PostgreSQL Version:"
sudo -u postgres psql --version
echo ""

echo "📊 Datenbank Verbindung:"
if sudo -u postgres psql -d storedb -c "SELECT 1;" > /dev/null 2>&1; then
    echo "✅ Verbindung zu storedb erfolgreich"
else
    echo "❌ Verbindung zu storedb FEHLGESCHLAGEN"
fi
echo ""

echo "👤 Datenbank User:"
sudo -u postgres psql -c "SELECT rolname, rolcanlogin FROM pg_roles WHERE rolname IN ('postgres', 'storeapp');"
echo ""

echo "📦 Existierende Datenbanken:"
sudo -u postgres psql -c "SELECT datname, pg_size_pretty(pg_database_size(datname)) AS size FROM pg_database WHERE datistemplate = false;"
echo ""

echo "🔑 Berechtigungen für storeapp:"
sudo -u postgres psql -d storedb -c "
SELECT
    grantee,
    table_schema,
    privilege_type
FROM information_schema.table_privileges
WHERE grantee = 'storeapp'
LIMIT 10;
" 2>/dev/null || echo "⚠️  Konnte Berechtigungen nicht prüfen"
echo ""

# ==================================================================================
# 4. FLYWAY MIGRATION STATUS
# ==================================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4️⃣  FLYWAY MIGRATION STATUS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if sudo -u postgres psql -d storedb -c "\dt flyway_schema_history" 2>/dev/null | grep -q flyway_schema_history; then
    echo "📋 Flyway Schema History (alle Migrationen):"
    sudo -u postgres psql -d storedb -c "
    SELECT
        installed_rank,
        version,
        description,
        type,
        script,
        installed_on,
        execution_time,
        success
    FROM flyway_schema_history
    ORDER BY installed_rank;
    "
    echo ""

    echo "📊 Letzte ausgeführte Migration:"
    sudo -u postgres psql -d storedb -t -c "
    SELECT version || ' - ' || description
    FROM flyway_schema_history
    WHERE success = true
    ORDER BY installed_rank DESC
    LIMIT 1;
    " | xargs
    echo ""
else
    echo "⚠️  flyway_schema_history Tabelle existiert nicht - Flyway wurde noch nicht ausgeführt"
    echo ""
fi

# ==================================================================================
# 5. DATABASE SCHEMA STATUS
# ==================================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "5️⃣  DATABASE SCHEMA STATUS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "📊 Alle Tabellen:"
sudo -u postgres psql -d storedb -c "
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
"
echo ""

echo "🔍 Kritische Tabellen Check:"
CRITICAL_TABLES=("users" "stores" "products" "categories" "orders" "order_items" "cart_items" "media" "store_domains")
for table in "${CRITICAL_TABLES[@]}"; do
    if sudo -u postgres psql -d storedb -c "\dt $table" 2>/dev/null | grep -q "$table"; then
        COUNT=$(sudo -u postgres psql -d storedb -t -c "SELECT COUNT(*) FROM $table;" 2>/dev/null | xargs)
        printf "%-20s : ✅ existiert (%s rows)\n" "$table" "$COUNT"
    else
        printf "%-20s : ❌ fehlt\n" "$table"
    fi
done
echo ""

echo "🔍 cart_items Spalten Check (kritisch):"
if sudo -u postgres psql -d storedb -c "\dt cart_items" 2>/dev/null | grep -q cart_items; then
    CREATED_AT=$(sudo -u postgres psql -d storedb -t -c "
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'cart_items' AND column_name = 'created_at'
        );" | xargs)

    UPDATED_AT=$(sudo -u postgres psql -d storedb -t -c "
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'cart_items' AND column_name = 'updated_at'
        );" | xargs)

    if [ "$CREATED_AT" = "t" ]; then
        echo "✅ created_at: existiert"
    else
        echo "❌ created_at: FEHLT (wird Hibernate-Fehler verursachen!)"
    fi

    if [ "$UPDATED_AT" = "t" ]; then
        echo "✅ updated_at: existiert"
    else
        echo "❌ updated_at: FEHLT (wird Hibernate-Fehler verursachen!)"
    fi

    echo ""
    echo "📋 Vollständige cart_items Struktur:"
    sudo -u postgres psql -d storedb -c "
    SELECT
        column_name,
        data_type,
        is_nullable,
        column_default
    FROM information_schema.columns
    WHERE table_name = 'cart_items'
    ORDER BY ordinal_position;
    "
else
    echo "❌ cart_items Tabelle existiert nicht"
fi
echo ""

# ==================================================================================
# 6. APPLICATION LOGS
# ==================================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "6️⃣  APPLICATION LOGS (letzte 50 Zeilen)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "📝 Letzte Startup-Logs:"
sudo journalctl -u storebackend --no-pager -n 50 | tail -30
echo ""

echo "🔍 Fehler in Logs (letzte 100 Zeilen):"
ERROR_COUNT=$(sudo journalctl -u storebackend --no-pager -n 100 | grep -i -E "error|exception|failed|caused by" | wc -l)
if [ "$ERROR_COUNT" -gt 0 ]; then
    echo "❌ $ERROR_COUNT Fehler gefunden:"
    sudo journalctl -u storebackend --no-pager -n 100 | grep -i -E "error|exception|failed|caused by" | tail -20
else
    echo "✅ Keine Fehler in den letzten 100 Log-Zeilen"
fi
echo ""

echo "🔍 Flyway-bezogene Logs:"
FLYWAY_LOGS=$(sudo journalctl -u storebackend --no-pager -n 200 | grep -i flyway | tail -10)
if [ -n "$FLYWAY_LOGS" ]; then
    echo "$FLYWAY_LOGS"
else
    echo "⚠️  Keine Flyway-Logs gefunden"
fi
echo ""

echo "🔍 Schema-Validation Fehler:"
SCHEMA_ERRORS=$(sudo journalctl -u storebackend --no-pager -n 200 | grep -i "schema-validation" | tail -10)
if [ -n "$SCHEMA_ERRORS" ]; then
    echo "❌ Schema-Validation Fehler gefunden:"
    echo "$SCHEMA_ERRORS"
else
    echo "✅ Keine Schema-Validation Fehler"
fi
echo ""

# ==================================================================================
# 7. DISK SPACE & RESOURCES
# ==================================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "7️⃣  DISK SPACE & RESOURCES"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "💾 Disk Usage:"
df -h / | awk 'NR==1 || /\/$/'
echo ""

echo "💾 Application Directory:"
du -sh /opt/storebackend 2>/dev/null || echo "⚠️  /opt/storebackend nicht gefunden"
echo ""

echo "💾 PostgreSQL Data:"
du -sh /var/lib/postgresql 2>/dev/null || echo "⚠️  PostgreSQL Data nicht lesbar"
echo ""

echo "🧠 Memory Usage:"
free -h
echo ""

echo "⚡ CPU Load:"
uptime
echo ""

# ==================================================================================
# 8. FILES & PERMISSIONS
# ==================================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "8️⃣  FILES & PERMISSIONS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "📁 /opt/storebackend Struktur:"
ls -lah /opt/storebackend 2>/dev/null | head -20 || echo "⚠️  Verzeichnis nicht gefunden"
echo ""

echo "📝 JAR File:"
if [ -f /opt/storebackend/app.jar ]; then
    ls -lh /opt/storebackend/app.jar
    echo "✅ app.jar existiert"
else
    echo "❌ app.jar nicht gefunden"
fi
echo ""

echo "🔧 Scripts Verzeichnis:"
ls -lah /opt/storebackend/scripts 2>/dev/null | head -15 || echo "⚠️  Scripts Verzeichnis nicht gefunden"
echo ""

echo "⚙️  Systemd Service File:"
if [ -f /etc/systemd/system/storebackend.service ]; then
    echo "✅ Service File existiert"
    echo "Inhalt:"
    cat /etc/systemd/system/storebackend.service | head -20
else
    echo "❌ Service File nicht gefunden"
fi
echo ""

# ==================================================================================
# 9. ENVIRONMENT VARIABLES
# ==================================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "9️⃣  ENVIRONMENT VARIABLES (aus Service)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ -f /etc/systemd/system/storebackend.service ]; then
    echo "🔐 Environment (ohne Secrets):"
    grep "Environment=" /etc/systemd/system/storebackend.service | grep -v "PASSWORD" | grep -v "SECRET" || echo "Keine Environment Variables gefunden"
else
    echo "⚠️  Service File nicht gefunden"
fi
echo ""

# ==================================================================================
# 10. SUMMARY & RECOMMENDATIONS
# ==================================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔟 ZUSAMMENFASSUNG & EMPFEHLUNGEN"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Prüfe kritische Komponenten
ISSUES=0

if ! sudo systemctl is-active --quiet storebackend; then
    echo "❌ Backend Service läuft nicht"
    ISSUES=$((ISSUES + 1))
fi

if ! sudo systemctl is-active --quiet postgresql; then
    echo "❌ PostgreSQL läuft nicht"
    ISSUES=$((ISSUES + 1))
fi

if ! curl -f -s http://localhost:8080/actuator/health > /dev/null 2>&1; then
    echo "❌ Backend nicht erreichbar auf Port 8080"
    ISSUES=$((ISSUES + 1))
fi

if ! sudo -u postgres psql -d storedb -c "\dt cart_items" 2>/dev/null | grep -q cart_items; then
    echo "❌ cart_items Tabelle fehlt"
    ISSUES=$((ISSUES + 1))
else
    CREATED_AT=$(sudo -u postgres psql -d storedb -t -c "
        SELECT EXISTS (SELECT 1 FROM information_schema.columns
        WHERE table_name = 'cart_items' AND column_name = 'created_at');" | xargs)

    if [ "$CREATED_AT" != "t" ]; then
        echo "❌ cart_items.created_at Spalte fehlt (Hibernate-Fehler!)"
        ISSUES=$((ISSUES + 1))
    fi
fi

echo ""
if [ $ISSUES -eq 0 ]; then
    echo "╔════════════════════════════════════════════════════════════════════════════╗"
    echo "║                          ✅ SYSTEM STATUS: GESUND                          ║"
    echo "╚════════════════════════════════════════════════════════════════════════════╝"
else
    echo "╔════════════════════════════════════════════════════════════════════════════╗"
    echo "║                    ⚠️  PROBLEME GEFUNDEN: $ISSUES Issues                          ║"
    echo "╚════════════════════════════════════════════════════════════════════════════╝"
    echo ""
    echo "💡 Empfohlene Maßnahmen:"
    echo "   1. Prüfe Application Logs: sudo journalctl -u storebackend -n 100"
    echo "   2. Prüfe PostgreSQL: sudo /opt/storebackend/scripts/diagnose-database.sh"
    echo "   3. Restart Service: sudo systemctl restart storebackend"
    echo "   4. Flyway Repair: sudo /opt/storebackend/scripts/diagnose-v17-migration.sh"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ FULL SYSTEM CHECK ABGESCHLOSSEN"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

