const fs = require('fs');
const path = require('path');

const lgasPath = path.resolve(__dirname, 'apps/web/public/data/lgas.geojson');
const settlementsPath = path.resolve(__dirname, 'apps/web/public/data/regional_settlements.geojson');
const landmarksPath = path.resolve(__dirname, 'apps/web/public/data/cultural_landmarks.geojson');
const outputPath = path.resolve(__dirname, 'apps/web/public/data/search_index.json');

const lgas = JSON.parse(fs.readFileSync(lgasPath, 'utf8'));
const settlements = JSON.parse(fs.readFileSync(settlementsPath, 'utf8'));
const landmarks = JSON.parse(fs.readFileSync(landmarksPath, 'utf8'));

const bbox = (coords) => {
  let minX = 180, minY = 90, maxX = -180, maxY = -90;
  const flatten = (arr) => {
    if (typeof arr[0] === 'number') {
      minX = Math.min(minX, arr[0]);
      maxX = Math.max(maxX, arr[0]);
      minY = Math.min(minY, arr[1]);
      maxY = Math.max(maxY, arr[1]);
    } else {
      arr.forEach(flatten);
    }
  };
  flatten(coords);
  return [+((minX + maxX) / 2).toFixed(5), +((minY + maxY) / 2).toFixed(5)];
};

const items = [];

// 1. LGAs (774)
for (const f of lgas.features) {
  const p = f.properties;
  items.push({
    id: 'lga-' + p.admin2Pcod,
    type: 'lga',
    name: p.admin2Name,
    lgaName: p.admin2Name,
    lgaCode: p.admin2Pcod,
    stateName: p.admin1Name,
    stateCode: p.admin1Pcod,
    center: bbox(f.geometry.coordinates)
  });
}

// 2. Settlements (cities, towns, villages, hamlets)
for (const f of settlements.features) {
  const p = f.properties;
  if (!p.name) continue;
  items.push({
    id: p.id || ('set-' + Math.random().toString(36).slice(2)),
    type: p.place || 'settlement',
    name: p.name,
    lgaName: p.adm2_name,
    lgaCode: p.adm2_pcode,
    stateName: p.adm1_name,
    stateCode: p.adm1_pcode,
    center: f.geometry.type === 'Point' ? f.geometry.coordinates : bbox(f.geometry.coordinates)
  });
}

// 3. Cultural Landmarks (markets, town halls, palaces)
for (const f of landmarks.features) {
  const p = f.properties;
  if (!p.name) continue;
  const isMarket = /market|eke|orie|afor|nkwo/i.test(p.name) || p.amenity === 'marketplace';
  items.push({
    id: p.id || ('lm-' + Math.random().toString(36).slice(2)),
    type: isMarket ? 'market' : (p.amenity || 'landmark'),
    name: p.name,
    lgaName: p.adm2_name,
    lgaCode: p.adm2_pcode,
    stateName: p.adm1_name,
    stateCode: p.adm1_pcode,
    center: f.geometry.type === 'Point' ? f.geometry.coordinates : bbox(f.geometry.coordinates)
  });
}

// 4. Communities from communities_store.json
const commStorePath = path.resolve(__dirname, 'apps/web/public/data/communities_store.json');
if (fs.existsSync(commStorePath)) {
  const comms = JSON.parse(fs.readFileSync(commStorePath, 'utf8'));
  for (const c of comms) {
    if (!c.name) continue;
    items.push({
      id: c.id,
      type: 'community',
      name: c.name,
      lgaName: c.lgaName,
      lgaCode: c.lgaId,
      stateName: c.stateName,
      stateCode: c.stateId,
      center: [c.longitude, c.latitude]
    });
  }
}

fs.writeFileSync(outputPath, JSON.stringify(items), 'utf8');
console.log('Indexed items:', items.length);
