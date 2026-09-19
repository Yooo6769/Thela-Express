const fs = require('fs');
const path = require('path');

const repoDir = 'C:\\Users\\anura\\.gemini\\antigravity\\scratch\\thela-express-prod';
let errors = [];

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  lines.forEach((l, idx) => {
    // Check for demo data visible to users
    if (/Indiranagar/i.test(l)) {
      errors.push(filePath + ':' + (idx+1) + ': [Indiranagar] ' + l.trim());
    }
    if (/Bengaluru|Bangalore/i.test(l)) {
      errors.push(filePath + ':' + (idx+1) + ': [Bengaluru] ' + l.trim());
    }
    if (/4829/i.test(l)) {
      errors.push(filePath + ':' + (idx+1) + ': [4829] ' + l.trim());
    }
    if (/Demo OTP/i.test(l) || /Try 1234/i.test(l)) {
      errors.push(filePath + ':' + (idx+1) + ': [Demo OTP] ' + l.trim());
    }
    if (/>LIVE<\/span>/i.test(l) && filePath.endsWith('index.html')) {
      errors.push(filePath + ':' + (idx+1) + ': [LIVE Badge in Header] ' + l.trim());
    }
    if (/Rahul Sharma|Ramesh Sharma|Sharma Ji Chaat|Suresh Gupta|Sanjay Rider/i.test(l)) {
      errors.push(filePath + ':' + (idx+1) + ': [Fake Name Leak] ' + l.trim());
    }
  });
}

function scan(dir) {
  const list = fs.readdirSync(dir);
  for (const item of list) {
    const p = path.join(dir, item);
    if (item === 'node_modules' || item === '.git' || item === 'data') continue;
    const stat = fs.statSync(p);
    if (stat.isDirectory()) {
      scan(p);
    } else if (/\.(html|js)$/.test(item)) {
      checkFile(p);
    }
  }
}

scan(path.join(repoDir, 'public'));
scan(path.join(repoDir, 'server', 'src'));

// Verify server/data/thela.db.json has 0 demo stalls, 0 demo riders, 0 demo orders
const dbFilePath = path.join(repoDir, 'server', 'data', 'thela.db.json');
if (fs.existsSync(dbFilePath)) {
  const dbData = JSON.parse(fs.readFileSync(dbFilePath, 'utf8'));
  if (dbData.stalls && dbData.stalls.length > 0) {
    errors.push('thela.db.json has ' + dbData.stalls.length + ' demo stalls (must be 0)');
  }
  if (dbData.riders && dbData.riders.length > 0) {
    errors.push('thela.db.json has ' + dbData.riders.length + ' demo riders (must be 0)');
  }
  if (dbData.orders && dbData.orders.length > 0) {
    errors.push('thela.db.json has ' + dbData.orders.length + ' demo orders (must be 0)');
  }
}

if (errors.length > 0) {
  console.log('Remaining matches:');
  errors.forEach(e => console.log(e));
  process.exit(1);
} else {
  console.log('DEMO DATA AUDIT PASSED! Zero demo data, fake names, LIVE badge, or mock vendors found in public/, server/src/ and thela.db.json.');
}
