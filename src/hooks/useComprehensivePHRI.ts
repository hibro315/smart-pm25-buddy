import { useMemo, useCallback } from 'react';
import { useHealthProfile } from './useHealthProfile';

// =====================================================
// PHRI Calculation Model (WHO/EPA Standard) - Enhanced
// =====================================================
// PHRI = Risk Factor Score (0-50) + Exposure Score (0-50)
// Total Range: 0-100
// 
// Key Principle: Symptoms do NOT affect PHRI score
// Symptoms only modify recommendations
// =====================================================

export interface RiskFactorInput {
  age: number;
  chronicConditions: string[];
  smokingStatus: string;
  isOutdoorWorker: boolean;
  isImmunoCompromised: boolean;
  allergies?: string[]; // dust, pollen, animal, food
  riskBehaviors?: string[]; // heavy exercise, sedentary
}

export interface ExposureInput {
  // Air Quality
  pm25: number;
  aqi: number;
  pm10?: number;
  o3?: number;
  co?: number;
  no2?: number;
  so2?: number;
  
  // Weather
  temperature?: number; // Celsius
  humidity?: number; // Percent
  
  // Exposure Duration
  outdoorTimeMinutes: number;
  outdoorTimeCategory?: '0-15' | '16-30' | '31-60' | '61-120' | '>120';
  
  // Environment
  isIndoor: boolean;
  hasAirPurifier: boolean;
  locationRisk: 'green' | 'yellow' | 'orange' | 'red' | 'purple';
  nearConstruction?: boolean;
  nearMainRoad?: boolean;
  
  // Activity
  activityLevel: 'resting' | 'walking' | 'exercising' | 'intense';
  
  // Protection
  maskType: 'N95' | 'surgical' | 'cloth' | 'none';
  maskFit?: 'good' | 'moderate' | 'poor';
}

export interface SymptomSeverity {
  cough: 'none' | 'mild' | 'moderate' | 'severe';
  dyspnea: 'none' | 'mild' | 'moderate' | 'severe'; // shortness of breath
  eyeIrritation: 'none' | 'mild' | 'moderate' | 'severe';
  chestPain: 'none' | 'mild' | 'moderate' | 'severe';
  throatIrritation: 'none' | 'mild' | 'moderate' | 'severe';
  fatigue: 'none' | 'mild' | 'moderate' | 'severe';
}

export interface PHRIResult {
  totalScore: number;
  riskFactorScore: number;
  exposureScore: number;
  level: 'low' | 'moderate' | 'high' | 'very_high';
  levelThai: string;
  interpretation: string;
  recommendations: string[];
  breakdown: {
    riskFactors: { factor: string; score: number; description: string }[];
    exposureFactors: { factor: string; score: number; description: string }[];
  };
}

// =====================================================
// RISK FACTOR SCORING (0-50 points)
// This score is relatively stable for each user
// =====================================================

