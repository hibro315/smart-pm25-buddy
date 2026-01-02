/**
 * Context-Aware Health Data Fusion Engine
 * 
 * "Same AQI ≠ Same Risk"
 * 
 * Fuses multiple data sources to understand:
 * - WHO: User health profile, age, conditions
 * - WHAT: Activity mode (walking, motorcycle, car, transit)
 * - WHERE: Location, indoor/outdoor, nearby pollution sources
 * - HOW LONG: Duration of exposure
 * 
 * @version 1.0.0
 */

import { 
  computePHRI, 
  type ExposureInput, 
  type UserHealthProfile, 
  type DiseaseProfile,
  type ActivityLevel,
  DISEASE_COEFFICIENTS 
} from './HealthRiskEngine';

// ============================================================================
// DATA FUSION TYPES
// ============================================================================

export interface EnvironmentalContext {
  pm25: number;
  aqi?: number;
  temperature?: number;
  humidity?: number;
  windSpeed?: number;
  windDirection?: string;
  weatherCondition?: 'clear' | 'cloudy' | 'rain' | 'haze' | 'storm';
  uvIndex?: number;
}

export interface LocationContext {
  latitude: number;
  longitude: number;
  locationType: 'outdoor' | 'indoor' | 'transit' | 'vehicle';
  nearbyPollutionSources?: ('traffic' | 'industrial' | 'construction' | 'agricultural')[];
  areaType?: 'urban' | 'suburban' | 'rural' | 'industrial';
  elevation?: number;
}

export interface ActivityContext {
  mode: 'walking' | 'cycling' | 'motorcycle' | 'car' | 'bus' | 'bts' | 'mrt' | 'stationary';
  intensity: ActivityLevel;
  durationMinutes: number;
  isExercising: boolean;
}

export interface UserContext {
  age: number;
  diseases: DiseaseProfile[];
  smokingStatus: 'never' | 'former' | 'current';
  hasMask: boolean;
  maskType?: 'n95' | 'surgical' | 'cloth' | 'none';
  currentSymptoms?: string[];
  recentExposureHours?: number; // Hours of PM2.5 exposure in last 24h
}

export interface FusedHealthContext {
  // Input contexts
  environment: EnvironmentalContext;
  location: LocationContext;
  activity: ActivityContext;
  user: UserContext;
  
  // Computed insights
  effectivePM25: number;           // Adjusted PM2.5 after all modifiers
  contextMultiplier: number;       // Combined context multiplier
  riskScore: number;               // 0-100 score
  riskLevel: 'safe' | 'caution' | 'warning' | 'danger';
  
  // Decision-ready outputs
  primaryDecision: string;
  supportingFacts: string[];
  actionableOptions: FusedOption[];
  safeWindow?: { start: string; end: string };
}

export interface FusedOption {
  id: string;
  action: string;
  riskReduction: number;  // 0-100 percentage reduction
  feasibility: 'easy' | 'moderate' | 'difficult';
  timeToImplement: string;
}

// ============================================================================
// CONTEXT MODIFIERS
// ============================================================================

/**
 * Activity mode modifiers - how much PM2.5 intake varies by transport mode
 */
const ACTIVITY_MODE_MODIFIERS: Record<ActivityContext['mode'], {
  exposureMultiplier: number;
  ventilationRate: 'low' | 'medium' | 'high' | 'very_high';
  protection: number; // 0-1, higher = more protected
}> = {
  walking: {
    exposureMultiplier: 1.0,
    ventilationRate: 'high',
    protection: 0,
  },
  cycling: {
    exposureMultiplier: 1.2, // Higher breathing rate
    ventilationRate: 'very_high',
    protection: 0,
  },
  motorcycle: {
    exposureMultiplier: 0.9, // Moving through air
    ventilationRate: 'high',
    protection: 0.1,
  },
  car: {
    exposureMultiplier: 0.4, // AC/filter
    ventilationRate: 'low',
    protection: 0.6,
  },
  bus: {
    exposureMultiplier: 0.5,
    ventilationRate: 'medium',
    protection: 0.5,
  },
  bts: {
    exposureMultiplier: 0.3, // Enclosed, filtered
    ventilationRate: 'low',
    protection: 0.7,
  },
  mrt: {
    exposureMultiplier: 0.2, // Underground, filtered
    ventilationRate: 'low',
    protection: 0.8,
  },
  stationary: {
    exposureMultiplier: 0.8,
    ventilationRate: 'low',
    protection: 0.2,
  },
};

/**
 * Weather condition modifiers
 */
