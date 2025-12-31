/**
 * Risk Engine - Deterministic Health Risk Scoring
 * 
 * Computes a reproducible risk score (0-100) based on:
 * - Exposure risk (PM2.5, AQI levels)
 * - Vulnerability modifier (age, health conditions)
 * - Travel mode modifier
 * - Duration modifier
 * 
 * @version 1.0.0
 */

import {
  PM25_THRESHOLDS,
  AQI_THRESHOLDS,
  RISK_WEIGHTS,
  VULNERABILITY_MODIFIERS,
  TRAVEL_MODIFIERS,
  DURATION_MODIFIERS,
  RISK_CATEGORIES,
  type TravelMode,
  type HealthCondition,
  type SensitivityLevel,
  type RiskCategory,
} from '@/config/constants';

// ============================================================================
// TYPES
// ============================================================================

export interface AirQualityInput {
  pm25: number;
  aqi?: number;
  temperature?: number;
  humidity?: number;
}

export interface UserProfile {
  age: number;
  conditions: HealthCondition[];
  sensitivity: SensitivityLevel;
  hasMask?: boolean;
  maskType?: 'n95' | 'surgical' | 'cloth' | 'none';
}

export interface TravelInput {
  mode: TravelMode;
  durationMinutes: number;
  isOutdoor?: boolean;
}

export interface RiskScore {
  total: number;
  baseExposure: number;
  vulnerabilityModifier: number;
  travelModifier: number;
  durationModifier: number;
  category: RiskCategory;
  categoryLabel: string;
  categoryLabelEn: string;
  color: string;
}

