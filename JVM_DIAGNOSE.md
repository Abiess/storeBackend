# JVM Diagnose-Befehle für storebackend OOM-Analyse

## Schnell-Diagnose (sofort ausführbar, ohne Neustart)

```bash
# PID des laufenden Backends ermitteln
PID=$(pgrep -f "app.jar")
echo "Backend PID: $PID"

# Heap-Übersicht (Used/Committed/Max)
jcmd $PID GC.heap_info

# GC-Statistiken
jcmd $PID GC.run_finalization

# Top-50 Klassen nach Instanzanzahl (Leak-Kandidaten: wachsende byte[], String, JsonNode)
jcmd $PID GC.class_histogram | head -50

# JVM Flags (aktuell aktive JVM-Optionen prüfen)
jcmd $PID VM.flags
```

## Native Memory Tracking (NMT)

**Nur aktivieren wenn Standard-Heap-Analyse nicht ausreicht.**  
Overhead: ~5-10% Performance.

### Aktivierung (in `/etc/storebackend.env` JAVA_OPTS ergänzen, dann Neustart):
```bash
# Bestehende Zeile in /etc/storebackend.env:
JAVA_OPTS=-Xms128m -Xmx1024m -XX:+UseG1GC -XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=/var/log/storebackend/heapdump.hprof -XX:+ExitOnOutOfMemoryError

# NMT ergänzen:
JAVA_OPTS=-Xms128m -Xmx1024m -XX:+UseG1GC -XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=/var/log/storebackend/heapdump.hprof -XX:+ExitOnOutOfMemoryError -XX:NativeMemoryTracking=summary
```

### NMT Abfrage:
```bash
PID=$(pgrep -f "app.jar")
jcmd $PID VM.native_memory summary

# Detailliert (alle Bereiche):
jcmd $PID VM.native_memory detail

# Differenz seit letztem Baseline (Leak-Detektion):
jcmd $PID VM.native_memory baseline
# ... nach einiger Zeit ...
jcmd $PID VM.native_memory summary.diff
```

## Heapdump analysieren

### Automatischer OOM-Dump
Der Heapdump wird bei OOM automatisch erstellt (dank `-XX:+HeapDumpOnOutOfMemoryError`):
```bash
ls -lh /var/log/storebackend/heapdump.hprof
```

### Manueller Heapdump (ohne OOM, für Vorher/Nachher-Vergleich):
```bash
PID=$(pgrep -f "app.jar")

# GC vor Dump erzwingen (optional, für saubereren Dump)
jcmd $PID GC.run

# Heapdump erstellen
jmap -dump:format=b,file=/var/log/storebackend/manual-heapdump-$(date +%Y%m%d-%H%M%S).hprof $PID

# Dateigröße prüfen
ls -lh /var/log/storebackend/*.hprof
```

### Heapdump lokal analysieren
1. Datei herunterladen: `scp user@vps:/var/log/storebackend/heapdump.hprof ./`
2. Analyse mit **Eclipse MAT** (Memory Analyzer Tool): https://eclipse.dev/mat/
3. Alternativ: `jhat heapdump.hprof` (eingebaut, aber sehr einfach)
4. Schnellübersicht: `jmap -histo:live <pid>` (live-Objekte)

## Memory-Watch Log auswerten

```bash
# Letzter Eintrag
tail -50 /var/log/memory-watch/memory.log

# OOM-Einträge suchen
grep -i "oom\|killed\|out of memory" /var/log/memory-watch/memory.log

# Wachstum über Zeit: MemoryCurrent beobachten
grep "MemoryCurrent" /var/log/memory-watch/memory.log
```

## Telegram Import Speicher-Monitoring

Vor und nach einem manuellen Telegram-Import:

```bash
PID=$(pgrep -f "app.jar")

echo "=== VOR Import ==="
jcmd $PID GC.heap_info
free -h

# Import auslösen (oder warten bis Auto-Import)

echo "=== NACH Import ==="
jcmd $PID GC.heap_info
free -h

# Top-Objekte nach Import
jcmd $PID GC.class_histogram | head -30
```

## systemd Memory-Status prüfen

```bash
# Aktueller Speicherverbrauch des Services
systemctl show storebackend --property=MemoryCurrent,MemoryMax,MemoryHigh

# Als menschenlesbare Größen (Byte → MB)
systemctl show storebackend --property=MemoryCurrent | awk -F= '{printf "MemoryCurrent: %.0f MB\n", $2/1024/1024}'

# OOM-Kill prüfen (systemd-intern)
journalctl -u storebackend | grep -i "oom\|killed\|memory"
dmesg | grep -i "oom\|killed" | tail -20
```

## Swap-Status

```bash
swapon --show
free -h
cat /proc/sys/vm/swappiness   # sollte 10 sein
```

## DB-Update: Bestehende import_limit auf 20 setzen

Bestehende `telegram_mtproto_config`-Einträge haben ggf. noch `import_limit=50`.
Der Java-Default wurde auf 20 geändert, aber `ddl-auto=update` ändert DB-Werte nicht rückwirkend.

```bash
# Einmalig auf VPS ausführen:
sudo -u postgres psql storedb -c \
  "UPDATE telegram_mtproto_config SET import_limit = 20 WHERE import_limit > 20;"

# Prüfen:
sudo -u postgres psql storedb -c \
  "SELECT store_id, import_limit FROM telegram_mtproto_config;"
```

## Deploy-Checkliste nach Änderungen

```bash
# 1. Lokal bauen (kein Deploy ohne Build-Success)
mvn -DskipTests package

# 2. JAR auf VPS kopieren
scp target/storeBackend-0.0.1-SNAPSHOT.jar user@vps:/tmp/app.jar

# 3. Service-Unit aktualisieren (falls storebackend.service geändert)
sudo cp scripts/storebackend.service /etc/systemd/system/storebackend.service
sudo systemctl daemon-reload

# 4. Swap + Log-Verzeichnisse sicherstellen (einmalig)
sudo bash scripts/setup-swap.sh
sudo mkdir -p /var/log/storebackend && sudo chown storebackend:storebackend /var/log/storebackend
sudo mkdir -p /var/log/memory-watch

# 5. Memory-Watch Script deployen + Cron
sudo cp scripts/memory-watch.sh /opt/storebackend/scripts/memory-watch.sh
sudo chmod +x /opt/storebackend/scripts/memory-watch.sh
# Cron als root hinzufügen (einmalig):
# */2 * * * * /opt/storebackend/scripts/memory-watch.sh >> /dev/null 2>&1

# 6. JAVA_OPTS in /etc/storebackend.env prüfen
grep JAVA_OPTS /etc/storebackend.env

# 7. JAR installieren + Neustart
sudo cp /tmp/app.jar /opt/storebackend/app.jar
sudo chown storebackend:storebackend /opt/storebackend/app.jar
sudo systemctl restart storebackend

# 8. Logs prüfen
journalctl -u storebackend -n 100 --no-pager

# 9. Memory-Limits prüfen
systemctl show storebackend --property=MemoryMax,MemoryHigh

# 10. DB-Update import_limit
sudo -u postgres psql storedb -c \
  "UPDATE telegram_mtproto_config SET import_limit = 20 WHERE import_limit > 20;"
```

