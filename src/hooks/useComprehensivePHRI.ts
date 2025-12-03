import { useMemo, useCallback } from 'react';
import { useHealthProfile } from './useHealthProfile';

// =====================================================
// PHRI Calculation Model (WHO/EPA Standard)
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
}

export interface ExposureInput {
  pm25: number;
  aqi: number;
  outdoorTimeMinutes: number;
  isIndoor: boolean;
  hasAirPurifier: boolean;
  isWearingMask: boolean;
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'vigorous'; // walking, running, exercise
  locationRisk: 'green' | 'yellow' | 'orange' | 'red' | 'purple'; // AQI zone color
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
  const cardiovascularDiseases = ['heart_disease', 'hypertension', 'coronary_artery_disease'];
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

  // Check allergies
  const hasAllergy = input.chronicConditions.some(c => allergyConditions.includes(c.toLowerCase()));
  if (hasAllergy && diseaseScore < 25) {
    const allergyScore = Math.min(5, 25 - diseaseScore);
    diseaseScore += allergyScore;
    breakdown.push({ factor: 'ภูมิแพ้', score: allergyScore, description: 'โรคภูมิแพ้/ไซนัส' });
  }

  score += diseaseScore;

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
  if (input.smokingStatus === 'current' || input.smokingStatus === 'smoker') {
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

  // 1. PM2.5 Concentration (max 40 points)
  let pm25Score = 0;
  if (input.pm25 <= 12) {
    pm25Score = 0;
  } else if (input.pm25 <= 25) {
    pm25Score = 5;
    breakdown.push({ factor: 'ค่า PM2.5', score: 5, description: `${input.pm25} µg/m³ - ดี` });
  } else if (input.pm25 <= 35) {
    pm25Score = 10;
    breakdown.push({ factor: 'ค่า PM2.5', score: 10, description: `${input.pm25} µg/m³ - ปานกลาง` });
  } else if (input.pm25 <= 55) {
    pm25Score = 15;
    breakdown.push({ factor: 'ค่า PM2.5', score: 15, description: `${input.pm25} µg/m³ - เริ่มมีผลต่อสุขภาพ` });
  } else if (input.pm25 <= 90) {
    pm25Score = 25;
    breakdown.push({ factor: 'ค่า PM2.5', score: 25, description: `${input.pm25} µg/m³ - ไม่ดีต่อสุขภาพ` });
  } else if (input.pm25 <= 150) {
    pm25Score = 35;
    breakdown.push({ factor: 'ค่า PM2.5', score: 35, description: `${input.pm25} µg/m³ - อันตราย` });
  } else {
    pm25Score = 40;
    breakdown.push({ factor: 'ค่า PM2.5', score: 40, description: `${input.pm25} µg/m³ - อันตรายมาก` });
  }
  score += pm25Score;

  // 2. Outdoor Exposure Duration (max 10 points)
  const outdoorHours = input.outdoorTimeMinutes / 60;
  let durationScore = 0;
  
  if (!input.isIndoor) {
    if (outdoorHours >= 4) {
      durationScore = 10;
      breakdown.push({ factor: 'เวลากลางแจ้ง', score: 10, description: `${outdoorHours.toFixed(1)} ชั่วโมง (นานมาก)` });
    } else if (outdoorHours >= 2) {
      durationScore = 7;
      breakdown.push({ factor: 'เวลากลางแจ้ง', score: 7, description: `${outdoorHours.toFixed(1)} ชั่วโมง (นาน)` });
    } else if (outdoorHours >= 1) {
      durationScore = 5;
      breakdown.push({ factor: 'เวลากลางแจ้ง', score: 5, description: `${outdoorHours.toFixed(1)} ชั่วโมง (ปานกลาง)` });
    } else if (outdoorHours >= 0.5) {
      durationScore = 3;
      breakdown.push({ factor: 'เวลากลางแจ้ง', score: 3, description: `${(outdoorHours * 60).toFixed(0)} นาที (สั้น)` });
    }
  }
  score += durationScore;

  // 3. Activity Level Modifier (increases exposure when exercising)
  let activityModifier = 0;
  if (!input.isIndoor && input.pm25 > 35) {
    switch (input.activityLevel) {
      case 'vigorous': // running, intense exercise
        activityModifier = 8;
        breakdown.push({ factor: 'กิจกรรมหนัก', score: 8, description: 'วิ่ง/ออกกำลังกายหนัก (หายใจเร็ว)' });
        break;
      case 'moderate': // brisk walking, light exercise
        activityModifier = 5;
        breakdown.push({ factor: 'กิจกรรมปานกลาง', score: 5, description: 'เดินเร็ว/ออกกำลังกายเบา' });
        break;
      case 'light': // slow walking
        activityModifier = 2;
        breakdown.push({ factor: 'กิจกรรมเบา', score: 2, description: 'เดินช้า' });
        break;
      case 'sedentary':
      default:
        // No modifier for sedentary
        break;
    }
  }
  score += activityModifier;

  // 4. Location Risk Zone (max 5 points)
  let locationScore = 0;
  switch (input.locationRisk) {
    case 'purple':
      locationScore = 5;
      breakdown.push({ factor: 'พื้นที่เสี่ยง', score: 5, description: 'โซนสีม่วง (อันตรายมาก)' });
      break;
    case 'red':
      locationScore = 4;
      breakdown.push({ factor: 'พื้นที่เสี่ยง', score: 4, description: 'โซนสีแดง (ไม่ดีต่อสุขภาพมาก)' });
      break;
    case 'orange':
      locationScore = 3;
      breakdown.push({ factor: 'พื้นที่เสี่ยง', score: 3, description: 'โซนสีส้ม (ไม่ดีต่อกลุ่มเสี่ยง)' });
      break;
    case 'yellow':
      locationScore = 1;
      breakdown.push({ factor: 'พื้นที่เสี่ยง', score: 1, description: 'โซนสีเหลือง (ปานกลาง)' });
      break;
    case 'green':
    default:
      // No additional risk
      break;
  }
  score += locationScore;

  // 5. Indoor Environment Reduction
  if (input.isIndoor) {
    const indoorReduction = input.hasAirPurifier ? -10 : -5;
    score = Math.max(0, score + indoorReduction);
    if (input.hasAirPurifier) {
      breakdown.push({ factor: 'อยู่ในอาคาร', score: -10, description: 'มีเครื่องฟอกอากาศ' });
    } else {
      breakdown.push({ factor: 'อยู่ในอาคาร', score: -5, description: 'ไม่มีเครื่องฟอกอากาศ' });
    }
  }

  // 6. Mask Protection Reduction (only if outdoor)
  if (!input.isIndoor && input.isWearingMask) {
    const maskReduction = -5;
    score = Math.max(0, score + maskReduction);
    breakdown.push({ factor: 'สวมหน้ากาก', score: -5, description: 'ลดการสัมผัสฝุ่น' });
  }

  // Cap at 50
  return { score: Math.min(50, Math.max(0, score)), breakdown };
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
  exposure: ExposureInput
): string[] => {
  const recommendations: string[] = [];

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
    if (exposure.activityLevel === 'vigorous') {
      recommendations.push('🏃 ลดความเข้มข้นการออกกำลังกาย');
    }
    recommendations.push('😷 พิจารณาสวมหน้ากากเมื่ออยู่ในพื้นที่ฝุ่นหนาแน่น');
  } else {
    recommendations.push('✅ คุณภาพอากาศดี สามารถทำกิจกรรมได้ตามปกติ');
    recommendations.push('💪 เหมาะสำหรับการออกกำลังกายกลางแจ้ง');
  }

