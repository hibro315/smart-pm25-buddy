/**
 * AQICN Data Service - Data Ingestion Layer
 * 
 * Responsible for:
 * - Fetching air quality data from AQICN API
 * - Data validation and normalization
 * - Spatial interpolation between stations
 * - Caching for reliability and offline fallback
 * 
 * This layer contains NO UI or decision logic.
 * 
 * @version 2.0.0 - ISEF Research Grade
 * @author Environmental Health Navigation System
 */

import { DATA_VALIDATION } from '@/config/constants';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface AQICNStationData {
  aqi: number;
  pm25: number;
  pm10?: number;
  o3?: number;
  no2?: number;
  so2?: number;
  co?: number;
  timestamp: string;
  station: {
    name: string;
    latitude: number;
    longitude: number;
    uid: number;
  };
  dominantPollutant?: string;
}

export interface NormalizedAQIData {
  aqi: number;
  pm25: number;
  pm10: number | null;
  o3: number | null;
  no2: number | null;
  so2: number | null;
  co: number | null;
  latitude: number;
  longitude: number;
  stationName: string;
  stationId: number;
  timestamp: Date;
  fetchedAt: Date;
  isInterpolated: boolean;
  interpolationConfidence?: number;
  dominantPollutant: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface InterpolatedPoint {
  latitude: number;
  longitude: number;
  pm25: number;
  aqi: number;
  confidence: number;
  contributingStations: {
    stationId: number;
    weight: number;
    distance: number;
  }[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes
const CACHE_KEY_PREFIX = 'aqicn_cache_';
const MAX_INTERPOLATION_DISTANCE_KM = 50; // Max distance for interpolation
const IDW_POWER = 2; // Inverse Distance Weighting power

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validates raw AQICN API response data
 * All validation rules are explicit and documented
 */
export function validateAQIData(data: unknown): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!data || typeof data !== 'object') {
    return { isValid: false, errors: ['Invalid data structure'], warnings: [] };
  }

  const d = data as Record<string, unknown>;

  // Validate AQI
  if (typeof d.aqi !== 'number') {
    errors.push('AQI value is required and must be a number');
  } else if (d.aqi < DATA_VALIDATION.AQI.min || d.aqi > DATA_VALIDATION.AQI.max) {
    errors.push(`AQI value ${d.aqi} is out of valid range [${DATA_VALIDATION.AQI.min}, ${DATA_VALIDATION.AQI.max}]`);
  }

  // Validate PM2.5 (required for health calculations)
  const iaqi = d.iaqi as Record<string, { v: number }> | undefined;
  if (iaqi?.pm25?.v !== undefined) {
    if (iaqi.pm25.v < DATA_VALIDATION.PM25.min || iaqi.pm25.v > DATA_VALIDATION.PM25.max) {
      warnings.push(`PM2.5 value ${iaqi.pm25.v} is outside typical range`);
    }
  }

  // Validate coordinates if present
  const city = d.city as { geo?: number[] } | undefined;
  if (city?.geo) {
    const [lat, lng] = city.geo;
    if (lat < DATA_VALIDATION.LATITUDE.min || lat > DATA_VALIDATION.LATITUDE.max) {
      errors.push(`Latitude ${lat} is invalid`);
    }
    if (lng < DATA_VALIDATION.LONGITUDE.min || lng > DATA_VALIDATION.LONGITUDE.max) {
      errors.push(`Longitude ${lng} is invalid`);
    }
  }

  // Validate timestamp
  const time = d.time as { iso?: string } | undefined;
  if (time?.iso) {
    const timestamp = new Date(time.iso);
    if (isNaN(timestamp.getTime())) {
      warnings.push('Invalid timestamp format');
    }
    // Warn if data is more than 2 hours old
    if (Date.now() - timestamp.getTime() > 2 * 60 * 60 * 1000) {
      warnings.push('Data is more than 2 hours old');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================================================
// NORMALIZATION FUNCTIONS
// ============================================================================

/**
 * Normalizes AQICN API response to standardized format
 * Ensures consistent data structure for downstream processing
 */
export function normalizeAQIData(rawData: Record<string, unknown>): NormalizedAQIData | null {
  const validation = validateAQIData(rawData);
  if (!validation.isValid) {
    console.error('Validation failed:', validation.errors);
    return null;
  }

  const aqi = rawData.aqi as number;
  const iaqi = rawData.iaqi as Record<string, { v: number }> | undefined;
  const city = rawData.city as { name?: string; geo?: number[]; url?: string } | undefined;
  const time = rawData.time as { iso?: string } | undefined;
  const idx = rawData.idx as number | undefined;
  const dominentpol = rawData.dominentpol as string | undefined;

  // Extract individual pollutant values
  const pm25 = iaqi?.pm25?.v ?? estimatePM25FromAQI(aqi);
  const pm10 = iaqi?.pm10?.v ?? null;
  const o3 = iaqi?.o3?.v ?? null;
  const no2 = iaqi?.no2?.v ?? null;
  const so2 = iaqi?.so2?.v ?? null;
  const co = iaqi?.co?.v ?? null;

  return {
    aqi,
    pm25,
    pm10,
    o3,
    no2,
    so2,
    co,
    latitude: city?.geo?.[0] ?? 0,
    longitude: city?.geo?.[1] ?? 0,
    stationName: city?.name ?? 'Unknown',
    stationId: idx ?? 0,
    timestamp: time?.iso ? new Date(time.iso) : new Date(),
    fetchedAt: new Date(),
    isInterpolated: false,
    dominantPollutant: dominentpol ?? 'pm25',
  };
}

/**
 * Estimates PM2.5 from AQI when PM2.5 value is not directly available
 * Based on US EPA PM2.5 to AQI conversion breakpoints
 * 
 * @see https://www.airnow.gov/aqi/aqi-basics/
 */
function estimatePM25FromAQI(aqi: number): number {
  // US EPA PM2.5 AQI breakpoints (simplified)
  const breakpoints = [
    { aqiLow: 0, aqiHigh: 50, pm25Low: 0, pm25High: 12 },
    { aqiLow: 51, aqiHigh: 100, pm25Low: 12.1, pm25High: 35.4 },
    { aqiLow: 101, aqiHigh: 150, pm25Low: 35.5, pm25High: 55.4 },
    { aqiLow: 151, aqiHigh: 200, pm25Low: 55.5, pm25High: 150.4 },
    { aqiLow: 201, aqiHigh: 300, pm25Low: 150.5, pm25High: 250.4 },
    { aqiLow: 301, aqiHigh: 500, pm25Low: 250.5, pm25High: 500.4 },
  ];

  for (const bp of breakpoints) {
    if (aqi >= bp.aqiLow && aqi <= bp.aqiHigh) {
      // Linear interpolation within breakpoint
      const ratio = (aqi - bp.aqiLow) / (bp.aqiHigh - bp.aqiLow);
      return bp.pm25Low + ratio * (bp.pm25High - bp.pm25Low);
    }
  }

  // Fallback for extreme values
  return aqi * 0.7;
}

// ============================================================================
// SPATIAL INTERPOLATION (IDW - Inverse Distance Weighting)
// ============================================================================

/**
 * Calculates Haversine distance between two coordinates
 * @returns Distance in kilometers
 */
export function haversineDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Performs Inverse Distance Weighting (IDW) interpolation
 * 
 * Formula: z(x) = Σ(wi * zi) / Σ(wi)
 * where wi = 1 / di^p (p = IDW_POWER)
 * 
 * @param targetLat - Target latitude for interpolation
 * @param targetLng - Target longitude for interpolation
 * @param stations - Array of station data points
 * @returns Interpolated point with confidence score
 */
export function interpolateAQI(
  targetLat: number,
  targetLng: number,
  stations: NormalizedAQIData[]
): InterpolatedPoint | null {
  if (stations.length === 0) return null;

  // Calculate distances and filter stations within range
  const stationsWithDistance = stations
    .map(station => ({
      station,
      distance: haversineDistance(targetLat, targetLng, station.latitude, station.longitude),
    }))
    .filter(s => s.distance <= MAX_INTERPOLATION_DISTANCE_KM)
    .sort((a, b) => a.distance - b.distance);

  if (stationsWithDistance.length === 0) return null;

  // Check if point is very close to a station (< 1km)
  if (stationsWithDistance[0].distance < 1) {
    const nearestStation = stationsWithDistance[0].station;
    return {
      latitude: targetLat,
      longitude: targetLng,
      pm25: nearestStation.pm25,
      aqi: nearestStation.aqi,
      confidence: 1.0,
      contributingStations: [{
        stationId: nearestStation.stationId,
        weight: 1.0,
        distance: stationsWithDistance[0].distance,
      }],
    };
  }

  // IDW calculation
  let weightSum = 0;
  let pm25WeightedSum = 0;
  let aqiWeightedSum = 0;
  const contributingStations: InterpolatedPoint['contributingStations'] = [];

  for (const { station, distance } of stationsWithDistance) {
    const weight = 1 / Math.pow(distance, IDW_POWER);
    weightSum += weight;
    pm25WeightedSum += weight * station.pm25;
    aqiWeightedSum += weight * station.aqi;

    contributingStations.push({
      stationId: station.stationId,
      weight,
      distance,
    });
  }

  // Normalize weights for confidence calculation
  const normalizedWeights = contributingStations.map(s => s.weight / weightSum);
  
  // Confidence based on:
  // 1. Number of stations (more = higher)
  // 2. Distance to nearest (closer = higher)
  // 3. Weight distribution (more even = higher)
  const stationCountFactor = Math.min(stationsWithDistance.length / 5, 1);
  const distanceFactor = 1 - (stationsWithDistance[0].distance / MAX_INTERPOLATION_DISTANCE_KM);
  const entropyFactor = calculateEntropyFactor(normalizedWeights);
  
  const confidence = (stationCountFactor * 0.3 + distanceFactor * 0.5 + entropyFactor * 0.2);

  return {
    latitude: targetLat,
    longitude: targetLng,
    pm25: pm25WeightedSum / weightSum,
    aqi: aqiWeightedSum / weightSum,
    confidence: Math.round(confidence * 100) / 100,
    contributingStations,
  };
}

/**
 * Calculates normalized Shannon entropy for weight distribution
 * Higher entropy = more even distribution = higher confidence
 */
function calculateEntropyFactor(weights: number[]): number {
  if (weights.length <= 1) return 1;
  
  const entropy = -weights.reduce((sum, w) => {
    if (w <= 0) return sum;
    return sum + w * Math.log2(w);
  }, 0);
  
  const maxEntropy = Math.log2(weights.length);
  return maxEntropy > 0 ? entropy / maxEntropy : 0;
}

// ============================================================================
// CACHING LAYER
// ============================================================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

/**
 * Stores data in cache with expiration
 */
export function cacheData<T>(key: string, data: T, durationMs: number = CACHE_DURATION_MS): void {
  const entry: CacheEntry<T> = {
    data,
    timestamp: Date.now(),
    expiresAt: Date.now() + durationMs,
  };
  
  try {
    localStorage.setItem(CACHE_KEY_PREFIX + key, JSON.stringify(entry));
  } catch (error) {
    console.warn('Cache storage failed:', error);
  }
}

/**
 * Retrieves data from cache if not expired
 */
export function getCachedData<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY_PREFIX + key);
    if (!raw) return null;
    
    const entry: CacheEntry<T> = JSON.parse(raw);
    
    if (Date.now() > entry.expiresAt) {
      localStorage.removeItem(CACHE_KEY_PREFIX + key);
      return null;
    }
    
    return entry.data;
  } catch {
    return null;
  }
}

/**
 * Gets cache age in milliseconds
 */
export function getCacheAge(key: string): number | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY_PREFIX + key);
    if (!raw) return null;
    
    const entry: CacheEntry<unknown> = JSON.parse(raw);
    return Date.now() - entry.timestamp;
  } catch {
    return null;
  }
}

