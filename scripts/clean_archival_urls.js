const fs = require('fs');

const path = './apps/web/lib/archival.ts';
let code = fs.readFileSync(path, 'utf8');

// The verified URLs that actually return 200/202:
// - Willink Commission: https://archive.org/details/reportofcommissi00grea
// - Olaudah Equiano: https://www.gutenberg.org/ebooks/15399
// - Laird & Oldfield: https://archive.org/details/narrativeanexpe00oldfgoog
// - Arthur Glyn Leonard: https://archive.org/details/lowernigerandit00leongoog
// - Ekumeku Despatches: https://discovery.nationalarchives.gov.uk/details/r/C3725547
// - Opobo Treaties: https://discovery.nationalarchives.gov.uk/details/r/C1704253
// - Aro Expedition (Kew CO 520/10): https://discovery.nationalarchives.gov.uk/details/r/C1014164

// List of all 404 fake or dead urls to remove completely:
const badUrls = [
  'https://archive.org/details/nigeria-national-archives-finding-aids',
  'https://archive.org/details/peoplesofsouther02talbuoft',
  'https://archive.org/details/lawauthorityinna00meek',
  'https://archive.org/details/aroexpedition1902',
  'https://archive.org/details/nigeria-census-1952-1953',
  'https://archive.org/details/igboukwu-thurstan-shaw',
  'https://archive.org/details/reportofcommissi00nige',
  'https://archive.org/details/nigeria-colonial-gazettes'
];

badUrls.forEach(badUrl => {
  // Regex to remove the digitalUrl line matching this URL
  const reg = new RegExp(`\\s*digitalUrl:\\s*['"]${badUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"],?`, 'g');
  code = code.replace(reg, '');
});

// Update Aro Expedition to point to the live National Archives Kew catalog for CO 520/10
code = code.replace(
  /id:\s*'doc-aro-expedition-1901',[\s\S]*?digitalUrl:\s*'.*?',/,
  (match) => match.replace(/digitalUrl:\s*'.*?'/, "digitalUrl: 'https://discovery.nationalarchives.gov.uk/details/r/C1014164'")
);

fs.writeFileSync(path, code);
console.log('Cleaned archival.ts of dead URLs.');