const WEATHER_MODIFIERS: Record<NonNullable<EnvironmentalContext['weatherCondition']>, number> = {
  clear: 1.0,
  cloudy: 0.95,
  rain: 0.6,    // Rain washes out particulates
  haze: 1.2,    // Haze indicates poor dispersion
  storm: 0.5,   // Strong winds disperse
};

/**
 * Location type modifiers
 */
const LOCATION_MODIFIERS: Record<LocationContext['locationType'], number> = {
  outdoor: 1.0,
  indoor: 0.3,  // Typical indoor filtration
  transit: 0.5, // Station platforms
  vehicle: 0.4, // Inside vehicle
};

/**
 * Area type modifiers
 */
const AREA_MODIFIERS: Record<NonNullable<LocationContext['areaType']>, number> = {
  urban: 1.0,
  suburban: 0.8,
  rural: 0.6,
  industrial: 1.3,
};

// ============================================================================
// CORE FUSION ENGINE
// ============================================================================

export class ContextAwareHealthFusion {
  /**
   * Fuses all context data into a unified health assessment
   */
  static fuse(
    environment: EnvironmentalContext,
    location: LocationContext,
    activity: ActivityContext,
    user: UserContext
  ): FusedHealthContext {
    // Step 1: Calculate effective PM2.5 after environmental modifiers
    const effectivePM25 = this.calculateEffectivePM25(environment, location, activity);
    
    // Step 2: Calculate context multiplier
    const contextMultiplier = this.calculateContextMultiplier(environment, location, activity, user);
    
    // Step 3: Compute PHRI using the Health Risk Engine
    const phriResult = computePHRI(
      {
        pm25: effectivePM25,
        durationMinutes: activity.durationMinutes,
        activityLevel: activity.intensity,
        isOutdoor: location.locationType === 'outdoor',
        hasMask: user.hasMask,
        maskType: user.maskType,
      },
      {
        age: user.age,
        diseases: user.diseases,
        smokingStatus: user.smokingStatus,
      }
    );
    
    // Step 4: Determine risk level
    const riskScore = phriResult.score * contextMultiplier;
    const riskLevel = this.getRiskLevel(riskScore);
    
    // Step 5: Generate decision outputs
    const primaryDecision = this.generatePrimaryDecision(riskLevel, activity, environment);
    const supportingFacts = this.generateSupportingFacts(environment, location, activity, user);
    const actionableOptions = this.generateOptions(riskLevel, activity, user);
    const safeWindow = this.calculateSafeWindow(environment.pm25);
    
    return {
      environment,
      location,
      activity,
      user,
      effectivePM25: Math.round(effectivePM25 * 10) / 10,
      contextMultiplier: Math.round(contextMultiplier * 100) / 100,
      riskScore: Math.round(Math.min(riskScore, 100) * 10) / 10,
      riskLevel,
      primaryDecision,
      supportingFacts,
      actionableOptions,
      safeWindow,
    };
  }
  
  /**
   * Calculates effective PM2.5 exposure after all modifiers
   */
  private static calculateEffectivePM25(
    environment: EnvironmentalContext,
    location: LocationContext,
    activity: ActivityContext
  ): number {
    let effective = environment.pm25;
    
    // Apply activity mode modifier
    const modeModifier = ACTIVITY_MODE_MODIFIERS[activity.mode];
    effective *= modeModifier.exposureMultiplier;
    
    // Apply weather modifier
    if (environment.weatherCondition) {
      effective *= WEATHER_MODIFIERS[environment.weatherCondition];
    }
    
    // Apply location type modifier
    effective *= LOCATION_MODIFIERS[location.locationType];
    
    // Apply area type modifier
    if (location.areaType) {
      effective *= AREA_MODIFIERS[location.areaType];
    }
    
    // Temperature/humidity adjustments
    if (environment.temperature !== undefined && environment.humidity !== undefined) {
      // Hot + dry = worse dispersion
      if (environment.temperature > 35 && environment.humidity < 30) {
        effective *= 1.15;
      }
      // Cool + humid = better dispersion
      if (environment.temperature < 25 && environment.humidity > 60) {
        effective *= 0.9;
      }
    }
    
    // Wind speed adjustment
    if (environment.windSpeed !== undefined) {
      if (environment.windSpeed > 20) {
        effective *= 0.7; // Strong wind disperses
      } else if (environment.windSpeed < 5) {
        effective *= 1.1; // Calm = stagnant air
      }
    }
    
    return Math.max(0, effective);
  }
  
