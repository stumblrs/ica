import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import * as turf from '@turf/turf';

// Cache for normalized GeoJSON features to allow fast spatial queries
let cachedStatesGeoJson: any = null;
let cachedLgasGeoJson: any = null;

function loadGeoJsonData() {
  if (!cachedStatesGeoJson) {
    const candidates = [
      path.resolve(process.cwd(), 'public/data/states.geojson'),
      path.resolve(process.cwd(), 'apps/web/public/data/states.geojson'),
      path.resolve(process.cwd(), '../../data/normalized/states.geojson')
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) {
        cachedStatesGeoJson = JSON.parse(fs.readFileSync(p, 'utf8'));
        break;
      }
    }
  }
  if (!cachedLgasGeoJson) {
    const candidates = [
      path.resolve(process.cwd(), 'public/data/lgas.geojson'),
      path.resolve(process.cwd(), 'apps/web/public/data/lgas.geojson'),
      path.resolve(process.cwd(), '../../data/normalized/lgas.geojson')
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) {
        cachedLgasGeoJson = JSON.parse(fs.readFileSync(p, 'utf8'));
        break;
      }
    }
  }
}

/**
 * Server-side point-in-polygon administrative assignment
 * Section 7.1 & 7.2 of Development Plan:
 * "The client must not provide authoritative state/LGA IDs."
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { longitude, latitude } = body;

    if (
      typeof longitude !== 'number' ||
      typeof latitude !== 'number' ||
      isNaN(longitude) ||
      isNaN(latitude)
    ) {
      return NextResponse.json(
        { error: 'Valid longitude and latitude coordinates are required.' },
        { status: 400 }
      );
    }

    // Coordinate range validation for Nigeria: Longitude [2.5, 15], Latitude [4.0, 14.5]
    if (longitude < 2.0 || longitude > 15.5 || latitude < 3.5 || latitude > 15.0) {
      return NextResponse.json(
        { error: 'Coordinates are outside the geographic extent of Nigeria.' },
        { status: 422 }
      );
    }

    loadGeoJsonData();

    if (!cachedLgasGeoJson || !cachedStatesGeoJson) {
      return NextResponse.json(
        { error: 'Reference spatial datasets not initialized.' },
        { status: 500 }
      );
    }

    const pt = turf.point([longitude, latitude]);

    // Find covering LGA
    const matchingLgas: any[] = [];
    for (const feature of cachedLgasGeoJson.features) {
      if (turf.booleanPointInPolygon(pt, feature)) {
        matchingLgas.push(feature);
      }
    }

    // Find covering State
    let matchingState: any = null;
    for (const feature of cachedStatesGeoJson.features) {
      if (turf.booleanPointInPolygon(pt, feature)) {
        matchingState = feature;
        break;
      }
    }

    // Section 7.2: Handle boundary ambiguity
    if (matchingLgas.length > 1) {
      return NextResponse.json({
        ambiguous: true,
        message: 'Point is on or near a boundary between multiple LGAs.',
        candidates: matchingLgas.map((l) => ({
          lgaName: l.properties.admin2Name,
          lgaCode: l.properties.admin2Pcod,
          stateName: l.properties.admin1Name,
          stateCode: l.properties.admin1Pcod,
        })),
      });
    }

    if (matchingLgas.length === 0) {
      return NextResponse.json(
        {
          error:
            'Coordinates do not intersect any known Nigerian LGA polygon.',
          foundState: matchingState?.properties?.admin1Name || null,
        },
        { status: 404 }
      );
    }

    const matchedLga = matchingLgas[0];

    return NextResponse.json({
      success: true,
      ambiguous: false,
      state: {
        code: matchedLga.properties.admin1Pcod,
        name: matchedLga.properties.admin1Name,
      },
      lga: {
        code: matchedLga.properties.admin2Pcod,
        name: matchedLga.properties.admin2Name,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Spatial resolution error: ' + err.message },
      { status: 500 }
    );
  }
}
