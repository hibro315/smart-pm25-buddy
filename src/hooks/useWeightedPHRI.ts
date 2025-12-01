import { useMemo } from 'react';
import { useDailySymptoms } from './useDailySymptoms';

interface AirQualityData {
  aqi: number;
  pm25: number;
  pm10?: number;
  temperature?: number;
  humidity?: number;
}

interface UserFactors {
  age: number;
  outdoorTime: number;
  hasHealthConditions: boolean;
}

export const useWeightedPHRI = (
  airQualityData: AirQualityData | null,
  userFactors: UserFactors | null
) => {
  const { getSymptomScore, todaySymptoms } = useDailySymptoms();

  const phri = useMemo(() => {
    if (!airQualityData || !userFactors) return null;

    // Environmental Score (60% weight)
    const environmentalScore = calculateEnvironmentalScore(airQualityData, userFactors);

    // Symptom Score (40% weight)
    const symptomScore = getSymptomScore();

    // Weighted Average: 60% environmental + 40% symptoms
    const weightedPHRI = (environmentalScore * 0.6) + (symptomScore * 0.4);

    return {
      total: Math.round(weightedPHRI),
      environmental: Math.round(environmentalScore),
      symptom: symptomScore,
      category: getPHRICategory(weightedPHRI),
      hasSymptoms: todaySymptoms !== null,
    };
  }, [airQualityData, userFactors, getSymptomScore, todaySymptoms]);

  return phri;
};

const calculateEnvironmentalScore = (
  data: AirQualityData,
  factors: UserFactors
): number => {
  let score = 0;

  // Base AQI contribution (0-50 points)
  if (data.aqi <= 50) {
    score += data.aqi * 0.2; // 0-10
  } else if (data.aqi <= 100) {
    score += 10 + (data.aqi - 50) * 0.4; // 10-30
  } else if (data.aqi <= 150) {
    score += 30 + (data.aqi - 100) * 0.6; // 30-60
  } else {
    score += 60 + Math.min(data.aqi - 150, 100) * 0.4; // 60-100+
  }

  // PM2.5 contribution (0-30 points)
  if (data.pm25 <= 12) {
    score += data.pm25 * 0.5; // 0-6
  } else if (data.pm25 <= 35) {
    score += 6 + (data.pm25 - 12) * 0.6; // 6-20
  } else {
    score += 20 + Math.min(data.pm25 - 35, 50) * 0.5; // 20-45
  }

  // Age factor (0-10 points)
  if (factors.age < 18 || factors.age > 65) {
    score += 10;
  } else if (factors.age < 25 || factors.age > 55) {
    score += 5;
  }

  // Outdoor time factor (0-15 points)
  const outdoorHours = factors.outdoorTime / 60;
  if (outdoorHours > 4) {
    score += 15;
  } else if (outdoorHours > 2) {
    score += 10;
  } else if (outdoorHours > 1) {
    score += 5;
  }

  // Health conditions multiplier
  if (factors.hasHealthConditions) {
    score *= 1.3;
  }

  return Math.min(Math.round(score), 100);
};

const getPHRICategory = (phri: number): string => {
  if (phri <= 25) return 'Low Risk';
  if (phri <= 50) return 'Moderate Risk';
  if (phri <= 75) return 'High Risk';
  return 'Very High Risk';
};
