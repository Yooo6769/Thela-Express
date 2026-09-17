# ThelaExpress Live - Production Street Food Delivery Platform

Welcome to **ThelaExpress Live** — a full-stack, real-time street food delivery ecosystem built for authentic vendors, delivery partners, and street food lovers.

---

## 🚀 One-Click Launchers (Desktop Shortcuts)

You can launch any of the 3 ecosystem portals directly from this folder:

| Launcher File | Target Role | Description |
| :--- | :--- | :--- |
| **`Launch-Customer-App.bat`** | 🛍️ **Customer App** | Browse verified stalls, customize dishes, add to cart, phone OTP login, UPI checkout, and live order tracking. |
| **`Launch-Vendor-Kitchen-POS.bat`** | 👨‍🍳 **Vendor Kitchen Display** | Live incoming kitchen order stream, pleasant audio chime alerts, 1-tap accept / cook / ready status progression, and item 86/85 stock manager. |
| **`Launch-Rider-Console.bat`** | 🛵 **Rider Delivery Console** | Gigs acceptor, live GPS simulation transmitter, and 4-digit doorstep delivery OTP verification. |
| **`Open-On-iPhone-Live.bat`** | 📱 **Mobile / iPhone Safari** | Starts a secure, TLS-certified HTTPS tunnel with QR code so you can test on iPhone Safari without any "HTTPS-Only" or Quick Look errors. |

---

## 🔑 Authentication & Testing Shortcuts

- **Phone OTP Login**: Enter any 10-digit mobile number (e.g. `9876543210`).
- **Universal Dev OTP**: **`1234`** is pre-configured as a universal bypass for instant local testing.
- **Doorstep Delivery OTP**: Displayed prominently on the customer tracking screen (e.g. `4829`), or bypass with `1234` in the rider console.

---

## 🛠️ Architecture & Tech Stack

- **Backend**: Node.js LTS + Express.js API Gateway (`http://localhost:5000/api`)
- **Realtime Layer**: Native WebSockets (`ws://localhost:5000/ws` or `wss://...` on mobile)
- **Audio Engine**: Web Audio API synthesizer for instant 2-tone kitchen chimes without external audio files
- **Database**: Persistent JSON Storage Engine (`thela-express-prod/server/data/thela.db.json`)
- **Telemetry**: Real-time GPS coordinate stream and HTML5 Canvas radar map
- **Frontend**: Responsive Tailwind CSS + Vanilla JS (Zero build step, maximum speed, seamless on iOS Safari & Android)

---

## 🍲 Default Verified Street Food Stalls

1. **Sharma Ji Ka Mashoor Chaat** (Indiranagar) - FSSAI Clean Street Gold (98% Score)
2. **Babu Vada Pav & Misal Center** (Indiranagar) - Zero-Oil Reheat Certified (99% Score)
3. **Tibetan Momo Corner & Thukpa** (Indiranagar) - Steam Sanitized Cooking (96% Score)
4. **Madras Benne Dosa & Podi Idli Thela** (Indiranagar) - White Butter Heritage (99% Score)
