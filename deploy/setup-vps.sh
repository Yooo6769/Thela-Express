#!/usr/bin/env bash
# ============================================================
# ThelaExpress — 1-Click 24/7 Cloud VPS Deployment Script
# Target OS: Ubuntu 22.04 / 24.04 LTS (Hostinger, etc.)
# ============================================================
set -e

echo "🚀 [1/6] Updating system packages..."
sudo apt-get update -y
sudo apt-get upgrade -y
sudo apt-get install -y curl git ufw nginx

echo "📦 [2/6] Installing Node.js 20 LTS & PM2..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm install -g pm2

echo "⚙️ [3/6] Installing project dependencies..."
npm install
cd server && npm install && cd ..

echo "🛡️ [4/6] Configuring Nginx reverse proxy with WebSockets..."
sudo cp deploy/nginx-thelaexpress.conf /etc/nginx/sites-available/thelaexpress
sudo rm -f /etc/nginx/sites-enabled/default
sudo ln -sf /etc/nginx/sites-available/thelaexpress /etc/nginx/sites-enabled/thelaexpress
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx

echo "🔥 [5/6] Configuring UFW firewall..."
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

echo "⚡ [6/6] Launching ThelaExpress with PM2 (Auto-restart on boot)..."
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd -u root --hp /root | tail -n 1 | bash || true
pm2 save

echo ""
echo "============================================================"
echo "🎉 SUCCESS: ThelaExpress is now live 24/7 in the cloud!"
echo "============================================================"
echo "Open your browser and visit:"
echo "👉 http://$(curl -s ifconfig.me)"
echo ""
echo "Commands to manage your live server anytime:"
echo "  pm2 status        (Check if server is active)"
echo "  pm2 logs          (View live incoming customer orders)"
echo "  pm2 restart all   (Restart application)"
echo "============================================================"
