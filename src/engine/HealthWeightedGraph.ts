/**
 * Health-Weighted Navigation Graph
 * 
 * "Safest path ≠ Shortest path"
 * 
 * Graph-based navigation where:
 * - Node = location point
 * - Edge = connection with exposure cost
 * - Weight = disease-adjusted health risk
 * 
 * This enables finding the healthiest route, not just the fastest.
 * 
 * @version 1.0.0
 */

import { 
  computePHRI, 
  type DiseaseProfile, 
  type ActivityLevel,
  DISEASE_COEFFICIENTS 
} from './HealthRiskEngine';

// ============================================================================
// GRAPH TYPES
// ============================================================================

export interface GraphNode {
  id: string;
  latitude: number;
  longitude: number;
  pm25: number;
  aqi?: number;
  locationType?: 'outdoor' | 'indoor' | 'transit' | 'underground';
  elevation?: number;
  timestamp?: number;
}

export interface GraphEdge {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  distanceMeters: number;
  durationSeconds: number;
  
  // Health weights
  exposureCost: number;        // Base PM2.5 exposure (µg/m³ × minutes)
  healthWeight: number;        // Disease-adjusted weight (0-100)
  riskLevel: 'low' | 'moderate' | 'high' | 'severe';
  
  // Road characteristics
  roadType?: 'highway' | 'main' | 'secondary' | 'residential' | 'pedestrian';
  trafficLevel?: 'low' | 'medium' | 'high';
  hasGreenCover?: boolean;
}

export interface HealthGraph {
  nodes: Map<string, GraphNode>;
  edges: Map<string, GraphEdge>;
  adjacencyList: Map<string, string[]>; // nodeId -> connected edgeIds
}

export interface RouteResult {
  nodes: GraphNode[];
  edges: GraphEdge[];
  
  // Aggregate metrics
  totalDistanceMeters: number;
  totalDurationSeconds: number;
  totalExposureCost: number;
  averageHealthWeight: number;
  maxHealthWeight: number;
  
  // Risk profile
  overallRiskLevel: 'low' | 'moderate' | 'high' | 'severe';
  highRiskSegments: number;   // Count of high/severe segments
  recommendation: string;
  
  // For visualization
  segmentColors: string[];
}

export interface RouteComparisonResult {
  routes: RouteResult[];
  safestRouteIndex: number;
  fastestRouteIndex: number;
  healthSavings: number;       // % reduction vs fastest route
  timeCost: number;            // Extra minutes for safer route
  recommendation: string;
}

// ============================================================================
// WEIGHT CALCULATION
// ============================================================================

/**
 * Road type base modifiers (affect local PM2.5)
 */
const ROAD_TYPE_MODIFIERS: Record<NonNullable<GraphEdge['roadType']>, number> = {
  highway: 1.4,      // High traffic emissions
  main: 1.2,         // Busy roads
  secondary: 1.0,    // Normal roads
  residential: 0.8,  // Less traffic
  pedestrian: 0.6,   // Car-free zones
};

/**
 * Traffic level modifiers
 */
const TRAFFIC_MODIFIERS: Record<NonNullable<GraphEdge['trafficLevel']>, number> = {
  low: 0.8,
  medium: 1.0,
  high: 1.3,
};

/**
 * Green cover reduces exposure
 */
const GREEN_COVER_REDUCTION = 0.85; // 15% reduction

// ============================================================================
// CORE GRAPH ENGINE
// ============================================================================

export class HealthWeightedGraph {
  private graph: HealthGraph;
  private userDiseases: DiseaseProfile[];
  private activityLevel: ActivityLevel;
  private travelMode: 'walking' | 'cycling' | 'driving';
  
  constructor(
    diseases: DiseaseProfile[] = ['general'],
    activityLevel: ActivityLevel = 'light',
    travelMode: 'walking' | 'cycling' | 'driving' = 'walking'
  ) {
    this.graph = {
      nodes: new Map(),
      edges: new Map(),
      adjacencyList: new Map(),
    };
    this.userDiseases = diseases;
    this.activityLevel = activityLevel;
    this.travelMode = travelMode;
  }
  
