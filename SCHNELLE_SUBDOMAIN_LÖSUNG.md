# 🚀 Schnelle Subdomain-Lösung

## Problem
Store "abdellah" ist unter `markt.ma/frontend/1` erreichbar, aber **nicht unter `abdellah.markt.ma`**

## ✅ Lösung in 3 Schritten

### Schritt 1: DNS Wildcard Record (5 Minuten)

Gehen Sie zu Ihrem DNS-Provider und fügen Sie hinzu:

```
Type: A
Host: *
Value: 212.227.58.56
TTL: 3600
```

**Wichtig:** Das `*` (Wildcard) bedeutet, dass ALLE Subdomains auf Ihren Server zeigen.

#### Beliebte DNS-Provider:

**Cloudflare:**
1. Login → Select Domain `markt.ma`
2. DNS → Add Record
3. Type: `A`, Name: `*`, IPv4: `212.227.58.56`
4. Save

**GoDaddy:**
1. My Products → DNS
2. Add New Record
3. Type: `A`, Host: `*`, Points to: `212.227.58.56`

**Namecheap:**
1. Domain List → Manage → Advanced DNS
2. Add New Record
3. Type: `A`, Host: `*`, Value: `212.227.58.56`

---

### Schritt 2: VPS konfigurieren (10 Minuten)

#### Option A: Automatisches Setup-Skript

```bash
# 1. SSH zum VPS
ssh root@212.227.58.56

# 2. Zum Projekt-Verzeichnis
cd /root/storeBackend

# 3. Neueste Änderungen holen
git pull

# 4. Setup-Skript ausführen
chmod +x scripts/setup-subdomain-support.sh
sudo ./scripts/setup-subdomain-support.sh
```

Das Skript wird:
- ✅ Nginx für Subdomains konfigurieren
- ✅ Domain-Einträge in der Datenbank erstellen
- ✅ Nginx neu laden

#### Option B: Manuelle Konfiguration

Falls das Skript nicht funktioniert, siehe `SUBDOMAIN_SETUP_FIX.md` für manuelle Schritte.

---

### Schritt 3: Testen (2 Minuten)

Warten Sie 5-10 Minuten nach dem DNS-Setup, dann:

```bash
# DNS testen
nslookup abdellah.markt.ma
# Sollte zeigen: 212.227.58.56

# HTTP testen
curl -I http://abdellah.markt.ma
# Sollte zeigen: 200 OK
```

**Im Browser öffnen:**
- http://abdellah.markt.ma

---

## 🔍 Troubleshooting

### Problem: DNS zeigt falsche IP

```bash
# Warten Sie länger (bis zu 48h für weltweite Propagation)
# Prüfen Sie: https://dnschecker.org
```

### Problem: 404 oder 502 Error

```bash
# Auf dem VPS - Nginx-Logs prüfen
ssh root@212.227.58.56
tail -f /var/log/nginx/subdomain-error.log
```

### Problem: "Store not found"

```bash
# Domain-Eintrag in DB überprüfen
ssh root@212.227.58.56
mysql -u storeuser -p storebackend

SELECT s.name, s.slug, d.host, d.status 
FROM stores s 
LEFT JOIN domains d ON s.id = d.store_id 
WHERE s.slug = 'abdellah';

# Falls leer, manuell erstellen:
INSERT INTO domains (store_id, host, domain_type, status, is_verified, created_at)
SELECT id, CONCAT(slug, '.markt.ma'), 'SUBDOMAIN', 'ACTIVE', 1, NOW()
FROM stores WHERE slug = 'abdellah';
```

---

## 📊 Was passiert technisch?

1. **DNS Wildcard** (`*.markt.ma` → `212.227.58.56`)
   - Browser löst `abdellah.markt.ma` auf → `212.227.58.56`

2. **Nginx empfängt Request** mit Host: `abdellah.markt.ma`
   - Regex-Pattern erkennt Subdomain: `abdellah`
   - Leitet Frontend-Dateien und API-Calls weiter

