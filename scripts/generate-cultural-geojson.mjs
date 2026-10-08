import fs from 'node:fs';
import path from 'node:path';

const ARCS = [
  {
    id: 'nri-hegemony',
    name: 'Nri Spiritual & Peace Diaspora',
    origin: { name: 'Nri (Ancestral Hearth)', coords: [7.0267, 6.1578] },
    destination: { name: 'Aguleri / Omambala', coords: [6.8865, 6.3421] },
    era: 'c. 900 AD – 1300 AD',
    description: 'Radiation of Ozo/Ichi titles, peace covenants, and sacred agriculture.',
    color: '#10b981',
  },
  {
    id: 'nri-igboukwu',
    name: 'Nri – Igbo-Ukwu Bronze Metallurgical Hearth',
    origin: { name: 'Nri', coords: [7.0267, 6.1578] },
    destination: { name: 'Igbo-Ukwu', coords: [7.0189, 6.0177] },
    era: '9th Century AD',
    description: 'Sophisticated lost-wax copper casting and sacred royal regalia.',
    color: '#059669',
  },
  {
    id: 'aro-arondizuogu',
    name: 'Arochukwu to Arondizuogu Settlement',
    origin: { name: 'Arochukwu', coords: [7.9122, 5.3854] },
    destination: { name: 'Arondizuogu (Imo State)', coords: [7.1432, 5.8643] },
    era: '18th Century (Mazi Izuogu Mgbokpo)',
    description: 'Establishment of the major Aro commercial and diaspora settlement in central Igboland.',
    color: '#f59e0b',
  },
  {
    id: 'aro-ndikelionwu',
    name: 'Arochukwu to Aro-Ndikelionwu',
    origin: { name: 'Arochukwu', coords: [7.9122, 5.3854] },
    destination: { name: 'Aro-Ndikelionwu (Anambra State)', coords: [7.1662, 6.0831] },
    era: 'Mid 18th Century',
    description: 'Founded by Mazi Ikelionwu along major regional trade axes.',
    color: '#d97706',
  },
  {
    id: 'ezechima-onitsha',
    name: 'Ezechima Migration to Onitsha (Ado N’Idu)',
    origin: { name: 'Igbanke / Western Borderlands', coords: [6.1245, 6.3214] },
    destination: { name: 'Onitsha (River Niger)', coords: [6.7865, 6.1498] },
    era: '16th Century (c. 1500s)',
    description: 'The eastward crossing of River Niger establishing Onitsha Ado and the Obi monarchy.',
    color: '#a855f7',
  },
  {
    id: 'ezechima-anioma',
    name: 'Ezechima Clan Town Foundations (Anioma)',
    origin: { name: 'Igbanke / Western Hearth', coords: [6.1245, 6.3214] },
    destination: { name: 'Issele-Uku / Ogwashi-Uku', coords: [6.4851, 6.3112] },
    era: '16th Century',
    description: 'Formation of Umuezechima monarchies (Issele-Uku, Onicha-Olona, Ezi, Obior).',
    color: '#8b5cf6',
  },
  {
    id: 'ikwerre-rumuokoro',
    name: 'Ikwerre Clan Lineage & Settlement Arc',
    origin: { name: 'Elele / Ogba Hearth', coords: [6.8184, 5.1054] },
    destination: { name: 'Port Harcourt / Diobu-Rumuokoro', coords: [6.9984, 4.8521] },
    era: 'Pre-Colonial Epoch',
    description: 'Upland clan movements across fertile agricultural ridges in the Niger Delta.',
    color: '#ec4899',
  },
];

function generateCurvedLine(start, end, curvature = 0.25, numPoints = 30) {
  const [x1, y1] = start;
  const [x2, y2] = end;

  // Midpoint with normal offset
  const dx = x2 - x1;
  const dy = y2 - y1;
  const mx = (x1 + x2) / 2 - dy * curvature;
  const my = (y1 + y2) / 2 + dx * curvature;

  const points = [];
  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;
    // Quadratic Bezier: B(t) = (1-t)^2 P0 + 2(1-t)t P1 + t^2 P2
    const bx = (1 - t) * (1 - t) * x1 + 2 * (1 - t) * t * mx + t * t * x2;
    const by = (1 - t) * (1 - t) * y1 + 2 * (1 - t) * t * my + t * t * y2;
    points.push([Number(bx.toFixed(5)), Number(by.toFixed(5))]);
  }
  return points;
}

// 1. Build migration arcs GeoJSON
const arcFeatures = ARCS.map((arc) => {
  const coordinates = generateCurvedLine(arc.origin.coords, arc.destination.coords);
  return {
    type: 'Feature',
    id: arc.id,
    properties: {
      id: arc.id,
      name: arc.name,
      originName: arc.origin.name,
      destinationName: arc.destination.name,
      era: arc.era,
      description: arc.description,
      color: arc.color,
    },
    geometry: {
      type: 'LineString',
      coordinates,
    },
  };
});