  /**
   * Builds a health-weighted graph from route data
   */
  buildFromRoute(
    coordinates: [number, number][],
    pm25Samples: number[],
    totalDurationSeconds: number
  ): void {
    this.graph = {
      nodes: new Map(),
      edges: new Map(),
      adjacencyList: new Map(),
    };
    
    // Create nodes
    const segmentDuration = totalDurationSeconds / Math.max(coordinates.length - 1, 1);
    
    coordinates.forEach((coord, i) => {
      const nodeId = `node_${i}`;
      const node: GraphNode = {
        id: nodeId,
        latitude: coord[1],
        longitude: coord[0],
        pm25: pm25Samples[i] ?? pm25Samples[pm25Samples.length - 1] ?? 0,
        timestamp: Date.now(),
      };
      this.graph.nodes.set(nodeId, node);
      this.graph.adjacencyList.set(nodeId, []);
    });
    
    // Create edges
    for (let i = 0; i < coordinates.length - 1; i++) {
      const fromNode = this.graph.nodes.get(`node_${i}`)!;
      const toNode = this.graph.nodes.get(`node_${i + 1}`)!;
      
      const edgeId = `edge_${i}`;
      const distance = this.calculateDistance(
        fromNode.latitude, fromNode.longitude,
        toNode.latitude, toNode.longitude
      );
      
      const avgPM25 = (fromNode.pm25 + toNode.pm25) / 2;
      const edge = this.createEdge(edgeId, fromNode.id, toNode.id, distance, segmentDuration, avgPM25);
      
      this.graph.edges.set(edgeId, edge);
      this.graph.adjacencyList.get(fromNode.id)!.push(edgeId);
    }
  }
  
  /**
   * Creates a weighted edge between two nodes
   */
  private createEdge(
    id: string,
    fromNodeId: string,
    toNodeId: string,
    distanceMeters: number,
    durationSeconds: number,
    pm25: number,
    roadType: GraphEdge['roadType'] = 'secondary',
    trafficLevel: GraphEdge['trafficLevel'] = 'medium',
    hasGreenCover: boolean = false
  ): GraphEdge {
    // Calculate exposure cost
    const durationMinutes = durationSeconds / 60;
    let effectivePM25 = pm25;
    
    // Apply road modifiers
    effectivePM25 *= ROAD_TYPE_MODIFIERS[roadType];
    effectivePM25 *= TRAFFIC_MODIFIERS[trafficLevel];
    if (hasGreenCover) effectivePM25 *= GREEN_COVER_REDUCTION;
    
    const exposureCost = effectivePM25 * durationMinutes;
    
    // Calculate health weight using PHRI engine
    const phriResult = computePHRI(
      {
        pm25: effectivePM25,
        durationMinutes,
        activityLevel: this.activityLevel,
        isOutdoor: true,
        hasMask: false,
      },
      {
        age: 30, // Default, should be parameterized
        diseases: this.userDiseases,
        smokingStatus: 'never',
      }
    );
    
    const healthWeight = phriResult.score;
    const riskLevel = phriResult.level;
    
    return {
      id,
      fromNodeId,
      toNodeId,
      distanceMeters,
      durationSeconds,
      exposureCost: Math.round(exposureCost * 10) / 10,
      healthWeight: Math.round(healthWeight * 10) / 10,
      riskLevel,
      roadType,
      trafficLevel,
      hasGreenCover,
    };
  }
  
