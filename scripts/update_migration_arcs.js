const fs = require('fs');

const mPath = './apps/web/public/data/migration_arcs.geojson';
const m = JSON.parse(fs.readFileSync(mPath, 'utf8'));

// Helper to generate a curved great-circle / bezier arc between two points
function generateArcCoords(start, end, numPoints = 25) {
  const coords = [];
  const midX = (start[0] + end[0]) / 2;
  const midY = (start[1] + end[1]) / 2;
  // Perpendicular curve offset
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const offsetDistance = 0.18; // curve magnitude
  const ctrlX = midX - dy * offsetDistance;
  const ctrlY = midY + dx * offsetDistance;

  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;
    // Quadratic Bezier curve
    const x = (1 - t) * (1 - t) * start[0] + 2 * (1 - t) * t * ctrlX + t * t * end[0];
    const y = (1 - t) * (1 - t) * start[1] + 2 * (1 - t) * t * ctrlY + t * t * end[1];
    coords.push([parseFloat(x.toFixed(5)), parseFloat(y.toFixed(5))]);
  }
  return coords;
}

const newArcs = [
  {
    id: 'opobo-jaja-founding',
    name: 'King Jaja Opobo Founding Corridor',
    originName: 'Amaigbo (Heartland Hearth)',
    destinationName: 'Opobo Town (Imo Estuary)',
    origin: [7.0851, 5.6724],
    destination: [7.5412, 4.5189],
    era: '1869–1870 AD',
    description: 'Founding of the Opobo Kingdom by King Jaja of Amaigbo, creating an Igbo mercantile and court power on the Atlantic.',
    color: '#f59e0b',
  },
  {
    id: 'aboh-niger-kingdom',
    name: 'Aboh Riverine Naval Empire & Lower Niger Corridors',
    originName: 'Aboh (River Niger West Bank)',
    destinationName: 'Ndoni & Upper Delta Waterways',
    origin: [6.5412, 5.5489],
    destination: [6.7214, 5.3891],
    era: '17th–19th Century',
    description: 'Canoe flotilla naval supremacy along the lower Niger, controlling trade tariffs from Asaba to the Nun/Forcados estuaries.',
    color: '#06b6d4',
  },
  {
    id: 'aro-benue-middlebelt',
    name: 'Arochukwu to Benue Valley Commercial Highway',
    originName: 'Arochukwu (Chukwu Ibin Ukpabi)',
    destinationName: 'Idoma & Tiv Borderlands (Otukpo/Wukari)',
    origin: [7.9122, 5.3854],
    destination: [8.1345, 7.1892],
    era: '18th–19th Century',
    description: 'The northernmost mercantile highway of the Aro Confederacy, linking Cross River trade rings to Benue salt mines.',
    color: '#f59e0b',
  },
];

let addedCount = 0;
for (const arc of newArcs) {
  const exists = m.features.some(f => f.properties && f.properties.id === arc.id);
  if (!exists) {
    // Add LineString feature
    m.features.push({
      type: 'Feature',
      id: arc.id,
      properties: {
        id: arc.id,
        name: arc.name,
        originName: arc.originName,
        destinationName: arc.destinationName,
        era: arc.era,
        description: arc.description,
        color: arc.color,
      },
      geometry: {
        type: 'LineString',
        coordinates: generateArcCoords(arc.origin, arc.destination),
      },
    });

    // Add destination point feature
    m.features.push({
      type: 'Feature',
      properties: {
        id: arc.id,
        name: arc.destinationName,
        originName: arc.originName,
        destinationName: arc.destinationName,
        era: arc.era,
        description: arc.description,
        color: arc.color,
      },
      geometry: {
        type: 'Point',
        coordinates: arc.destination,
      },
    });

    addedCount++;
  }
}

fs.writeFileSync(mPath, JSON.stringify(m, null, 2));
console.log(`Successfully added ${addedCount} migration arcs to migration_arcs.geojson`);
