/**
 * Smart PM2.5 Buddy - Central Configuration
 * 
 * All thresholds, constants, and algorithm parameters are defined here.
 * This ensures reproducibility and easy maintenance.
 * 
 * @version 1.0.0
 * @author Smart PM2.5 Research Team
 */

// ============================================================================
// AQI THRESHOLDS (Based on Thai PCD & US EPA Standards)
// ============================================================================

export const AQI_THRESHOLDS = {
  GOOD: { min: 0, max: 50, label: 'ดี', labelEn: 'Good' },
  MODERATE: { min: 51, max: 100, label: 'ปานกลาง', labelEn: 'Moderate' },
  UNHEALTHY_SENSITIVE: { min: 101, max: 150, label: 'ไม่ดีสำหรับกลุ่มเสี่ยง', labelEn: 'Unhealthy for Sensitive Groups' },
  UNHEALTHY: { min: 151, max: 200, label: 'ไม่ดี', labelEn: 'Unhealthy' },
  VERY_UNHEALTHY: { min: 201, max: 300, label: 'แย่มาก', labelEn: 'Very Unhealthy' },
  HAZARDOUS: { min: 301, max: 500, label: 'อันตราย', labelEn: 'Hazardous' },
} as const;

// ============================================================================
// PM2.5 THRESHOLDS (µg/m³) - WHO & Thai Standards
// ============================================================================

export const PM25_THRESHOLDS = {
  GOOD: { min: 0, max: 15, label: 'ดีมาก', color: 'aqi-good' },
  SATISFACTORY: { min: 16, max: 25, label: 'ดี', color: 'aqi-good' },
  MODERATE: { min: 26, max: 37.5, label: 'ปานกลาง', color: 'aqi-moderate' },
  UNHEALTHY_SENSITIVE: { min: 37.6, max: 75, label: 'เริ่มมีผลต่อสุขภาพ', color: 'aqi-unhealthy-sensitive' },
  UNHEALTHY: { min: 75.1, max: 150, label: 'มีผลต่อสุขภาพ', color: 'aqi-unhealthy' },
  VERY_UNHEALTHY: { min: 150.1, max: 250, label: 'มีผลต่อสุขภาพมาก', color: 'aqi-very-unhealthy' },
  HAZARDOUS: { min: 250.1, max: 1000, label: 'อันตราย', color: 'aqi-hazardous' },
} as const;

// ============================================================================
// DATA VALIDATION RANGES
// ============================================================================

export const DATA_VALIDATION = {
  PM25: { min: 0, max: 1000 },
  AQI: { min: 0, max: 500 },
  TEMPERATURE: { min: -40, max: 60 }, // Celsius
  HUMIDITY: { min: 0, max: 100 }, // Percentage
  WIND_SPEED: { min: 0, max: 200 }, // km/h
  LATITUDE: { min: -90, max: 90 },
  LONGITUDE: { min: -180, max: 180 },
} as const;

// ============================================================================
// RISK ENGINE WEIGHTS & MODIFIERS
// ============================================================================

/**
 * Risk Score Formula:
 * BaseRisk = (PM2.5 / 500) * 100
 * ModifiedRisk = BaseRisk * VulnerabilityModifier * TravelModifier * DurationModifier
 * FinalScore = clamp(ModifiedRisk, 0, 100)
 */

export const RISK_WEIGHTS = {
  // Base exposure weight from PM2.5
  PM25_BASE_WEIGHT: 0.6,
  AQI_WEIGHT: 0.3,
  WEATHER_WEIGHT: 0.1,
} as const;

export const VULNERABILITY_MODIFIERS = {
  // Age-based modifiers
  AGE_CHILD: { min: 0, max: 12, modifier: 1.3 },
  AGE_TEEN: { min: 13, max: 18, modifier: 1.1 },
  AGE_ADULT: { min: 19, max: 64, modifier: 1.0 },
  AGE_ELDERLY: { min: 65, max: 150, modifier: 1.4 },

  // Health condition modifiers (cumulative)
  CONDITIONS: {
    asthma: 1.5,
    copd: 1.6,
    heart_disease: 1.4,
    diabetes: 1.2,
    hypertension: 1.2,
    allergy: 1.3,
    sinusitis: 1.2,
    pregnant: 1.4,
    immunocompromised: 1.5,
  },

  // Sensitivity levels
  SENSITIVITY: {
    high: 1.4,
    moderate: 1.2,
    low: 1.0,
  },
} as const;

export const TRAVEL_MODIFIERS = {
  walking: { modifier: 1.5, label: 'เดินเท้า', icon: '🚶' },
  cycling: { modifier: 1.6, label: 'จักรยาน', icon: '🚴' },
  motorcycle: { modifier: 1.4, label: 'มอเตอร์ไซค์', icon: '🏍️' },
  car: { modifier: 1.0, label: 'รถยนต์', icon: '🚗' },
  bus: { modifier: 1.1, label: 'รถเมล์', icon: '🚌' },
  bts_mrt: { modifier: 0.9, label: 'BTS/MRT', icon: '🚇' },
  indoor: { modifier: 0.3, label: 'ในอาคาร', icon: '🏢' },
} as const;