  /**
   * Calculates route result for the current graph
   */
  calculateRoute(): RouteResult {
    const nodes = Array.from(this.graph.nodes.values());
    const edges = Array.from(this.graph.edges.values());
    
    if (edges.length === 0) {
      return this.createEmptyResult();
    }
    
    // Aggregate metrics
    const totalDistanceMeters = edges.reduce((sum, e) => sum + e.distanceMeters, 0);
    const totalDurationSeconds = edges.reduce((sum, e) => sum + e.durationSeconds, 0);
    const totalExposureCost = edges.reduce((sum, e) => sum + e.exposureCost, 0);
    const averageHealthWeight = edges.reduce((sum, e) => sum + e.healthWeight, 0) / edges.length;
    const maxHealthWeight = Math.max(...edges.map(e => e.healthWeight));
    
    // Count high risk segments
    const highRiskSegments = edges.filter(e => 
      e.riskLevel === 'high' || e.riskLevel === 'severe'
    ).length;
    
    // Overall risk level
    const overallRiskLevel = this.determineOverallRisk(averageHealthWeight, maxHealthWeight);
    
    // Generate recommendation
    const recommendation = this.generateRouteRecommendation(overallRiskLevel, highRiskSegments, edges.length);
    
    // Generate colors for visualization
    const segmentColors = edges.map(e => this.getRiskColor(e.riskLevel));
    
    return {
      nodes,
      edges,
      totalDistanceMeters: Math.round(totalDistanceMeters),
      totalDurationSeconds: Math.round(totalDurationSeconds),
      totalExposureCost: Math.round(totalExposureCost * 10) / 10,
      averageHealthWeight: Math.round(averageHealthWeight * 10) / 10,
      maxHealthWeight: Math.round(maxHealthWeight * 10) / 10,
      overallRiskLevel,
      highRiskSegments,
      recommendation,
      segmentColors,
    };
  }
  
  /**
   * Compares multiple routes and finds the safest
   */
  static compareRoutes(
    routes: Array<{
      coordinates: [number, number][];
      pm25Samples: number[];
      durationSeconds: number;
    }>,
    diseases: DiseaseProfile[] = ['general'],
    activityLevel: ActivityLevel = 'light'
  ): RouteComparisonResult {
    const results: RouteResult[] = routes.map(route => {
      const graph = new HealthWeightedGraph(diseases, activityLevel);
      graph.buildFromRoute(route.coordinates, route.pm25Samples, route.durationSeconds);
      return graph.calculateRoute();
    });
    
    // Find safest (lowest average health weight)
    let safestIndex = 0;
    let lowestWeight = Infinity;
    results.forEach((r, i) => {
      if (r.averageHealthWeight < lowestWeight) {
        lowestWeight = r.averageHealthWeight;
        safestIndex = i;
      }
    });
    
    // Find fastest (lowest duration)
    let fastestIndex = 0;
    let lowestDuration = Infinity;
    results.forEach((r, i) => {
      if (r.totalDurationSeconds < lowestDuration) {
        lowestDuration = r.totalDurationSeconds;
        fastestIndex = i;
      }
    });
    
    // Calculate health savings
    const fastestWeight = results[fastestIndex].averageHealthWeight;
    const safestWeight = results[safestIndex].averageHealthWeight;
    const healthSavings = fastestWeight > 0 
      ? Math.round((1 - safestWeight / fastestWeight) * 100)
      : 0;
    
    // Calculate time cost
    const safestDuration = results[safestIndex].totalDurationSeconds;
    const fastestDuration = results[fastestIndex].totalDurationSeconds;
    const timeCost = Math.round((safestDuration - fastestDuration) / 60);
    
    // Generate recommendation
    let recommendation: string;
    if (safestIndex === fastestIndex) {
      recommendation = 'เส้นทางที่เร็วที่สุดก็ปลอดภัยที่สุด';
    } else if (healthSavings > 30) {
      recommendation = `เลือกเส้นทาง ${safestIndex + 1} ลดความเสี่ยง ${healthSavings}% (เพิ่ม ${timeCost} นาที)`;
    } else if (timeCost > 15) {
      recommendation = `เส้นทาง ${fastestIndex + 1} เร็วกว่ามาก ความเสี่ยงต่างกันเล็กน้อย`;
    } else {
      recommendation = `เส้นทาง ${safestIndex + 1} แนะนำ ปลอดภัยกว่าเล็กน้อย`;
    }
    
    return {
      routes: results,
      safestRouteIndex: safestIndex,
      fastestRouteIndex: fastestIndex,
      healthSavings,
      timeCost,
      recommendation,
    };
  }
  
