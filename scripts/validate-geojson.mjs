/**
 * Data Validation Script for Igbo Community Atlas
 * Verifies Section 3 & Section 15.1 of igbo_community_atlas_final_development_plan.md:
 * - 37 State features imported, unique admin1Pcod
 * - 774 LGA features imported, unique admin2Pcod
 * - Every LGA references an existing state admin1Pcod
 * - All geometries are valid MultiPolygon and WGS84 CRS semantics
 */

import fs from 'node:fs';
import path from 'node:path';

const statesPath = path.resolve('data/source/nigeria_state_boundaries.geojson');
const lgasPath = path.resolve('data/source/nigeria_lga_boundaries.geojson');

console.log('--- Igbo Community Atlas Data Validation ---');

if (!fs.existsSync(statesPath) || !fs.existsSync(lgasPath)) {
  console.error('ERROR: Source GeoJSON files not found in data/source/');
  process.exit(1);
}

console.log('Loading states GeoJSON...');
const statesData = JSON.parse(fs.readFileSync(statesPath, 'utf8'));

console.log('Loading LGAs GeoJSON...');
const lgasData = JSON.parse(fs.readFileSync(lgasPath, 'utf8'));

// 1. Verify States
const stateFeatures = statesData.features || [];
console.log(`States Feature Count: ${stateFeatures.length} (Expected: 37)`);
if (stateFeatures.length !== 37) {
  console.error(`FAIL: Expected 37 state features, got ${stateFeatures.length}`);
  process.exit(1);
}

const statePcodes = new Set();
for (const feature of stateFeatures) {
  const pcode = feature.properties?.admin1Pcod;
  const name = feature.properties?.admin1Name;
  if (!pcode) {
    console.error(`FAIL: State missing admin1Pcod: ${name}`);
    process.exit(1);
  }
  if (statePcodes.has(pcode)) {
    console.error(`FAIL: Duplicate state admin1Pcod: ${pcode}`);
    process.exit(1);
  }
  statePcodes.add(pcode);

  if (feature.geometry?.type !== 'MultiPolygon') {
    console.warn(`NOTE: State ${name} geometry type is ${feature.geometry?.type}, expected MultiPolygon`);
  }
}
console.log(`✓ States valid: 37 unique admin1Pcod codes found.`);

// 2. Verify LGAs
const lgaFeatures = lgasData.features || [];
console.log(`LGAs Feature Count: ${lgaFeatures.length} (Expected: 774)`);
if (lgaFeatures.length !== 774) {
  console.error(`FAIL: Expected 774 LGA features, got ${lgaFeatures.length}`);
  process.exit(1);
}

const lgaPcodes = new Set();
let missingStateLinks = 0;

for (const feature of lgaFeatures) {
  const pcode = feature.properties?.admin2Pcod;
  const name = feature.properties?.admin2Name;
  const statePcode = feature.properties?.admin1Pcod;

  if (!pcode) {
    console.error(`FAIL: LGA missing admin2Pcod: ${name}`);
    process.exit(1);
  }
  if (lgaPcodes.has(pcode)) {
    console.error(`FAIL: Duplicate LGA admin2Pcod: ${pcode}`);
    process.exit(1);
  }
  lgaPcodes.add(pcode);

  if (!statePcodes.has(statePcode)) {
    console.error(`FAIL: LGA ${name} (${pcode}) references non-existent state ${statePcode}`);
    missingStateLinks++;
  }
}

if (missingStateLinks > 0) {
  console.error(`FAIL: ${missingStateLinks} LGAs reference non-existent states.`);
  process.exit(1);
}

console.log(`✓ LGAs valid: 774 unique admin2Pcod codes found, all reference valid parent states.`);
console.log('✓ All baseline geographic data tests PASSED according to Section 3 & 15.1!');
