# Thela Express — Comprehensive App Version History & Engineering Changelog

**Product Name**: Thela Express  
**Description**: Hyper-Local Quick Commerce Platform for Indian Street Food Stalls  
**Current Production Version**: `v2.0.1`  
**Current Date**: September 20, 2026  
**Repository**: [https://github.com/Yooo6769/Thela-Express.git](https://github.com/Yooo6769/Thela-Express.git)  
**Live Production Deployment**: [https://thela-express.onrender.com](https://thela-express.onrender.com)  

---

## Executive Summary of Architectural Evolution

Thela Express was conceived to bring authentic Indian street-food carts (*thelas*) into the quick commerce ecosystem with the same operational rigor as top-tier food delivery platforms, while honoring the hyper-local reality of street vendors (varying preparation times, mobile locations, FSSAI regulatory compliance, and daily cash-flow needs).

Over the course of development, the system evolved from an initial multi-portal prototype into a robust, enterprise-grade, server-authoritative distributed platform built on **six foundational engineering invariants**:

1. **Zero Client Trust**: Monetary values, order totals, platform commissions, vendor settlements, rider earnings, discount allocations, and verification statuses are strictly calculated and finalized on the backend. Client submissions claiming `PAID`, modified item prices, or direct activation to `LIVE` are completely ignored or rejected.
2. **Immutable Double-Entry Financial Ledger**: All monetary movements (customer payments, platform commissions, vendor liabilities, rider payouts, refunds, and adjustments) are recorded as append-only financial ledger entries. Original records are never mutated in place.
3. **Strict State Machine Enactment**: Both orders and participant registrations follow formal deterministic state machines guarded by Optimistic Concurrency Control (OCC `version`), role-based access control (RBAC), and explicit transition rules.
4. **Cryptographic Doorstep Delivery Proof**: Delivery completion requires single-use, AES-256-GCM encrypted doorstep OTP verification with cryptographic salt hashing, preventing driver fraud and replay attacks.
5. **Progressive 7-Gate Verification (Zero Admin Bypass)**: Registration is treated strictly as an application (`APPLICATION_SUBMITTED`). A stall can only go `LIVE` after fulfilling 7 mandatory server-side gates (FSSAI verified, physical hygiene score $\ge 80$, on-site location verified, active menu, UPI ID, valid contact, and operations approval).
6. **Zero Fictional Data**: Elimination of all mock vendors, fake craving cards, hardcoded sample OTPs, and fabricated "15-minute" delivery claims in favor of real-time Haversine distance, vendor prep times, and fleet capacity telemetry.

---

## Semantic Version Release Breakdown

```
v1.0.0 ──► v1.1.0 ──► v1.2.0 ──► v1.3.0 ──► v1.4.0 ──► v1.5.0 ──► v1.6.0 ──► v1.7.0 ──► v1.8.0 ──► v1.9.0 ──► v2.0.0 ──► v2.0.1
Initial     12-Lang   Two-Tier   Dynamic    Vendor     Adaptive   Food Photo  Dynamic   Centralized Payments &  Server      Authoritative
Cloud       Indian    Trust &    Discovery  Profiles   Density &  & Dynamic   Delivery  Order       Ledger &    Activation  Store Status
Setup       i18n      Infra      & No Fiction & Clean  Atmosphere Hiding      ETA       Lifecycle   Settlement  Pipeline    Resolution
```

---

### Version 1.0.0 — Genesis & Cloud Infrastructure Foundation
- **Release Date**: September 17, 2026
- **Git Commit**: `ec45110` (`feat: Initial commit for ThelaExpress 24/7 cloud deployment`)
- **Theme**: Core Monolithic Architecture & Multi-Portal Provisioning

#### Key Features & Changes
- Established full-stack Node.js and Express backend architecture with native HTTP and WebSocket (`ws`) server integration.
- Provisioned the four foundational user touchpoints:
  - **Customer Web App (`public/index.html`)**: Mobile-first responsive storefront for street food discovery.
  - **Partner Console (`public/partner.html`)**: Dual-mode operational interface for both street food vendors (POS order management) and delivery partners (gig claiming and navigation).
  - **Onboarding Portals (`public/onboard-vendor.html`, `public/onboard-rider.html`)**: Specialized intake forms for food carts and delivery riders.
  - **Admin Backoffice (`public/admin.html`)**: Operations console for inspecting stalls, auditing riders, and reviewing platform metrics.
- Configured production deployment pipeline with Render (`render.yaml`), defining auto-deploy configurations, health check endpoints (`/api/health`), and static file serving.
- Built JSON-based file storage engine (`server/data/thela.db.json`) with safe atomic serialization.

---

### Version 1.1.0 — Universal 12-Language Indian Localization (i18n)
- **Release Dates**: September 17–18, 2026
- **Git Commits**: `ea5344e`, `e227fcd`
- **Theme**: Deep Linguistic Accessibility for Indian Street Food Vendors & Customers

#### Key Features & Changes
- Built universal client-side internationalization dictionary (`public/i18n.js`) covering **12 major Indian languages**:
  1. English (`en`)
  2. Hindi (`hi` — हिन्दी)
  3. Bengali (`bn` — বাংলা)
  4. Marathi (`mr` — मराठी)
  5. Telugu (`te` — తెలుగు)
  6. Tamil (`ta` — தமிழ்)
  7. Gujarati (`gu` — ગુજરાતી)
  8. Kannada (`kn` — ಕನ್ನಡ)
  9. Malayalam (`ml` — മലയാളം)
  10. Punjabi (`pa` — ਪੰਜਾਬੀ)
  11. Odia (`or` — ଓଡ଼ିଆ)
  12. Assamese (`as` — অসমীয়া)
- Engineered a zero-reload, reactive DOM translation engine with declarative `data-i18n` HTML attributes.
- Implemented persistent user language preference storage across sessions in `localStorage`.
- Created automated dictionary coverage audit script (`scratch/test_all_i18n.js`) enforcing zero missing translation keys across all 5 applications and 12 languages.

---

### Version 1.2.0 — Two-Tier Street Food Trust Architecture & Infrastructure Hardening
- **Release Date**: September 18, 2026
- **Git Commits**: `ec59eb6`, `076ecd7`, `8416ab7`, `9c0f5e2`
- **Theme**: Regulatory Credibility, Physical Hygiene Audits & Production Deploy Tools

#### Key Features & Changes
- Architected the **Two-Tier Vendor Trust Model**, strictly separating regulatory paperwork from operational sanitation:
  - **Tier 1 (FSSAI Regulatory Audit)**: 14-digit government registration validation, certificate status (`submitted`, `verified`, `expired`, `rejected`), expiry date tracking, and direct national portal links.
  - **Tier 2 (Physical Hygiene Audit)**: On-site inspection checklist covering Reverse Osmosis (RO) drinking water usage, covered glass food carts, food-grade packaging (*donas* and wrappers), clean oil reheating practices, and cart sanitization. Implemented strict audit scoring (0–100) requiring score $\ge 80$ for certification.
- Enhanced Admin Backoffice with dedicated verification action drawers for FSSAI review and field audit logging.
- Created production deployment scripts: 1-click cloud VPS provisioning (`deploy-vps.sh`), Nginx reverse proxy configuration, PM2 process management (`ecosystem.config.js`), and Windows batch push tools (`Push-To-GitHub.bat`).

---

### Version 1.3.0 — Customer Discovery Experience & Zero-Fiction Delivery Claims
- **Release Date**: September 18, 2026
- **Git Commits**: `7195f4a`, `1ce5583`
- **Theme**: Food-First Merchandising & Eradication of Fabricated Time Promises

#### Key Features & Changes
- Redesigned customer home interface around genuine street food cravings:
  - Added craving-oriented search bar and interactive category chips (Chaat, Rolls, Tandoor, Sweets, Beverages, South Indian, Momos).
  - Introduced 6 horizontal curated discovery sections: Trending, Popular, Under ₹100, Legendary Stalls, Late Night, and Hidden Gems.
- **Complete Eradication of Fictional Delivery Claims**:
  - Eliminated static marketing claims ("15-minute delivery", "14-min guarantee") that misled customers.
  - Implemented dynamic calculation: straight-line Haversine distance engine, vendor food preparation time, transit calculations, and platform load buffers.
  - Added neutral fallback states ("ETA available after location") when customer coordinates or vendor data are not yet established.

---

### Version 1.4.0 — Authentic Street Vendor Profile Experience & Data Cleanliness
- **Release Date**: September 18, 2026
- **Git Commits**: `4659572`, `24184c6`
- **Theme**: Vendor Heritage Storytelling & Sensitive Data Purge

#### Key Features & Changes
- Created dedicated Vendor Detail Modal and storefront view:
  - Prominent verification badge display (FSSAI verified, Hygiene audited score, on-site verified location).
  - Authentic vendor heritage storytelling ("About this Cart", years operating, secret family spice blends).
  - Signature dishes showcase ("Famous For" badge), categorized food menus, and vegetarian/non-vegetarian toggles.
  - Persistent floating checkout bar and cart drawer.
- **Sensitive & Demo Data Purge**:
  - Removed all hardcoded test OTP bypasses (`9999`) and mock geolocation coordinates.
  - Restricted tracking screen to actual system dispatch estimates rather than fabricated driver simulations.

---

### Version 1.5.0 — Street-Food Atmosphere & State-Driven Adaptive Density
- **Release Date**: September 19, 2026
- **Git Commits**: `1fd2de5`, `bfac3b1`
- **Theme**: Visual Brand Identity & Viewport-Adaptive Interface Density

#### Key Features & Changes
- Created the **AtmosphereManager** visual system reflecting lively Indian night-market culture:
  - Warm spice color palettes (turmeric amber, deep masala red, fresh coriander green, cardamom gold).
  - Vector street food motifs (tawa spatulas, sizzling steam curls, earthen cups/kulhad, neon night signs).
- Built a **4-Level State-Driven Adaptive Density Engine**:
  - `compact`: Dense information layout for mobile viewports and order-heavy screens.
  - `normal`: Balanced spacing for desktop browsers.
  - `spacious`: High-readability layout for touch devices and elderly vendor access.
  - `minimal`: Background-suppressed mode activated automatically when modal stacks or drawers are open.
- Integrated hardware awareness: respects user `prefers-reduced-motion` and scales down animation loops during low-battery or performance constraints.

---

### Version 1.6.0 — Food Photography Hierarchy & Pure Dynamic Discovery
- **Release Date**: September 19, 2026
- **Git Commits**: `c4a4534`, `bb15488`, `e793837`
- **Theme**: 3-Tier Visual Food Hierarchy & Complete Elimination of Mock Vendors

#### Key Features & Changes
- Implemented **3-Tier Visual Menu Hierarchy**:
  - **Signature Dishes**: Full-width hero photography cards with ingredient callouts, heat levels, and awards.
  - **Bestsellers**: Medium-sized cards with quick-add counters and customization tags.
  - **Regular Items**: Streamlined list cards maximizing vertical scanning speed.
- Engineered dynamic SVG food placeholder generator (`getThelaFoodPlaceholder`) providing authentic vector illustrations for stalls without professional photography.
- **Pure Dynamic Discovery & Complete Demo Elimination**:
  - Completely emptied `CURATED_DISCOVERY` in `public/app.js` (removed 24 mock craving cards).
  - Updated discovery section rendering logic: horizontal tracks hide completely (`classList.add('hidden')`) when zero live matching vendors exist.
  - Purged `server/data/thela.db.json` of all mock vendors, demo tokens, and dummy ratings.
  - Enforced that customer discovery only displays authentic street food stalls registered in the database.

---

### Version 1.7.0 — Dynamic Delivery ETA Engine & Fleet Telemetry
- **Release Date**: September 19, 2026
- **Git Commits**: `8b5e8a6`, `bcbaa33`
- **Theme**: Mathematical Delivery Window Estimation & Dispatch Capacity Balancing

#### Key Features & Changes
- Developed mathematical delivery estimation algorithm:
  $$\text{ETA}_{\text{min}} = \text{PrepTime}_{\text{vendor}} + \left(\frac{\text{Distance}_{\text{km}}}{18\text{ km/h}} \times 60\right) + \text{Buffer}_{\text{fleet}}$$
  $$\text{ETA}_{\text{max}} = \text{ETA}_{\text{min}} + 7\text{ minutes}$$
- Dynamic fleet capacity telemetry (`getDeliveryCapacity`): scales buffer time proportionally based on active rider availability vs. pending active order queues.
- Rendered consistent, frosted ETA badges across discovery cards, stall detail drawers, and the cart summary.
- Guarded against phantom distance leaks: if customer location or vendor coordinates are missing, UI displays neutral `"ETA unavailable"` rather than guessing.

---

### Version 1.8.0 — Centralized Order Lifecycle Engine & Concurrency Safety
- **Release Date**: September 19, 2026
- **Git Commit**: `540e405`
- **Theme**: Deterministic State Machine, OCC Concurrency & Single-Use Doorstep OTP

#### Key Features & Changes
- Established canonical **10-stage order progression**:
  $$\text{PLACED} \to \text{ACCEPTED} \to \text{PREPARING} \to \text{READY\_FOR\_PICKUP} \to \text{RIDER\_ASSIGNED} \to \text{RIDER\_ARRIVING} \to \text{PICKED\_UP} \to \text{OUT\_FOR\_DELIVERY} \to \text{DELIVERED} \to \text{COMPLETED}$$
- Enacted 5 terminal failure states: `PAYMENT_FAILED`, `VENDOR_UNAVAILABLE`, `REJECTED`, `CANCELLED`, `RIDER_UNAVAILABLE`.
- **Optimistic Concurrency Control (OCC)**:
  - Every order entity maintains a monotonic integer `version`.
  - State transition requests require `expectedVersion`. Conflicting simultaneous updates fail with `HTTP 409 Conflict`.
- **Single-Use Doorstep Delivery OTP**:
  - Generated randomly upon order placement and encrypted at rest with AES-256-GCM (`OTP_SECRET`).
  - Stored in the database as salted SHA-256 hashes (`hashOtpWithSalt`). Raw OTP is never written to persistent storage.
  - Customer receives OTP only when status reaches `OUT_FOR_DELIVERY`.
  - Rate-limited verification locks after 5 consecutive incorrect attempts. Replay attacks on already-verified orders fail.
- **Rider Reassignment & Unavailable Flow**:
  - If a driver drops a gig, the order reverts to `READY_FOR_PICKUP` for auto-reassignment without resetting vendor prep progress.
  - If dispatch times out, order transitions to `RIDER_UNAVAILABLE`, automatically initiating customer refund procedures.
- Created comprehensive 22-test automated test suite (`scratch/test_order_lifecycle.js`).

---

### Version 1.9.0 — Server-Authoritative Payments, Financial Ledger & Settlements
- **Release Date**: September 19, 2026
- **Git Commit**: `1088bbc`
- **Theme**: Financial Ledger, Mathematical Balance Invariant & Settlement Life Cycle

#### Key Features & Changes
- **Server-Authoritative Pricing Engine (`server/src/payments/pricing_engine.js`)**:
  - Discards all client-supplied prices, totals, taxes, commissions, and payment statuses.
  - Re-fetches current catalog prices from database, calculates item totals, applies tiered delivery fees and packaging fees, verifies coupons, isolates customer tips (100% passed to rider, 0% platform take), and computes payable grand totals server-side.
- **Immutable Double-Entry Financial Ledger (`server/src/payments/ledger_service.js`)**:
  - Implemented append-only ledger (`financialLedger`) storing immutable financial transactions (`ORDER_PAYMENT`, `VENDOR_PAYABLE`, `RIDER_PAYABLE`, `PLATFORM_REVENUE`, `REFUND_ISSUED`, `ADJUSTMENT`).
  - Derived balances mathematically; existing ledger entries are never mutated.
- **Settlement State Machine (`server/src/routes/settlements.js`)**:
  - Vendor and rider settlements initiate in `PENDING`.
  - Transition to `ELIGIBLE` strictly upon doorstep OTP verification (`DELIVERED`).
  - Transition to `PROCESSING` upon batch payout generation, and `PAID` upon bank UTR confirmation.
- **Proportional Refund Engine**:
  - Supports full and partial item refunds. Reverses vendor payable proportionally for cancelled food while preserving rider delivery fees if pickup was already executed.
- **EOD Financial Reconciliation Monitor**:
  - Validates platform mathematical invariant across all historical ledger rows:
    $$\sum \text{Customer Collected} = \sum \text{Vendor Settlements} + \sum \text{Rider Settlements} + \sum \text{Platform Net} + \sum \text{Refunds}$$
- Created 19-test automated financial test suite (`scratch/test_payments_ledger.js`).

---

### Version 2.0.0 — Server-Authoritative Vendor & Rider Activation Pipeline
- **Release Date**: September 19, 2026
- **Git Commit**: `8bf2187`
- **Theme**: 7 Mandatory Activation Gates, Untrusted Browser Evidence & Zero Admin Bypass

#### Key Features & Changes
- **Onboarding Paradigm Shift ("Registration is an Application, Not an Approval")**:
  - Vendor registration strictly initializes stall in `APPLICATION_SUBMITTED` (`isOpen: false`, `location_verified: false`).
  - Rider registration strictly initializes rider in `APPLICATION_SUBMITTED` (`is_online: false`, `is_verified: false`).
  - Eliminated premature success claims ("Your cart is now live" / "You are now registered as a verified delivery partner"). Replaced with transparent verification journey roadmaps.
- **The 7 Mandatory Server-Side Activation Gates (`validateVendorLiveActivationGates`)**:
  No stall can transition to `LIVE`—even via admin actions—without satisfying all seven gates:
  1. `verification_status === 'APPROVED'`: Operational approval by platform compliance reviewers.
  2. **Authoritative Contact Data**: Valid owner name and verified 10-digit Indian mobile number.
  3. **Physical Location Verification**: Certified on-site inspection (`location_verified === true`). Raw browser GPS is tagged as untrusted applicant evidence (`location_source: 'browser_applicant'`).
  4. **Active Menu Catalog**: At least one in-stock menu item with a valid price $> ₹0$.
  5. **Valid Payout Destination**: Conforming UPI ID format (`id@bank`).
  6. **Regulatory FSSAI Compliance**: `fssai_status === 'verified'` with non-expired expiry date.
  7. **Physical Hygiene Inspection**: `hygiene_status === 'verified'` with audit score $\ge 80$.
- **Continuous Post-Activation Compliance (`checkStallCanAcceptOrders`)**:
  - Evaluates all 7 gates on every incoming order. If an FSSAI license lapses or hygiene audit is revoked post-activation, stall is immediately suspended and blocked from receiving orders.
- **Mandatory Suspension Re-Review**:
  - Reinstatement from `SUSPENDED` cannot jump directly to `APPROVED` or `LIVE`. Requires re-review transition through `DOCUMENT_VERIFICATION` or `PHYSICAL_INSPECTION`.
- **Rider Activation Pipeline**:
  - Progressive stages: `APPLICATION_SUBMITTED` $\to$ `IDENTITY_REVIEW` $\to$ `APPROVED` $\to$ `AVAILABLE`.
  - Unapproved riders are barred from toggling online or claiming delivery gigs.
- **Applicant Token Scoping & Anti-Enumeration Security**:
  - Scoped tokens (`thela_tok_vendor_${stallId}`, `thela_tok_rider_${riderId}`) restricted to tracking the applicant's own status.
  - Cross-applicant status lookups rejected with `HTTP 403 Forbidden` prior to database queries, preventing ID enumeration.
- **Architecture Refactor**:
  - Created `server/src/app.js` separating Express configuration from server listen logic for isolated unit and integration testing.
- Created comprehensive 8-test activation test suite (`scratch/test_vendor_rider_activation.js`).

---

### Version 2.0.1 — Server-Authoritative Store Status Derivation & Activation Contradiction Fix
- **Release Date**: September 20, 2026
- **Git Commit**: `d67801c` (`fix(partner): resolve store status contradiction with server-authoritative state derivation and regression tests`)
- **Theme**: Operational Invariant Integrity & Partner Portal Store Status Normalization

#### Problem Solved
In production, stalls in intake stages (`APPLICATION_SUBMITTED`, `DOCUMENT_VERIFICATION`, `PHYSICAL_INSPECTION`, `CORRECTION_REQUIRED`, `REJECTED`, `APPROVED-but-not-LIVE`, `INACTIVE`, or `SUSPENDED`) previously suffered from a UI contradiction where the Partner header rendered "Store Status: OPEN FOR ORDERS" in bright green while the body of the page correctly showed "Kitchen POS Locked" and pending onboarding verification gates. This contradiction was caused by static i18n attribute overwrites (`data-i18n="store_open"`) and optimistic client-side fallback status labels.

#### Key Features & Changes
- **Single Backend Source of Truth (`server/src/db.js` -> `getStallStoreStatus`)**:
  - Implemented centralized backend state machine method that authoritatively evaluates verification status, activation gates, and `isOpen` flag, returning canonical status objects.
  - Strict canonical labels enforced:
    - `APPLICATION_SUBMITTED` $\to$ `"APPLICATION PENDING"`
    - `DOCUMENT_VERIFICATION` $\to$ `"VERIFICATION IN PROGRESS"`
    - `PHYSICAL_INSPECTION` $\to$ `"VERIFICATION IN PROGRESS"`
    - `CORRECTION_REQUIRED` $\to$ `"CORRECTION REQUIRED"`
    - `REJECTED` $\to$ `"APPLICATION REJECTED"`
    - `APPROVED` (not LIVE) $\to$ `"APPROVED — NOT LIVE"`
    - `INACTIVE` $\to$ `"INACTIVE"`
    - `SUSPENDED` $\to$ `"SUSPENDED"`
    - `LIVE` + `isOpen === false` $\to$ `"STORE CLOSED"`
    - `LIVE` + `isOpen === true` (all 7 mandatory activation gates pass) $\to$ `"OPEN FOR ORDERS"`
- **Strict Endpoint Hardening**:
  - `formatStallForPublic(stall)` strictly sets `isOpen: storeStatus.isOpen`. Unactivated stalls can never return `isOpen: true` to any customer or partner client.
  - `GET /api/stalls/:id/status` delivers the comprehensive status payload (`store_status`, `store_status_label`, `can_accept_orders`, `isOpen`, `can_toggle_open`, `failed_gates`).
  - `GET /api/onboard/vendor/status/:id` returns authoritative `store_status` and `store_status_label`.
  - `PATCH ['/:id/status', '/:id/toggle-open', '/:id/toggle-live']` strictly rejects open toggle requests on any stall not in `APPROVED`, `LIVE`, or `INACTIVE` with passing gates (`HTTP 400 Bad Request`).
- **Partner Frontend Normalization (`public/partner.html`, `public/partner.js`)**:
  - Removed `data-i18n="store_open"` from `#vendorOpenLabel` to eliminate i18n DOM translation collisions.
  - Initialized status button to neutral disabled: `CHECKING STATUS...` with gray indicator dot.
  - Integrated `renderStoreStatus()` responding synchronously to stall data, language updates, and WebSocket `STALL_STATUS_CHANGED` broadcasts.
- **12-Language Localization (`public/i18n.js`)**:
  - Added translation keys for all 8 canonical store status states across all 12 Indian languages (English, Hindi, Bengali, Telugu, Marathi, Tamil, Urdu, Gujarati, Kannada, Malayalam, Odia, Punjabi). Verified with 0 missing keys.
- **Automated Regression Suite (`scratch/test_store_status_contradiction.js`)**:
  - 5-suite comprehensive test suite testing static DOM invariants, application isolation, full lifecycle transitions, LIVE vs. closed states, and suspended state protection.

---

## Complete Git Commit Log History

| Commit Hash | Commit Date | Scope / Area | Commit Summary |
| :--- | :--- | :--- | :--- |
| `d67801c` | 2026-09-20 | Partner App | `fix(partner): resolve store status contradiction with server-authoritative state derivation and regression tests` |
| `790a35b` | 2026-09-20 | Packaging | `chore: bump version to 2.0.0 and generate version-stamped zip archives` |
| `865621e` | 2026-09-20 | Documentation | `docs: add comprehensive application version history and changelog from v1.0.0 to v2.0.0` |
| `8bf2187` | 2026-09-19 | Verification | `feat: implement server-authoritative vendor and rider activation pipeline with 7 mandatory gates` |
| `e793837` | 2026-09-19 | Discovery | `feat(discovery): remove all mock discovery vendor cards and enforce dynamic zero-vendor hiding` |
| `bb15488` | 2026-09-19 | Data Integrity | `Clean demo vendors, fake names, and header LIVE badge; isolate test fixtures` |
| `1088bbc` | 2026-09-19 | Payments & Ledger | `feat(payments): implement production-grade payments, double-entry ledger, settlements and reconciliation monitor` |
| `540e405` | 2026-09-19 | Order Lifecycle | `feat: Centralized Order Lifecycle Engine with OCC, single-use OTP & decoupled payments` |
| `bcbaa33` | 2026-09-19 | Delivery Telemetry | `feat: prominent dynamic delivery ETA engine with zero fiction & verified capacity telemetry (mirror)` |
| `8b5e8a6` | 2026-09-19 | Delivery Telemetry | `feat: prominent dynamic delivery ETA engine with zero fiction & verified capacity telemetry` |
| `c4a4534` | 2026-09-19 | Merchandising | `feat: elevate food photography, vendor cards & enforce strict data integrity` |
| `bfac3b1` | 2026-09-19 | Documentation | `docs: comprehensive developer handover guide and test suites` |
| `1fd2de5` | 2026-09-19 | UI Atmosphere | `feat(ui): lively Indian street-food visual atmosphere with state-driven adaptive density` |
| `24184c6` | 2026-09-18 | Vendor Storefront | `feat(vendor-page): premium authentic street-food vendor discovery experience, vitals, famous-for, verified local story, categorized menu, and persistent sticky cart` |
| `4659572` | 2026-09-18 | Data Integrity | `fix(cleanup): purge all visible demo data, test OTP, sample GPS, and restrict order tracking ETA to actual system dispatch estimates` |
| `1ce5583` | 2026-09-18 | Customer UI | `fix(delivery-claims): completely remove fixed 15-min and 14-min delivery promises in favor of dynamic calculations and neutral status` |
| `7195f4a` | 2026-09-18 | Customer UI | `feat(customer-home): major UI/UX upgrade with food-first design, craving search, 6 discovery sections, and dynamic delivery times` |
| `9c0f5e2` | 2026-09-18 | Deployment | `Add 1-click Push-To-GitHub.bat for Windows` |
| `8416ab7` | 2026-09-18 | Cloud Config | `Optimize render.yaml buildCommand for free 24/7 cloud deployment` |
| `076ecd7` | 2026-09-18 | Deployment | `Add 1-click cloud VPS deployment scripts, Nginx reverse proxy and PM2 ecosystem configuration` |
| `ec59eb6` | 2026-09-18 | Trust & Safety | `Implement authentic vendor verification and trust system with separated FSSAI and Hygiene audits` |
| `e227fcd` | 2026-09-18 | Localization | `fix: universal reactive 12-language Indian localization across all apps` |
| `ea5344e` | 2026-09-17 | Localization | `feat: Add 12-language Indian multi-language selector (i18n) across all apps` |
| `ec45110` | 2026-09-17 | Foundation | `feat: Initial commit for ThelaExpress 24/7 cloud deployment` |

---

## State Machine & Regulatory Enforcement Matrices

### 1. Vendor Stall State Machine

| Current State | Allowed Next State(s) | Permitted Role(s) | Preconditions & Activation Invariants |
| :--- | :--- | :--- | :--- |
| `APPLICATION_SUBMITTED` | `DOCUMENT_VERIFICATION`, `CORRECTION_REQUIRED`, `REJECTED` | `admin`, `reviewer` | Initial state upon registration. Untrusted browser GPS stored. `isOpen = false`. |
| `DOCUMENT_VERIFICATION` | `PHYSICAL_INSPECTION`, `CORRECTION_REQUIRED`, `REJECTED` | `admin`, `reviewer` | Legal identity & FSSAI 14-digit number validated against national registry. |
| `PHYSICAL_INSPECTION` | `APPROVED`, `CORRECTION_REQUIRED`, `REJECTED` | `admin`, `auditor` | On-site hygiene audit recorded (score $\ge 80$). Physical location verified on site. |
| `APPROVED` | `LIVE`, `INACTIVE`, `SUSPENDED` | `vendor`, `admin` | Stall approved. Can only transition to `LIVE` if all 7 mandatory gates pass. |
| `LIVE` | `INACTIVE`, `SUSPENDED` | `vendor`, `admin` | Active in customer discovery. Continuously audited by `checkStallCanAcceptOrders`. |
| `INACTIVE` | `LIVE`, `SUSPENDED` | `vendor`, `admin` | Vendor temporarily closed cart for the day. Re-activation requires gate validation. |
| `CORRECTION_REQUIRED` | `APPLICATION_SUBMITTED` | `vendor`, `admin` | Deficient documents returned to applicant for resubmission. |
| `SUSPENDED` | `DOCUMENT_VERIFICATION`, `PHYSICAL_INSPECTION`, `REJECTED` | `admin`, `compliance` | License lapsed or hygiene revoked. **Direct jump to APPROVED or LIVE is forbidden.** |
| `REJECTED` | None (Terminal) | None | Terminal state. Requires new application. |

---

### 2. Rider Partner State Machine

| Current State | Allowed Next State(s) | Permitted Role(s) | Preconditions & Activation Invariants |
| :--- | :--- | :--- | :--- |
| `APPLICATION_SUBMITTED` | `IDENTITY_REVIEW`, `CORRECTION_REQUIRED`, `REJECTED` | `admin`, `reviewer` | Initial state. Barred from dispatch pool. `is_online = false`. |
| `IDENTITY_REVIEW` | `APPROVED`, `CORRECTION_REQUIRED`, `REJECTED` | `admin`, `reviewer` | Verification of driver license, vehicle number plate, and identity documents. |
| `APPROVED` | `AVAILABLE`, `OFFLINE`, `SUSPENDED` | `rider`, `admin` | Approved fleet member. Permitted to go online. |
| `AVAILABLE` | `OFFLINE`, `SUSPENDED` | `rider`, `admin` | Online in dispatch pool. Counted in delivery fleet capacity telemetry. |
| `OFFLINE` | `AVAILABLE`, `SUSPENDED` | `rider`, `admin` | Driver off-duty. Excluded from gig assignment. |
| `CORRECTION_REQUIRED` | `APPLICATION_SUBMITTED` | `rider`, `admin` | Applicant correcting submitted vehicle/identity details. |
| `SUSPENDED` | `IDENTITY_REVIEW`, `REJECTED` | `admin` | Disciplinary or document expiration suspension. Must re-verify via review. |
| `REJECTED` | None (Terminal) | None | Terminal state. |

---

### 3. Order Lifecycle State Machine

| Stage # | Status Code | Permitted Initiator | Concurrency Guard | Triggering Event / Action |
| :---: | :--- | :--- | :---: | :--- |
| **1** | `PLACED` | Customer | `version = 1` | Server recalculates pricing, stores encrypted OTP, records payment funds. |
| **2** | `ACCEPTED` | Vendor, Admin | `expectedVersion = 1` | Vendor accepts incoming ticket on POS console. |
| **3** | `PREPARING` | Vendor, Admin | `expectedVersion = 2` | Vendor begins cooking on tawa/cart. Customer cancel window closes. |
| **4** | `READY_FOR_PICKUP` | Vendor, Admin | `expectedVersion = 3` | Food packaged in eco-dona/container. Order enters rider gig dispatch pool. |
| **5** | `RIDER_ASSIGNED` | Rider, System | `expectedVersion = 4` | Approved, online rider claims gig. Rider settlement recorded. |
| **6** | `RIDER_ARRIVING` | Rider, Admin | `expectedVersion = 5` | Delivery partner navigating to stall location. |
| **7** | `PICKED_UP` | Rider, Admin | `expectedVersion = 6` | Food collected from street stall. |
| **8** | `OUT_FOR_DELIVERY` | Rider, Admin | `expectedVersion = 7` | Driver transit to customer address. Customer app displays doorstep OTP. |
| **9** | `DELIVERED` | Rider, Admin | `expectedVersion = 8` | Rider submits valid single-use OTP. Settlements transition to `ELIGIBLE`. |
| **10** | `COMPLETED` | System, Admin | `expectedVersion = 9` | Order finalized. Historical stats incremented. |

---

### 4. Payment Settlement State Machine

| Settlement Status | Conditions Required to Enter | Action Permitted |
| :--- | :--- | :--- |
| `PENDING` | Created automatically upon verified customer payment funds recording. | Funds held in escrow. Cannot be disbursed. |
| `ELIGIBLE` | Doorstep OTP verified (`DELIVERED`). | Available for inclusion in automated payout batch. |
| `PROCESSING` | Included in bank transfer batch file / payout run. | Locked against double-payout or duplicate inclusion. |
| `PAID` | Bank UTR confirmation received from payout gateway. | Immutable finalized payout. Ledger entry stamped. |

---

## Verification Test Suites & Engineering Compliance

The platform includes **9 automated verification suites** covering all aspects of the system:

1. **[`scratch/test_store_status_contradiction.js`](file:///C:/Users/anura/.gemini/antigravity/scratch/thela-express-prod/scratch/test_store_status_contradiction.js)**:
   - Validates server-authoritative store status derivation, HTML DOM i18n invariants, non-activation isolation, canonical stage progression labels, and suspended state protection.
2. **[`scratch/test_vendor_rider_activation.js`](file:///C:/Users/anura/.gemini/antigravity/scratch/thela-express-prod/scratch/test_vendor_rider_activation.js)**:
   - Validates initial `APPLICATION_SUBMITTED` state, zero admin bypass, step-by-step activation lifecycle, post-activation continuous revalidation, suspension re-review rules, applicant token scoping (`HTTP 403`), rider dispatch gating, and public HTML content rendering.
3. **[`scratch/test_payments_ledger.js`](file:///C:/Users/anura/.gemini/antigravity/scratch/thela-express-prod/scratch/test_payments_ledger.js)**:
   - Validates server pricing manipulation defense, 100% tip isolation, vendor vs. platform discounts, append-only double-entry ledger, full & partial proportional refunds, and EOD mathematical balance reconciliation.
4. **[`scratch/test_order_lifecycle.js`](file:///C:/Users/anura/.gemini/antigravity/scratch/thela-express-prod/scratch/test_order_lifecycle.js)**:
   - Validates canonical 10-stage progression, illegal transition prevention, role impersonation defense, single-use doorstep OTP replay defense, rate-limiting, and OCC conflict handling.
5. **[`scratch/test_all_i18n.js`](file:///C:/Users/anura/.gemini/antigravity/scratch/thela-express-prod/scratch/test_all_i18n.js)**:
   - Enforces 100% dictionary key coverage across all 5 applications and 12 Indian languages (0 missing keys).
6. **[`scratch/audit_demodata.js`](file:///C:/Users/anura/.gemini/antigravity/scratch/thela-express-prod/scratch/audit_demodata.js)**:
   - Audits frontend scripts, backend code, and JSON database to guarantee zero mock vendors, fake names, or hardcoded tokens exist.
7. **[`scratch/test_food_cards.js`](file:///C:/Users/anura/.gemini/antigravity/scratch/thela-express-prod/scratch/test_food_cards.js)**:
   - Verifies 3-tier visual hierarchy, vector placeholder generation, and dynamic hiding of discovery sections when 0 vendors exist.
8. **[`scratch/test_delivery_eta_integrity.js`](file:///C:/Users/anura/.gemini/antigravity/scratch/thela-express-prod/scratch/test_delivery_eta_integrity.js)**:
   - Validates Haversine distance accuracy, fleet telemetry buffer scaling, and neutral fallback states for missing location data.
9. **[`scratch/test_atmosphere.js`](file:///C:/Users/anura/.gemini/antigravity/scratch/thela-express-prod/scratch/test_atmosphere.js)**:
   - Verifies street-food atmosphere motifs, adaptive density states, and modal stack tracking.

---

## File Hierarchy & System Topology

```
thela-express/
├── VERSION_HISTORY.md                 # Complete historical changelog & architectural reference
├── README.md                          # Production launch guide & developer handbook
├── package.json                       # Service metadata & Node engine dependencies
├── render.yaml                        # 24/7 Cloud deployment manifest
├── public/                            # Static Web Clients (HTML5, Vanilla JS, Tailwind CSS)
│   ├── index.html                     # Customer Ordering & Food Discovery Web App
│   ├── partner.html                   # Partner Unified Console (Vendor POS & Rider Dispatch)
│   ├── onboard-vendor.html            # Street Stall Intake & Application Portal
│   ├── onboard-rider.html             # Delivery Partner Intake & Verification Portal
│   ├── admin.html                     # Admin Verification, Backoffice & Financial Monitor
│   ├── app.js                         # Customer Storefront Logic, Search & Atmosphere Manager
│   ├── partner.js                     # POS Order Management, Gig Dispatch & Status Cards
│   └── i18n.js                        # 12-Language Localization Dictionary & DOM Engine
├── server/
│   ├── data/
│   │   └── thela.db.json              # Clean persistent JSON database (zero demo data)
│   └── src/
│       ├── app.js                     # Express API Gateway, Middleware & Route Configuration
│       ├── server.js                  # Production HTTP Server & WebSocket Gateway Entrypoint
│       ├── websocket.js               # Realtime Pub/Sub WebSocket Broadcast Engine
│       ├── db.js                      # Database Engine, State Machines & Gate Validations
│       ├── routes/
│       │   ├── admin.js               # Admin Verification, Stage Transitions & Gate Actions
│       │   ├── auth.js                # Participant Authentication & Session Management
│       │   ├── onboard.js             # Vendor & Rider Registration & Scoped Status Tracking
│       │   ├── orders.js              # Authoritative Order Placement, OTP & Lifecycle Hooks
│       │   ├── payments.js            # Payment Verification, Ledger Stamping & Refund Triggers
│       │   ├── riders.js              # Delivery Partner Fleet Telemetry & Availability Toggles
│       │   ├── settlements.js         # Financial Payout Lifecycle & Batch Processing
│       │   ├── stalls.js              # Live Stall Customer Discovery & Catalog Queries
│       │   └── users.js               # Customer Profile & Address Book Management
│       └── payments/
│           ├── pricing_engine.js      # Server-Authoritative Price, Fee & Margin Calculation
│           ├── payment_provider.js    # UPI & Gateway Cryptographic Signature Verification
│           └── ledger_service.js      # Double-Entry Ledger, Settlements & Reconciliation
└── scratch/                           # Automated Verification & Quality Assurance Suite
    ├── test_vendor_rider_activation.js# 8-Suite Vendor & Rider Activation Pipeline Test
    ├── test_order_lifecycle.js        # 22-Test Order Lifecycle & Concurrency Test
    ├── test_payments_ledger.js        # 19-Test Payments, Ledger & Balance Test
    ├── test_all_i18n.js               # Universal 12-Language Localization Test
    ├── audit_demodata.js              # Zero-Demo Data & Clean Repository Audit
    ├── test_food_cards.js             # Visual Hierarchy & Dynamic Discovery Card Test
    ├── test_delivery_eta_integrity.js # Haversine Distance & Fleet Telemetry Test
    ├── test_atmosphere.js             # Adaptive Density & Street-Food Visual Test
    └── make_zip.js                    # Distribution Archive Packaging Script
```

---

*Document compiled and verified against production codebase and Git commit history.*
