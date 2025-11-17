#!/bin/bash

# VPS Health Check Script
# Prüft ob alle Services laufen und zeigt Status an

echo "🏥 Store Backend - Health Check"
echo "================================"
echo ""

# Farben
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# PostgreSQL
echo -n "PostgreSQL: "
if systemctl is-active --quiet postgresql; then
    echo -e "${GREEN}✅ Running${NC}"
else
    echo -e "${RED}❌ Not Running${NC}"
fi

# Store Backend
echo -n "Store Backend: "
if systemctl is-active --quiet storebackend; then
    echo -e "${GREEN}✅ Running${NC}"
else
    echo -e "${RED}❌ Not Running${NC}"
fi

# Nginx
echo -n "Nginx: "
if systemctl is-active --quiet nginx; then
    echo -e "${GREEN}✅ Running${NC}"
else
    echo -e "${RED}❌ Not Running${NC}"
fi

echo ""
echo "📊 Application Health:"
HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/actuator/health 2>/dev/null)
if [ "$HEALTH_RESPONSE" = "200" ]; then
    echo -e "${GREEN}✅ Application is healthy (HTTP 200)${NC}"
    curl -s http://localhost:8080/actuator/health | python3 -m json.tool 2>/dev/null || echo ""
else
    echo -e "${RED}❌ Application is not responding (HTTP $HEALTH_RESPONSE)${NC}"
fi

echo ""
echo "📈 Resource Usage:"
echo "CPU: $(top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print 100 - $1"%"}')"
echo "Memory: $(free -m | awk 'NR==2{printf "%.1f%%", $3*100/$2 }')"
echo "Disk: $(df -h / | awk 'NR==2{print $5}')"

echo ""
echo "📋 Recent Logs (last 10 lines):"
journalctl -u storebackend -n 10 --no-pager

echo ""
echo "🔗 Service URLs:"
echo "  - Health: http://localhost:8080/actuator/health"
echo "  - API: http://localhost:8080"
if [ -f /etc/nginx/sites-enabled/storebackend ]; then
    DOMAIN=$(grep "server_name" /etc/nginx/sites-enabled/storebackend | head -1 | awk '{print $2}' | sed 's/;//')
    if [ "$DOMAIN" != "your-domain.com" ]; then
        echo "  - Public: http://$DOMAIN"
    fi
fi

