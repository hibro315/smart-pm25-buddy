/**
 * Disease-Specific AQI Thresholds
 * Reference: US EPA, WHO, and Thai Department of Health guidelines
 * 
 * Different health conditions have different sensitivity levels to air pollution.
 * Sensitive groups should apply stricter thresholds.
 */

export interface AQILevel {
  level: 'good' | 'moderate' | 'unhealthy_sensitive' | 'unhealthy' | 'very_unhealthy' | 'hazardous';
  label: string;
  labelTh: string;
  color: string;
  bgColor: string;
  recommendation: string;
  recommendationTh: string;
}

export interface PM25Level {
  level: 'good' | 'moderate' | 'unhealthy_sensitive' | 'unhealthy' | 'very_unhealthy' | 'hazardous';
  label: string;
  labelTh: string;
  color: string;
  bgColor: string;
}

// Standard AQI breakpoints (US EPA)
const STANDARD_AQI_BREAKPOINTS = {
  good: { max: 50 },
  moderate: { max: 100 },
  unhealthy_sensitive: { max: 150 },
  unhealthy: { max: 200 },
  very_unhealthy: { max: 300 },
  hazardous: { max: 500 }
};

// Sensitive group AQI breakpoints (stricter thresholds)
const SENSITIVE_AQI_BREAKPOINTS = {
  good: { max: 25 },           // 50% of normal
  moderate: { max: 50 },       // Normal "good" becomes "moderate" for sensitive
  unhealthy_sensitive: { max: 75 },
  unhealthy: { max: 100 },     // Normal "moderate" becomes "unhealthy" for sensitive
  very_unhealthy: { max: 150 },
  hazardous: { max: 300 }
};

// Cardiovascular disease specific thresholds
const CARDIOVASCULAR_AQI_BREAKPOINTS = {
  good: { max: 30 },
  moderate: { max: 60 },
  unhealthy_sensitive: { max: 90 },
  unhealthy: { max: 120 },
  very_unhealthy: { max: 180 },
  hazardous: { max: 300 }
};

// PM2.5 breakpoints in µg/m³ (WHO 2021 guidelines)
const STANDARD_PM25_BREAKPOINTS = {
  good: { max: 15 },           // WHO annual guideline
  moderate: { max: 35.4 },     // US EPA moderate
  unhealthy_sensitive: { max: 55.4 },
  unhealthy: { max: 150.4 },
  very_unhealthy: { max: 250.4 },
  hazardous: { max: 500 }
};

// Sensitive PM2.5 breakpoints
const SENSITIVE_PM25_BREAKPOINTS = {
  good: { max: 10 },           // Stricter for sensitive groups
  moderate: { max: 25 },
  unhealthy_sensitive: { max: 35.4 },
  unhealthy: { max: 55.4 },
  very_unhealthy: { max: 150.4 },
  hazardous: { max: 250 }
};

export type DiseaseCategory = 'general' | 'asthma' | 'copd' | 'cardiovascular' | 'elderly' | 'children';

/**
 * Determine which disease category applies based on chronic conditions
 */
export const getDiseaseCategory = (conditions: string[]): DiseaseCategory => {
  if (!conditions || conditions.length === 0) return 'general';
  
  const conditionsLower = conditions.map(c => c.toLowerCase());
  
  // Check for specific conditions
  if (conditionsLower.some(c => c.includes('asthma') || c.includes('หอบหืด'))) {
    return 'asthma';
  }
  if (conditionsLower.some(c => c.includes('copd') || c.includes('ถุงลมโป่งพอง') || c.includes('chronic obstructive'))) {
    return 'copd';
  }
  if (conditionsLower.some(c => 
    c.includes('heart') || c.includes('หัวใจ') || 
    c.includes('cardiovascular') || c.includes('hypertension') || 
    c.includes('ความดันโลหิตสูง') || c.includes('โรคหัวใจ')
  )) {
    return 'cardiovascular';
  }
  
  // Default to general if no specific condition matched
  return 'general';
};

/**
 * Get AQI breakpoints based on disease category
 */
const getAQIBreakpoints = (category: DiseaseCategory) => {
  switch (category) {
    case 'asthma':
    case 'copd':
    case 'elderly':
    case 'children':
      return SENSITIVE_AQI_BREAKPOINTS;
    case 'cardiovascular':
      return CARDIOVASCULAR_AQI_BREAKPOINTS;
    default:
      return STANDARD_AQI_BREAKPOINTS;
  }
};

/**
 * Get PM2.5 breakpoints based on disease category
 */
const getPM25Breakpoints = (category: DiseaseCategory) => {
  switch (category) {
    case 'asthma':
    case 'copd':
    case 'cardiovascular':
    case 'elderly':
    case 'children':
      return SENSITIVE_PM25_BREAKPOINTS;
    default:
      return STANDARD_PM25_BREAKPOINTS;
  }
};

/**
 * Evaluate AQI level with disease-specific thresholds
 */