3. **Frontend erkennt Subdomain**
   - `SubdomainService` in Angular liest `window.location.hostname`
   - Ruft Backend auf: `/api/public/store/resolve?host=abdellah.markt.ma`

4. **Backend löst Store auf**
   - Sucht in `domains`-Tabelle nach Host `abdellah.markt.ma`
   - Findet Store-ID und lädt Store-Daten
   - Sendet zurück: `{ storeId: 1, name: "...", slug: "abdellah" }`

5. **Frontend zeigt Store**
   - Lädt Produkte für Store-ID
   - Lädt Kategorien
   - Wendet Custom-Theme an
   - Zeigt öffentliche Storefront

---

## ✅ Fertig!

Nach diesen Schritten:
- ✅ `abdellah.markt.ma` zeigt die Storefront
- ✅ Jeder neue Store bekommt automatisch seine Subdomain
- ✅ Keine Anmeldung erforderlich (öffentlich)
- ✅ Funktioniert für unbegrenzt viele Stores

**Beispiele:**
- `shop1.markt.ma`
- `mybusiness.markt.ma`
- `test.markt.ma`

Alle funktionieren automatisch! 🎉
# 🌐 Subdomain-Support auf VPS einrichten
# PowerShell-Skript für Windows

Write-Host "🌐 Subdomain-Support Setup für markt.ma" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host ""

$VPS_IP = "212.227.58.56"
$VPS_USER = "root"

Write-Host "📋 Checkliste:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. ✅ DNS Wildcard Record erstellen (bei Ihrem DNS-Provider):" -ForegroundColor White
Write-Host "   Type: A" -ForegroundColor Gray
Write-Host "   Host: *" -ForegroundColor Gray
Write-Host "   Value: $VPS_IP" -ForegroundColor Gray
Write-Host "   TTL: 3600" -ForegroundColor Gray
Write-Host ""
Write-Host "2. ⏳ Warten Sie 5-10 Minuten für DNS-Propagation" -ForegroundColor White
Write-Host ""
Write-Host "3. 🚀 Setup-Skript auf VPS ausführen" -ForegroundColor White
Write-Host ""

$response = Read-Host "Haben Sie den DNS Wildcard Record erstellt? (j/n)"

if ($response -ne "j" -and $response -ne "J") {
    Write-Host ""
    Write-Host "❌ Bitte erstellen Sie zuerst den DNS Wildcard Record!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Anleitung:" -ForegroundColor Yellow
    Write-Host "1. Gehen Sie zu Ihrem DNS-Provider (z.B. Cloudflare, GoDaddy, etc.)" -ForegroundColor White
    Write-Host "2. Suchen Sie nach 'DNS Records' oder 'DNS Management' für markt.ma" -ForegroundColor White
    Write-Host "3. Fügen Sie einen neuen A-Record hinzu:" -ForegroundColor White
    Write-Host "   - Type: A" -ForegroundColor Gray
    Write-Host "   - Name/Host: * (Sternchen)" -ForegroundColor Gray
    Write-Host "   - Value/Points to: $VPS_IP" -ForegroundColor Gray
    Write-Host "   - TTL: 3600 (oder Auto)" -ForegroundColor Gray
    Write-Host ""
    exit
}

Write-Host ""
Write-Host "🔌 Verbinde zu VPS..." -ForegroundColor Yellow

# SSH-Befehle in temporäre Datei schreiben
$scriptContent = @"
#!/bin/bash
cd /root/storeBackend
chmod +x scripts/setup-subdomain-support.sh
./scripts/setup-subdomain-support.sh
"@

$tempFile = [System.IO.Path]::GetTempFileName()
$scriptContent | Out-File -FilePath $tempFile -Encoding ASCII

Write-Host "📤 Lade Setup-Skript auf VPS..." -ForegroundColor Yellow

