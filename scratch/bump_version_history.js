// scratch/bump_version_history.js
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'VERSION_HISTORY.md');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Update version number at top
content = content.replace(
  "**Current Production Version**: `v2.1.4`",
  "**Current Production Version**: `v2.2.0`"
);

// 2. Update mermaid diagram
content = content.replace(
  'v213 --> v214["v2.1.4<br/>Admin HQ Simplification & 1-Click Operations Engine"]',
  'v213 --> v214["v2.1.4<br/>Admin HQ Simplification & 1-Click Operations Engine"]\n    v214 --> v220["v2.2.0<br/>Zomato-Inspired Dynamic Customer App & VIP Center"]'
);

// 3. Add v2.2.0 section before Commit History table
const v220Section = `---

### \`v2.2.0\` — Zomato-Inspired Dynamic Customer App Experience & VIP Center
- **Release Date**: September 23, 2026
- **Git Commit**: \`[HEAD]\` (\`feat: Zomato-inspired dynamic customer storefront and VIP center (v2.2.0)\`)
- **Key Architectural Accomplishments**:
  - **Festive Promotional Hero Carousel**:
    - High-impact animated carousel (\`#heroPromoCarousel\`) rotating through curated street food events: 70% OFF Limited Time Feast (\`THELA70\`), Thela Gold Club Royalty & Unlimited Free Delivery, and Midnight Street Carnival.
    - Smooth touch-swipe navigation, automatic 4.5-second rotation with hover-pause, and dynamic active dot indicators.
  - **Circular Food Category Stories Rail**:
    - Zomato-style horizontal circular dish stories (\`#circularCategoriesTrack\`) spanning 12 Indian street food classics: Explore All, Burger, Chole Bhature, Rajma Rice, Golgappe & Chaat, Mumbai Vada Pav, Butter Pav Bhaji, Steamed Momos, Benne Dosa, Kathi Rolls, and Kulhad Chai.
    - Active selection glow ring, bold rose colored typography, and active indicator dot with smooth horizontal scrolling.
  - **Quick Filter Pills Bar**:
    - Floating horizontal filter rail (\`#quickFiltersBar\`) featuring 6 real-time filter pills: Filters dropdown, ⚡ Near & Fast (< 25 min delivery), No packaging charges, ★ 4.0+ Top Rated, Under ₹100, and Favorites.
    - Real-time client-side filter engine with animated toggle states and instant catalog updates.
  - **Zomato Visual Hierarchy for Stall Cards**:
    - Redesigned stall cards with top photo discount overlay ribbons (\`Items starting at ₹49\`, \`20% OFF up to ₹50\`, \`Buy 1 Get 1 FREE\`).
    - Prominent dynamic delivery ETA badges (\`⚡ 15-20 mins • 1.2 km\`) with high-contrast backdrops and emerald green star rating badges (\`★ 4.3 (1.2k+)\`).
  - **Interactive 4-Tile "Explore More" Feature Grid**:
    - 4 vibrant feature tiles: Offers (launches 12-coupon drawer), Thela Gold Club (VIP modal), Food on Train (IRCTC PNR delivery modal), and Chef's Table/Tawa (legendary street stalls).
  - **Environmental & FSSAI Compliance Banner**:
    - Dark-themed disclosure banner (\`#ecoPlanetBanner\`) matching Zomato's sustainability layout: nutritional and calorie guidelines, eco bagasse/areca leaf packaging notice, Central FSSAI License (\`Lic. No. 13322004000125\`), and menu issue reporting.
  - **Floating Frosted-Glass Bottom Dock**:
    - Zomato-inspired floating bottom navigation dock (\`#floatingBottomDock\`) with frosted backdrop blur: Home, Under ₹100, Carnival Dining, Healthy Mode (sprouts, salads, steamed items), and VIP Account.
  - **Zomato VIP Profile & Account Center**:
    - Full-featured account center drawer (\`#profileModal\`) mirroring screenshots: Gold member VIP card displaying lifetime savings of ₹10,816, Thela Money wallet with instant recharge pills, 12-coupon voucher wallet, quick profile editor, dark/light theme cycler, and 24x7 street helpline.
  - **Full Automated UX & Regression Verification**:
    - Created \`scratch/test_zomato_ux.js\` validating all 12 core Zomato interface invariants, alongside 100% pass across all 62 theme engine tests, 0 missing localization keys across 12 languages, and zero regression in store status and KDS operations.
`;

content = content.replace(
  '## 3. Git Commit History & Release Audit Log',
  v220Section + '\n---\n\n## 3. Git Commit History & Release Audit Log'
);

// 4. Update Commit History table
const commitEntry = '| `[HEAD]` | 2026-09-23 | Customer Experience | Zomato-inspired dynamic customer storefront and VIP center (v2.2.0) |\n';
content = content.replace(
  '| Commit | Date | Category | Description |\n| :--- | :--- | :--- | :--- |\n',
  '| Commit | Date | Category | Description |\n| :--- | :--- | :--- | :--- |\n' + commitEntry
);

// 5. Update Automated Verification Test Suite Summary table
const testEntry = '| [`test_zomato_ux.js`](file:///C:/Users/anura/.gemini/antigravity/scratch/thela-express-prod/scratch/test_zomato_ux.js) | Zomato-inspired dynamic customer app experience, hero carousel, circular stories, quick filters, bottom dock, VIP Gold profile & wallet engine | 12 tests | ✅ Passed |\n';
content = content.replace(
  '| [`test_store_status_contradiction.js`]',
  testEntry + '| [`test_store_status_contradiction.js`]'
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('✓ Successfully updated VERSION_HISTORY.md to v2.2.0');