// ============================================================================
// MAIN DATA FETCHING SERVICE
// ============================================================================

/**
 * Fetches and normalizes AQI data from AQICN API
 * Includes caching and validation
 */
export async function fetchAQIData(
  latitude: number,
  longitude: number,
  apiToken: string,
  useCache: boolean = true
): Promise<NormalizedAQIData | null> {
  const cacheKey = `geo_${latitude.toFixed(4)}_${longitude.toFixed(4)}`;

  // Check cache first
  if (useCache) {
    const cached = getCachedData<NormalizedAQIData>(cacheKey);
    if (cached) {
      console.log('[AQICNDataService] Using cached data');
      return cached;
    }
  }

  try {
    const url = `https://api.waqi.info/feed/geo:${latitude};${longitude}/?token=${apiToken}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const json = await response.json();
    
    if (json.status !== 'ok') {
      throw new Error(`API error: ${json.data || 'Unknown error'}`);
    }

    const normalized = normalizeAQIData(json.data);
    
    if (normalized) {
      cacheData(cacheKey, normalized);
    }

    return normalized;
  } catch (error) {
    console.error('[AQICNDataService] Fetch error:', error);
    
    // Return cached data even if expired as fallback
    const cached = getCachedData<NormalizedAQIData>(cacheKey);
    if (cached) {
      console.log('[AQICNDataService] Using stale cache as fallback');
      return cached;
    }
    
    return null;
  }
}

/**
 * Fetches multiple AQI readings along a route
 * @param coordinates - Array of [lng, lat] coordinates
 * @param sampleEveryKm - Sample interval in kilometers
 */
export async function fetchRouteAQIData(
  coordinates: [number, number][],
  apiToken: string,
  sampleEveryKm: number = 2
): Promise<NormalizedAQIData[]> {
  if (coordinates.length === 0) return [];

  // Calculate sample points
  const samplePoints: [number, number][] = [];
  let accumulatedDistance = 0;
  let lastPoint = coordinates[0];
  samplePoints.push(lastPoint);

  for (let i = 1; i < coordinates.length; i++) {
    const [lng, lat] = coordinates[i];
    const [lastLng, lastLat] = lastPoint;
    const segmentDistance = haversineDistance(lastLat, lastLng, lat, lng);
    accumulatedDistance += segmentDistance;

    if (accumulatedDistance >= sampleEveryKm) {
      samplePoints.push([lng, lat]);
      accumulatedDistance = 0;
    }
    lastPoint = [lng, lat];
  }

  // Always include endpoint
  const lastCoord = coordinates[coordinates.length - 1];
  if (samplePoints[samplePoints.length - 1] !== lastCoord) {
    samplePoints.push(lastCoord);
  }

  // Fetch data for each sample point (with rate limiting)
  const results: NormalizedAQIData[] = [];
  
  for (const [lng, lat] of samplePoints) {
    const data = await fetchAQIData(lat, lng, apiToken, true);
    if (data) {
      results.push(data);
    }
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return results;
}

export default {
  validateAQIData,
  normalizeAQIData,
  haversineDistance,
  interpolateAQI,
  cacheData,
  getCachedData,
  getCacheAge,
  fetchAQIData,
  fetchRouteAQIData,
};
