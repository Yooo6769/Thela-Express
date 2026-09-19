const fs = require('fs');

const updates = {
  en: {
    complete_vendor_btn: "Submit Stall Application",
    complete_rider_onboard_btn: "Submit Partner Application",
    rider_success_title: "Application Submitted — Review Pending",
    rider_success_desc: "Your delivery partner application has been submitted for identity and document review. Your account is not active yet and you cannot accept delivery gigs until verified by operations."
  },
  hi: {
    complete_vendor_btn: "स्टॉल आवेदन जमा करें",
    complete_rider_onboard_btn: "पार्टनर आवेदन जमा करें",
    rider_success_title: "आवेदन जमा किया गया — समीक्षा लंबित",
    rider_success_desc: "आपका डिलीवरी पार्टनर आवेदन पहचान और दस्तावेज़ समीक्षा के लिए जमा कर दिया गया है। आपका खाता अभी सक्रिय नहीं है और अनुमोदन मिलने तक आप डिलीवरी स्वीकार नहीं कर सकते।"
  },
  hinglish: {
    complete_vendor_btn: "Stall Application Submit Karein",
    complete_rider_onboard_btn: "Partner Application Submit Karein",
    rider_success_title: "Application Submit Ho Gaya — Review Pending",
    rider_success_desc: "Aapka delivery partner application identity aur document review ke liye submit ho chuka hai. Account abhi active nahi hai aur approval milne tak aap gigs claim nahi kar sakte."
  },
  mr: {
    complete_vendor_btn: "स्टॉल अर्ज सादर करा",
    complete_rider_onboard_btn: "भागीदार अर्ज सादर करा",
    rider_success_title: "अर्ज सादर केला — पुनरावलोकन प्रलंबित",
    rider_success_desc: "तुमचा डिलिव्हरी पार्टनर अर्ज ओळख आणि कागदपत्र पुनरावलोकनासाठी सादर केला गेला आहे. तुमचे खाते अद्याप सक्रिय नाही."
  },
  gu: {
    complete_vendor_btn: "સ્ટોલ અરજી સબમિટ કરો",
    complete_rider_onboard_btn: "ભાગીદાર અરજી સબમિટ કરો",
    rider_success_title: "અરજી સબમિટ થઈ — સમીક્ષા બાકી",
    rider_success_desc: "તમારી ડિલિવરી પાર્ટનર અરજી દસ્તાવેજ ચકાસણી માટે સબમિટ કરવામાં આવી છે. મંજૂરી ન મળે ત્યાં સુધી તમારું એકાઉન્ટ સક્રિય નથી."
  },
  ta: {
    complete_vendor_btn: "ஸ்டால் விண்ணப்பத்தை சமர்ப்பிக்கவும்",
    complete_rider_onboard_btn: "பங்குதாரர் விண்ணப்பத்தை சமர்ப்பிக்கவும்",
    rider_success_title: "விண்ணப்பம் சமர்ப்பிக்கப்பட்டது — மதிப்பாய்வு நிலுவையில் உள்ளது",
    rider_success_desc: "உங்கள் டெலிவரி பார்ட்னர் விண்ணப்பம் சரிபார்ப்புக்கு சமர்ப்பிக்கப்பட்டுள்ளது. ஒப்புதல் கிடைக்கும் வரை உங்கள் கணக்கு செயலில் இல்லை."
  },
  te: {
    complete_vendor_btn: "స్టాల్ దరఖాస్తును సమర్పించండి",
    complete_rider_onboard_btn: "భాగస్వామి దరఖాస్తును సమర్పించండి",
    rider_success_title: "దరఖాస్తు సమర్పించబడింది — సమీక్ష పెండింగ్‌లో ఉంది",
    rider_success_desc: "మీ డెలివరీ భాగస్వామి దరఖాస్తు ధృవీకరణ కోసం సమర్పించబడింది. ఆమోదం పొందే వరకు మీ ఖాతా యాక్టివ్‌గా ఉండదు."
  },
  kn: {
    complete_vendor_btn: "ಸ್ಟಾಲ್ ಅರ್ಜಿಯನ್ನು ಸಲ್ಲಿಸಿ",
    complete_rider_onboard_btn: "ಪಾಲುದಾರ ಅರ್ಜಿಯನ್ನು ಸಲ್ಲಿಸಿ",
    rider_success_title: "ಅರ್ಜಿ ಸಲ್ಲಿಸಲಾಗಿದೆ — ಪರಿಶೀಲನೆ ಬಾಕಿ ಇದೆ",
    rider_success_desc: "ನಿಮ್ಮ ವಿತರಣಾ ಪಾಲುದಾರ ಅರ್ಜಿಯನ್ನು ಪರಿಶೀಲನೆಗಾಗಿ ಸಲ್ಲಿಸಲಾಗಿದೆ. ಅನುಮೋದನೆ ದೊರೆಯುವವರೆಗೆ ನಿಮ್ಮ ಖಾತೆಯು ಸಕ್ರಿಯವಾಗಿರುವುದಿಲ್ಲ."
  },
  bn: {
    complete_vendor_btn: "স্টল আবেদন জমা দিন",
    complete_rider_onboard_btn: "পার্টনার আবেদন জমা দিন",
    rider_success_title: "আবেদন জমা হয়েছে — পর্যালোচনা মুলতুবি",
    rider_success_desc: "আপনার ডেলিভারি পার্টনার আবেদন পর্যালোচনার জন্য জমা দেওয়া হয়েছে। অনুমোদন না পাওয়া পর্যন্ত অ্যাকাউন্ট সক্রিয় নয়।"
  },
  ml: {
    complete_vendor_btn: "സ്റ്റാൾ അപേക്ഷ സമർപ്പിക്കുക",
    complete_rider_onboard_btn: "പാർട്ണർ അപേക്ഷ സമർപ്പിക്കുക",
    rider_success_title: "അപേക്ഷ സമർപ്പിച്ചു — അവലോകനം ബാക്കി",
    rider_success_desc: "നിങ്ങളുടെ ഡെലിവറി പാർട്ണർ അപേക്ഷ പരിശോധനയ്ക്കായി സമർപ്പിച്ചു. അംഗീകാരം ലഭിക്കുന്നത് വരെ അക്കൗണ്ട് സജീവമല്ല."
  },
  pa: {
    complete_vendor_btn: "ਸਟਾਲ ਅਰਜ਼ੀ ਜਮ੍ਹਾਂ ਕਰੋ",
    complete_rider_onboard_btn: "ਸਾਂਝੇਦਾਰ ਅਰਜ਼ੀ ਜਮ੍ਹਾਂ ਕਰੋ",
    rider_success_title: "ਅਰਜ਼ੀ ਜਮ੍ਹਾਂ ਹੋ ਗਈ — ਸਮੀਖਿਆ ਬਾਕੀ",
    rider_success_desc: "ਤੁਹਾਡੀ ਡਿਲਿਵਰੀ ਪਾਰਟਨਰ ਅਰਜ਼ੀ ਸਮੀਖਿਆ ਲਈ ਜਮ੍ਹਾਂ ਕਰ ਦਿੱਤੀ ਗਈ ਹੈ। ਮਨਜ਼ੂਰੀ ਮਿਲਣ ਤੱਕ ਖਾਤਾ ਸਰਗਰਮ ਨਹੀਂ ਹੈ।"
  },
  od: {
    complete_vendor_btn: "ଷ୍ଟଲ୍ ଆବେଦନ ଦାଖଲ କରନ୍ତୁ",
    complete_rider_onboard_btn: "ପାର୍ଟନର ଆବେଦନ ଦାଖଲ କରନ୍ତୁ",
    rider_success_title: "ଆବେଦନ ଦାଖଲ ହୋଇଛି — ସମୀକ୍ଷା ବାକି ଅଛି",
    rider_success_desc: "ଆପଣଙ୍କ ଡେଲିଭରୀ ପାର୍ଟନର ଆବେଦନ ଯାଞ୍ଚ ପାଇଁ ଦାଖଲ ହୋଇଛି। ଅନୁମୋଦନ ନମିଳିବା ପର୍ଯ୍ୟନ୍ତ ଖାତା ସକ୍ରିୟ ନୁହେଁ।"
  }
};