  /**
   * Calculates disease-adjusted threshold for a user
   */
  static getPersonalizedThreshold(diseases: DiseaseProfile[]): number {
    if (diseases.length === 0) return 50; // Thai PCD standard
    
    // Use the most restrictive threshold
    const thresholds = diseases.map(d => DISEASE_COEFFICIENTS[d]?.pm25Threshold ?? 50);
    return Math.min(...thresholds);
  }
  
  /**
   * Gets weight multiplier for user's conditions
   */
  static getSensitivityMultiplier(diseases: DiseaseProfile[]): number {
    if (diseases.length === 0) return 1.0;
    
    const coefficients = diseases.map(d => DISEASE_COEFFICIENTS[d]?.sensitivity ?? 1.0);
    
    // Geometric mean for multiple conditions
    const product = coefficients.reduce((a, b) => a * b, 1);
    return Math.pow(product, 1 / coefficients.length);
  }
  
  // ============================================================================
  // HELPER METHODS
  // ============================================================================
  
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
  
  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }
  
  private determineOverallRisk(avgWeight: number, maxWeight: number): RouteResult['overallRiskLevel'] {
    // Use a combination of average and max
    const combined = avgWeight * 0.7 + maxWeight * 0.3;
    
    if (combined < 25) return 'low';
    if (combined < 50) return 'moderate';
    if (combined < 75) return 'high';
    return 'severe';
  }
  
  private generateRouteRecommendation(
    risk: RouteResult['overallRiskLevel'],
    highRiskSegments: number,
    totalSegments: number
  ): string {
    const highRiskPercent = Math.round((highRiskSegments / totalSegments) * 100);
    
    if (risk === 'low') {
      return 'เส้นทางนี้ปลอดภัยสำหรับสุขภาพ';
    }
    if (risk === 'moderate') {
      if (highRiskPercent > 30) {
        return `${highRiskPercent}% ของเส้นทางมีความเสี่ยงสูง พิจารณาสวมหน้ากาก`;
      }
      return 'ระวังบริเวณที่มีฝุ่นหนาแน่น';
    }
    if (risk === 'high') {
      return 'เส้นทางนี้มีความเสี่ยงสูง แนะนำหน้ากาก N95 หรือเลือกเส้นทางอื่น';
    }
    return 'ไม่แนะนำเส้นทางนี้ ความเสี่ยงสูงมาก';
  }
  
  private getRiskColor(level: GraphEdge['riskLevel']): string {
    const colors: Record<GraphEdge['riskLevel'], string> = {
      low: '#22c55e',      // Green
      moderate: '#f59e0b', // Amber
      high: '#ef4444',     // Red
      severe: '#7c2d12',   // Dark red
    };
    return colors[level];
  }
  
  private createEmptyResult(): RouteResult {
    return {
      nodes: [],
      edges: [],
      totalDistanceMeters: 0,
      totalDurationSeconds: 0,
      totalExposureCost: 0,
      averageHealthWeight: 0,
      maxHealthWeight: 0,
      overallRiskLevel: 'low',
      highRiskSegments: 0,
      recommendation: 'ไม่มีข้อมูลเส้นทาง',
      segmentColors: [],
    };
  }
  
  // ============================================================================
  // PUBLIC ACCESSORS
  // ============================================================================
  
  getNodes(): GraphNode[] {
    return Array.from(this.graph.nodes.values());
  }
  
  getEdges(): GraphEdge[] {
    return Array.from(this.graph.edges.values());
  }
  
  getGraph(): HealthGraph {
    return this.graph;
  }
}

export default HealthWeightedGraph;
