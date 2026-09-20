const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'public', 'i18n.js');
let content = fs.readFileSync(filePath, 'utf8');

const THEME_I18N = {
  en: {
    theme_selector: "Theme",
    theme_white: "White (Light)",
    theme_black: "Black (Dark)",
    theme_system: "System Default"
  },
  hi: {
    theme_selector: "थीम",
    theme_white: "सफेद (लाइट)",
    theme_black: "काला (डार्क)",
    theme_system: "सिस्टम डिफ़ॉल्ट"
  },
  hinglish: {
    theme_selector: "Theme",
    theme_white: "White (Light)",
    theme_black: "Black (Dark)",
    theme_system: "System Default"
  },
  mr: {
    theme_selector: "थीम",
    theme_white: "पांढरा (लाइट)",
    theme_black: "काळा (डार्क)",
    theme_system: "सिस्टम डीफॉल्ट"
  },
  gu: {
    theme_selector: "થીમ",
    theme_white: "સફેદ (લાઇટ)",
    theme_black: "કાળો (ડાર્ક)",
    theme_system: "સિસ્ટમ ડિફૉલ્ટ"
  },
  ta: {
    theme_selector: "தீம்",
    theme_white: "வெள்ளை (லைட்)",
    theme_black: "கருப்பு (டார்க்)",
    theme_system: "சிஸ்டம் இயல்புநிலை"
  },
  te: {
    theme_selector: "థీమ్",
    theme_white: "తెలుపు (లైట్)",
    theme_black: "నలుపు (డార్క్)",
    theme_system: "సిస్టమ్ డిఫాల్ట్"
  },
  kn: {
    theme_selector: "ಥೀಮ್",
    theme_white: "ಬಿಳಿ (ಲೈಟ್)",
    theme_black: "ಕಪ್ಪು (ಡಾರ್ಕ್)",
    theme_system: "ಸಿಸ್ಟಮ್ ಡೀಫಾಲ್ಟ್"
  },
  bn: {
    theme_selector: "থিম",
    theme_white: "সাদা (লাইট)",
    theme_black: "কালো (ডার্ক)",
    theme_system: "সিস্টেম ডিফল্ট"
  },
  ml: {
    theme_selector: "തീം",
    theme_white: "വെള്ള (ലൈറ്റ്)",
    theme_black: "കറുപ്പ് (ഡാർക്ക്)",
    theme_system: "സിസ്റ്റം ഡിഫോൾട്ട്"
  },
  pa: {
    theme_selector: "ਥੀਮ",
    theme_white: "ਚਿੱਟਾ (ਲਾਈਟ)",
    theme_black: "ਕਾਲਾ (ਡਾਰਕ)",
    theme_system: "ਸਿਸਟਮ ਡਿਫੌਲਟ"
  },
  or: {
    theme_selector: "ଥିମ୍",
    theme_white: "ଧଳା (ଲାଇଟ୍)",
    theme_black: "କଳା (ଡାର୍କ)",
    theme_system: "ସିଷ୍ଟମ୍ ଡିଫଲ୍ଟ"
  }
};

for (const [lang, dict] of Object.entries(THEME_I18N)) {
  const targetRegex = new RegExp(`("${lang}"\\s*:\\s*{[\\s\\S]*?"orders_delivered_suffix"\\s*:\\s*"[^"]+")`, 'm');
  const match = content.match(targetRegex);
  if (!match) {
    console.error(`Could not find match for lang: ${lang}`);
    process.exit(1);
  }

  const addition = `,\n    "theme_selector": ${JSON.stringify(dict.theme_selector)},\n    "theme_white": ${JSON.stringify(dict.theme_white)},\n    "theme_black": ${JSON.stringify(dict.theme_black)},\n    "theme_system": ${JSON.stringify(dict.theme_system)}`;
  const replaced = match[1] + addition;
  content = content.replace(match[1], replaced);
  console.log(`✓ Added theme keys for: ${lang}`);
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated public/i18n.js with theme dictionary entries!');