export const DURATION_MODIFIERS = {
  // Duration in minutes
  SHORT: { max: 15, modifier: 0.7 },
  MEDIUM: { max: 60, modifier: 1.0 },
  LONG: { max: 180, modifier: 1.3 },
  EXTENDED: { max: Infinity, modifier: 1.6 },
} as const;

// ============================================================================
// RISK CATEGORIES
// ============================================================================

// Risk categories for 0-100 scale (used by RiskEngine)
export const RISK_CATEGORIES = {
  LOW: { min: 0, max: 25, label: 'ความเสี่ยงต่ำ', labelEn: 'Low Risk', color: 'success' },
  MODERATE: { min: 26, max: 50, label: 'ความเสี่ยงปานกลาง', labelEn: 'Moderate Risk', color: 'warning' },
  HIGH: { min: 51, max: 75, label: 'ความเสี่ยงสูง', labelEn: 'High Risk', color: 'destructive' },
  SEVERE: { min: 76, max: 100, label: 'ความเสี่ยงรุนแรง', labelEn: 'Severe Risk', color: 'destructive' },
} as const;

// PHRI categories for 0-10 scale (Personal Health Risk Index)
// <3 = Safe/Low, 3-6 = Warning, >6 = Dangerous
export const PHRI_CATEGORIES = {
  SAFE: { min: 0, max: 2.99, label: 'ปลอดภัย', labelEn: 'Safe', color: 'success' },
  WARNING: { min: 3, max: 6, label: 'เตือน', labelEn: 'Warning', color: 'warning' },
  DANGER: { min: 6.01, max: 10, label: 'อันตราย', labelEn: 'Dangerous', color: 'destructive' },
} as const;

// ============================================================================
// NOTIFICATION SETTINGS
// ============================================================================

export const NOTIFICATION_CONFIG = {
  // Cooldown between notifications (milliseconds)
  COOLDOWN_MS: 30 * 60 * 1000, // 30 minutes
  
  // PM2.5 thresholds for notifications
  ALERT_THRESHOLDS: {
    WARNING: 50,
    DANGER: 100,
    CRITICAL: 150,
  },
  
  // Push notification check interval
  CHECK_INTERVAL_MS: 15 * 60 * 1000, // 15 minutes
} as const;

// ============================================================================
// CACHE SETTINGS
// ============================================================================

export const CACHE_CONFIG = {
  // Cache duration (milliseconds)
  AQI_CACHE_DURATION: 5 * 60 * 1000, // 5 minutes
  MAP_TILES_CACHE_DURATION: 24 * 60 * 60 * 1000, // 24 hours
  
  // Storage keys
  STORAGE_KEYS: {
    AIR_QUALITY: 'airQualityCache',
    USER_LOCATION: 'userLocationCache',
    HEALTH_PROFILE: 'healthProfileCache',
    NOTIFICATION_SETTINGS: 'notificationSettingsCache',
  },
} as const;

// ============================================================================
// API CONFIGURATION
// ============================================================================

export const API_CONFIG = {
  AQICN: {
    BASE_URL: 'https://api.waqi.info',
    ENDPOINTS: {
      GEO: '/feed/geo',
      CITY: '/feed',
      SEARCH: '/search',
    },
    TIMEOUT_MS: 10000,
    RETRY_ATTEMPTS: 3,
  },
  
  MAPBOX: {
    STYLES: {
      LIGHT: 'mapbox://styles/mapbox/light-v11',
      DARK: 'mapbox://styles/mapbox/dark-v11',
      STREETS: 'mapbox://styles/mapbox/streets-v12',
    },
  },
} as const;

// ============================================================================
// UI CONFIGURATION
// ============================================================================

export const UI_CONFIG = {
  // Animation durations (ms)
  ANIMATION: {
    FAST: 150,
    NORMAL: 300,
    SLOW: 500,
  },
  
  // Map settings
  MAP: {
    DEFAULT_ZOOM: 12,
    DEFAULT_CENTER: { lat: 13.7563, lng: 100.5018 }, // Bangkok
    MARKER_ANIMATION_DURATION: 300,
  },
  
  // Chatbot settings
  CHATBOT: {
    MAX_MESSAGE_LENGTH: 500,
    TYPING_SPEED_MS: 30,
    AUTO_SCROLL_DELAY: 100,
  },
} as const;

// ============================================================================
// DORA (Decision-Oriented Response Architecture) CONFIG
// ============================================================================

export const DORA_CONFIG = {
  // Maximum decision text length
  MAX_DECISION_SENTENCES: 2,
  MAX_DECISION_CHARS: 150,
  
  // Options configuration
  MIN_OPTIONS: 2,
  MAX_OPTIONS: 4,
  
  // Response formatting
  SUPPRESS_ELEMENTS: [
    'markdown',
    'emojis_in_decision',
    'urls',
    'code_blocks',
    'bullet_points_in_decision',
  ],
} as const;

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type AQIThreshold = keyof typeof AQI_THRESHOLDS;
export type PM25Threshold = keyof typeof PM25_THRESHOLDS;
export type RiskCategory = keyof typeof RISK_CATEGORIES;
export type TravelMode = keyof typeof TRAVEL_MODIFIERS;
export type HealthCondition = keyof typeof VULNERABILITY_MODIFIERS.CONDITIONS;
export type SensitivityLevel = keyof typeof VULNERABILITY_MODIFIERS.SENSITIVITY;
