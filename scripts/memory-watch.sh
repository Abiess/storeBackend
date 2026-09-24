#!/bin/bash
# =============================================================================
# memory-watch.sh – Speicher-Monitoring alle 2 Minuten (via Cron)
#
# Cron-Eintrag (als root):
#   */2 * * * * /opt/storebackend/scripts/memory-watch.sh >> /dev/null 2>&1
#
# Log: /var/log/memory-watch/memory.log
# Rotation: ab 50 MB wird das Log rotiert (kein logrotate-Abhängigkeit)
# =============================================================================
set -euo pipefail

LOG_DIR="/var/log/memory-watch"
LOG="$LOG_DIR/memory.log"
MAX_SIZE_BYTES=52428800  # 50 MB

# ── Verzeichnis anlegen ───────────────────────────────────────────────────────
mkdir -p "$LOG_DIR"

# ── Log-Rotation bei >50 MB ──────────────────────────────────────────────────
if [ -f "$LOG" ] && [ "$(stat -c%s "$LOG" 2>/dev/null || echo 0)" -gt "$MAX_SIZE_BYTES" ]; then
  mv "$LOG" "$LOG.$(date +%Y%m%d-%H%M%S)"
fi

# ── Daten sammeln ─────────────────────────────────────────────────────────────
{
  echo "====== $(date '+%Y-%m-%d %H:%M:%S') ======"

  echo "--- free -h ---"
  free -h

  echo ""
  echo "--- ps aux --sort=-%mem | head -25 ---"
  ps aux --sort=-%mem | head -25

  echo ""
  echo "--- java processes ---"
  pgrep -a java 2>/dev/null || echo "(kein Java-Prozess aktiv)"

  echo ""
  echo "--- storebackend systemd memory ---"
  systemctl show storebackend \
    --property=MemoryCurrent,MemoryMax,MemoryHigh,ActiveState 2>/dev/null \
    || echo "(storebackend nicht gefunden)"

  echo ""
  echo "--- docker stats (falls vorhanden) ---"
  if command -v docker &>/dev/null; then
    docker stats --no-stream 2>/dev/null || echo "(docker nicht erreichbar)"
  else
    echo "(docker nicht installiert)"
  fi

  echo ""
  echo "--- OOM-Kills (dmesg) ---"
  dmesg 2>/dev/null | grep -i "oom\|killed\|out of memory" | tail -10 \
    || echo "(keine OOM-Einträge)"

  echo ""
} >> "$LOG"

