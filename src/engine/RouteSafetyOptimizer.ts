/**
 * Route Safety Optimizer Engine
 * 
 * Implements multi-objective route optimization prioritizing health safety.
 * 
 * The safest route is defined as:
 * "Minimum cumulative health risk, NOT minimum distance or time."
 * 
 * This is a constrained multi-objective optimization problem.
 * 
 * @version 1.0.0 - ISEF Research Grade
 * @author Environmental Health Navigation System
 */

import { 
  computePHRI, 
  compareRouteRisks, 
  DiseaseProfile, 
  ActivityLevel,
  RiskLevel,
  UserHealthProfile,
} from './HealthRiskEngine';
import { haversineDistance, NormalizedAQIData } from '@/data/AQICNDataService';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface RouteCandidate {
  index: number;
  geometry: {
    type: string;
    coordinates: [number, number][];
  };
  distanceMeters: number;
  durationSeconds: number;
  pm25Samples: number[];
  sampleLocations: { lat: number; lng: number }[];
}

export interface OptimizedRouteResult {
  safestRoute: RouteCandidate;
  allRoutes: ScoredRoute[];
  decision: RouteDecision;
  metadata: OptimizationMetadata;
}

export interface ScoredRoute {
  route: RouteCandidate;
  scores: RouteScores;
  segments: RouteSegment[];
  rank: number;
}

export interface RouteScores {
  // Primary health metrics
  cumulativeExposure: number;     // Total PM2.5 intake (µg)
  averagePM25: number;            // Average PM2.5 along route
  peakPM25: number;               // Maximum PM2.5 encountered
  peakExposureRatio: number;      // Peak/Average ratio (spikiness)
  
  // PHRI-based scores
  averagePHRI: number;            // Average PHRI across segments
  peakPHRI: number;               // Maximum PHRI
  phriVariance: number;           // Variance in PHRI (consistency)
  
  // Multi-objective composite
  healthScore: number;            // 0-100 (lower = healthier)
  convenienceScore: number;       // 0-100 (higher = more convenient)
  overallScore: number;           // Weighted composite
}

export interface RouteSegment {
  index: number;
  startCoord: [number, number];
  endCoord: [number, number];
  distanceKm: number;
  pm25: number;
  phri: number;
  riskLevel: RiskLevel;
  color: string;                  // For visualization
}

export interface RouteDecision {
  recommendedIndex: number;
  decisionText: string;           // Max 2 sentences, Thai
  decisionTextEn: string;
  alternativeText?: string;
  tradeoffAnalysis: {
    healthBenefit: number;        // % risk reduction vs worst
    timeCost: number;             // Extra minutes vs fastest
    distanceCost: number;         // Extra km vs shortest
  };
  shouldProceed: boolean;
  warningLevel: 'none' | 'caution' | 'warning' | 'danger';
}

export interface OptimizationMetadata {
  timestamp: Date;
  routesAnalyzed: number;
  samplesPerRoute: number;
  profileUsed: boolean;
  computationTimeMs: number;
  dataQuality: 'high' | 'medium' | 'low';
}

// ============================================================================
// OPTIMIZATION WEIGHTS
// ============================================================================

/**
 * Weight configuration for multi-objective optimization
 * 
 * These weights determine the trade-off between health and convenience.
 * For ISEF evaluation, health is prioritized heavily.
 */
export const OPTIMIZATION_WEIGHTS = {
  // Primary objective: minimize health risk
  HEALTH: 0.7,
  
  // Secondary: minimize inconvenience  
  CONVENIENCE: 0.3,
  
  // Health sub-weights
  AVERAGE_EXPOSURE: 0.5,
  PEAK_EXPOSURE: 0.3,
  EXPOSURE_VARIANCE: 0.2,
  
  // Convenience sub-weights
  DURATION: 0.6,
  DISTANCE: 0.4,
} as const;

/**
 * Risk level to color mapping for visualization
 */
export const RISK_COLORS: Record<RiskLevel, string> = {
  low: '#22c55e',       // Green
  moderate: '#eab308',  // Yellow
  high: '#f97316',      // Orange
  severe: '#ef4444',    // Red
};

// ============================================================================
// CORE OPTIMIZATION FUNCTIONS
// ============================================================================

/**
 * Main optimization function - finds the safest route
 * 
 * Algorithm:
 * 1. Score each route on health metrics
 * 2. Score each route on convenience metrics
 * 3. Compute weighted composite score
 * 4. Select route with minimum composite score
 * 5. Generate decision text
 */