export const evaluateAQI = (
  aqi: number, 
  category: DiseaseCategory = 'general',
  language: 'en' | 'th' = 'th'
): AQILevel => {
  const breakpoints = getAQIBreakpoints(category);
  
  if (aqi <= breakpoints.good.max) {
    return {
      level: 'good',
      label: 'Good',
      labelTh: 'ดี',
      color: 'text-green-600',
      bgColor: 'bg-green-500',
      recommendation: 'Air quality is satisfactory. Enjoy outdoor activities.',
      recommendationTh: 'คุณภาพอากาศดี สามารถทำกิจกรรมกลางแจ้งได้ตามปกติ'
    };
  }
  if (aqi <= breakpoints.moderate.max) {
    return {
      level: 'moderate',
      label: 'Moderate',
      labelTh: 'ปานกลาง',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-500',
      recommendation: 'Air quality is acceptable. Sensitive groups should limit prolonged outdoor exertion.',
      recommendationTh: 'คุณภาพอากาศพอใช้ กลุ่มเสี่ยงควรจำกัดเวลากลางแจ้ง'
    };
  }
  if (aqi <= breakpoints.unhealthy_sensitive.max) {
    return {
      level: 'unhealthy_sensitive',
      label: 'Unhealthy for Sensitive Groups',
      labelTh: 'ไม่ดีต่อกลุ่มเสี่ยง',
      color: 'text-orange-600',
      bgColor: 'bg-orange-500',
      recommendation: 'Sensitive groups should reduce outdoor activities. Wear N95 mask if going outside.',
      recommendationTh: 'กลุ่มเสี่ยงควรลดกิจกรรมกลางแจ้ง สวมหน้ากาก N95 เมื่อออกนอกบ้าน'
    };
  }
  if (aqi <= breakpoints.unhealthy.max) {
    return {
      level: 'unhealthy',
      label: 'Unhealthy',
      labelTh: 'ไม่ดี',
      color: 'text-red-600',
      bgColor: 'bg-red-500',
      recommendation: 'Everyone may experience health effects. Avoid outdoor activities.',
      recommendationTh: 'ทุกคนอาจได้รับผลกระทบ หลีกเลี่ยงกิจกรรมกลางแจ้ง'
    };
  }
  if (aqi <= breakpoints.very_unhealthy.max) {
    return {
      level: 'very_unhealthy',
      label: 'Very Unhealthy',
      labelTh: 'ไม่ดีมาก',
      color: 'text-purple-600',
      bgColor: 'bg-purple-500',
      recommendation: 'Health alert! Everyone should avoid all outdoor exertion.',
      recommendationTh: 'เตือนภัยสุขภาพ! ทุกคนควรหลีกเลี่ยงออกนอกบ้าน'
    };
  }
  return {
    level: 'hazardous',
    label: 'Hazardous',
    labelTh: 'อันตราย',
    color: 'text-rose-900',
    bgColor: 'bg-rose-800',
    recommendation: 'Health emergency! Stay indoors with air purification.',
    recommendationTh: 'เหตุฉุกเฉินด้านสุขภาพ! อยู่ในอาคารที่มีเครื่องฟอกอากาศ'
  };
};

/**
 * Evaluate PM2.5 level with disease-specific thresholds
 */
export const evaluatePM25 = (
  pm25: number, 
  category: DiseaseCategory = 'general'
): PM25Level => {
  const breakpoints = getPM25Breakpoints(category);
  
  if (pm25 <= breakpoints.good.max) {
    return {
      level: 'good',
      label: 'Good',
      labelTh: 'ดี',
      color: 'text-green-600',
      bgColor: 'bg-green-500'
    };
  }
  if (pm25 <= breakpoints.moderate.max) {
    return {
      level: 'moderate',
      label: 'Moderate',
      labelTh: 'ปานกลาง',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-500'
    };
  }
  if (pm25 <= breakpoints.unhealthy_sensitive.max) {
    return {
      level: 'unhealthy_sensitive',
      label: 'Unhealthy for Sensitive Groups',
      labelTh: 'ไม่ดีต่อกลุ่มเสี่ยง',
      color: 'text-orange-600',
      bgColor: 'bg-orange-500'
    };
  }
  if (pm25 <= breakpoints.unhealthy.max) {
    return {
      level: 'unhealthy',
      label: 'Unhealthy',
      labelTh: 'ไม่ดี',
      color: 'text-red-600',
      bgColor: 'bg-red-500'
    };
  }
  if (pm25 <= breakpoints.very_unhealthy.max) {
    return {
      level: 'very_unhealthy',
      label: 'Very Unhealthy',
      labelTh: 'ไม่ดีมาก',
      color: 'text-purple-600',
      bgColor: 'bg-purple-500'
    };
  }
  return {
    level: 'hazardous',
    label: 'Hazardous',
    labelTh: 'อันตราย',
    color: 'text-rose-900',
    bgColor: 'bg-rose-800'
  };
};

/**
 * Get disease-specific label for AQI display
 */
export const getDiseaseSpecificLabel = (category: DiseaseCategory, language: 'en' | 'th' = 'th'): string => {
  const labels: Record<DiseaseCategory, { en: string; th: string }> = {
    general: { en: 'Standard AQI', th: 'AQI มาตรฐาน' },
    asthma: { en: 'Asthma-Sensitive AQI', th: 'AQI สำหรับผู้ป่วยหอบหืด' },
    copd: { en: 'COPD-Sensitive AQI', th: 'AQI สำหรับผู้ป่วย COPD' },
    cardiovascular: { en: 'Heart-Sensitive AQI', th: 'AQI สำหรับผู้ป่วยหัวใจ' },
    elderly: { en: 'Elderly-Sensitive AQI', th: 'AQI สำหรับผู้สูงอายุ' },
    children: { en: 'Children-Sensitive AQI', th: 'AQI สำหรับเด็ก' }
  };
  
  return labels[category][language];
};
