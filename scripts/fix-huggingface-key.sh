#!/bin/bash
# Quick Fix Script für Hugging Face API Key Problem
# Dieses Script behebt das Problem SOFORT auf dem Server

echo "🔧 Fixing Hugging Face API Key Configuration..."
echo ""

# 1. Prüfe ob API Key in env-Datei existiert
echo "1️⃣ Checking /etc/storebackend.env..."
if grep -q "HUGGINGFACE_API_KEY" /etc/storebackend.env; then
    echo "✅ HUGGINGFACE_API_KEY found in /etc/storebackend.env"
    grep "HUGGINGFACE_API_KEY" /etc/storebackend.env
else
    echo "❌ HUGGINGFACE_API_KEY NOT found in /etc/storebackend.env"
    echo ""
    echo "Adding it now..."
    echo "# Hugging Face API Key (AI Product Creation)" | sudo tee -a /etc/storebackend.env
    echo "HUGGINGFACE_API_KEY=" | sudo tee -a /etc/storebackend.env
    echo "⚠️  API Key is empty! You need to set it manually."
    echo ""
fi

# 2. Zeige die Service-Konfiguration
echo ""
echo "2️⃣ Checking systemd service configuration..."
systemctl show storebackend --property=EnvironmentFiles

# 3. Teste ob die Variable geladen wird
echo ""
echo "3️⃣ Testing if environment is loaded..."
sudo systemctl daemon-reload
echo "✅ Daemon reloaded"

# 4. Zeige die aktuelle Konfiguration
echo ""
echo "4️⃣ Current HUGGINGFACE_API_KEY status:"
cat /etc/storebackend.env | grep "HUGGINGFACE_API_KEY"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎯 NEXT STEPS:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Option A: Manual Fix (Quick)"
echo "----------------------------"
echo "1. Edit the env file:"
echo "   sudo nano /etc/storebackend.env"
echo ""
echo "2. Find the line:"
echo "   HUGGINGFACE_API_KEY="
echo ""
echo "3. Add your token:"
echo "   HUGGINGFACE_API_KEY=hf_xxxxxxxxxxxxxxxxxxxxxxxxxx"
echo ""
echo "4. Save (Ctrl+O, Enter, Ctrl+X)"
echo ""
echo "5. Restart:"
echo "   sudo systemctl restart storebackend"
echo ""
echo "6. Check logs:"
echo "   sudo journalctl -u storebackend -n 30 | grep 'API Key'"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Option B: Get token from GitHub Secret"
echo "----------------------------------------"
echo "Your token is already in GitHub Secrets!"
echo "Just re-run the GitHub Actions deployment:"
echo ""
echo "1. Go to: https://github.com/Abiess/storeBackend/actions"
echo "2. Click 'Re-run jobs' on the latest workflow"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🔍 For debugging, show me the output of:"
echo "   cat /etc/storebackend.env | grep HUGGINGFACE"
echo ""