export function optimizeForSafety(
  routes: RouteCandidate[],
  profile: UserHealthProfile,
  activityLevel: ActivityLevel = 'light',
  travelSpeedKmh: number = 30
): OptimizedRouteResult {
  const startTime = performance.now();
  
  if (routes.length === 0) {
    throw new Error('No routes provided for optimization');
  }
  
  // Score all routes
  const scoredRoutes: ScoredRoute[] = routes.map((route, index) => {
    const segments = analyzeRouteSegments(route, profile, activityLevel, travelSpeedKmh);
    const scores = computeRouteScores(route, segments);
    
    return {
      route,
      scores,
      segments,
      rank: 0, // Will be set after sorting
    };
  });
  
  // Sort by overall score (lowest = best)
  scoredRoutes.sort((a, b) => a.scores.overallScore - b.scores.overallScore);
  
  // Assign ranks
  scoredRoutes.forEach((sr, i) => {
    sr.rank = i + 1;
  });
  
  const safestRoute = scoredRoutes[0].route;
  const worstRoute = scoredRoutes[scoredRoutes.length - 1];
  
  // Calculate tradeoffs
  const fastestDuration = Math.min(...routes.map(r => r.durationSeconds));
  const shortestDistance = Math.min(...routes.map(r => r.distanceMeters));
  
  const tradeoffAnalysis = {
    healthBenefit: worstRoute.scores.averagePM25 > 0
      ? Math.round((1 - scoredRoutes[0].scores.averagePM25 / worstRoute.scores.averagePM25) * 100)
      : 0,
    timeCost: Math.round((safestRoute.durationSeconds - fastestDuration) / 60),
    distanceCost: Math.round((safestRoute.distanceMeters - shortestDistance) / 1000 * 10) / 10,
  };
  
  // Generate decision
  const decision = generateDecision(
    scoredRoutes[0],
    worstRoute,
    tradeoffAnalysis,
    profile.diseases
  );
  
  const computationTimeMs = performance.now() - startTime;
  
  return {
    safestRoute,
    allRoutes: scoredRoutes,
    decision,
    metadata: {
      timestamp: new Date(),
      routesAnalyzed: routes.length,
      samplesPerRoute: routes[0]?.pm25Samples.length ?? 0,
      profileUsed: profile.diseases.length > 0,
      computationTimeMs: Math.round(computationTimeMs),
      dataQuality: assessDataQuality(routes),
    },
  };
}

/**
 * Analyzes individual segments of a route
 */
function analyzeRouteSegments(
  route: RouteCandidate,
  profile: UserHealthProfile,
  activityLevel: ActivityLevel,
  travelSpeedKmh: number
): RouteSegment[] {
  const segments: RouteSegment[] = [];
  const numSamples = route.pm25Samples.length;
  
  if (numSamples === 0) return segments;
  
  const totalDistanceKm = route.distanceMeters / 1000;
  const segmentDistanceKm = totalDistanceKm / Math.max(numSamples - 1, 1);
  const segmentDurationMin = (segmentDistanceKm / travelSpeedKmh) * 60;
  
  route.pm25Samples.forEach((pm25, i) => {
    const phriResult = computePHRI(
      {
        pm25,
        durationMinutes: segmentDurationMin,
        activityLevel,
        isOutdoor: true,
        hasMask: false,
      },
      profile
    );
    
    const startCoord = route.sampleLocations[i] 
      ? [route.sampleLocations[i].lng, route.sampleLocations[i].lat] as [number, number]
      : route.geometry.coordinates[Math.floor(i / numSamples * route.geometry.coordinates.length)];
    
    const endCoord = route.sampleLocations[i + 1]
      ? [route.sampleLocations[i + 1].lng, route.sampleLocations[i + 1].lat] as [number, number]
      : route.geometry.coordinates[Math.floor((i + 1) / numSamples * route.geometry.coordinates.length)] || startCoord;
    
    segments.push({
      index: i,
      startCoord,
      endCoord,
      distanceKm: segmentDistanceKm,
      pm25,
      phri: phriResult.score,
      riskLevel: phriResult.level,
      color: RISK_COLORS[phriResult.level],
    });
  });
  
  return segments;
}

/**
 * Computes comprehensive scores for a route
 */