const calculateRiskFactorScore = (input: RiskFactorInput): { score: number; breakdown: { factor: string; score: number; description: string }[] } => {
  let score = 0;
  const breakdown: { factor: string; score: number; description: string }[] = [];

  // 1. Chronic Diseases (max 25 points for respiratory, 20 for cardiovascular)
  const respiratoryDiseases = ['asthma', 'copd', 'chronic_bronchitis', 'pulmonary_fibrosis'];
  const cardiovascularDiseases = ['heart_disease', 'cardiovascular', 'hypertension', 'coronary_artery_disease'];
  const metabolicDiseases = ['diabetes'];
  const allergyConditions = ['allergies', 'rhinitis', 'sinusitis'];

  let diseaseScore = 0;
  
  // Check respiratory diseases (highest risk)
  const hasRespiratory = input.chronicConditions.some(c => respiratoryDiseases.includes(c.toLowerCase()));
  if (hasRespiratory) {
    diseaseScore += 25;
    breakdown.push({ factor: 'โรคทางเดินหายใจ', score: 25, description: 'หอบหืด/COPD/โรคปอดเรื้อรัง' });
  }

  // Check cardiovascular diseases
  const hasCardiovascular = input.chronicConditions.some(c => cardiovascularDiseases.includes(c.toLowerCase()));
  if (hasCardiovascular && diseaseScore < 25) {
    const cardioScore = Math.min(20, 25 - diseaseScore);
    diseaseScore += cardioScore;
    breakdown.push({ factor: 'โรคหัวใจ/หลอดเลือด', score: cardioScore, description: 'โรคหัวใจ/ความดันโลหิตสูง' });
  }

  // Check metabolic diseases
  const hasMetabolic = input.chronicConditions.some(c => metabolicDiseases.includes(c.toLowerCase()));
  if (hasMetabolic && diseaseScore < 25) {
    const metabolicScore = Math.min(10, 25 - diseaseScore);
    diseaseScore += metabolicScore;
    breakdown.push({ factor: 'โรคเมตาบอลิก', score: metabolicScore, description: 'เบาหวาน' });
  }

  // Check allergies from chronic conditions
  const hasAllergy = input.chronicConditions.some(c => allergyConditions.includes(c.toLowerCase()));
  if (hasAllergy && diseaseScore < 25) {
    const allergyScore = Math.min(5, 25 - diseaseScore);
    diseaseScore += allergyScore;
    breakdown.push({ factor: 'ภูมิแพ้', score: allergyScore, description: 'โรคภูมิแพ้/ไซนัส' });
  }

  score += diseaseScore;

  // 1.5 Specific Allergies (additional risk)
  if (input.allergies && input.allergies.length > 0) {
    const dustAllergy = input.allergies.includes('dust');
    const pollenAllergy = input.allergies.includes('pollen');
    
    if (dustAllergy) {
      const dustScore = Math.min(5, 50 - score);
      score += dustScore;
      breakdown.push({ factor: 'แพ้ฝุ่น', score: dustScore, description: 'แพ้ฝุ่นละออง' });
    }
    if (pollenAllergy && score < 50) {
      const pollenScore = Math.min(3, 50 - score);
      score += pollenScore;
      breakdown.push({ factor: 'แพ้เกสร', score: pollenScore, description: 'แพ้เกสรดอกไม้' });
    }
  }

  // 2. Age Factor (max 10 points)
  let ageScore = 0;
  if (input.age < 12) {
    ageScore = 10;
    breakdown.push({ factor: 'กลุ่มอายุ', score: 10, description: 'เด็กอายุต่ำกว่า 12 ปี (เสี่ยงสูง)' });
  } else if (input.age > 65) {
    ageScore = 10;
    breakdown.push({ factor: 'กลุ่มอายุ', score: 10, description: 'ผู้สูงอายุมากกว่า 65 ปี (เสี่ยงสูง)' });
  } else if (input.age > 60) {
    ageScore = 7;
    breakdown.push({ factor: 'กลุ่มอายุ', score: 7, description: 'ผู้สูงอายุ 60-65 ปี (เสี่ยงปานกลาง)' });
  } else if (input.age < 18) {
    ageScore = 5;
    breakdown.push({ factor: 'กลุ่มอายุ', score: 5, description: 'วัยรุ่น 12-18 ปี (เสี่ยงเล็กน้อย)' });
  }
  score += ageScore;

  // 3. Smoking Status (max 10 points)
  if (input.smokingStatus === 'current' || input.smokingStatus === 'smoker' || input.smokingStatus === 'smoking') {
    score += 10;
    breakdown.push({ factor: 'สูบบุหรี่', score: 10, description: 'สูบบุหรี่อยู่ปัจจุบัน' });
  } else if (input.smokingStatus === 'former' || input.smokingStatus === 'ex-smoker') {
    score += 5;
    breakdown.push({ factor: 'สูบบุหรี่', score: 5, description: 'เคยสูบบุหรี่' });
  }

  // 4. Outdoor Worker (max 10 points)
  if (input.isOutdoorWorker) {
    score += 10;
    breakdown.push({ factor: 'ทำงานกลางแจ้ง', score: 10, description: 'อาชีพที่ต้องอยู่กลางแจ้งเป็นประจำ' });
  }

  // 5. Immunocompromised (max 5 points)
  if (input.isImmunoCompromised) {
    score += 5;
    breakdown.push({ factor: 'ภูมิคุ้มกันต่ำ', score: 5, description: 'ระบบภูมิคุ้มกันอ่อนแอ' });
  }

  // 6. Risk Behaviors (additional)
  if (input.riskBehaviors) {
    if (input.riskBehaviors.includes('heavy exercise') && score < 50) {
      const exerciseScore = Math.min(3, 50 - score);
      score += exerciseScore;
      breakdown.push({ factor: 'ออกกำลังกายหนัก', score: exerciseScore, description: 'ออกกำลังกายหนักเป็นประจำ' });
    }
  }

  // Cap at 50
  return { score: Math.min(50, score), breakdown };
};

