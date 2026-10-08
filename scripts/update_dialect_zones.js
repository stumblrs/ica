const fs = require('fs');

const dPath = './apps/web/public/data/dialect_zones.geojson';
const d = JSON.parse(fs.readFileSync(dPath, 'utf8'));

// Check if northeastern cluster already exists
const hasNortheastern = d.features.some(f => f.properties && f.properties.id === 'northeastern');

if (!hasNortheastern) {
  const poly = {
    type: 'Feature',
    id: 'northeastern',
    properties: {
      id: 'northeastern',
      name: 'Northeastern / Abakaliki Cluster',
      igboName: 'Olundi Ezza, Izzi, Ikwo na Mgbo',
      color: '#0284c7'
    },
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [7.85, 6.0],
        [7.85, 6.6],
        [8.35, 6.6],
        [8.4, 6.1],
        [8.0, 5.95],
        [7.85, 6.0]
      ]]
    }
  };

  const pt = {
    type: 'Feature',
    properties: {
      id: 'northeastern',
      name: 'Northeastern / Abakaliki Cluster',
      igboName: 'Olundi Ezza, Izzi, Ikwo na Mgbo',
      color: '#0284c7'
    },
    geometry: {
      type: 'Point',
      coordinates: [8.1, 6.3]
    }
  };

  d.features.push(poly);
  d.features.push(pt);

  fs.writeFileSync(dPath, JSON.stringify(d, null, 2));
  console.log('Successfully added Northeastern cluster to dialect_zones.geojson');
} else {
  console.log('Northeastern cluster already present in dialect_zones.geojson');
}
