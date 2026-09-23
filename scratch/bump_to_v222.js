// scratch/bump_to_v222.js
const fs = require('fs');
const path = require('path');

const versionDocPath = path.join(__dirname, '..', 'VERSION_HISTORY.md');
let doc = fs.readFileSync(versionDocPath, 'utf8').replace(/\r\n/g, '\n');

// 1. Update header metadata
doc = doc.replace(
  '**Current Production Version**: `v2.2.1`',
  '**Current Production Version**: `v2.2.2`'
);

// 2. Update mermaid graph
doc = doc.replace(
  '    v220 --> v221["v2.2.1<br/>Purge Restaurant Dining & Fake Data; Enforce 100% Street Food Authenticity"]',
  '    v220 --> v221["v2.2.1<br/>Purge Restaurant Dining & Fake Data; Enforce 100% Street Food Authenticity"]\n    v221 --> v222["v2.2.2<br/>Theme Adaptation, Harmonized Atmosphere, Animated Veg Toggle, Dynamic Coupons & Buyable VIP"]'
);

// 3. Add v2.2.2 release entry before Section 3
const v222Entry = `### \`v2.2.2\` — Theme Adaptation, Harmonized Atmosphere, Animated Veg Toggle, Dynamic Coupons & Buyable VIP
- **Release Date**: September 23, 2026
- **Git Commit**: \`Upcoming / HEAD\`
- **Key Accomplishments**:
  - **Atmospheric Background Theme Harmonization**: Retained the floating street food illustrations in \`#thelaAtmosphere\` per user request while eliminating text collision and aesthetic clash. Added \`mix-blend-mode: multiply\` with subtle watermark saturation in Light mode, and \`mix-blend-mode: screen\` in Dark mode with delicate opacities (0.07 high, 0.05 medium) and warm bronze/amber SVG fills, ensuring clean typography.
  - **Purged Fake Stall Count**: Completely removed the hardcoded \`1,971 STREET FOOD THELAS DELIVERING TO YOU\` banner. Gated \`#thelasCountSeparator\` to display only when live verified carts exist (\`stalls.length > 0\`), keeping it completely hidden when 0 stalls are open.
  - **Visual VEG Switch Toggle Animation**: Resolved the static switch issue where clicking VEG toggled state logically but failed to slide visually. Enhanced \`toggleVegFilter()\` to toggle \`bg-emerald-600\` on \`#vegSwitchTrack\` and \`translate-x-3.5\` on \`#vegSwitchThumb\` with smooth 200ms animation, and synced status to profile modal preferences.
  - **Theme Adaptation for Profile, Dock & Banners**: Converted hardcoded pitch-black \`bg-stone-950\` drawer on \`#profileModal\`, \`#floatingBottomDock\`, and \`#ecoPlanetBanner\` to adaptive light/dark classes (\`bg-white dark:bg-stone-950\`, \`bg-stone-50 dark:bg-stone-900\`, \`border-stone-200 dark:border-stone-800\`).
  - **Buyable Thela VIP Membership**: VIP status is no longer granted by default. Displayed "Join Thela Club (Buy @ ₹99)" and concealed the header avatar crown badge until purchased. Implemented \`buyThelaGoldMembership()\` with user confirmation, wallet balance deduction, local/server persistence, and active delivery perk unlocking.
  - **Dynamic Earned Coupons System**: Coupons start at \`0 available\` for new users rather than hardcoded 12. Implemented \`renderCouponsDrawerContent()\` with a friendly zero-coupon state explaining order unlocks, and wired automatic coupon issuance (\`STREETxxx\`, ₹15–₹40 OFF) upon verified order placement.
  - **Interactive Quick Filter Sheet**: Created \`#filterModal\` wired to the \`Filters v\` pill button, allowing multi-criteria filtering for pure veg, near & fast (<25 min), zero packaging fee, and 4.0+ ratings.
  - **Comprehensive Verification**: Expanded \`test_street_food_ux.js\` to 19 passing tests covering all new features and theme invariants.

`;

doc = doc.replace('## 3. Comprehensive Feature & Invariant Matrix', v222Entry + '## 3. Comprehensive Feature & Invariant Matrix');

// 4. Update test summary table
doc = doc.replace(
  '| [`test_street_food_ux.js`](file:///C:/Users/anura/.gemini/antigravity/scratch/thela-express-prod/scratch/test_street_food_ux.js) | Authentic street food UX, zero fake names/emails, zero fake addresses, zero restaurant dining, authentic bottom dock & real wallet | 12 tests | ✅ Passed |',
  '| [`test_street_food_ux.js`](file:///C:/Users/anura/.gemini/antigravity/scratch/thela-express-prod/scratch/test_street_food_ux.js) | Authentic street food UX, theme harmonized atmosphere, zero 1971 fake count, visual veg toggle, buyable VIP, dynamic coupons & adaptive modals | 19 tests | ✅ Passed |'
);

fs.writeFileSync(versionDocPath, doc.replace(/\n/g, '\r\n'), 'utf8');
console.log('✓ Successfully bumped VERSION_HISTORY.md to v2.2.2');
