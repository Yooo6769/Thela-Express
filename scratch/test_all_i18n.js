const fs = require('fs');
global.localStorage = { getItem: () => 'en', setItem: () => {} };
global.window = { addEventListener: () => {}, dispatchEvent: () => {} };
global.document = { querySelectorAll: () => [], addEventListener: () => {} };
const content = fs.readFileSync('public/i18n.js', 'utf8');
eval(content.replace(/const I18N_/g, 'global.I18N_'));

const files = [
  'public/index.html',
  'public/partner.html',
  'public/onboard-vendor.html',
  'public/onboard-rider.html',
  'public/admin.html'
];

let totalErrors = 0;

files.forEach(file => {
  const html = fs.readFileSync(file, 'utf8');
  const hasScript = html.includes('/i18n.js');
  const hasMount = html.includes('langSelectorMount');
  console.log('--- Checking', file, '---');
  console.log('Has i18n script:', hasScript, '| Has langSelectorMount:', hasMount);
  if (!hasScript || !hasMount) {
    console.error('ERROR in', file, ': missing script or mount');
    totalErrors++;
  }

  const keys = new Set();
  const regex = /data-i18n(?:-placeholder|-html|-title)?=["']([^"']+)["']/g;
  let match;
  while ((match = regex.exec(html)) !== null) {
    keys.add(match[1]);
  }

  console.log('Total i18n keys in', file, ':', keys.size);

  for (const lang of global.I18N_LANGUAGES) {
    const dict = global.I18N_DICTIONARY[lang.code];
    const missing = Array.from(keys).filter(k => dict[k] === undefined);
    if (missing.length > 0) {
      console.error('Lang', lang.code, 'missing keys in', file, ':', missing);
      totalErrors += missing.length;
    }
  }
});

console.log('=== TEST RESULT: Total missing keys across all 5 apps and 12 languages:', totalErrors, '===');
process.exit(totalErrors === 0 ? 0 : 1);