export interface RiskBreakdown {
  score: RiskScore;
  factors: {
    name: string;
    value: number;
    impact: 'positive' | 'negative' | 'neutral';
    description: string;
  }[];
  recommendations: string[];
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Clamps a value between min and max
 */
const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

/**
 * Validates input data ranges
 */
const validateAirQuality = (data: AirQualityInput): boolean => {
  if (data.pm25 < 0 || data.pm25 > 1000) return false;
  if (data.aqi !== undefined && (data.aqi < 0 || data.aqi > 500)) return false;
  return true;
};

/**
 * Gets PM2.5 threshold category
 */
export const getPM25Category = (pm25: number): keyof typeof PM25_THRESHOLDS => {
  if (pm25 <= PM25_THRESHOLDS.GOOD.max) return 'GOOD';
  if (pm25 <= PM25_THRESHOLDS.SATISFACTORY.max) return 'SATISFACTORY';
  if (pm25 <= PM25_THRESHOLDS.MODERATE.max) return 'MODERATE';
  if (pm25 <= PM25_THRESHOLDS.UNHEALTHY_SENSITIVE.max) return 'UNHEALTHY_SENSITIVE';
  if (pm25 <= PM25_THRESHOLDS.UNHEALTHY.max) return 'UNHEALTHY';
  if (pm25 <= PM25_THRESHOLDS.VERY_UNHEALTHY.max) return 'VERY_UNHEALTHY';
  return 'HAZARDOUS';
};

/**
 * Gets AQI threshold category
 */
export const getAQICategory = (aqi: number): keyof typeof AQI_THRESHOLDS => {
  if (aqi <= AQI_THRESHOLDS.GOOD.max) return 'GOOD';
  if (aqi <= AQI_THRESHOLDS.MODERATE.max) return 'MODERATE';
  if (aqi <= AQI_THRESHOLDS.UNHEALTHY_SENSITIVE.max) return 'UNHEALTHY_SENSITIVE';
  if (aqi <= AQI_THRESHOLDS.UNHEALTHY.max) return 'UNHEALTHY';
  if (aqi <= AQI_THRESHOLDS.VERY_UNHEALTHY.max) return 'VERY_UNHEALTHY';
  return 'HAZARDOUS';
};

// ============================================================================
// CORE RISK CALCULATIONS
// ============================================================================

/**
 * Calculates base exposure risk from air quality data
 * Formula: (PM2.5 / 500) * 100 * weight + (AQI / 500) * 100 * weight
 */
const calculateBaseExposure = (airQuality: AirQualityInput): number => {
  const pm25Score = (airQuality.pm25 / 500) * 100 * RISK_WEIGHTS.PM25_BASE_WEIGHT;
  const aqiScore = airQuality.aqi 
    ? (airQuality.aqi / 500) * 100 * RISK_WEIGHTS.AQI_WEIGHT 
    : 0;
  
  // Weather factor (high temp + low humidity = worse dispersion)
  let weatherFactor = 1.0;
  if (airQuality.temperature !== undefined && airQuality.humidity !== undefined) {
    if (airQuality.temperature > 35 && airQuality.humidity < 40) {
      weatherFactor = 1.1;
    } else if (airQuality.temperature < 20 && airQuality.humidity > 80) {
      weatherFactor = 0.95;
    }
  }

  return clamp((pm25Score + aqiScore) * weatherFactor, 0, 100);
};

/**
 * Calculates vulnerability modifier based on user profile
 * Combines age, health conditions, and sensitivity
 */
const calculateVulnerabilityModifier = (profile: UserProfile): number => {
  let modifier = 1.0;

  // Age modifier
  const { AGE_CHILD, AGE_TEEN, AGE_ADULT, AGE_ELDERLY } = VULNERABILITY_MODIFIERS;
  if (profile.age <= AGE_CHILD.max) {
    modifier *= AGE_CHILD.modifier;
  } else if (profile.age <= AGE_TEEN.max) {
    modifier *= AGE_TEEN.modifier;
  } else if (profile.age <= AGE_ADULT.max) {
    modifier *= AGE_ADULT.modifier;
  } else {
    modifier *= AGE_ELDERLY.modifier;
  }

  // Health conditions (cumulative, but with diminishing returns)
  const conditionModifiers = profile.conditions.map(
    condition => VULNERABILITY_MODIFIERS.CONDITIONS[condition] || 1.0
  );
  
  if (conditionModifiers.length > 0) {
    // Sort descending and apply diminishing returns
    conditionModifiers.sort((a, b) => b - a);
    const primaryModifier = conditionModifiers[0];
    const secondaryModifiers = conditionModifiers.slice(1).reduce(
      (sum, mod) => sum + (mod - 1) * 0.3, // 30% of additional modifiers
      0
    );
    modifier *= primaryModifier + secondaryModifiers;
  }

  // Sensitivity level
  modifier *= VULNERABILITY_MODIFIERS.SENSITIVITY[profile.sensitivity] || 1.0;

  // Mask protection (reduces exposure)
  if (profile.hasMask && profile.maskType) {
    const maskProtection: Record<string, number> = {
      n95: 0.05, // 95% reduction
      surgical: 0.5, // 50% reduction
      cloth: 0.7, // 30% reduction
      none: 1.0,
    };
    modifier *= maskProtection[profile.maskType] || 1.0;
  }

  return modifier;
};

/**
 * Calculates travel mode modifier
 */
const calculateTravelModifier = (mode: TravelMode): number => {
  return TRAVEL_MODIFIERS[mode]?.modifier || 1.0;
};

/**
 * Calculates duration modifier
 */
const calculateDurationModifier = (durationMinutes: number): number => {
  if (durationMinutes <= DURATION_MODIFIERS.SHORT.max) {
    return DURATION_MODIFIERS.SHORT.modifier;
  }
  if (durationMinutes <= DURATION_MODIFIERS.MEDIUM.max) {
    return DURATION_MODIFIERS.MEDIUM.modifier;
  }
  if (durationMinutes <= DURATION_MODIFIERS.LONG.max) {
    return DURATION_MODIFIERS.LONG.modifier;
  }
  return DURATION_MODIFIERS.EXTENDED.modifier;
};

/**
 * Maps risk score to category
 */
const getRiskCategory = (score: number): RiskCategory => {
  if (score <= RISK_CATEGORIES.LOW.max) return 'LOW';
  if (score <= RISK_CATEGORIES.MODERATE.max) return 'MODERATE';
  if (score <= RISK_CATEGORIES.HIGH.max) return 'HIGH';
  return 'SEVERE';
};

// ============================================================================
// MAIN RISK ENGINE CLASS
// ============================================================================

export class RiskEngine {
  /**
   * Computes the complete risk score
   * 
   * @param airQuality - Air quality data (PM2.5, AQI, etc.)
   * @param profile - User health profile
   * @param travel - Travel mode and duration
   * @returns RiskScore object with all components
   */
  static compute(
    airQuality: AirQualityInput,
    profile: UserProfile,
    travel: TravelInput
  ): RiskScore {
    // Validate input
    if (!validateAirQuality(airQuality)) {
      console.warn('Invalid air quality data, using defaults');
      airQuality = { pm25: 0, aqi: 0 };
    }

    // Calculate components
    const baseExposure = calculateBaseExposure(airQuality);
    const vulnerabilityModifier = calculateVulnerabilityModifier(profile);
    const travelModifier = calculateTravelModifier(travel.mode);
    const durationModifier = calculateDurationModifier(travel.durationMinutes);

    // Combine modifiers
    const totalModifier = vulnerabilityModifier * travelModifier * durationModifier;
    const totalScore = clamp(baseExposure * totalModifier, 0, 100);

    // Get category
    const category = getRiskCategory(totalScore);
    const categoryInfo = RISK_CATEGORIES[category];

    return {
      total: Math.round(totalScore * 10) / 10, // Round to 1 decimal
      baseExposure: Math.round(baseExposure * 10) / 10,
      vulnerabilityModifier: Math.round(vulnerabilityModifier * 100) / 100,
      travelModifier,
      durationModifier,
      category,
      categoryLabel: categoryInfo.label,
      categoryLabelEn: categoryInfo.labelEn,
      color: categoryInfo.color,
    };
  }