// Also add point markers for the origin and destination hubs
const hubFeatures = [];
const seenHubs = new Set();
for (const arc of ARCS) {
  for (const hub of [arc.origin, arc.destination]) {
    if (!seenHubs.has(hub.name)) {
      seenHubs.add(hub.name);
      hubFeatures.push({
        type: 'Feature',
        properties: {
          name: hub.name,
          color: arc.color,
        },
        geometry: {
          type: 'Point',
          coordinates: hub.coords,
        },
      });
    }
  }
}

const migrationArcsGeoJSON = {
  type: 'FeatureCollection',
  features: [...arcFeatures, ...hubFeatures],
};

// 2. Build Dialect Zones GeoJSON with center anchor points and stylized polygons
const DIALECT_ZONES = [
  {
    id: 'waawa',
    name: 'Waawa / Northern Igbo',
    igboName: 'Olundi Waawa',
    color: '#38bdf8',
    center: [7.45, 6.75],
    polygon: [
      [7.15, 6.35], [7.10, 6.85], [7.35, 7.15], [7.75, 7.15], [7.90, 6.70], [7.65, 6.25], [7.25, 6.20], [7.15, 6.35]
    ],
  },
  {
    id: 'anambra_basin',
    name: 'Anambra Basin / Idemili',
    igboName: 'Mpaghara Mmiri Anambra',
    color: '#06b6d4',
    center: [6.95, 6.15],
    polygon: [
      [6.70, 6.35], [7.05, 6.45], [7.20, 6.15], [7.05, 5.85], [6.80, 5.95], [6.68, 6.15], [6.70, 6.35]
    ],
  },
  {
    id: 'central',
    name: 'Central / Standard Igbo Core',
    igboName: 'Igbo Izugbe & Etiti',
    color: '#10b981',
    center: [7.20, 5.55],
    polygon: [
      [7.05, 5.85], [7.35, 5.90], [7.60, 5.60], [7.45, 5.15], [7.15, 5.10], [6.95, 5.45], [7.05, 5.85]
    ],
  },
  {
    id: 'anioma',
    name: 'Anioma / Western Igbo',
    igboName: 'Igbo Enuani, Ika na Ukwuani',
    color: '#a855f7',
    center: [6.45, 6.15],
    polygon: [
      [6.05, 6.35], [6.40, 6.55], [6.75, 6.30], [6.75, 5.65], [6.35, 5.45], [6.05, 5.85], [6.05, 6.35]
    ],
  },
  {
    id: 'southern',
    name: 'Southern / Niger Delta Fringe',
    igboName: 'Igbo Ndịda & Upland Rivers',
    color: '#f59e0b',
    center: [6.90, 4.95],
    polygon: [
      [6.60, 5.25], [7.10, 5.20], [7.30, 4.85], [7.05, 4.65], [6.70, 4.75], [6.60, 5.25]
    ],
  },
  {
    id: 'crossriver',
    name: 'Cross River / Eastern Igbo',
    igboName: 'Igbo Mmiri Cross',
    color: '#ec4899',
    center: [7.85, 5.75],
    polygon: [
      [7.65, 6.15], [8.10, 6.10], [8.15, 5.40], [7.80, 5.30], [7.60, 5.55], [7.65, 6.15]
    ],
  },
];

const dialectFeatures = DIALECT_ZONES.map((d) => ({
  type: 'Feature',
  id: d.id,
  properties: {
    id: d.id,
    name: d.name,
    igboName: d.igboName,
    color: d.color,
  },
  geometry: {
    type: 'Polygon',
    coordinates: [d.polygon],
  },
}));

const dialectLabels = DIALECT_ZONES.map((d) => ({
  type: 'Feature',
  properties: {
    id: d.id,
    name: d.name,
    igboName: d.igboName,
    color: d.color,
  },
  geometry: {
    type: 'Point',
    coordinates: d.center,
  },
}));

const dialectGeoJSON = {
  type: 'FeatureCollection',
  features: [...dialectFeatures, ...dialectLabels],
};

const outputDir = path.resolve(process.cwd(), 'apps/web/public/data');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

fs.writeFileSync(
  path.join(outputDir, 'migration_arcs.geojson'),
  JSON.stringify(migrationArcsGeoJSON, null, 2)
);
console.log('Generated apps/web/public/data/migration_arcs.geojson');

fs.writeFileSync(
  path.join(outputDir, 'dialect_zones.geojson'),
  JSON.stringify(dialectGeoJSON, null, 2)
);
console.log('Generated apps/web/public/data/dialect_zones.geojson');
