/**
 * Database Seeder Script for Administrative Geography
 * Generates SQL seed file and/or inserts directly into PostGIS
 * 
 * Target tables:
 * - states (admin1_pcod, name, reference_name, geom, etc.)
 * - lgas (admin2_pcod, name, state_id, geom, etc.)
 */

import fs from 'node:fs';
import path from 'node:path';

const sourceStatesPath = path.resolve('data/source/nigeria_state_boundaries.geojson');
const sourceLgasPath = path.resolve('data/source/nigeria_lga_boundaries.geojson');
const seedSqlPath = path.resolve('database/seeds/001_administrative_geography.sql');

console.log('Generating PostGIS SQL seed file from source GeoJSON...');

const statesRaw = JSON.parse(fs.readFileSync(sourceStatesPath, 'utf8'));
const lgasRaw = JSON.parse(fs.readFileSync(sourceLgasPath, 'utf8'));

let sqlContent = `-- Administrative Geography Seed File
-- 37 States, 774 LGAs
BEGIN;

`;

// 1. Insert States
sqlContent += `-- 1. Insert States\n`;
for (const feature of statesRaw.features) {
  const p = feature.properties;
  const geomGeoJson = JSON.stringify(feature.geometry).replace(/'/g, "''");
  const admin1Pcod = p.admin1Pcod.replace(/'/g, "''");
  const name = p.admin1Name.replace(/'/g, "''");
  const refName = (p.admin1RefN || p.admin1Name).replace(/'/g, "''");
  const altName = p.admin1AltN ? `'${p.admin1AltN.replace(/'/g, "''")}'` : 'NULL';
  const shapeLeng = p.Shape_Leng || 0;
  const shapeArea = p.Shape_Area || 0;

  sqlContent += `INSERT INTO states (admin1_pcod, name, reference_name, alternate_name, shape_length, shape_area, geom)
VALUES ('${admin1Pcod}', '${name}', '${refName}', ${altName}, ${shapeLeng}, ${shapeArea}, ST_SetSRID(ST_GeomFromGeoJSON('${geomGeoJson}'), 4326))
ON CONFLICT (admin1_pcod) DO UPDATE SET name = EXCLUDED.name, geom = EXCLUDED.geom;\n`;
}

// 2. Insert LGAs
sqlContent += `\n-- 2. Insert LGAs\n`;
for (const feature of lgasRaw.features) {
  const p = feature.properties;
  const geomGeoJson = JSON.stringify(feature.geometry).replace(/'/g, "''");
  const admin2Pcod = p.admin2Pcod.replace(/'/g, "''");
  const name = p.admin2Name.replace(/'/g, "''");
  const refName = (p.admin2RefN || p.admin2Name).replace(/'/g, "''");
  const altName = p.admin2AltN ? `'${p.admin2AltN.replace(/'/g, "''")}'` : 'NULL';
  const parentStatePcod = p.admin1Pcod.replace(/'/g, "''");
  const shapeLeng = p.Shape_Leng || 0;
  const shapeArea = p.Shape_Area || 0;

  sqlContent += `INSERT INTO lgas (admin2_pcod, name, reference_name, alternate_name, state_id, admin1_pcod, shape_length, shape_area, geom)
SELECT '${admin2Pcod}', '${name}', '${refName}', ${altName}, s.id, '${parentStatePcod}', ${shapeLeng}, ${shapeArea}, ST_SetSRID(ST_GeomFromGeoJSON('${geomGeoJson}'), 4326)
FROM states s WHERE s.admin1_pcod = '${parentStatePcod}'
ON CONFLICT (admin2_pcod) DO UPDATE SET name = EXCLUDED.name, geom = EXCLUDED.geom;\n`;
}

sqlContent += `\nCOMMIT;\n`;

fs.writeFileSync(seedSqlPath, sqlContent, 'utf8');
const stat = fs.statSync(seedSqlPath);
console.log(`✓ Seed SQL generated at ${seedSqlPath} (${(stat.size / 1024 / 1024).toFixed(2)} MB)`);
