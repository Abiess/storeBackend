# Backend-Fehler in Grafana ansehen

`storebackend.service` schreibt bereits ins systemd-Journal. Das vorhandene
Prometheus-Dashboard zeigt Messwerte, aber keine Java-Stacktraces. Diese
Konfiguration ergänzt Loki (lokale Logspeicherung), Alloy (Journal-Leser)
und eine Grafana-Datenquelle. Loki lauscht ausschließlich auf `127.0.0.1`;
Logdaten werden nach sieben Tagen gelöscht. Die Konfiguration verändert
weder den Backend-Service noch das bestehende Prometheus-Dashboard.

## Auf der Markt-VPS nach dem Merge

Die folgenden Befehle im ausgecheckten Repository auf der **gleichen VPS wie
Grafana und `storebackend`** ausführen. Zuerst prüfen, ob bereits ein Loki oder
Alloy installiert ist; vorhandene Konfiguration dann vor dem Überschreiben
vergleichen.

```bash
systemctl status grafana-server loki alloy storebackend --no-pager
sudo ss -ltnp | grep -E ':3100|:12345' || true
```

Grafanas offiziellen APT-Repository-Schlüssel und Paketquelle installieren,
falls diese Quelle noch nicht eingerichtet ist:

```bash
sudo apt-get install -y gpg wget
sudo mkdir -p /etc/apt/keyrings
sudo wget -O /etc/apt/keyrings/grafana.asc https://apt.grafana.com/gpg-full.key
sudo chmod 644 /etc/apt/keyrings/grafana.asc
echo 'deb [signed-by=/etc/apt/keyrings/grafana.asc] https://apt.grafana.com stable main' | sudo tee /etc/apt/sources.list.d/grafana.list
sudo apt-get update
sudo apt-get install -y loki alloy
```

Die vom Paket verwendeten Config-Pfade mit `systemctl cat loki alloy` prüfen.
Beim offiziellen Loki-DEB lautet der Pfad `/etc/loki/config.yml`, bei Alloy
`/etc/alloy/config.alloy`. Vorhandene Dateien sichern und die neuen kopieren:

```bash
sudo cp /etc/loki/config.yml /etc/loki/config.yml.bak
sudo cp /etc/alloy/config.alloy /etc/alloy/config.alloy.bak
sudo install -m 0644 grafana/logging/loki-config.yml /etc/loki/config.yml
sudo install -m 0644 grafana/logging/alloy-config.alloy /etc/alloy/config.alloy
sudo install -d -o loki -g loki /var/lib/loki
sudo usermod -aG adm,systemd-journal alloy
sudo alloy validate /etc/alloy/config.alloy
sudo systemctl enable --now loki alloy
sudo systemctl restart loki alloy
curl -f http://127.0.0.1:3100/ready
```

Wenn `loki` schon läuft und seine Daten woanders liegen, den Datenpfad und
das Schema **nicht** durch dieses Beispiel ersetzen. Die Konfiguration muss
an die bestehende Installation angepasst werden.

Grafana-Datenquelle einrichten (Grafana liest Provisioning-Dateien beim
Neustart):

```bash
sudo install -m 0644 grafana/logging/loki-datasource.yml /etc/grafana/provisioning/datasources/markt-loki.yml
sudo systemctl restart grafana-server
```

## Prüfen und Fehler finden

In `https://grafana.markt.ma` unter **Explore** die Datenquelle **Loki** wählen,
Zeitraum auf „Letzte 24 Stunden“ stellen und diese LogQL-Abfrage ausführen:

```logql
{service="storebackend"} |= "Unhandled exception while processing"
```

Für den vollständigen Stacktrace alle Logzeilen unmittelbar nach einem
Treffer öffnen, zum Beispiel mit `{service="storebackend"}` und engem
Zeitfenster. Der heute um 09:22 UTC aufgetretene Fehler ist nur auffindbar,
solange das systemd-Journal ihn noch enthält und Alloy innerhalb von 24
Stunden nach dem Fehler gestartet wird. `max_age` bei späterer Einrichtung
vorübergehend erhöhen.

Bei leerer Ansicht: `sudo journalctl -u storebackend -n 20 --no-pager`,
`sudo journalctl -u alloy -n 50 --no-pager` und
`sudo journalctl -u loki -n 50 --no-pager` vergleichen. Die Grafana-Datenquelle
liegt im Servermodus auf derselben VPS und erreicht Loki über localhost.
Logs können Kundendaten enthalten; Grafana-Zugriff auf Admins beschränken.
