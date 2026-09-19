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

if (errors.length > 0) {
  console.log('Remaining matches:');
  errors.forEach(e => console.log(e));
} else {
  console.log('DEMO DATA AUDIT PASSED! Zero demo data or location leaks found in public/ and server/src/.');
}
