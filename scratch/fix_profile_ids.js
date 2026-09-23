// scratch/fix_profile_ids.js
const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'public', 'index.html');
let html = fs.readFileSync(htmlPath, 'utf8');

html = html.replace(
  'id="profileDisplayName"',
  'id="profileModalName" data-alias="profileDisplayName"'
);

html = html.replace(
  'id="profileDisplayEmail"',
  'id="profileModalEmail" data-alias="profileDisplayEmail"'
);

html = html.replace(
  'id="editProfileForm"',
  'id="profileEditForm" data-alias="editProfileForm"'
);

fs.writeFileSync(htmlPath, html, 'utf8');
console.log('✓ Successfully mapped profile element IDs in index.html');