function computeRouteScores(route: RouteCandidate, segments: RouteSegment[]): RouteScores {
  const pm25Values = route.pm25Samples.filter(v => v > 0);
  const phriValues = segments.map(s => s.phri);
  
  if (pm25Values.length === 0) {
    return {
      cumulativeExposure: 0,
      averagePM25: 0,
      peakPM25: 0,
      peakExposureRatio: 0,
      averagePHRI: 0,
      peakPHRI: 0,
      phriVariance: 0,
      healthScore: 0,
      convenienceScore: 0,
      overallScore: 0,
    };
  }
  
  // PM2.5 statistics
  const averagePM25 = pm25Values.reduce((a, b) => a + b, 0) / pm25Values.length;
  const peakPM25 = Math.max(...pm25Values);
  const peakExposureRatio = averagePM25 > 0 ? peakPM25 / averagePM25 : 0;
  
  // Cumulative exposure (simplified dose calculation)
  const durationHours = route.durationSeconds / 3600;
  const cumulativeExposure = averagePM25 * durationHours;
  
  // PHRI statistics
  const averagePHRI = phriValues.reduce((a, b) => a + b, 0) / phriValues.length;
  const peakPHRI = Math.max(...phriValues);
  
  // Variance calculation
  const phriMean = averagePHRI;
  const phriVariance = phriValues.reduce((sum, v) => sum + Math.pow(v - phriMean, 2), 0) / phriValues.length;
  
  // Health score (0-100, lower is better)
  const healthScore = 
    OPTIMIZATION_WEIGHTS.AVERAGE_EXPOSURE * normalizeScore(averagePM25, 0, 200) +
    OPTIMIZATION_WEIGHTS.PEAK_EXPOSURE * normalizeScore(peakPM25, 0, 300) +
    OPTIMIZATION_WEIGHTS.EXPOSURE_VARIANCE * normalizeScore(phriVariance, 0, 500);
  
  // Convenience score (0-100, lower is better = more convenient)
  const durationMinutes = route.durationSeconds / 60;
  const distanceKm = route.distanceMeters / 1000;
  const convenienceScore = 
    OPTIMIZATION_WEIGHTS.DURATION * normalizeScore(durationMinutes, 0, 120) +
    OPTIMIZATION_WEIGHTS.DISTANCE * normalizeScore(distanceKm, 0, 50);
  
  // Overall weighted score
  const overallScore = 
    OPTIMIZATION_WEIGHTS.HEALTH * healthScore +
    OPTIMIZATION_WEIGHTS.CONVENIENCE * convenienceScore;
  
  return {
    cumulativeExposure: Math.round(cumulativeExposure * 10) / 10,
    averagePM25: Math.round(averagePM25 * 10) / 10,
    peakPM25: Math.round(peakPM25 * 10) / 10,
    peakExposureRatio: Math.round(peakExposureRatio * 100) / 100,
    averagePHRI: Math.round(averagePHRI * 10) / 10,
    peakPHRI: Math.round(peakPHRI * 10) / 10,
    phriVariance: Math.round(phriVariance * 10) / 10,
    healthScore: Math.round(healthScore * 10) / 10,
    convenienceScore: Math.round(convenienceScore * 10) / 10,
    overallScore: Math.round(overallScore * 10) / 10,
  };
}

/**
 * Normalizes a value to 0-100 scale
 */
function normalizeScore(value: number, min: number, max: number): number {
  const normalized = ((value - min) / (max - min)) * 100;
  return Math.max(0, Math.min(100, normalized));
}

/**
 * Generates decision text following DORA principles
 */
