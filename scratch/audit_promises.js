const fs = require('fs');
const path = require('path');

const repoDir = 'C:\\Users\\anura\\.gemini\\antigravity\\scratch\\thela-express-prod';
let errors = [];

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  lines.forEach((l, idx) => {
    // Check for 14 or 15 minute claims
    if (/(14|15)\s*(min|minute|मिनिट|મિનિટ|நிமிட|నిమిష|ನಿಮಿಷ|মিনিট|മിനിറ്റ്|ਮਿੰਟ|ମିନିଟ)/i.test(l)) {
      errors.push(`${filePath}:${idx+1}: ${l.trim()}`);
    }
    if (/within\s*15/i.test(l) || /in\s*14\s*mins?/i.test(l) || /in\s*15\s*mins?/i.test(l)) {
      errors.push(`${filePath}:${idx+1}: ${l.trim()}`);
    }
    if (/\|\s*14\s*mins/i.test(l) || /\|\s*15\s*mins/i.test(l)) {
      errors.push(`${filePath}:${idx+1}: ${l.trim()}`);
    }
  });
}

function scan(dir) {
  const list = fs.readdirSync(dir);
  for (const item of list) {
    const p = path.join(dir, item);
    if (item === 'node_modules' || item === '.git') continue;
    const stat = fs.statSync(p);
    if (stat.isDirectory()) {
      scan(p);
    } else if (/\.(html|js)$/.test(item)) {
      checkFile(p);
    }
  }
}

scan(path.join(repoDir, 'public'));
scan(path.join(repoDir, 'server'));

if (errors.length > 0) {
  console.error('Found potential violations:');
  errors.forEach(e => console.error(e));
  process.exit(1);
} else {
  console.log('AUDIT PASSED! Zero 14-min or 15-min delivery promises found in public/ and server/.');
}