// =====================================================
// EXPOSURE SCORING (0-50 points)
// This score changes daily/hourly based on environment
// =====================================================

const calculateExposureScore = (input: ExposureInput): { score: number; breakdown: { factor: string; score: number; description: string }[] } => {
  let score = 0;
  const breakdown: { factor: string; score: number; description: string }[] = [];

  // 1. PM2.5 Concentration (max 30 points) - Primary pollutant
  let pm25Score = 0;
  if (input.pm25 <= 12) {
    pm25Score = 0;
  } else if (input.pm25 <= 25) {
    pm25Score = 5;
    breakdown.push({ factor: 'PM2.5', score: 5, description: `${input.pm25.toFixed(1)} µg/m³ - ดี` });
  } else if (input.pm25 <= 35) {
    pm25Score = 10;
    breakdown.push({ factor: 'PM2.5', score: 10, description: `${input.pm25.toFixed(1)} µg/m³ - ปานกลาง` });
  } else if (input.pm25 <= 55) {
    pm25Score = 15;
    breakdown.push({ factor: 'PM2.5', score: 15, description: `${input.pm25.toFixed(1)} µg/m³ - เริ่มมีผลต่อสุขภาพ` });
  } else if (input.pm25 <= 90) {
    pm25Score = 20;
    breakdown.push({ factor: 'PM2.5', score: 20, description: `${input.pm25.toFixed(1)} µg/m³ - ไม่ดีต่อสุขภาพ` });
  } else if (input.pm25 <= 150) {
    pm25Score = 25;
    breakdown.push({ factor: 'PM2.5', score: 25, description: `${input.pm25.toFixed(1)} µg/m³ - อันตราย` });
  } else {
    pm25Score = 30;
    breakdown.push({ factor: 'PM2.5', score: 30, description: `${input.pm25.toFixed(1)} µg/m³ - อันตรายมาก` });
  }
  score += pm25Score;

  // 2. Other Pollutants (max 10 points combined)
  let otherPollutantScore = 0;
  
  // PM10
  if (input.pm10 && input.pm10 > 50) {
    const pm10Score = input.pm10 > 150 ? 3 : input.pm10 > 100 ? 2 : 1;
    otherPollutantScore += pm10Score;
    breakdown.push({ factor: 'PM10', score: pm10Score, description: `${input.pm10.toFixed(0)} µg/m³` });
  }
  
  // Ozone (O3) - harmful at high levels
  if (input.o3 && input.o3 > 100) {
    const o3Score = input.o3 > 200 ? 3 : input.o3 > 150 ? 2 : 1;
    otherPollutantScore += o3Score;
    breakdown.push({ factor: 'โอโซน (O3)', score: o3Score, description: `${input.o3.toFixed(0)} µg/m³` });
  }
  
  // NO2
  if (input.no2 && input.no2 > 40) {
    const no2Score = input.no2 > 100 ? 2 : 1;
    otherPollutantScore += no2Score;
    breakdown.push({ factor: 'ไนโตรเจนไดออกไซด์ (NO2)', score: no2Score, description: `${input.no2.toFixed(0)} µg/m³` });
  }
  
  // CO
  if (input.co && input.co > 4) {
    const coScore = input.co > 10 ? 2 : 1;
    otherPollutantScore += coScore;
    breakdown.push({ factor: 'คาร์บอนมอนอกไซด์ (CO)', score: coScore, description: `${input.co.toFixed(1)} mg/m³` });
  }
  
  // SO2
  if (input.so2 && input.so2 > 20) {
    const so2Score = input.so2 > 80 ? 2 : 1;
    otherPollutantScore += so2Score;
    breakdown.push({ factor: 'ซัลเฟอร์ไดออกไซด์ (SO2)', score: so2Score, description: `${input.so2.toFixed(0)} µg/m³` });
  }
  
  score += Math.min(10, otherPollutantScore);

  // 3. Weather Conditions (max 5 points)
  let weatherScore = 0;
  
  // Temperature extremes increase risk
  if (input.temperature !== undefined) {
    if (input.temperature > 38 || input.temperature < 10) {
      weatherScore += 3;
      breakdown.push({ 
        factor: 'อุณหภูมิ', 
        score: 3, 
        description: `${input.temperature}°C - ${input.temperature > 38 ? 'ร้อนจัด' : 'หนาวจัด'}` 
      });
    } else if (input.temperature > 35 || input.temperature < 15) {
      weatherScore += 1;
      breakdown.push({ 
        factor: 'อุณหภูมิ', 
        score: 1, 
        description: `${input.temperature}°C - ${input.temperature > 35 ? 'ร้อน' : 'เย็น'}` 
      });
    }
  }
  
  // High humidity can trap pollutants
  if (input.humidity !== undefined) {
    if (input.humidity > 80) {
      weatherScore += 2;
      breakdown.push({ factor: 'ความชื้น', score: 2, description: `${input.humidity}% - สูงมาก (ฝุ่นลอยตัวนาน)` });
    } else if (input.humidity < 30) {
      weatherScore += 1;
      breakdown.push({ factor: 'ความชื้น', score: 1, description: `${input.humidity}% - แห้งมาก` });
    }
  }
  
  score += Math.min(5, weatherScore);

  // 4. Outdoor Exposure Duration (max 10 points)
  let durationScore = 0;
  
  if (!input.isIndoor) {
    // Use category if available, otherwise calculate from minutes
    const outdoorCategory = input.outdoorTimeCategory || getOutdoorTimeCategory(input.outdoorTimeMinutes);
    
    switch (outdoorCategory) {
      case '>120':
        durationScore = 10;
        breakdown.push({ factor: 'เวลากลางแจ้ง', score: 10, description: 'มากกว่า 2 ชั่วโมง (นานมาก)' });
        break;
      case '61-120':
        durationScore = 7;
        breakdown.push({ factor: 'เวลากลางแจ้ง', score: 7, description: '1-2 ชั่วโมง (นาน)' });
        break;
      case '31-60':
        durationScore = 5;
        breakdown.push({ factor: 'เวลากลางแจ้ง', score: 5, description: '31-60 นาที (ปานกลาง)' });
        break;
      case '16-30':
        durationScore = 3;
        breakdown.push({ factor: 'เวลากลางแจ้ง', score: 3, description: '16-30 นาที (สั้น)' });
        break;
      case '0-15':
        durationScore = 1;
        breakdown.push({ factor: 'เวลากลางแจ้ง', score: 1, description: '0-15 นาที (สั้นมาก)' });
        break;
    }
  }
  score += durationScore;

  // 5. Activity Level (max 8 points) - Higher activity = more inhalation
  let activityScore = 0;
  if (!input.isIndoor && input.pm25 > 25) {
    switch (input.activityLevel) {
      case 'intense':
        activityScore = 8;
        breakdown.push({ factor: 'กิจกรรมหนักมาก', score: 8, description: 'วิ่ง/ออกกำลังกายหนัก (หายใจเร็ว 3-4 เท่า)' });
        break;
      case 'exercising':
        activityScore = 5;
        breakdown.push({ factor: 'ออกกำลังกาย', score: 5, description: 'ออกกำลังกายปานกลาง (หายใจเร็ว 2 เท่า)' });
        break;
      case 'walking':
        activityScore = 2;
        breakdown.push({ factor: 'เดิน', score: 2, description: 'เดินเร็ว/เดินปกติ' });
        break;
      case 'resting':
      default:
        // No additional risk
        break;
    }
  }
  score += activityScore;

  // 6. Location Risk (max 5 points)
  let locationScore = 0;
  switch (input.locationRisk) {
    case 'purple':
      locationScore = 5;
      breakdown.push({ factor: 'พื้นที่ AQI', score: 5, description: 'โซนสีม่วง (อันตรายมาก)' });
      break;
    case 'red':
      locationScore = 4;
      breakdown.push({ factor: 'พื้นที่ AQI', score: 4, description: 'โซนสีแดง (ไม่ดีต่อสุขภาพมาก)' });
      break;
    case 'orange':
      locationScore = 3;
      breakdown.push({ factor: 'พื้นที่ AQI', score: 3, description: 'โซนสีส้ม (ไม่ดีต่อกลุ่มเสี่ยง)' });
      break;
    case 'yellow':
      locationScore = 1;
      breakdown.push({ factor: 'พื้นที่ AQI', score: 1, description: 'โซนสีเหลือง (ปานกลาง)' });
      break;
    case 'green':
    default:
      break;
  }
  
  // Additional location risks
  if (input.nearConstruction) {
    locationScore += 2;
    breakdown.push({ factor: 'ใกล้ก่อสร้าง', score: 2, description: 'อยู่ใกล้พื้นที่ก่อสร้าง' });
  }
  if (input.nearMainRoad) {
    locationScore += 2;
    breakdown.push({ factor: 'ใกล้ถนนหลัก', score: 2, description: 'อยู่ใกล้ถนนใหญ่/การจราจรหนาแน่น' });
  }
  
  score += Math.min(7, locationScore);

  // 7. Protection Reductions

  // Indoor Environment Reduction
  if (input.isIndoor) {
    const indoorReduction = input.hasAirPurifier ? -12 : -6;
    score = Math.max(0, score + indoorReduction);
    if (input.hasAirPurifier) {
      breakdown.push({ factor: 'อยู่ในอาคาร', score: -12, description: 'มีเครื่องฟอกอากาศ (ลดการสัมผัส 70-80%)' });
    } else {
      breakdown.push({ factor: 'อยู่ในอาคาร', score: -6, description: 'ไม่มีเครื่องฟอก (ลดการสัมผัส 30-50%)' });
    }
  }

  // Mask Protection (only if outdoor)
  if (!input.isIndoor && input.maskType !== 'none') {
    let maskReduction = 0;
    let maskDesc = '';
    
    // Base reduction by mask type
    switch (input.maskType) {
      case 'N95':
        maskReduction = -10;
        maskDesc = 'N95 (กรอง 95%)';
        break;
      case 'surgical':
        maskReduction = -5;
        maskDesc = 'หน้ากากอนามัย (กรอง 50-70%)';
        break;
      case 'cloth':
        maskReduction = -2;
        maskDesc = 'หน้ากากผ้า (กรอง 20-40%)';
        break;
    }
    
    // Adjust by fit quality
    if (input.maskFit) {
      switch (input.maskFit) {
        case 'good':
          // Full reduction
          break;
        case 'moderate':
          maskReduction = Math.round(maskReduction * 0.7);
          maskDesc += ' (สวมใส่ปานกลาง)';
          break;
        case 'poor':
          maskReduction = Math.round(maskReduction * 0.3);
          maskDesc += ' (สวมใส่ไม่ดี - รั่ว)';
          break;
      }
    }
    
    score = Math.max(0, score + maskReduction);
    breakdown.push({ factor: 'สวมหน้ากาก', score: maskReduction, description: maskDesc });
  }

  // Cap at 50
  return { score: Math.min(50, Math.max(0, score)), breakdown };
};

