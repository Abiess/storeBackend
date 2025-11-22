#!/bin/bash

echo "🚀 Starting deployment..."

# Farben für Output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Stoppe alte Instanz
echo "⏹️  Stopping old application..."
sudo systemctl stop storebackend || true

# Backup alte Version
if [ -f /opt/storebackend/app.jar ]; then
    echo "💾 Backing up old version..."
    sudo cp /opt/storebackend/app.jar /opt/storebackend/backups/app-$(date +%Y%m%d-%H%M%S).jar

    # Alte Backups löschen (älter als 7 Tage)
    find /opt/storebackend/backups -name "app-*.jar" -mtime +7 -delete
fi

# PostgreSQL Datenbank erstellen (falls nicht existiert)
echo "🗄️  Setting up database..."
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname = 'storedb'" | grep -q 1 || \
    sudo -u postgres psql -c "CREATE DATABASE storedb;"

echo "✅ Database ready"

# Neue JAR Datei verschieben
# Find the JAR file (could be app.jar or storeBackend-*.jar)
JAR_FILE=$(find /tmp -maxdepth 1 -name "*.jar" -type f 2>/dev/null | grep -v "java" | head -n 1)

if [ -z "$JAR_FILE" ]; then
    echo -e "${RED}❌ No JAR file found in /tmp/${NC}"
    echo "Available files in /tmp:"
    ls -lah /tmp/ 2>/dev/null | grep -E "\.jar|app|store" || echo "No jar files found"
    exit 1
fi

echo "📦 Found JAR file: $(basename $JAR_FILE) ($(du -h $JAR_FILE | cut -f1))"
echo "📦 Installing new version..."
echo "   Source: $JAR_FILE"
echo "   Target: /opt/storebackend/app.jar"

# Move to target location
sudo mv "$JAR_FILE" /opt/storebackend/app.jar 2>/dev/null || {
    echo -e "${RED}❌ Failed to move JAR file${NC}"
    exit 1
}

# Verify move was successful
if [ ! -f /opt/storebackend/app.jar ]; then
    echo -e "${RED}❌ JAR file not found at /opt/storebackend/app.jar after move${NC}"
    exit 1
fi

# Set permissions
sudo chown storebackend:storebackend /opt/storebackend/app.jar 2>/dev/null || true
sudo chmod 755 /opt/storebackend/app.jar 2>/dev/null || true

echo -e "${GREEN}✅ JAR installed successfully$([ -f /opt/storebackend/app.jar ] && echo " (verified)" || echo " (unverified)")${NC}"

# Environment Variables setzen (werden vom Service geladen)
echo "🔧 Configuring environment..."

# Neue Version starten
echo "🚀 Starting new application..."
sudo systemctl start storebackend

# Warte auf Start
echo "⏳ Waiting for application to start..."
sleep 15

# Health Check
echo "🏥 Performing health checks..."
for i in {1..30}; do
    if curl -f http://localhost:8080/actuator/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Application is healthy!${NC}"
        echo "📊 Deployment completed successfully at $(date)"

        # Status anzeigen
        echo ""
        echo -e "${YELLOW}📈 Application Status:${NC}"
        sudo systemctl status storebackend --no-pager -l | head -n 10

        exit 0
    fi
    echo "Waiting for health check... ($i/30)"
    sleep 2
done

echo -e "${RED}❌ Application failed to start${NC}"
echo "📋 Last 50 lines of log:"
sudo journalctl -u storebackend -n 50 --no-pager

# Rollback zum letzten Backup
echo -e "${YELLOW}🔄 Attempting rollback...${NC}"
LAST_BACKUP=$(ls -t /opt/storebackend/backups/app-*.jar 2>/dev/null | head -n 1)
if [ -n "$LAST_BACKUP" ]; then
    echo "Rolling back to: $LAST_BACKUP"
    sudo cp "$LAST_BACKUP" /opt/storebackend/app.jar
    sudo systemctl start storebackend
    sleep 10

    if curl -f http://localhost:8080/actuator/health > /dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  Rollback successful - running previous version${NC}"
        exit 1
    fi
fi

echo -e "${RED}❌ Rollback failed${NC}"
exit 1

