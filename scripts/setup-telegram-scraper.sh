#!/usr/bin/env bash
# =============================================================================
# setup-telegram-scraper.sh
# Installiert und startet den Telegram MTProto Scraper (Python-Microservice)
# als systemd-Service auf Port 8001.
# Analog zu deploy.sh / fix-db-permissions.sh etc.
# =============================================================================
set -euo pipefail

SCRAPER_DIR="/opt/telegram-scraper"
SERVICE_NAME="telegram-scraper"
SYSTEMD_SERVICE="/etc/systemd/system/${SERVICE_NAME}.service"
VENV_DIR="$SCRAPER_DIR/.venv"
PORT=8001

# ── Hilfsfunktionen ────────────────────────────────────────────────────────────
print_ok()      { echo "   ✅ $1"; }
print_warn()    { echo "   ⚠️  $1"; }
print_error()   { echo "   ❌ $1"; }
print_section() { echo ""; echo "🤖 $1"; }

# ==============================================================================
# 1. NTP-Sync sicherstellen (PFLICHT für Telegram-Auth – ohne korrekte Uhrzeit
#    schlägt die Code-Verifikation sofort mit "expired" fehl!)
# ==============================================================================
print_section "Prüfe Systemzeit (NTP-Sync für Telegram-Auth erforderlich)..."
if command -v timedatectl &>/dev/null; then
    NTP_ACTIVE=$(timedatectl show --property=NTPSynchronized --value 2>/dev/null || echo "unknown")
    if [ "$NTP_ACTIVE" = "yes" ]; then
        print_ok "NTP aktiv und synchronisiert."
    else
        print_warn "NTP nicht synchronisiert – installiere/starte systemd-timesyncd..."
        sudo apt-get install -y -qq systemd-timesyncd 2>/dev/null || true
        sudo systemctl enable --now systemd-timesyncd 2>/dev/null || true
        sudo timedatectl set-ntp true 2>/dev/null || true
        sleep 2
        print_ok "NTP-Sync gestartet (Uhrzeit: $(date -u))"
    fi
else
    print_warn "timedatectl nicht verfügbar – installiere ntpdate..."
    sudo apt-get install -y -qq ntpdate 2>/dev/null || true
    sudo ntpdate -u pool.ntp.org 2>/dev/null || true
fi

# ==============================================================================
# 2. Port-Check: Nur zur Info – kein vorzeitiger Exit mehr!
#    (Früher wurde hier exit 0 aufgerufen, bevor der neue Code kopiert wurde →
#     main.py auf dem Server wurde nie aktualisiert. Jetzt immer vollständig deployen.)
# ==============================================================================
print_section "Prüfe Port $PORT (nur Info – Deploy läuft immer vollständig durch)..."
if ss -tlnp 2>/dev/null | grep -q ":${PORT} " || \
   netstat -tlnp 2>/dev/null | grep -q ":${PORT} "; then
    print_ok "Port $PORT belegt – Scraper läuft. Neuer Code wird trotzdem eingespielt + Service neu gestartet."
else
    print_warn "Port $PORT ist frei – Telegram Scraper wird erstmalig eingerichtet..."
fi

# ==============================================================================
# 3. Quellcode deployen (vom Upload in /opt/storebackend/telegram-scraper)
# ==============================================================================
print_section "Installiere Telegram Scraper nach $SCRAPER_DIR ..."
sudo mkdir -p "$SCRAPER_DIR"

SRC_DIR="/opt/storebackend/telegram-scraper"
if [ -d "$SRC_DIR" ]; then
    sudo cp -r "$SRC_DIR/." "$SCRAPER_DIR/"
    print_ok "Quellcode nach $SCRAPER_DIR kopiert."
else
    print_error "Quellcode-Verzeichnis nicht gefunden: $SRC_DIR"
    print_error "Stelle sicher, dass 'telegram-scraper/' im Repository enthalten ist."
    exit 1
fi

# ==============================================================================
# 3. Python 3 & venv
# ==============================================================================
print_section "Prüfe Python-Installation..."
sudo apt-get update -qq

# Python 3 installieren falls nicht vorhanden
if ! command -v python3 &>/dev/null; then
    print_warn "python3 nicht gefunden – installiere..."
    sudo apt-get install -y python3 python3-pip
fi
print_ok "Python $(python3 --version)"