// Helper function to convert minutes to category
const getOutdoorTimeCategory = (minutes: number): '0-15' | '16-30' | '31-60' | '61-120' | '>120' => {
  if (minutes <= 15) return '0-15';
  if (minutes <= 30) return '16-30';
  if (minutes <= 60) return '31-60';
  if (minutes <= 120) return '61-120';
  return '>120';
};

// =====================================================
// MAIN PHRI CALCULATION
// =====================================================

const getAQIZone = (aqi: number): 'green' | 'yellow' | 'orange' | 'red' | 'purple' => {
  if (aqi <= 50) return 'green';
  if (aqi <= 100) return 'yellow';
  if (aqi <= 150) return 'orange';
  if (aqi <= 200) return 'red';
  return 'purple';
};

const getPHRILevel = (score: number): { level: 'low' | 'moderate' | 'high' | 'very_high'; thai: string } => {
  if (score <= 25) return { level: 'low', thai: 'ต่ำ (ปลอดภัย)' };
  if (score <= 50) return { level: 'moderate', thai: 'ปานกลาง (เสี่ยงเล็กน้อย)' };
  if (score <= 75) return { level: 'high', thai: 'สูง (เสี่ยงมาก)' };
  return { level: 'very_high', thai: 'สูงมาก (เสี่ยงรุนแรง)' };
};