let i18nContent = fs.readFileSync('public/i18n.js', 'utf8');

for (const [lang, dict] of Object.entries(updates)) {
  for (const [key, val] of Object.entries(dict)) {
    // Regex matching `"key": "..."` within lang section
    // Or simpler: replace specifically
    const escapedVal = JSON.stringify(val);
    const regex = new RegExp(`("${key}"\\s*:\\s*)"(?:[^"\\\\]|\\\\.)*"`, 'g');
    // We want to be language-aware or replace all occurrences where appropriate
  }
}

// Since I18N_DICTIONARY is a plain object in JS, let's parse or rewrite cleanly
// Let's load the dictionary using eval in node
global.localStorage = { getItem: () => 'en', setItem: () => {} };
global.window = { addEventListener: () => {}, dispatchEvent: () => {} };
global.document = { querySelectorAll: () => [], addEventListener: () => {} };

eval(i18nContent.replace(/const I18N_/g, 'global.I18N_'));

for (const [lang, dict] of Object.entries(updates)) {
  if (global.I18N_DICTIONARY[lang]) {
    for (const [k, v] of Object.entries(dict)) {
      global.I18N_DICTIONARY[lang][k] = v;
    }
  }
}

// Rebuild public/i18n.js keeping helper functions
const prefix = `// ThelaExpress - Comprehensive Multi-Language Localization Engine (i18n)
// Supports 12 Indian Languages: English, Hindi, Hinglish, Marathi, Gujarati, Tamil, Telugu, Kannada, Bengali, Malayalam, Punjabi, Odia

const I18N_LANGUAGES = ${JSON.stringify(global.I18N_LANGUAGES, null, 2)};

const I18N_DICTIONARY = ${JSON.stringify(global.I18N_DICTIONARY, null, 2)};

`;

// Extract functions part from original file (from function getCurrentLanguage)
const fnIndex = i18nContent.indexOf('function getCurrentLanguage');
const helperFunctions = i18nContent.slice(fnIndex);

fs.writeFileSync('public/i18n.js', prefix + helperFunctions, 'utf8');
console.log('Successfully updated public/i18n.js with review-pending localization across all 12 languages.');
