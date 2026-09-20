// Script to generate styled HTML, TXT, and Markdown versions of the Version History document
// and copy them to all standard user locations (OneDrive Desktop, Local Desktop, Downloads).

const fs = require('fs');
const path = require('path');

const srcMd = path.join(__dirname, '..', 'VERSION_HISTORY.md');
if (!fs.existsSync(srcMd)) {
  console.error('Source VERSION_HISTORY.md not found at:', srcMd);
  process.exit(1);
}

const content = fs.readFileSync(srcMd, 'utf8');

function mdToHtml(md) {
  let html = md
    .replace(/^### (.*$)/gim, '<h3 style="color:#ea580c;margin-top:24px;margin-bottom:8px;font-size:1.3rem;border-bottom:1px solid #fed7aa;padding-bottom:4px;">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 style="color:#c2410c;margin-top:32px;margin-bottom:12px;font-size:1.6rem;border-bottom:2px solid #f97316;padding-bottom:6px;">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 style="color:#9a3412;margin-bottom:16px;font-size:2.2rem;border-bottom:3px solid #ea580c;padding-bottom:10px;">$1</h1>')
    .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/gim, '<em>$1</em>')
    .replace(/`([^`]+)`/gim, '<code style="background:#ffedd5;color:#9a3412;padding:2px 6px;border-radius:4px;font-family:monospace;font-size:0.9em;">$1</code>');

  const lines = html.split('\n');
  let inTable = false;
  let tableHtml = '';
  let inList = false;
  let finalLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('|') && line.endsWith('|')) {
      if (inList) {
        finalLines.push('</ul>');
        inList = false;
      }
      if (line.includes('---')) continue; // table header separator
      const cells = line.split('|').filter((c, idx, arr) => idx > 0 && idx < arr.length - 1).map(c => c.trim());
      if (!inTable) {
        inTable = true;
        tableHtml = '<div style="overflow-x:auto;margin:20px 0;"><table style="width:100%;border-collapse:collapse;font-size:0.92rem;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);"><thead><tr style="background:#ffedd5;color:#9a3412;">';
        cells.forEach(c => { tableHtml += '<th style="border:1px solid #fed7aa;padding:10px 12px;text-align:left;font-weight:700;">' + c + '</th>'; });
        tableHtml += '</tr></thead><tbody>';
      } else {
        tableHtml += '<tr style="border-bottom:1px solid #f3f4f6;">';
        cells.forEach(c => { tableHtml += '<td style="border:1px solid #fed7aa;padding:8px 12px;">' + c + '</td>'; });
        tableHtml += '</tr>';
      }
    } else {
      if (inTable) {
        inTable = false;
        tableHtml += '</tbody></table></div>';
        finalLines.push(tableHtml);
      }
      if (line.startsWith('- ')) {
        if (!inList) {
          finalLines.push('<ul style="padding-left:24px;margin-bottom:16px;">');
          inList = true;
        }
        finalLines.push('<li style="margin-bottom:6px;">' + line.substring(2) + '</li>');
      } else if (line.startsWith('---')) {
        if (inList) { finalLines.push('</ul>'); inList = false; }
        finalLines.push('<hr style="border:0;border-top:1px solid #fed7aa;margin:32px 0;"/>');
      } else if (line.length > 0 && !line.startsWith('<h')) {
        if (inList) { finalLines.push('</ul>'); inList = false; }
        finalLines.push('<p style="margin-bottom:12px;line-height:1.65;color:#374151;">' + line + '</p>');
      } else {
        if (inList && line.length === 0) { finalLines.push('</ul>'); inList = false; }
        finalLines.push(line);
      }
    }
  }
  if (inTable) {
    tableHtml += '</tbody></table></div>';
    finalLines.push(tableHtml);
  }
  if (inList) {
    finalLines.push('</ul>');
  }

  return finalLines.join('\n');
}

const styledHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Thela Express — Version History & Changelog</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: #1f2937;
      background: #fffaf0;
      margin: 0;
      padding: 32px 16px;
    }
    .header-banner {
      background: linear-gradient(135deg, #ea580c, #c2410c);
      color: white;
      padding: 24px 32px;
      border-radius: 12px 12px 0 0;
      margin: -48px -48px 32px -48px;
    }
    .header-banner h1 {
      color: white !important;
      margin: 0 0 8px 0 !important;
      border: 0 !important;
      font-size: 2rem !important;
    }
    .header-banner p {
      margin: 0;
      color: #ffedd5 !important;
      font-size: 1rem;
    }
    .container {
      max-width: 980px;
      margin: 0 auto;
      background: #ffffff;
      padding: 48px;
      border-radius: 16px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.03);
      border: 1px solid #fed7aa;
    }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      background: #ea580c;
      color: white;
      border-radius: 9999px;
      font-weight: 600;
      font-size: 0.85rem;
    }
    a {
      color: #ea580c;
      text-decoration: none;
      font-weight: 500;
    }
    a:hover {
      text-decoration: underline;
    }
    @media print {
      body { background: #fff; padding: 0; }
      .container { border: 0; box-shadow: none; padding: 0; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header-banner">
      <h1><i class="fa-solid fa-store" style="margin-right:10px;"></i>Thela Express</h1>
      <p>App Version History & Architectural Changelog (v1.0.0 → v2.0.3)</p>
    </div>
    ${mdToHtml(content)}
  </div>
</body>
</html>`;

const destinations = [
  'C:\\Users\\anura\\OneDrive\\Desktop\\ThelaExpress_Version_History.html',
  'C:\\Users\\anura\\OneDrive\\Desktop\\ThelaExpress_Version_History.md',
  'C:\\Users\\anura\\OneDrive\\Desktop\\ThelaExpress_Version_History.txt',
  'C:\\Users\\anura\\Desktop\\ThelaExpress_Version_History.html',
  'C:\\Users\\anura\\Desktop\\ThelaExpress_Version_History.md',
  'C:\\Users\\anura\\Desktop\\ThelaExpress_Version_History.txt',
  'C:\\Users\\anura\\Downloads\\ThelaExpress_Version_History.html',
  'C:\\Users\\anura\\Downloads\\ThelaExpress_Version_History.txt'
];

let created = 0;
destinations.forEach(dest => {
  try {
    const dir = path.dirname(dest);
    if (fs.existsSync(dir)) {
      if (dest.endsWith('.html')) {
        fs.writeFileSync(dest, styledHtml, 'utf8');
      } else {
        fs.writeFileSync(dest, content, 'utf8');
      }
      console.log('✅ Created: ' + dest);
      created++;
    }
  } catch(e) {
    console.error('❌ Error writing to ' + dest + ': ' + e.message);
  }
});

console.log(`\nSuccessfully exported to ${created} locations!`);