const generateInterpretation = (
  riskFactorScore: number,
  exposureScore: number,
  level: string
): string => {
  let interpretation = '';

  if (riskFactorScore >= 25) {
    interpretation += 'คุณมีปัจจัยเสี่ยงพื้นฐานสูงจากโรคประจำตัว ';
  } else if (riskFactorScore >= 10) {
    interpretation += 'คุณมีปัจจัยเสี่ยงพื้นฐานปานกลาง ';
  }

  if (exposureScore >= 30) {
    interpretation += 'และมีการสัมผัสฝุ่น PM2.5 ในระดับอันตราย ';
  } else if (exposureScore >= 20) {
    interpretation += 'และมีการสัมผัสฝุ่น PM2.5 ในระดับไม่ดีต่อสุขภาพ ';
  } else if (exposureScore >= 10) {
    interpretation += 'และมีการสัมผัสฝุ่น PM2.5 ในระดับปานกลาง ';
  }

  if (level === 'very_high') {
    interpretation += 'ควรหลีกเลี่ยงกิจกรรมกลางแจ้งทันที และพบแพทย์หากมีอาการ';
  } else if (level === 'high') {
    interpretation += 'ควรจำกัดกิจกรรมกลางแจ้ง และสวมหน้ากาก N95';
  } else if (level === 'moderate') {
    interpretation += 'ควรระมัดระวัง และหลีกเลี่ยงการออกกำลังกายกลางแจ้งหนัก';
  } else {
    interpretation += 'ความเสี่ยงต่ำ สามารถทำกิจกรรมได้ตามปกติ';
  }

  return interpretation;
};