  /**
   * Computes risk with detailed breakdown and recommendations
   */
  static computeWithBreakdown(
    airQuality: AirQualityInput,
    profile: UserProfile,
    travel: TravelInput
  ): RiskBreakdown {
    const score = this.compute(airQuality, profile, travel);
    
    const factors: RiskBreakdown['factors'] = [];
    
    // Add exposure factor
    factors.push({
      name: 'ค่า PM2.5',
      value: airQuality.pm25,
      impact: airQuality.pm25 > 50 ? 'negative' : airQuality.pm25 > 25 ? 'neutral' : 'positive',
      description: `${PM25_THRESHOLDS[getPM25Category(airQuality.pm25)].label}`,
    });

    // Add vulnerability factors
    if (profile.conditions.length > 0) {
      factors.push({
        name: 'โรคประจำตัว',
        value: profile.conditions.length,
        impact: 'negative',
        description: `มี ${profile.conditions.length} โรคที่เพิ่มความเสี่ยง`,
      });
    }

    // Add travel factor
    factors.push({
      name: 'วิธีการเดินทาง',
      value: score.travelModifier,
      impact: score.travelModifier > 1.2 ? 'negative' : score.travelModifier < 0.9 ? 'positive' : 'neutral',
      description: TRAVEL_MODIFIERS[travel.mode].label,
    });

    // Generate recommendations based on risk level
    const recommendations = this.generateRecommendations(score, airQuality, travel);

    return { score, factors, recommendations };
  }

  /**
   * Generates actionable recommendations
   */
  static generateRecommendations(
    score: RiskScore,
    airQuality: AirQualityInput,
    travel: TravelInput
  ): string[] {
    const recommendations: string[] = [];

    if (score.category === 'SEVERE') {
      recommendations.push('หลีกเลี่ยงกิจกรรมกลางแจ้งทั้งหมด');
      recommendations.push('ใช้เครื่องฟอกอากาศในอาคาร');
      recommendations.push('สวมหน้ากาก N95 หากต้องออกนอกอาคาร');
    } else if (score.category === 'HIGH') {
      recommendations.push('ลดเวลากิจกรรมกลางแจ้ง');
      recommendations.push('สวมหน้ากากอนามัย');
      if (travel.mode === 'walking' || travel.mode === 'cycling') {
        recommendations.push('พิจารณาใช้ BTS/MRT แทน');
      }
    } else if (score.category === 'MODERATE') {
      recommendations.push('ระวังอาการผิดปกติ');
      if (airQuality.pm25 > 37.5) {
        recommendations.push('กลุ่มเสี่ยงควรลดกิจกรรมกลางแจ้ง');
      }
    } else {
      recommendations.push('คุณภาพอากาศอยู่ในเกณฑ์ดี');
      recommendations.push('สามารถทำกิจกรรมกลางแจ้งได้ตามปกติ');
    }

    return recommendations;
  }

  /**
   * Quick check for simple go/no-go decision
   */
  static shouldProceed(
    airQuality: AirQualityInput,
    profile: UserProfile,
    travel: TravelInput
  ): { proceed: boolean; reason: string } {
    const score = this.compute(airQuality, profile, travel);
    
    if (score.category === 'SEVERE') {
      return { proceed: false, reason: 'ความเสี่ยงรุนแรงเกินไป' };
    }
    if (score.category === 'HIGH' && profile.conditions.length > 0) {
      return { proceed: false, reason: 'ไม่แนะนำสำหรับผู้มีโรคประจำตัว' };
    }
    
    return { proceed: true, reason: 'สามารถดำเนินกิจกรรมได้' };
  }
}

export default RiskEngine;
