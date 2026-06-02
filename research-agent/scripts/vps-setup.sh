#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════
#  markt.ma – Research Agent VPS-Setup
#  Einmalig auf dem VPS ausführen:
#    bash /opt/research-agent/scripts/vps-setup.sh
# ══════════════════════════════════════════════════════════════
set -euo pipefail

AGENT_DIR="/opt/research-agent"
LOG_DIR="$AGENT_DIR/logs"
OUTPUT_DIR="$AGENT_DIR/output"

echo "════════════════════════════════════════════════════════"
echo "  🏪  Research Agent – VPS-Erstinstallation"
echo "════════════════════════════════════════════════════════"

# ── 1. Node.js prüfen / installieren ─────────────────────────
echo ""
echo "📦  Prüfe Node.js..."
if ! command -v node &>/dev/null; then
  echo "   Node.js nicht gefunden – installiere v20 LTS..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi
NODE_VER=$(node --version)
echo "   ✅ Node.js $NODE_VER"

# ── 2. Verzeichnisse anlegen ──────────────────────────────────
echo ""
echo "📁  Erstelle Verzeichnisse..."
mkdir -p "$LOG_DIR" "$OUTPUT_DIR"
echo "   ✅ $LOG_DIR"
echo "   ✅ $OUTPUT_DIR"

# ── 3. npm install ────────────────────────────────────────────
echo ""
echo "📦  npm install..."
cd "$AGENT_DIR"
npm install --production
echo "   ✅ Dependencies installiert"

# ── 4. Cron-Job einrichten ────────────────────────────────────
echo ""
echo "⏰  Richte Cron-Job ein (täglich 06:00 Marokko-Zeit)..."

CRON_JOB="0 5 * * * cd $AGENT_DIR && /usr/bin/node main.js --source all --min-score 40 >> $LOG_DIR/cron.log 2>&1"
CRON_MARKER="research-agent-daily"

(crontab -l 2>/dev/null | grep -v "$CRON_MARKER" || true) > /tmp/crontab_tmp
echo "# $CRON_MARKER" >> /tmp/crontab_tmp
echo "$CRON_JOB" >> /tmp/crontab_tmp
crontab /tmp/crontab_tmp
rm /tmp/crontab_tmp

echo "   ✅ Cron gesetzt: $CRON_JOB"

# ── 5. Log-Rotation einrichten ────────────────────────────────
echo ""
echo "🔄  Richte Log-Rotation ein..."
sudo tee /etc/logrotate.d/research-agent > /dev/null <<'LOGROTATE'
/opt/research-agent/logs/*.log {
    daily
    rotate 14
    compress
    missingok
    notifempty
    create 0644 root root
}
LOGROTATE
echo "   ✅ Logrotate konfiguriert (14 Tage)"

# ── 6. Erster Test-Lauf (Demo) ────────────────────────────────
echo ""
echo "🎭  Führe Test-Lauf aus (Demo-Modus)..."
cd "$AGENT_DIR"
node main.js --demo --min-score 0 --output "$OUTPUT_DIR"
echo "   ✅ Test-Lauf erfolgreich"

# ── 7. Zusammenfassung ────────────────────────────────────────
echo ""
echo "════════════════════════════════════════════════════════"
echo "  ✅ Research Agent erfolgreich eingerichtet!"
echo "════════════════════════════════════════════════════════"
echo ""
echo "  📂  Outputs:   $OUTPUT_DIR"
echo "  📋  Logs:      $LOG_DIR/cron.log"
echo "  ⏰  Cron:      Täglich 06:00 Marokko-Zeit"
echo ""
echo "  Manueller Lauf:"
echo "    cd $AGENT_DIR && node main.js --source avito --min-score 50"
echo ""
echo "  Logs verfolgen:"
echo "    tail -f $LOG_DIR/cron.log"
echo ""
echo "  Letzte Ergebnisse:"
echo "    ls -lht $OUTPUT_DIR | head -5"
echo ""

