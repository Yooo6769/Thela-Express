# ThelaExpress — Authentic Indian Street Food Delivery Ecosystem

Welcome to **ThelaExpress**, a modern, full-stack, real-time street-food discovery and hyperlocal delivery platform designed specifically for authentic Indian street vendors (thelas), delivery partners, and street-food explorers.

---

## 🌐 Complete App Directory (6 Core Portals)

The ecosystem is structured with zero build step (vanilla modern JavaScript + Tailwind CSS + Node.js LTS) for blazing fast load times and seamless cross-platform support:

| Portal | URL Path | Source File | Description |
| :--- | :--- | :--- | :--- |
| 🛍️ **Customer App** | `/` or `/index.html` | `public/index.html` | Night-market visual atmosphere, craving discovery, verified vendor pages, 12-language support, customizer, and live order tracker. |
| 👨‍🍳 **Vendor Kitchen POS** | `/partner.html?role=vendor` | `public/partner.html` | Real-time incoming kitchen order stream, Web Audio chimes, 1-tap accept/prep/ready progression, item 86/85 stock management. |
| 🛵 **Rider Console** | `/partner.html?role=rider` | `public/partner.html` | Order broadcast dispatcher, live GPS radar transmitter, thermal box confirmation, doorstep delivery OTP completion. |
| 📝 **Vendor Onboarding** | `/onboard-vendor.html` | `public/onboard-vendor.html` | FSSAI registration number capture, hygiene self-audit checklist, signature dishes, cart photography, and geo-location pinning. |
| 🪪 **Rider Onboarding** | `/onboard-rider.html` | `public/onboard-rider.html` | Driving license, vehicle type (EV / petrol scooter / bicycle), thermal delivery bag verification, document upload. |
| 🛡️ **Admin & Trust Dossier** | `/admin.html` | `public/admin.html` | Operations central dispatch, vendor approval queue, FSSAI verification toggle, hygiene audit scores, revenue metrics. |

---

## ⚡ Quick Start for Developers

### Prerequisites
- **Node.js** (v18.x or higher)
- **npm** (v9.x or higher)
- **Git**

### Installation & Launch in 60 Seconds

```bash
# 1. Clone repository
git clone https://github.com/Yooo6769/Thela-Express.git
cd Thela-Express

# 2. Install server dependencies
cd server
npm install

# 3. Start production/local server
node src/server.js
```

The server will initialize on **`http://localhost:5000`** with:
- Static client application serving (`/public`)
- REST API Gateway (`/api/*`)
- Bi-directional Real-time WebSockets (`ws://localhost:5000/ws`)

---

## 🧪 Verification & Test Suites

Run the built-in automated test suites to verify integrity:

```bash
# In the repository root:
node -c public/app.js                                 # Validate client script syntax
node scratch/test_atmosphere.js                       # Test street-food visual atmosphere & adaptive density engine
node scratch/test_all_i18n.js                         # Verify 12 Indian languages across all 5 apps (0 missing keys)
node scratch/audit_promises.js                        # Ensure zero hardcoded delivery promises
node scratch/audit_demodata.js                        # Ensure zero demo data leaks in production files
node server/test-e2e.js                               # Run end-to-end order flow and socket sync test
```

---

## 🏗️ Architecture & Technology Stack

- **Frontend**: Lightweight Vanilla JavaScript ES6+, Tailwind CSS, FontAwesome 6, Lucide icons, HTML5 Canvas radar map.
  - *Zero Build Step*: Direct asset serving, ultra-fast TTFB and LCP.
  - *12 Indian Languages*: English, Hindi, Hinglish, Marathi, Gujarati, Tamil, Telugu, Kannada, Bengali, Malayalam, Punjabi, Odia.
  - *Adaptive Visual Density Engine*: UI-state-driven atmosphere manager adapting to customer buying funnel.
- **Backend API**: Node.js + Express.js REST API.
- **Real-Time Stream**: Native `ws` WebSocket engine for sub-100ms order dispatch synchronization between customer, vendor, and rider.
- **Database Engine**: Atomic JSON-backed persistence store (`server/data/thela.db.json`) with automated seeding and zero external DBMS configuration required for development.
- **Audio Synthesis**: Native browser Web Audio API generating authentic two-tone kitchen chimes without external mp3 dependencies.

---

## 🚀 Deployment & Production Hosting

- **Systemd / PM2 Config**: `ecosystem.config.js` included for instant PM2 management:
  ```bash
  pm2 start ecosystem.config.js
  ```
- **Reverse Proxy**: Ready-to-deploy Nginx config included in `deploy/nginx-thelaexpress.conf` with WebSocket upgrade rules.
- **Cloudflare Tunnel / HTTPS**: Built-in scripts (`start-cloudflare.ps1` or `setup-vps.sh`) allow instantaneous SSL/TLS tunneling for testing on physical iOS/Android devices without App Store deployment.

---

## 🔒 Security & Verification Guidelines
- **FSSAI Food Safety Compliance**: Strict verification check validation; unverified claims are never displayed.
- **Dynamic Delivery Estimates**: Calculated dynamically using vendor prep time and haversine road distance matrix; zero static 15-minute guarantees.
- **Zero Fiction Metric Policy**: Order counts and ratings represent genuine data only.
