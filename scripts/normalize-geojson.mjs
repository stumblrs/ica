/**
 * GeoJSON Normalization and Optimization Script
 * 
 * 1. Reads states (37) and LGAs (774) from data/source/
 * 2. Prunes unused or redundant metadata properties for web performance
 * 3. Truncates high-precision float coordinates to 5 decimal places (~1.1 meter accuracy, reducing file size by 50-60%)
 * 4. Outputs normalized reference datasets to data/normalized/ and apps/web/public/data/
 */

import fs from 'node:fs';
import path from 'node:path';

const sourceStatesPath = path.resolve('data/source/nigeria_state_boundaries.geojson');
const sourceLgasPath = path.resolve('data/source/nigeria_lga_boundaries.geojson');

const normalizedDir = path.resolve('data/normalized');
const webPublicDataDir = path.resolve('apps/web/public/data');

if (!fs.existsSync(normalizedDir)) {
  fs.mkdirSync(normalizedDir, { recursive: true });
}
if (!fs.existsSync(webPublicDataDir)) {
  fs.mkdirSync(webPublicDataDir, { recursive: true });
}

function roundCoordinates(coords, precision = 5) {
  if (typeof coords[0] === 'number') {
    return [
      Number(coords[0].toFixed(precision)),
      Number(coords[1].toFixed(precision))
    ];
  }
  return coords.map(c => roundCoordinates(c, precision));
}

console.log('Normalizing Nigeria States GeoJSON...');
const statesRaw = JSON.parse(fs.readFileSync(sourceStatesPath, 'utf8'));
const normalizedStates = {
  type: 'FeatureCollection',
  features: statesRaw.features.map(f => ({
    type: 'Feature',
    id: f.properties.admin1Pcod,
    properties: {
      admin1Pcod: f.properties.admin1Pcod,
      admin1Name: f.properties.admin1Name,
      admin1RefN: f.properties.admin1RefN || null,
      admin0Pcod: f.properties.admin0Pcod || 'NG',
      admin0Name: f.properties.admin0Name || 'Nigeria'
    },
    geometry: {
      type: f.geometry.type,
      coordinates: roundCoordinates(f.geometry.coordinates)
    }
  }))
};

const statesOutNorm = path.join(normalizedDir, 'states.geojson');
const statesOutWeb = path.join(webPublicDataDir, 'states.geojson');
const statesJsonStr = JSON.stringify(normalizedStates);
fs.writeFileSync(statesOutNorm, statesJsonStr);
fs.writeFileSync(statesOutWeb, statesJsonStr);

console.log(`Saved normalized states (${(statesJsonStr.length / 1024 / 1024).toFixed(2)} MB, was ${(fs.statSync(sourceStatesPath).size / 1024 / 1024).toFixed(2)} MB)`);

console.log('Normalizing Nigeria LGAs GeoJSON...');
const lgasRaw = JSON.parse(fs.readFileSync(sourceLgasPath, 'utf8'));
const normalizedLgas = {
  type: 'FeatureCollection',
  features: lgasRaw.features.map(f => ({
    type: 'Feature',
    id: f.properties.admin2Pcod,
    properties: {
      admin2Pcod: f.properties.admin2Pcod,
      admin2Name: f.properties.admin2Name,
      admin1Pcod: f.properties.admin1Pcod,
      admin1Name: f.properties.admin1Name
    },
    geometry: {
      type: f.geometry.type,
      coordinates: roundCoordinates(f.geometry.coordinates)
    }
  }))
};

const lgasOutNorm = path.join(normalizedDir, 'lgas.geojson');
const lgasOutWeb = path.join(webPublicDataDir, 'lgas.geojson');
const lgasJsonStr = JSON.stringify(normalizedLgas);
fs.writeFileSync(lgasOutNorm, lgasJsonStr);
fs.writeFileSync(lgasOutWeb, lgasJsonStr);

console.log(`Saved normalized LGAs (${(lgasJsonStr.length / 1024 / 1024).toFixed(2)} MB, was ${(fs.statSync(sourceLgasPath).size / 1024 / 1024).toFixed(2)} MB)`);
console.log('✓ Normalization completed successfully!');
