#!/bin/bash
# =============================================================================
# setup-swap.sh – Richtet 4GB Swap + swappiness=10 ein (vollständig idempotent)
# Sicher mehrfach ausführbar, keine doppelten fstab/sysctl.conf Einträge.
# =============================================================================
set -euo pipefail

SWAP_FILE="/swapfile"
SWAP_SIZE="4G"
SWAPPINESS=10

echo "=== Swap Setup (idempotent) ==="

# ── 1. Swap-Datei anlegen falls noch nicht vorhanden ─────────────────────────
if [ ! -f "$SWAP_FILE" ]; then
  echo "📁 Erstelle $SWAP_FILE ($SWAP_SIZE)..."
  fallocate -l "$SWAP_SIZE" "$SWAP_FILE"
  chmod 600 "$SWAP_FILE"
  mkswap "$SWAP_FILE"
  echo "✅ Swap-Datei erstellt und formatiert."
else
  echo "ℹ️  $SWAP_FILE existiert bereits – überspringe Erstellung."
fi

# ── 2. Swap aktivieren falls nicht bereits aktiv ─────────────────────────────
if ! grep -q "^$SWAP_FILE" /proc/swaps 2>/dev/null; then
  echo "🔄 Aktiviere Swap..."
  swapon "$SWAP_FILE"
  echo "✅ Swap aktiviert."
else
  echo "ℹ️  Swap ist bereits aktiv."
fi

# ── 3. fstab – Eintrag nur EINMAL hinzufügen ─────────────────────────────────
if ! grep -qF "$SWAP_FILE" /etc/fstab; then
  echo "$SWAP_FILE none swap sw 0 0" >> /etc/fstab
  echo "✅ fstab-Eintrag hinzugefügt."
else
  echo "ℹ️  fstab-Eintrag bereits vorhanden."
fi

# ── 4. swappiness setzen (sofort + persistent) ───────────────────────────────
sysctl -w vm.swappiness="$SWAPPINESS" > /dev/null
if ! grep -qF "vm.swappiness" /etc/sysctl.conf; then
  echo "vm.swappiness=$SWAPPINESS" >> /etc/sysctl.conf
  echo "✅ vm.swappiness=$SWAPPINESS in /etc/sysctl.conf gesetzt."
else
  # Wert aktualisieren falls abweichend (idempotent)
  sed -i "s/^vm\.swappiness=.*/vm.swappiness=$SWAPPINESS/" /etc/sysctl.conf
  echo "ℹ️  vm.swappiness bereits in sysctl.conf – sichergestellt: $SWAPPINESS."
fi

# ── 5. Status-Ausgabe ─────────────────────────────────────────────────────────
echo ""
echo "=== Aktueller Swap-Status ==="
swapon --show
echo ""
echo "swappiness=$(cat /proc/sys/vm/swappiness)"
echo ""
echo "✅ setup-swap.sh abgeschlossen."

