import fs from 'fs';
import path from 'path';
import https from 'https';

const GITHUB_DOWNLOAD_URL = 'https://github.com/stumblrs/Nig_Geojson/releases/download/nigerian_settlements_names.geojson/nigerian_settlements_names.geojson';
const TEMP_FILE = path.resolve('temp_raw_settlements.geojson');
const OUTPUT_FILE = path.resolve('apps/web/public/data/settlements_13_states.json');

const TARGET_13_STATES = new Set([
  'Abia', 'Anambra', 'Ebonyi', 'Enugu', 'Imo',
  'Delta', 'Rivers', 'Benue', 'Kogi', 'Edo',
  'Cross River', 'Akwa Ibom', 'Bayelsa'
]);

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    console.log(`Fetching from: ${url}`);
    
    function getUrl(currentUrl) {
      https.get(currentUrl, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          console.log(`Following redirect (${res.statusCode}) to: ${res.headers.location.slice(0, 100)}...`);
          return getUrl(res.headers.location);
        }
        if (res.statusCode !== 200) {
          return reject(new Error(`Download failed with HTTP status ${res.statusCode}`));
        }

        const totalBytes = parseInt(res.headers['content-length'] || '0', 10);
        let downloadedBytes = 0;
        let lastReport = Date.now();

        const fileStream = fs.createWriteStream(destPath);
        res.on('data', (chunk) => {
          downloadedBytes += chunk.length;
          if (Date.now() - lastReport > 2000) {
            const pct = totalBytes > 0 ? ` (${((downloadedBytes / totalBytes) * 100).toFixed(1)}%)` : '';
            console.log(`Downloaded ${(downloadedBytes / 1024 / 1024).toFixed(1)} MB${pct}...`);
            lastReport = Date.now();
          }
        });

        res.pipe(fileStream);

        fileStream.on('finish', () => {
          fileStream.close();
          console.log(`Download complete: ${(downloadedBytes / 1024 / 1024).toFixed(1)} MB saved to temporary file.`);
          resolve();
        });

        fileStream.on('error', (err) => {
          fs.unlink(destPath, () => {});
          reject(err);
        });
      }).on('error', reject);
    }

    getUrl(url);
  });
}

async function run() {
  try {
    const startTime = Date.now();
    console.log('=== STARTING 13-STATE SETTLEMENTS EXTRACTION ===');
    
    // 1. Download raw file from GitHub Releases to temp file
    await downloadFile(GITHUB_DOWNLOAD_URL, TEMP_FILE);

    // 2. Parse and filter strictly the 13 focus states
    console.log('Reading and parsing downloaded GeoJSON...');
    const rawContent = fs.readFileSync(TEMP_FILE, 'utf8');
    const geojson = JSON.parse(rawContent);

    console.log(`Total national features in raw file: ${geojson.features.length}`);

    const extractedSettlements = [];
    const stateCounts = {};

    for (const f of geojson.features) {
      const state = (f.properties?.statename || '').trim();
      if (!TARGET_13_STATES.has(state)) continue;

      stateCounts[state] = (stateCounts[state] || 0) + 1;

      // Extract coordinates clamped to 5 decimal places (~1.1 meter real-world accuracy)
      const coords = f.geometry?.coordinates;
      if (!coords || coords.length < 2) continue;

      const lng = Number(coords[0].toFixed(5));
      const lat = Number(coords[1].toFixed(5));

      extractedSettlements.push({
        id: f.properties?.globalid || String(f.properties?.FID || extractedSettlements.length + 1),
        name: (f.properties?.set_name || '').trim(),
        altName: (f.properties?.set_altnam || '').trim() || undefined,
        ward: (f.properties?.wardname || '').trim(),
        wardCode: (f.properties?.wardcode || '').trim(),
        lga: (f.properties?.lganame || '').trim(),
        lgaCode: (f.properties?.lgacode || '').trim(),
        state: state,
        stateCode: (f.properties?.statecode || '').trim(),
        coords: [lng, lat]
      });
    }

    console.log(`Filtered target settlements: ${extractedSettlements.length}`);
    console.log('State distribution:');
    console.log(stateCounts);

    // 3. Save lean output asset
    fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
    const jsonOutput = JSON.stringify(extractedSettlements);
    fs.writeFileSync(OUTPUT_FILE, jsonOutput, 'utf8');

    const outputSizeMb = (Buffer.byteLength(jsonOutput) / 1024 / 1024).toFixed(2);
    console.log(`Successfully wrote ${OUTPUT_FILE} (${outputSizeMb} MB)`);

    // 4. Clean up temporary file
    if (fs.existsSync(TEMP_FILE)) {
      fs.unlinkSync(TEMP_FILE);
      console.log('Temporary raw file deleted. Zero local storage bloat maintained!');
    }

    console.log(`Ingestion completed in ${((Date.now() - startTime) / 1000).toFixed(1)}s.`);
  } catch (err) {
    console.error('Extraction failed:', err);
    if (fs.existsSync(TEMP_FILE)) {
      try { fs.unlinkSync(TEMP_FILE); } catch (_) {}
    }
    process.exit(1);
  }
}

run();