# Kopiere Skript zum VPS und führe es aus
try {
    # Prüfe ob plink verfügbar ist (PuTTY)
    $plinkPath = Get-Command plink -ErrorAction SilentlyContinue
    $pscpPath = Get-Command pscp -ErrorAction SilentlyContinue
    
    if ($plinkPath -and $pscpPath) {
        Write-Host "Verwende PuTTY (plink/pscp)..." -ForegroundColor Gray
        
        # Kopiere lokales Skript zum Server
        pscp -r "scripts/setup-subdomain-support.sh" "${VPS_USER}@${VPS_IP}:/root/storeBackend/scripts/"
        
        # Führe Skript aus
        plink -batch "${VPS_USER}@${VPS_IP}" "cd /root/storeBackend && chmod +x scripts/setup-subdomain-support.sh && ./scripts/setup-subdomain-support.sh"
    } else {
        Write-Host "⚠️  PuTTY nicht gefunden. Manuelle Installation erforderlich." -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Führen Sie manuell auf dem VPS aus:" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "ssh ${VPS_USER}@${VPS_IP}" -ForegroundColor White
        Write-Host "cd /root/storeBackend" -ForegroundColor White
        Write-Host "git pull" -ForegroundColor White
        Write-Host "chmod +x scripts/setup-subdomain-support.sh" -ForegroundColor White
        Write-Host "./scripts/setup-subdomain-support.sh" -ForegroundColor White
        Write-Host ""
    }
} catch {
    Write-Host "❌ Fehler: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Manuelle Anleitung:" -ForegroundColor Yellow
    Write-Host "1. SSH zum VPS:" -ForegroundColor White
    Write-Host "   ssh ${VPS_USER}@${VPS_IP}" -ForegroundColor Gray
    Write-Host ""
    Write-Host "2. Setup-Skript ausführen:" -ForegroundColor White
    Write-Host "   cd /root/storeBackend" -ForegroundColor Gray
    Write-Host "   git pull" -ForegroundColor Gray
    Write-Host "   chmod +x scripts/setup-subdomain-support.sh" -ForegroundColor Gray
    Write-Host "   sudo ./scripts/setup-subdomain-support.sh" -ForegroundColor Gray
} finally {
    Remove-Item $tempFile -ErrorAction SilentlyContinue
}

Write-Host ""
Write-Host "🧪 DNS-Test" -ForegroundColor Cyan
Write-Host "============" -ForegroundColor Cyan
Write-Host ""

$testDomain = "abdellah.markt.ma"
Write-Host "Teste DNS-Auflösung für: $testDomain" -ForegroundColor Yellow

try {
    $dnsResult = Resolve-DnsName -Name $testDomain -ErrorAction SilentlyContinue
    if ($dnsResult) {
        Write-Host "✅ DNS funktioniert!" -ForegroundColor Green
        Write-Host "   IP-Adresse: $($dnsResult.IPAddress)" -ForegroundColor Gray
    } else {
        Write-Host "⚠️  DNS noch nicht propagiert. Warten Sie 5-10 Minuten." -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️  DNS noch nicht aktiv. Bitte warten..." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "✅ Setup-Dateien erstellt!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Nächste Schritte:" -ForegroundColor Yellow
Write-Host "1. Commiten Sie die Änderungen:" -ForegroundColor White
Write-Host "   git commit -m 'Add subdomain support setup scripts'" -ForegroundColor Gray
Write-Host "   git push" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Auf dem VPS ausführen:" -ForegroundColor White
Write-Host "   ssh root@$VPS_IP" -ForegroundColor Gray
Write-Host "   cd /root/storeBackend" -ForegroundColor Gray
Write-Host "   git pull" -ForegroundColor Gray
Write-Host "   chmod +x scripts/setup-subdomain-support.sh" -ForegroundColor Gray
Write-Host "   sudo ./scripts/setup-subdomain-support.sh" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Testen Sie im Browser:" -ForegroundColor White
Write-Host "   http://abdellah.markt.ma" -ForegroundColor Gray
Write-Host ""