const generateRecommendations = (
  result: { riskFactorScore: number; exposureScore: number; level: string },
  exposure: ExposureInput,
  symptoms?: SymptomSeverity
): string[] => {
  const recommendations: string[] = [];

  // Base recommendations by risk level
  if (result.level === 'very_high') {
    recommendations.push('🚨 หลีกเลี่ยงกิจกรรมกลางแจ้งทั้งหมด');
    recommendations.push('🏠 อยู่ในอาคารที่มีระบบกรองอากาศ');
    recommendations.push('😷 สวมหน้ากาก N95 ตลอดเวลาเมื่อต้องออกนอกบ้าน');
    recommendations.push('👨‍⚕️ พบแพทย์หากมีอาการหายใจลำบาก');
  } else if (result.level === 'high') {
    recommendations.push('⚠️ จำกัดเวลากลางแจ้งให้น้อยกว่า 1 ชั่วโมง');
    recommendations.push('🏃 งดออกกำลังกายกลางแจ้ง');
    recommendations.push('😷 สวมหน้ากาก N95 เมื่อออกนอกบ้าน');
    if (!exposure.hasAirPurifier) {
      recommendations.push('💨 พิจารณาใช้เครื่องฟอกอากาศในบ้าน');
    }
  } else if (result.level === 'moderate') {
    recommendations.push('ℹ️ ระวังเรื่องเวลากลางแจ้ง');
    if (exposure.activityLevel === 'intense' || exposure.activityLevel === 'exercising') {
      recommendations.push('🏃 ลดความเข้มข้นการออกกำลังกาย');
    }
    recommendations.push('😷 พิจารณาสวมหน้ากากเมื่ออยู่ในพื้นที่ฝุ่นหนาแน่น');
  } else {
    recommendations.push('✅ คุณภาพอากาศดี สามารถทำกิจกรรมได้ตามปกติ');
    recommendations.push('💪 เหมาะสำหรับการออกกำลังกายกลางแจ้ง');
  }

  // Symptom-based recommendations (do not affect score, only advice)
  if (symptoms) {
    const hasSevereSymptom = Object.values(symptoms).some(s => s === 'severe');
    const hasModerateSymptom = Object.values(symptoms).some(s => s === 'moderate');
    
    if (hasSevereSymptom) {
      recommendations.push('🏥 มีอาการรุนแรง - ควรพบแพทย์โดยเร็ว');
    } else if (hasModerateSymptom) {
      recommendations.push('💊 มีอาการปานกลาง - ควรพักผ่อนและติดตามอาการ');
    }
    
    if (symptoms.dyspnea === 'moderate' || symptoms.dyspnea === 'severe') {
      recommendations.push('🫁 หายใจลำบาก - หลีกเลี่ยงกิจกรรมที่ต้องออกแรงมาก');
    }
    
    if (symptoms.eyeIrritation === 'moderate' || symptoms.eyeIrritation === 'severe') {
      recommendations.push('👁️ ระคายเคืองตา - สวมแว่นตากันฝุ่น');
    }
    
    if (symptoms.cough === 'severe') {
      recommendations.push('🤧 ไอรุนแรง - ดื่มน้ำอุ่นและพักผ่อน');
    }
  }

  // Location-specific recommendations
  if (exposure.nearConstruction) {
    recommendations.push('🚧 หลีกเลี่ยงพื้นที่ก่อสร้าง');
  }
  if (exposure.nearMainRoad) {
    recommendations.push('🚗 หลีกเลี่ยงถนนที่มีการจราจรหนาแน่น');
  }

  // Mask upgrade recommendation
  if (result.level !== 'low' && exposure.maskType !== 'N95') {
    if (exposure.maskType === 'none') {
      recommendations.push('😷 ควรสวมหน้ากากอนามัยหรือ N95');
    } else if (exposure.maskType === 'cloth') {
      recommendations.push('😷 พิจารณาเปลี่ยนเป็นหน้ากากอนามัยหรือ N95');
    }
  }

  return recommendations;
};

