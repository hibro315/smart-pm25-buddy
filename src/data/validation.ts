/**
 * Data Validation Utilities
 * 
 * Validates API responses and ensures data integrity
 * 
 * @version 1.0.0
 */

import { DATA_VALIDATION } from '@/config/constants';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedData: any;
}

export interface AirQualityValidation {
  pm25: number;
  aqi: number;
  temperature?: number;
  humidity?: number;
  location?: string;
}

/**
 * Validates air quality data from API
 */
export const validateAirQualityData = (data: any): ValidationResult => {
  const errors: string[] = [];
  const sanitized: Partial<AirQualityValidation> = {};

  // PM2.5 validation
  if (typeof data?.pm25 === 'number') {
    if (data.pm25 >= DATA_VALIDATION.PM25.min && data.pm25 <= DATA_VALIDATION.PM25.max) {
      sanitized.pm25 = data.pm25;
    } else {
      errors.push(`PM2.5 out of range: ${data.pm25}`);
      sanitized.pm25 = Math.max(DATA_VALIDATION.PM25.min, Math.min(DATA_VALIDATION.PM25.max, data.pm25));
    }
  } else {
    errors.push('PM2.5 is missing or invalid');
    sanitized.pm25 = 0;
  }

  // AQI validation
  if (typeof data?.aqi === 'number') {
    if (data.aqi >= DATA_VALIDATION.AQI.min && data.aqi <= DATA_VALIDATION.AQI.max) {
      sanitized.aqi = data.aqi;
    } else {
      errors.push(`AQI out of range: ${data.aqi}`);
      sanitized.aqi = Math.max(DATA_VALIDATION.AQI.min, Math.min(DATA_VALIDATION.AQI.max, data.aqi));
    }
  } else {
    errors.push('AQI is missing or invalid');
    sanitized.aqi = 0;
  }

  // Temperature validation (optional)
  if (data?.temperature !== undefined && typeof data.temperature === 'number') {
    if (data.temperature >= DATA_VALIDATION.TEMPERATURE.min && 
        data.temperature <= DATA_VALIDATION.TEMPERATURE.max) {
      sanitized.temperature = data.temperature;
    } else {
      errors.push(`Temperature out of range: ${data.temperature}`);
    }
  }

  // Humidity validation (optional)
  if (data?.humidity !== undefined && typeof data.humidity === 'number') {
    if (data.humidity >= DATA_VALIDATION.HUMIDITY.min && 
        data.humidity <= DATA_VALIDATION.HUMIDITY.max) {
      sanitized.humidity = data.humidity;
    } else {
      errors.push(`Humidity out of range: ${data.humidity}`);
    }
  }

  // Location validation
  if (typeof data?.location === 'string' && data.location.trim()) {
    sanitized.location = data.location.trim();
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedData: sanitized,
  };
};

/**
 * Validates coordinates
 */
export const validateCoordinates = (lat: number, lng: number): boolean => {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    lat >= DATA_VALIDATION.LATITUDE.min &&
    lat <= DATA_VALIDATION.LATITUDE.max &&
    lng >= DATA_VALIDATION.LONGITUDE.min &&
    lng <= DATA_VALIDATION.LONGITUDE.max &&
    !isNaN(lat) &&
    !isNaN(lng)
  );
};

/**
 * Sanitizes user input for search queries
 */
export const sanitizeSearchQuery = (query: string): string => {
  return query
    .trim()
    .replace(/[<>]/g, '') // Remove potential XSS
    .slice(0, 200); // Limit length
};
