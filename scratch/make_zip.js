const cp = require('child_process');
const fs = require('fs');
const path = require('path');

const src = 'C:\\Users\\anura\\.gemini\\antigravity\\scratch\\thela-express-prod';
const targets = [
  'C:\\Users\\anura\\OneDrive\\Desktop\\ThelaExpress-SourceCode.zip',
  'C:\\Users\\anura\\Desktop\\ThelaExpress-SourceCode.zip',
  'C:\\Users\\anura\\Downloads\\ThelaExpress-SourceCode.zip'
];

const tempDir = path.join(process.env.TEMP, 'thela_zip_temp');
if (fs.existsSync(tempDir)) {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
fs.mkdirSync(tempDir, { recursive: true });

console.log('Copying source files to temporary staging folder...');
try {
  cp.execSync(`robocopy "${src}" "${tempDir}" /E /XD node_modules .git /XF cloudflared.exe *.log`, { stdio: 'ignore' });
} catch (e) {
  // Robocopy returns exit code 1 on success
}

const primaryZip = targets[0];
if (fs.existsSync(primaryZip)) {
  fs.unlinkSync(primaryZip);
}

console.log('Compressing into ZIP archive...');
const psCmd = `Compress-Archive -Path '${tempDir}\\*' -DestinationPath '${primaryZip}' -Force`;
cp.execSync(`powershell -NoProfile -Command "${psCmd}"`, { stdio: 'inherit' });

console.log('Duplicating to Desktop & Downloads folders...');
for (let i = 1; i < targets.length; i++) {
  try {
    fs.copyFileSync(primaryZip, targets[i]);
  } catch (err) {
    console.warn(`Could not copy to ${targets[i]}: ${err.message}`);
  }
}

try {
  fs.rmSync(tempDir, { recursive: true, force: true });
} catch (e) {}

console.log('\n=== ZIP CREATION COMPLETE ===');
targets.forEach(t => {
  if (fs.existsSync(t)) {
    const stat = fs.statSync(t);
    console.log(`FOUND: ${t} (${(stat.size / 1024 / 1024).toFixed(2)} MB)`);
  } else {
    console.log(`NOT FOUND: ${t}`);
  }
});