# python3-venv sicherstellen (auf Debian/Ubuntu oft separat erforderlich)
PY_VERSION=$(python3 -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')")
print_warn "Stelle sicher, dass python${PY_VERSION}-venv installiert ist..."
sudo apt-get install -y "python${PY_VERSION}-venv" python3-venv 2>/dev/null || \
    sudo apt-get install -y python3-full 2>/dev/null || true
print_ok "python-venv bereit."

# ==============================================================================
# 4. Virtuelle Umgebung & Abhängigkeiten
# ==============================================================================
print_section "Erstelle/Aktualisiere Virtual Environment..."
# Altes venv entfernen falls es defekt oder unvollständig ist
if [ -d "$VENV_DIR" ] && ! sudo "$VENV_DIR/bin/python3" --version &>/dev/null 2>&1; then
    print_warn "Defektes venv gefunden – wird neu erstellt..."
    sudo rm -rf "$VENV_DIR"
fi
if [ ! -d "$VENV_DIR" ]; then
    # --without-pip vermeidet den ensurepip-Fehler; pip wird danach manuell installiert
    sudo python3 -m venv --without-pip "$VENV_DIR"
fi

# pip via get-pip.py bootstrappen (funktioniert immer, unabhängig von ensurepip)
if ! sudo "$VENV_DIR/bin/python3" -m pip --version &>/dev/null 2>&1; then
    print_warn "pip nicht im venv – bootstrappe via get-pip.py..."
    curl -sSL https://bootstrap.pypa.io/get-pip.py -o /tmp/get-pip.py
    sudo "$VENV_DIR/bin/python3" /tmp/get-pip.py --quiet
    rm -f /tmp/get-pip.py
fi

sudo "$VENV_DIR/bin/python3" -m pip install --quiet --upgrade pip
sudo "$VENV_DIR/bin/python3" -m pip install --quiet -r "$SCRAPER_DIR/requirements.txt"
print_ok "Abhängigkeiten installiert."

# ==============================================================================
# 5. systemd Service einrichten
# ==============================================================================
print_section "Richte systemd Service ein: $SERVICE_NAME"
sudo bash -c "cat > '$SYSTEMD_SERVICE' <<'EOF'
[Unit]
Description=Telegram MTProto Scraper (Microservice Port 8001)
After=network.target
Wants=network-online.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/telegram-scraper
ExecStart=/opt/telegram-scraper/.venv/bin/python3 -m uvicorn main:app --host 0.0.0.0 --port 8001 --workers 1
Restart=on-failure
RestartSec=10s
StartLimitInterval=120s
StartLimitBurst=5

StandardOutput=journal
StandardError=journal
SyslogIdentifier=telegram-scraper

[Install]
WantedBy=multi-user.target
EOF"

sudo systemctl daemon-reload
sudo systemctl enable "$SERVICE_NAME"

# ==============================================================================
# 6. Service starten / neu starten – IMMER, damit neue main.py aktiv wird
# ==============================================================================
print_section "Starte $SERVICE_NAME (immer neu starten damit neuer Code aktiv wird)..."
sudo systemctl daemon-reload
if sudo systemctl is-active --quiet "$SERVICE_NAME"; then
    sudo systemctl restart "$SERVICE_NAME"
    print_ok "Service neu gestartet – neuer Code ist jetzt aktiv."
else
    sudo systemctl start "$SERVICE_NAME"
    print_ok "Service erstmalig gestartet."
fi

# ==============================================================================
# 7. Health-Check (max. 15 Versuche × 2s = 30s)
# ==============================================================================
print_section "Warte auf Health-Endpoint http://localhost:${PORT}/health ..."
for i in $(seq 1 15); do
    HEALTH=$(curl -s -o /dev/null -w "%{http_code}" \
        "http://localhost:${PORT}/health" 2>/dev/null || echo "000")
    if [ "$HEALTH" = "200" ]; then
        print_ok "Telegram Scraper ist healthy (HTTP 200) 🎉"
        exit 0
    fi
    echo "   ⏳ Versuch $i/15 (HTTP $HEALTH)..."
    sleep 2
done

print_error "Telegram Scraper antwortet nicht nach 30s!"
echo ""
echo "📋 Journal-Logs:"
sudo journalctl -u "$SERVICE_NAME" -n 30 --no-pager || true
exit 1

