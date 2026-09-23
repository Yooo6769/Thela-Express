// scratch/fix_search_tags.js
const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'public', 'index.html');
let html = fs.readFileSync(htmlPath, 'utf8');

html = html.replace(
  '<div class="absolute bottom-2.5 right-4 flex items-center space-x-1.5 z-20">',
  '<div id="carouselDots" class="absolute bottom-2.5 right-4 flex items-center space-x-1.5 z-20">'
);

fs.writeFileSync(htmlPath, html, 'utf8');
console.log('✓ Successfully added id="carouselDots" to index.html');
