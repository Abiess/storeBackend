# MinIO Test Guide

## 🚀 Schnell-Tests (ohne Installation)

### 1. **Browser-Test** (einfachste Methode)
Öffne im Browser:
- **MinIO Console**: http://localhost:9001
- **Login**: minioadmin / minioadmin

Falls remote (VPS):
- **MinIO Console**: http://api.markt.ma:9001

### 2. **cURL Tests** (direkt im Terminal)

#### Health Check:
```bash
curl http://localhost:9000/minio/health/live
```
✅ Erwartet: `200 OK`

#### Test mit VPS:
```bash
curl http://api.markt.ma:9000/minio/health/live
```

### 3. **Swagger Integration Test**
In Swagger UI:
1. `POST /api/stores/{storeId}/media/upload`
2. Datei hochladen
3. Wenn erfolgreich → MinIO funktioniert!

---

## 🔧 Vollständiger Test mit Script

### **Auf deinem VPS:**
```bash
# Script ausführbar machen
chmod +x /opt/storebackend/scripts/test-minio.sh

# Ausführen
/opt/storebackend/scripts/test-minio.sh
```

### **Was das Script testet:**
1. ✅ MinIO API erreichbar?
2. ✅ MinIO Console erreichbar?
3. ✅ MinIO Client (mc) installiert?
4. ✅ Authentifizierung funktioniert?
5. ✅ Bucket `store-assets` existiert?
6. ✅ Upload/Download funktioniert?

---

## 🐳 MinIO Status prüfen (VPS)

### **Systemd Service:**
```bash
# Status prüfen
sudo systemctl status minio

# Ist MinIO aktiv?
sudo systemctl is-active minio

# Logs anschauen
sudo journalctl -u minio -n 50
```

### **Docker (falls verwendet):**
```bash
# Container prüfen
docker ps | grep minio

# Logs anschauen
docker logs minio
```

---

## 🔍 MinIO Prozess prüfen

```bash
# Läuft MinIO?
ps aux | grep minio

# Welcher Port?
netstat -tulpn | grep 9000
netstat -tulpn | grep 9001
```

---

## 📦 MinIO Client (mc) installieren

Falls nicht installiert:
```bash
# Download
wget https://dl.min.io/client/mc/release/linux-amd64/mc

# Ausführbar machen
chmod +x mc
sudo mv mc /usr/local/bin/

# Konfigurieren
mc alias set local http://localhost:9000 minioadmin minioadmin

# Testen
mc admin info local
```

---

## 🧪 Manuelle Tests

### **1. Bucket auflisten:**
```bash
mc ls local/
```

### **2. Bucket erstellen:**
```bash
mc mb local/store-assets
```

### **3. Datei hochladen:**
```bash
echo "Test" > test.txt
mc cp test.txt local/store-assets/test.txt
```

### **4. Datei herunterladen:**
```bash
mc cp local/store-assets/test.txt downloaded.txt
```

### **5. Bucket öffentlich machen:**
```bash
mc anonymous set download local/store-assets
```

---

## 🌐 URLs testen

### **Lokal:**
- API: http://localhost:9000
- Console: http://localhost:9001

### **Remote (VPS):**
- API: http://YOUR_VPS_IP:9000
- Console: http://YOUR_VPS_IP:9001

### **Mit Domain:**
- API: http://api.markt.ma:9000
- Console: http://api.markt.ma:9001

---

## 🚨 Troubleshooting

### **MinIO startet nicht?**
```bash
# Logs prüfen
sudo journalctl -u minio -n 100

# Config prüfen
cat /etc/default/minio

# Manuell starten
sudo systemctl start minio
```

### **Port 9000 blockiert?**
```bash
# Prüfe ob Port frei ist
sudo lsof -i :9000

# Firewall prüfen
sudo ufw status
sudo ufw allow 9000/tcp
sudo ufw allow 9001/tcp
```

### **Bucket nicht gefunden?**
```bash
# Alle Buckets auflisten
mc ls local/

# Bucket erstellen
mc mb local/store-assets

# Bucket Policy setzen
mc anonymous set download local/store-assets
```

---

## ✅ Schneller One-Liner Test

```bash
curl -s http://localhost:9000/minio/health/live && echo "✅ MinIO läuft!" || echo "❌ MinIO läuft nicht!"
```

Remote:
```bash
curl -s http://api.markt.ma:9000/minio/health/live && echo "✅ MinIO läuft!" || echo "❌ MinIO läuft nicht!"
```

---

## 🎯 Test-Checkliste

- [ ] Health Endpoint antwortet
- [ ] Console ist erreichbar
- [ ] Kann mich einloggen
- [ ] Bucket `store-assets` existiert
- [ ] Kann Datei hochladen
- [ ] Kann Datei herunterladen
- [ ] Dateien sind öffentlich abrufbar
- [ ] Backend kann auf MinIO zugreifen

Wenn alle ✅ → MinIO funktioniert perfekt!