// =====================================================
// REACT HOOK
// =====================================================

export const useComprehensivePHRI = () => {
  const { profile, loading: profileLoading } = useHealthProfile();

  const calculatePHRI = useCallback((exposureInput: ExposureInput, symptoms?: SymptomSeverity): PHRIResult => {
    // Build risk factor input from health profile
    const riskFactorInput: RiskFactorInput = {
      age: profile?.age || 30,
      chronicConditions: profile?.chronicConditions || [],
      smokingStatus: profile?.smokingStatus || 'non_smoker',
      isOutdoorWorker: profile?.workEnvironment === 'outdoor',
      isImmunoCompromised: profile?.immunoCompromised || false,
      allergies: profile?.allergies ? [profile.allergies] : [],
      riskBehaviors: profile?.physicalActivity === 'active' ? ['heavy exercise'] : [],
    };

    // Calculate scores
    const riskFactorResult = calculateRiskFactorScore(riskFactorInput);
    const exposureResult = calculateExposureScore(exposureInput);

    // Total PHRI
    const totalScore = riskFactorResult.score + exposureResult.score;
    const levelInfo = getPHRILevel(totalScore);

    // Generate interpretation and recommendations
    const interpretation = generateInterpretation(
      riskFactorResult.score,
      exposureResult.score,
      levelInfo.level
    );

    const recommendations = generateRecommendations(
      {
        riskFactorScore: riskFactorResult.score,
        exposureScore: exposureResult.score,
        level: levelInfo.level,
      },
      exposureInput,
      symptoms
    );

    return {
      totalScore: Math.min(100, totalScore),
      riskFactorScore: riskFactorResult.score,
      exposureScore: exposureResult.score,
      level: levelInfo.level,
      levelThai: levelInfo.thai,
      interpretation,
      recommendations,
      breakdown: {
        riskFactors: riskFactorResult.breakdown,
        exposureFactors: exposureResult.breakdown,
      },
    };
  }, [profile]);

  // Quick calculation with minimal inputs
  const calculateQuickPHRI = useCallback((
    pm25: number,
    aqi: number,
    outdoorTimeMinutes: number,
    options?: {
      isIndoor?: boolean;
      maskType?: 'N95' | 'surgical' | 'cloth' | 'none';
      maskFit?: 'good' | 'moderate' | 'poor';
      activityLevel?: 'resting' | 'walking' | 'exercising' | 'intense';
      temperature?: number;
      humidity?: number;
      pm10?: number;
      o3?: number;
      no2?: number;
      co?: number;
      so2?: number;
      nearConstruction?: boolean;
      nearMainRoad?: boolean;
    }
  ): PHRIResult => {
    const exposureInput: ExposureInput = {
      pm25,
      aqi,
      pm10: options?.pm10,
      o3: options?.o3,
      no2: options?.no2,
      co: options?.co,
      so2: options?.so2,
      temperature: options?.temperature,
      humidity: options?.humidity,
      outdoorTimeMinutes,
      isIndoor: options?.isIndoor ?? false,
      hasAirPurifier: profile?.hasAirPurifier ?? false,
      maskType: options?.maskType ?? 'none',
      maskFit: options?.maskFit ?? 'good',
      activityLevel: options?.activityLevel ?? 'walking',
      locationRisk: getAQIZone(aqi),
      nearConstruction: options?.nearConstruction,
      nearMainRoad: options?.nearMainRoad,
    };

    return calculatePHRI(exposureInput);
  }, [calculatePHRI, profile?.hasAirPurifier]);

  return {
    calculatePHRI,
    calculateQuickPHRI,
    getAQIZone,
    hasProfile: !!profile,
    profileLoading,
  };
};

export default useComprehensivePHRI;
