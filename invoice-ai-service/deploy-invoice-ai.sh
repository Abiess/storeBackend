#!/usr/bin/env bash
set -euo pipefail

# ══════════════════════════════════════════════════════════════
# Invoice AI Service - Installation auf VPS
# ══════════════════════════════════════════════════════════════
#
# Wird vom GitHub Actions Deployment aufgerufen.
# Installiert NICHT automatisch, nur Dateien vorbereiten.
#
# ══════════════════════════════════════════════════════════════

SERVICE_DIR="/opt/invoice-ai-service"
ENV_FILE="/etc/markt-ma/invoice-ai.env"
SYSTEMD_SERVICE="/etc/systemd/system/invoice-ai.service"
NGINX_CONF="/etc/nginx/sites-available/ai.markt.ma"

echo "============================================================"
echo "Invoice AI Service - Deployment"
echo "============================================================"

# ── 1. Service-Verzeichnis anlegen ──────────────────────────────
echo ""
echo "1️⃣  Erstelle Service-Verzeichnis..."

if [ ! -d "$SERVICE_DIR" ]; then
    sudo mkdir -p "$SERVICE_DIR"
    echo "   ✅ $SERVICE_DIR erstellt"
else
    echo "   ℹ️  $SERVICE_DIR existiert bereits"
fi

# ── 2. Dateien aus /tmp kopieren ───────────────────────────────
echo ""
echo "2️⃣  Kopiere Service-Dateien..."

TMP_DIR="/tmp/invoice-ai-service-deploy"

if [ ! -d "$TMP_DIR" ]; then
    echo "   ❌ $TMP_DIR nicht gefunden!"
    echo "   Deployment abgebrochen."
    exit 1
fi

sudo cp "$TMP_DIR/main.py" "$SERVICE_DIR/"
sudo cp "$TMP_DIR/models.py" "$SERVICE_DIR/"
sudo cp "$TMP_DIR/requirements.txt" "$SERVICE_DIR/"

echo "   ✅ Python-Dateien kopiert"

# ── 3. systemd Service kopieren ────────────────────────────────
echo ""
echo "3️⃣  Kopiere systemd Service..."

if [ -f "$TMP_DIR/invoice-ai.service" ]; then
    sudo cp "$TMP_DIR/invoice-ai.service" "$SYSTEMD_SERVICE"
    echo "   ✅ $SYSTEMD_SERVICE erstellt"
else
    echo "   ⚠️  invoice-ai.service nicht gefunden in $TMP_DIR"
fi

# ── 4. Nginx-Konfiguration kopieren ────────────────────────────
echo ""
echo "4️⃣  Kopiere Nginx-Konfiguration..."

if [ -f "$TMP_DIR/nginx-ai-markt-ma.conf" ]; then
    sudo cp "$TMP_DIR/nginx-ai-markt-ma.conf" "$NGINX_CONF"
    echo "   ✅ $NGINX_CONF erstellt"
else
    echo "   ⚠️  nginx-ai-markt-ma.conf nicht gefunden in $TMP_DIR"
fi

# ── 5. Temp-Verzeichnis aufräumen ──────────────────────────────
echo ""
echo "5️⃣  Räume Temp-Verzeichnis auf..."
rm -rf "$TMP_DIR"
echo "   ✅ $TMP_DIR entfernt"

# ── 6. Status anzeigen ─────────────────────────────────────────
echo ""
echo "============================================================"
echo "✅ Invoice AI Service - Dateien deployed"
echo "============================================================"
echo ""
echo "📂 Deployed files:"
ls -lh "$SERVICE_DIR/"*.py "$SERVICE_DIR/"*.txt 2>/dev/null || true
echo ""
echo "⚠️  INSTALLATION NOCH NICHT ABGESCHLOSSEN!"
echo ""
echo "Manuelle Schritte erforderlich:"
echo ""
echo "  1. Python Virtual Environment erstellen:"
echo "     cd $SERVICE_DIR"
echo "     python3 -m venv venv"
echo "     source venv/bin/activate"
echo "     pip install --upgrade pip"
echo "     pip install -r requirements.txt"
echo ""
echo "  2. Token konfigurieren:"
echo "     sudo mkdir -p /etc/markt-ma"
echo "     sudo bash -c 'echo \"INVOICE_AI_TOKEN=\$(openssl rand -base64 32)\" > $ENV_FILE'"
echo "     sudo chmod 600 $ENV_FILE"
echo ""
echo "  3. systemd Service aktivieren:"
echo "     sudo systemctl daemon-reload"
echo "     sudo systemctl enable invoice-ai"
echo "     sudo systemctl start invoice-ai"
echo ""
echo "  4. Nginx konfigurieren:"
echo "     sudo certbot --nginx -d ai.markt.ma"
echo "     sudo ln -s $NGINX_CONF /etc/nginx/sites-enabled/"
echo "     sudo nginx -t"
echo "     sudo systemctl reload nginx"
echo ""
echo "  5. Ollama-Modell laden:"
echo "     ollama pull qwen2.5vl:3b"
echo ""
echo "  6. Test:"
echo "     curl https://ai.markt.ma/health"
echo ""
echo "============================================================"