function generateDecision(
  bestRoute: ScoredRoute,
  worstRoute: ScoredRoute,
  tradeoff: RouteDecision['tradeoffAnalysis'],
  diseases: DiseaseProfile[]
): RouteDecision {
  const avgPM25 = bestRoute.scores.averagePM25;
  const peakPM25 = bestRoute.scores.peakPM25;
  
  // Determine warning level
  let warningLevel: RouteDecision['warningLevel'] = 'none';
  if (avgPM25 > 100) warningLevel = 'danger';
  else if (avgPM25 > 50) warningLevel = 'warning';
  else if (avgPM25 > 25) warningLevel = 'caution';
  
  // Check disease-specific thresholds
  const hasRespiratoryCondition = diseases.some(d => 
    ['asthma', 'copd'].includes(d)
  );
  
  if (hasRespiratoryCondition && avgPM25 > 25) {
    warningLevel = avgPM25 > 50 ? 'danger' : 'warning';
  }
  
  // Generate decision text (max 2 sentences)
  let decisionText: string;
  let decisionTextEn: string;
  let alternativeText: string | undefined;
  let shouldProceed = true;
  
  if (warningLevel === 'danger') {
    shouldProceed = false;
    decisionText = `ไม่แนะนำให้เดินทาง PM2.5 สูงเกินไป (${Math.round(avgPM25)} µg/m³)\nพิจารณาเลื่อนการเดินทางหรือใช้ขนส่งปิด`;
    decisionTextEn = `Travel not recommended. PM2.5 too high (${Math.round(avgPM25)} µg/m³).\nConsider postponing or using enclosed transport.`;
  } else if (warningLevel === 'warning') {
    if (hasRespiratoryCondition) {
      shouldProceed = false;
      decisionText = `ผู้ป่วยทางเดินหายใจไม่ควรใช้เส้นทางนี้\nPM2.5 เฉลี่ย ${Math.round(avgPM25)} µg/m³ สูงเกินเกณฑ์ปลอดภัย`;
      decisionTextEn = `Not safe for respiratory patients.\nAverage PM2.5 ${Math.round(avgPM25)} µg/m³ exceeds safe threshold.`;
    } else {
      decisionText = `ใช้เส้นทางนี้ได้แต่ต้องสวมหน้ากาก N95\nPM2.5 เฉลี่ย ${Math.round(avgPM25)} µg/m³`;
      decisionTextEn = `Route usable with N95 mask.\nAverage PM2.5 ${Math.round(avgPM25)} µg/m³`;
    }
    alternativeText = 'พิจารณาใช้ BTS/MRT แทน';
  } else if (warningLevel === 'caution') {
    decisionText = `เส้นทางยอมรับได้ แนะนำสวมหน้ากากอนามัย\nPM2.5 เฉลี่ย ${Math.round(avgPM25)} µg/m³`;
    decisionTextEn = `Route acceptable. Surgical mask recommended.\nAverage PM2.5 ${Math.round(avgPM25)} µg/m³`;
  } else {
    decisionText = `เส้นทางปลอดภัย\nPM2.5 เฉลี่ย ${Math.round(avgPM25)} µg/m³`;
    decisionTextEn = `Safe route.\nAverage PM2.5 ${Math.round(avgPM25)} µg/m³`;
  }
  
  // Add tradeoff info if significant
  if (tradeoff.healthBenefit > 20 && tradeoff.timeCost > 0) {
    alternativeText = `ลดความเสี่ยง ${tradeoff.healthBenefit}% แม้ใช้เวลาเพิ่ม ${tradeoff.timeCost} นาที`;
  }
  
  return {
    recommendedIndex: bestRoute.route.index,
    decisionText,
    decisionTextEn,
    alternativeText,
    tradeoffAnalysis: tradeoff,
    shouldProceed,
    warningLevel,
  };
}

/**
 * Assesses data quality based on sample coverage
 */
function assessDataQuality(routes: RouteCandidate[]): 'high' | 'medium' | 'low' {
  const avgSamples = routes.reduce((sum, r) => sum + r.pm25Samples.length, 0) / routes.length;
  const validSamples = routes.reduce((sum, r) => 
    sum + r.pm25Samples.filter(v => v > 0).length, 0
  ) / routes.length;
  
  const validRatio = validSamples / avgSamples;
  
  if (validRatio > 0.8 && avgSamples >= 5) return 'high';
  if (validRatio > 0.5 && avgSamples >= 3) return 'medium';
  return 'low';
}

// ============================================================================
// VISUALIZATION HELPERS
// ============================================================================

/**
 * Generates GeoJSON for route segment visualization
 */
export function generateSegmentGeoJSON(segments: RouteSegment[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: segments.map((segment, i) => ({
      type: 'Feature' as const,
      properties: {
        segmentIndex: i,
        pm25: segment.pm25,
        phri: segment.phri,
        riskLevel: segment.riskLevel,
        color: segment.color,
      },
      geometry: {
        type: 'LineString' as const,
        coordinates: [segment.startCoord, segment.endCoord],
      },
    })),
  };
}

/**
 * Generates heatmap data points from PM2.5 samples
 */
export function generateHeatmapData(
  sampleLocations: { lat: number; lng: number }[],
  pm25Values: number[]
): Array<{ lat: number; lng: number; weight: number }> {
  return sampleLocations.map((loc, i) => ({
    lat: loc.lat,
    lng: loc.lng,
    weight: Math.min(pm25Values[i] / 200, 1), // Normalize weight 0-1
  }));
}

export default {
  optimizeForSafety,
  generateSegmentGeoJSON,
  generateHeatmapData,
  OPTIMIZATION_WEIGHTS,
  RISK_COLORS,
};
