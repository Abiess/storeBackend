#!/bin/bash
# MinIO Installation & Setup Script for Production
# Installs MinIO as a systemd service

set -e

echo "========================================"
echo "🗄️  MinIO Installation Script"
echo "========================================"
echo ""

# Configuration
MINIO_USER="minio-user"
MINIO_GROUP="minio-user"
MINIO_DATA_DIR="/mnt/minio/data"
MINIO_CONFIG_DIR="/etc/minio"
MINIO_BINARY="/usr/local/bin/minio"
MINIO_VERSION="latest"

# Credentials (change these!)
MINIO_ROOT_USER="${MINIO_ROOT_USER:-minioadmin}"
MINIO_ROOT_PASSWORD="${MINIO_ROOT_PASSWORD:-minioadmin}"
MINIO_BUCKET="${MINIO_BUCKET:-store-assets}"

echo "📦 Installing MinIO Server..."

# Download MinIO binary
if [ ! -f "$MINIO_BINARY" ]; then
    echo "   Downloading MinIO binary..."
    sudo wget -q https://dl.min.io/server/minio/release/linux-amd64/minio -O "$MINIO_BINARY"
    sudo chmod +x "$MINIO_BINARY"
    echo "   ✅ MinIO binary downloaded"
else
    echo "   ⚠️  MinIO binary already exists at $MINIO_BINARY"
fi

# Create MinIO user
echo ""
echo "👤 Creating MinIO user..."
if id "$MINIO_USER" &>/dev/null; then
    echo "   ⚠️  User $MINIO_USER already exists"
else
    sudo useradd -r -s /sbin/nologin "$MINIO_USER"
    echo "   ✅ User $MINIO_USER created"
fi

# Create data directory
echo ""
echo "📁 Creating data directories..."
sudo mkdir -p "$MINIO_DATA_DIR"
sudo mkdir -p "$MINIO_CONFIG_DIR"
sudo chown -R "$MINIO_USER:$MINIO_GROUP" "$MINIO_DATA_DIR"
sudo chown -R "$MINIO_USER:$MINIO_GROUP" "$MINIO_CONFIG_DIR"
echo "   ✅ Directories created"

# Create environment file
echo ""
echo "🔐 Creating environment file..."
sudo bash -c "cat > $MINIO_CONFIG_DIR/minio.env <<EOF
# MinIO Root Credentials
MINIO_ROOT_USER=$MINIO_ROOT_USER
MINIO_ROOT_PASSWORD=$MINIO_ROOT_PASSWORD

# MinIO Storage
MINIO_VOLUMES=$MINIO_DATA_DIR

# MinIO Console
MINIO_SERVER_URL=http://localhost:9000
MINIO_BROWSER_REDIRECT_URL=http://localhost:9001

# Optional: Enable logging
MINIO_LOG_LEVEL=info
EOF"

sudo chmod 600 "$MINIO_CONFIG_DIR/minio.env"
echo "   ✅ Environment file created: $MINIO_CONFIG_DIR/minio.env"

# Create systemd service file
echo ""
echo "🔧 Creating systemd service..."
sudo bash -c 'cat > /etc/systemd/system/minio.service <<EOF
[Unit]
Description=MinIO Object Storage
Documentation=https://min.io/docs/minio/linux/index.html
Wants=network-online.target
After=network-online.target
AssertFileIsExecutable=/usr/local/bin/minio

[Service]
Type=notify
WorkingDirectory=/usr/local
User=minio-user
Group=minio-user
EnvironmentFile=-/etc/minio/minio.env

ExecStartPre=/bin/bash -c "if [ -z \"\${MINIO_VOLUMES}\" ]; then echo \"Variable MINIO_VOLUMES not set\"; exit 1; fi"
ExecStart=/usr/local/bin/minio server \$MINIO_OPTS \$MINIO_VOLUMES --console-address ":9001"

# Let systemd restart this service always
Restart=always
RestartSec=5s

# Specifies the maximum file descriptor number that can be opened by this process
LimitNOFILE=65536

# Specifies the maximum number of threads this process can create
TasksMax=infinity

# Disable timeout logic and wait until process is stopped
TimeoutStopSec=infinity
SendSIGKILL=no

# Security Settings
PrivateTmp=true
ProtectSystem=full
ProtectHome=true
NoNewPrivileges=true

[Install]
WantedBy=multi-user.target
EOF'

echo "   ✅ Systemd service file created"

# Reload systemd and enable service
echo ""
echo "🔄 Enabling MinIO service..."
sudo systemctl daemon-reload
sudo systemctl enable minio
echo "   ✅ MinIO service enabled"

# Start MinIO
echo ""
echo "🚀 Starting MinIO..."
sudo systemctl start minio
sleep 3

# Check if MinIO is running
if sudo systemctl is-active --quiet minio; then
    echo "   ✅ MinIO started successfully!"
else
    echo "   ❌ MinIO failed to start"
    echo "   📋 Checking logs..."
    sudo journalctl -u minio -n 20 --no-pager
    exit 1
fi

# Install MinIO Client (mc)
echo ""
echo "📦 Installing MinIO Client (mc)..."
if command -v mc &> /dev/null; then
    echo "   ⚠️  MinIO Client already installed"
else
    sudo wget -q https://dl.min.io/client/mc/release/linux-amd64/mc -O /usr/local/bin/mc
    sudo chmod +x /usr/local/bin/mc
    echo "   ✅ MinIO Client installed"
fi

# Configure mc alias
echo ""
echo "🔧 Configuring MinIO Client..."
mc alias set local http://localhost:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD" > /dev/null 2>&1
echo "   ✅ MinIO Client configured"

# Wait for MinIO to be fully ready
echo ""
echo "⏳ Waiting for MinIO to be ready..."
sleep 2

# Create bucket
echo ""
echo "📦 Creating bucket: $MINIO_BUCKET..."
if mc ls local/$MINIO_BUCKET > /dev/null 2>&1; then
    echo "   ⚠️  Bucket already exists"
else
    mc mb local/$MINIO_BUCKET
    echo "   ✅ Bucket created"
fi

# Set bucket policy to public (for images)
echo ""
echo "🔓 Setting bucket policy to public..."
mc anonymous set download local/$MINIO_BUCKET
echo "   ✅ Bucket is now publicly readable"

# Show status
echo ""
echo "========================================"
echo "✅ MinIO Installation Complete!"
echo "========================================"
echo ""
echo "📊 MinIO Information:"
echo "   API URL:     http://localhost:9000"
echo "   Console URL: http://localhost:9001"
echo "   Root User:   $MINIO_ROOT_USER"
echo "   Root Pass:   $MINIO_ROOT_PASSWORD"
echo "   Data Dir:    $MINIO_DATA_DIR"
echo "   Bucket:      $MINIO_BUCKET"
echo ""
echo "🔧 Useful Commands:"
echo "   Status:  sudo systemctl status minio"
echo "   Stop:    sudo systemctl stop minio"
echo "   Start:   sudo systemctl start minio"
echo "   Restart: sudo systemctl restart minio"
echo "   Logs:    sudo journalctl -u minio -f"
echo ""
echo "🌐 Access MinIO Console:"
echo "   Open in browser: http://$(hostname -I | awk '{print $1}'):9001"
echo "   Or: http://api.markt.ma:9001"
echo ""
echo "✅ MinIO is ready to use!"
echo "========================================"

