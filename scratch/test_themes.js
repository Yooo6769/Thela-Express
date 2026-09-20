// Automated Verification Suite for ThelaExpress Theme Engine (White, Black, System Default)
const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('================================================================');
console.log('🎨 RUNNING UNIVERSAL THEME ENGINE VERIFICATION & TEST SUITE');
console.log('================================================================\n');

let totalTests = 0;
let passedTests = 0;

function it(desc, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✓ ${desc}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ ${desc}`);
    console.error(`    Error: ${err.message}`);
  }
}

// -------------------------------------------------------------
// SUITE 1: HTML PORTAL ASSET & MOUNT INVARIANTS
// -------------------------------------------------------------
console.log('--- SUITE 1: HTML Portal Invariants & Head Bootloaders ---');

const portals = [
  'public/index.html',
  'public/partner.html',
  'public/onboard-vendor.html',
  'public/onboard-rider.html',
  'public/admin.html'
];

portals.forEach(portalPath => {
  const fullPath = path.join(__dirname, '..', portalPath);
  const html = fs.readFileSync(fullPath, 'utf8');

  it(`${portalPath} includes theme.css link`, () => {
    assert(html.includes('/theme.css?v=2.0.3'), `Missing /theme.css?v=2.0.3 in ${portalPath}`);
  });

  it(`${portalPath} includes inline FOUC prevention script in head`, () => {
    assert(html.includes('thela_theme_mode'), `Missing FOUC localStorage check in ${portalPath}`);
    assert(html.includes('data-resolved-theme'), `Missing data-resolved-theme setting in ${portalPath}`);
  });

  it(`${portalPath} configures tailwind.config with darkMode: 'class'`, () => {
    assert(html.includes("darkMode: 'class'"), `Missing darkMode: 'class' in ${portalPath}`);
  });

  it(`${portalPath} contains .themeSelectorMount container`, () => {
    assert(html.includes('themeSelectorMount'), `Missing themeSelectorMount in ${portalPath}`);
  });

  it(`${portalPath} includes theme.js script`, () => {
    assert(html.includes('/theme.js?v=2.0.3'), `Missing /theme.js?v=2.0.3 in ${portalPath}`);
  });
});

// -------------------------------------------------------------
// SUITE 2: THEME MANAGER LOGIC & RESOLUTION TESTS
// -------------------------------------------------------------
console.log('\n--- SUITE 2: Theme Manager State Resolution & Storage ---');

const themeJsPath = path.join(__dirname, '..', 'public', 'theme.js');
const themeJs = fs.readFileSync(themeJsPath, 'utf8');

it('theme.js handles white, black, and system modes', () => {
  assert(themeJs.includes("'white'"), 'Missing white mode support');
  assert(themeJs.includes("'black'"), 'Missing black mode support');
  assert(themeJs.includes("'system'"), 'Missing system mode support');
});

it('theme.js syncs across browser tabs via storage listener', () => {
  assert(themeJs.includes("window.addEventListener('storage'"), 'Missing storage listener for multi-tab sync');
});

it('theme.js reacts to OS system dark/light changes', () => {
  assert(themeJs.includes("prefers-color-scheme: dark"), 'Missing prefers-color-scheme query');
  assert(themeJs.includes("addEventListener('change'"), 'Missing system change listener');
});

it('theme.js exposes public API window.ThelaTheme', () => {
  assert(themeJs.includes('window.ThelaTheme ='), 'Missing window.ThelaTheme export');
  assert(themeJs.includes('setMode:'), 'Missing setMode API');
  assert(themeJs.includes('getMode:'), 'Missing getMode API');
  assert(themeJs.includes('getResolved:'), 'Missing getResolved API');
});

// -------------------------------------------------------------
// SUITE 3: CSS TOKENS & STYLE COVERAGE
// -------------------------------------------------------------
console.log('\n--- SUITE 3: CSS Tokens & Dark/Light Semantic Overrides ---');

const themeCssPath = path.join(__dirname, '..', 'public', 'theme.css');
const themeCss = fs.readFileSync(themeCssPath, 'utf8');

it('theme.css defines light/white tokens', () => {
  assert(themeCss.includes('html.light') || themeCss.includes('html[data-theme="light"]'), 'Missing html.light selector');
  assert(themeCss.includes('--thela-bg: #ffffff'), 'Missing white background token');
});

it('theme.css defines deep black/AMOLED dark tokens', () => {
  assert(themeCss.includes('html.dark') || themeCss.includes('html[data-theme="dark"]'), 'Missing html.dark selector');
  assert(themeCss.includes('--thela-bg: #09090b'), 'Missing deep black background token');
});

it('theme.css covers admin adaptive theme for White mode', () => {
  assert(themeCss.includes('.admin-theme-adaptive'), 'Missing .admin-theme-adaptive styles');
});

it('theme.css styles thela-theme-container, thela-theme-btn, and thela-theme-menu', () => {
  assert(themeCss.includes('.thela-theme-container'), 'Missing .thela-theme-container');
  assert(themeCss.includes('.thela-theme-btn'), 'Missing .thela-theme-btn');
  assert(themeCss.includes('.thela-theme-menu'), 'Missing .thela-theme-menu');
  assert(themeCss.includes('.thela-theme-option'), 'Missing .thela-theme-option');
});

// -------------------------------------------------------------
// SUITE 4: 12-LANGUAGE LOCALIZATION COVERAGE
// -------------------------------------------------------------
console.log('\n--- SUITE 4: 12-Language Localization Coverage ---');

global.localStorage = { getItem: () => 'en', setItem: () => {} };
global.window = { addEventListener: () => {}, dispatchEvent: () => {} };
global.document = { querySelectorAll: () => [], addEventListener: () => {} };

const i18nContent = fs.readFileSync(path.join(__dirname, '..', 'public', 'i18n.js'), 'utf8');
eval(i18nContent.replace(/const I18N_/g, 'global.I18N_'));

const requiredThemeKeys = ['theme_selector', 'theme_white', 'theme_black', 'theme_system'];

global.I18N_LANGUAGES.forEach(lang => {
  it(`Language [${lang.code} - ${lang.name}] has all 4 theme keys`, () => {
    const dict = global.I18N_DICTIONARY[lang.code];
    assert(dict, `Dictionary missing for ${lang.code}`);
    requiredThemeKeys.forEach(k => {
      assert(dict[k], `Missing key "${k}" in language "${lang.code}"`);
      assert(dict[k].length > 0, `Empty key "${k}" in language "${lang.code}"`);
    });
  });
});

// -------------------------------------------------------------
// SUITE 5: CACHE-CONTROL HEADERS IN SERVER APP
// -------------------------------------------------------------
console.log('\n--- SUITE 5: Server Cache Headers Verification ---');

const appJsPath = path.join(__dirname, '..', 'server', 'src', 'app.js');
const appJs = fs.readFileSync(appJsPath, 'utf8');

it('server/src/app.js enforces no-cache headers for .css files', () => {
  assert(appJs.includes("filePath.endsWith('.css')"), 'Missing .css check in server static headers');
  assert(appJs.includes('no-cache, no-store, must-revalidate'), 'Missing no-cache header string');
});

// -------------------------------------------------------------
// SUMMARY
// -------------------------------------------------------------
console.log('\n================================================================');
if (totalTests === passedTests) {
  console.log(`🎉 ALL ${passedTests}/${totalTests} THEME ENGINE TESTS PASSED FLAWLESSLY!`);
} else {
  console.error(`❌ ${totalTests - passedTests}/${totalTests} TESTS FAILED!`);
}
console.log('================================================================\n');

process.exit(totalTests === passedTests ? 0 : 1);
