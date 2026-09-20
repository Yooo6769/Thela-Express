const cp = require('child_process');
const fs = require('fs');
const path = require('path');

const src = 'C:\\Users\\anura\\.gemini\\antigravity\\scratch\\thela-express-prod';
const pkgPath = path.join(src, 'package.json');
let version = '2.0.0';
try {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  if (pkg.version) version = pkg.version;
} catch (e) {}

const versionZipName = `ThelaExpress-v${version}.zip`;
const latestZipName = 'ThelaExpress-SourceCode.zip';

const outputDirs = [
  'C:\\Users\\anura\\OneDrive\\Desktop',
  'C:\\Users\\anura\\Desktop',
  'C:\\Users\\anura\\Downloads'
];

const tempDir = path.join(process.env.TEMP, 'thela_zip_temp');
if (fs.existsSync(tempDir)) {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
fs.mkdirSync(tempDir, { recursive: true });

console.log(`Packaging ThelaExpress v${version}...`);
console.log('Copying source files to temporary staging folder...');
try {
  cp.execSync(`robocopy "${src}" "${tempDir}" /E /XD node_modules .git /XF cloudflared.exe *.log`, { stdio: 'ignore' });
} catch (e) {
  // Robocopy returns exit code 1 on success
}

const stagingZip = path.join(process.env.TEMP, latestZipName);
if (fs.existsSync(stagingZip)) {
  fs.unlinkSync(stagingZip);
}

console.log('Compressing into ZIP archive...');
const psCmd = `Compress-Archive -Path '${tempDir}\\*' -DestinationPath '${stagingZip}' -Force`;
cp.execSync(`powershell -NoProfile -Command "${psCmd}"`, { stdio: 'inherit' });

console.log('Distributing Latest and Version-Stamped ZIP files...');
outputDirs.forEach(dir => {
  if (fs.existsSync(dir)) {
    const latestDest = path.join(dir, latestZipName);
    const versionDest = path.join(dir, versionZipName);
    try {
      fs.copyFileSync(stagingZip, latestDest);
      fs.copyFileSync(stagingZip, versionDest);
      console.log(`✓ Copied to ${dir}: [${latestZipName}, ${versionZipName}]`);
    } catch (err) {
      console.warn(`Could not copy to ${dir}: ${err.message}`);
    }
  }
});

try {
  fs.rmSync(tempDir, { recursive: true, force: true });
  fs.unlinkSync(stagingZip);
} catch (e) {}

console.log('\n=== ZIP CREATION COMPLETE ===');
outputDirs.forEach(dir => {
  [latestZipName, versionZipName].forEach(name => {
    const p = path.join(dir, name);
    if (fs.existsSync(p)) {
      const stat = fs.statSync(p);
      console.log(`FOUND: ${p} (${(stat.size / 1024 / 1024).toFixed(2)} MB)`);
    }
  });
});