  return recommendations;
};

// =====================================================
// REACT HOOK
// =====================================================

export const useComprehensivePHRI = () => {
  const { profile, loading: profileLoading } = useHealthProfile();

  const calculatePHRI = useCallback((exposureInput: ExposureInput): PHRIResult => {
    // Build risk factor input from health profile
    const riskFactorInput: RiskFactorInput = {
      age: profile?.age || 30,
      chronicConditions: profile?.chronicConditions || [],
      smokingStatus: profile?.smokingStatus || 'non_smoker',
      isOutdoorWorker: profile?.workEnvironment === 'outdoor',
      isImmunoCompromised: profile?.immunoCompromised || false,
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
      exposureInput
    );

    return {
      totalScore,
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

  // Quick calculation with just PM2.5 and basic info
  const calculateQuickPHRI = useCallback((
    pm25: number,
    aqi: number,
    outdoorMinutes: number = 60,
    activityLevel: 'sedentary' | 'light' | 'moderate' | 'vigorous' = 'sedentary',
    isIndoor: boolean = false,
    isWearingMask: boolean = false
  ): PHRIResult => {
    return calculatePHRI({
      pm25,
      aqi,
      outdoorTimeMinutes: outdoorMinutes,
      isIndoor,
      hasAirPurifier: profile?.hasAirPurifier || false,
      isWearingMask,
      activityLevel,
      locationRisk: getAQIZone(aqi),
    });
  }, [calculatePHRI, profile]);

  return {
    calculatePHRI,
    calculateQuickPHRI,
    getAQIZone,
    profileLoading,
    hasProfile: !!profile,
  };
};

export default useComprehensivePHRI;