  /**
   * Calculates combined context multiplier for risk
   */
  private static calculateContextMultiplier(
    environment: EnvironmentalContext,
    location: LocationContext,
    activity: ActivityContext,
    user: UserContext
  ): number {
    let multiplier = 1.0;
    
    // Ventilation rate based on activity mode
    const modeInfo = ACTIVITY_MODE_MODIFIERS[activity.mode];
    const ventilationMultipliers = {
      low: 1.0,
      medium: 1.3,
      high: 1.6,
      very_high: 2.0,
    };
    multiplier *= ventilationMultipliers[modeInfo.ventilationRate];
    
    // Exercise increases intake
    if (activity.isExercising) {
      multiplier *= 1.5;
    }
    
    // Cumulative exposure in last 24h
    if (user.recentExposureHours !== undefined && user.recentExposureHours > 4) {
      multiplier *= 1.0 + (user.recentExposureHours - 4) * 0.05;
    }
    
    // Current symptoms indicate sensitivity
    if (user.currentSymptoms && user.currentSymptoms.length > 0) {
      multiplier *= 1.0 + user.currentSymptoms.length * 0.1;
    }
    
    // Nearby pollution sources
    if (location.nearbyPollutionSources && location.nearbyPollutionSources.length > 0) {
      multiplier *= 1.0 + location.nearbyPollutionSources.length * 0.1;
    }
    
    return Math.min(multiplier, 3.0); // Cap at 3x
  }
  
  /**
   * Determines risk level from score
   */
  private static getRiskLevel(score: number): FusedHealthContext['riskLevel'] {
    if (score < 25) return 'safe';
    if (score < 50) return 'caution';
    if (score < 75) return 'warning';
    return 'danger';
  }
  
  /**
   * Generates primary decision statement
   */
  private static generatePrimaryDecision(
    riskLevel: FusedHealthContext['riskLevel'],
    activity: ActivityContext,
    environment: EnvironmentalContext
  ): string {
    const decisions: Record<FusedHealthContext['riskLevel'], string[]> = {
      safe: [
        'ดำเนินกิจกรรมได้ตามปกติ',
        'สภาพอากาศเหมาะสำหรับกิจกรรมกลางแจ้ง',
      ],
      caution: [
        'ระวังอาการผิดปกติระหว่างกิจกรรม',
        'ลดเวลากิจกรรมกลางแจ้งลง 30%',
      ],
      warning: [
        'หลีกเลี่ยงกิจกรรมหนักกลางแจ้ง',
        'สวมหน้ากาก N95 หากต้องออกนอกอาคาร',
      ],
      danger: [
        'หลีกเลี่ยงกิจกรรมกลางแจ้งทั้งหมด',
        'อยู่ในอาคารที่มีเครื่องฟอกอากาศ',
      ],
    };
    
    return decisions[riskLevel][0];
  }
  
  /**
   * Generates supporting facts for the decision
   */
  private static generateSupportingFacts(
    environment: EnvironmentalContext,
    location: LocationContext,
    activity: ActivityContext,
    user: UserContext
  ): string[] {
    const facts: string[] = [];
    
    // PM2.5 level
    facts.push(`PM2.5: ${environment.pm25} µg/m³`);
    
    // Activity mode impact
    const modeInfo = ACTIVITY_MODE_MODIFIERS[activity.mode];
    if (modeInfo.exposureMultiplier > 1) {
      facts.push(`การ${this.getModeLabel(activity.mode)} เพิ่มการรับสัมผัส ${Math.round((modeInfo.exposureMultiplier - 1) * 100)}%`);
    } else if (modeInfo.exposureMultiplier < 1) {
      facts.push(`${this.getModeLabel(activity.mode)} ลดการรับสัมผัส ${Math.round((1 - modeInfo.exposureMultiplier) * 100)}%`);
    }
    
    // Disease sensitivity
    if (user.diseases.length > 0) {
      const primaryDisease = user.diseases[0];
      const coefficient = DISEASE_COEFFICIENTS[primaryDisease];
      if (coefficient) {
        facts.push(`ความไวต่อมลพิษสูงกว่าปกติ ${Math.round((coefficient.sensitivity - 1) * 100)}%`);
      }
    }
    
    // Duration impact
    if (activity.durationMinutes > 60) {
      facts.push(`ระยะเวลา ${activity.durationMinutes} นาที เพิ่มความเสี่ยงสะสม`);
    }
    
    // Weather
    if (environment.weatherCondition === 'rain') {
      facts.push('ฝนช่วยลดฝุ่นในอากาศ');
    } else if (environment.weatherCondition === 'haze') {
      facts.push('หมอกควันบ่งชี้การกระจายตัวไม่ดี');
    }
    
    return facts.slice(0, 4); // Max 4 facts
  }
  
  /**
   * Generates actionable options
   */
  private static generateOptions(
    riskLevel: FusedHealthContext['riskLevel'],
    activity: ActivityContext,
    user: UserContext
  ): FusedOption[] {
    const options: FusedOption[] = [];
    
    if (riskLevel === 'safe') {
      return [{
        id: 'proceed',
        action: 'ดำเนินการได้เลย',
        riskReduction: 0,
        feasibility: 'easy',
        timeToImplement: 'ทันที',
      }];
    }
    
    // Mask option
    if (!user.hasMask) {
      options.push({
        id: 'wear_n95',
        action: 'สวมหน้ากาก N95',
        riskReduction: 75,
        feasibility: 'easy',
        timeToImplement: 'ทันที',
      });
    }
    
    // Mode change options
    if (activity.mode === 'walking' || activity.mode === 'cycling') {
      options.push({
        id: 'use_transit',
        action: 'ใช้ BTS/MRT แทน',
        riskReduction: 60,
        feasibility: 'moderate',
        timeToImplement: '10-15 นาที',
      });
    }
    
    if (activity.mode === 'motorcycle') {
      options.push({
        id: 'use_car',
        action: 'ใช้รถยนต์ (เปิดแอร์)',
        riskReduction: 50,
        feasibility: 'moderate',
        timeToImplement: 'ขึ้นกับการเข้าถึง',
      });
    }
    
    // Duration reduction
    if (activity.durationMinutes > 30) {
      options.push({
        id: 'reduce_duration',
        action: 'ลดเวลากลางแจ้ง 50%',
        riskReduction: 40,
        feasibility: 'moderate',
        timeToImplement: 'ปรับแผน',
      });
    }
    
    // Postpone option for high risk
    if (riskLevel === 'warning' || riskLevel === 'danger') {
      options.push({
        id: 'postpone',
        action: 'เลื่อนกิจกรรมไป 18:00-20:00',
        riskReduction: 50,
        feasibility: 'difficult',
        timeToImplement: 'รอ 4-6 ชม.',
      });
    }
    
    // Stay indoor for danger
    if (riskLevel === 'danger') {
      options.push({
        id: 'stay_indoor',
        action: 'อยู่ในอาคารที่มีฟิลเตอร์',
        riskReduction: 80,
        feasibility: 'easy',
        timeToImplement: 'ทันที',
      });
    }
    
    return options.slice(0, 4); // Max 4 options
  }
  
  /**
   * Calculates predicted safe window for outdoor activities
   */
  private static calculateSafeWindow(currentPM25: number): { start: string; end: string } | undefined {
    // Based on typical daily PM2.5 patterns in Bangkok
    // Morning rush: 7-9 AM (high)
    // Midday: 11-15 (lower)
    // Evening rush: 17-20 (high then drops)
    // Night: 21-06 (lowest)
    
    if (currentPM25 < 25) {
      return undefined; // Already safe
    }
    
    const hour = new Date().getHours();
    
    // If currently in high period, suggest wait
    if (hour >= 7 && hour < 10) {
      return { start: '11:00', end: '14:00' };
    }
    if (hour >= 16 && hour < 19) {
      return { start: '20:00', end: '22:00' };
    }
    
    // Default evening window
    return { start: '19:00', end: '21:00' };
  }
  
  /**
   * Gets human-readable mode label
   */
  private static getModeLabel(mode: ActivityContext['mode']): string {
    const labels: Record<ActivityContext['mode'], string> = {
      walking: 'เดินเท้า',
      cycling: 'ปั่นจักรยาน',
      motorcycle: 'มอเตอร์ไซค์',
      car: 'รถยนต์',
      bus: 'รถเมล์',
      bts: 'BTS',
      mrt: 'MRT',
      stationary: 'นั่ง/ยืน',
    };
    return labels[mode];
  }
  
  /**
   * Quick context check - returns simple go/no-go decision
   */
  static quickCheck(
    pm25: number,
    mode: ActivityContext['mode'],
    durationMinutes: number,
    hasConditions: boolean
  ): { safe: boolean; reason: string } {
    const baseThreshold = hasConditions ? 35 : 50;
    const modeModifier = ACTIVITY_MODE_MODIFIERS[mode].exposureMultiplier;
    const effectiveThreshold = baseThreshold / modeModifier;
    
    if (pm25 > effectiveThreshold) {
      return {
        safe: false,
        reason: `PM2.5 ${pm25} µg/m³ สูงกว่าเกณฑ์สำหรับ${this.getModeLabel(mode)}`,
      };
    }
    
    if (durationMinutes > 120 && pm25 > 25) {
      return {
        safe: false,
        reason: 'ระยะเวลานานเกินไปสำหรับระดับ PM2.5 นี้',
      };
    }
    
    return {
      safe: true,
      reason: 'สามารถดำเนินกิจกรรมได้',
    };
  }
}

export default ContextAwareHealthFusion;
