import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { EnhancedPHRIResult } from './useEnhancedPHRI';

export interface NearbyPlace {
  name: string;
  type: 'hospital' | 'clinic' | 'pharmacy' | 'park' | 'shopping_mall';
  distance: number; // in meters
  pm25Level?: number;
  recommendation: string;
}

export interface PersonalizedRecommendation {
  generalAdvice: string[];
  locationBasedAdvice: string[];
  healthTips: string[];
  nearbyPlaces: NearbyPlace[];
  weatherConsiderations: string[];
  timingRecommendations: string[];
}

export const usePersonalizedRecommendation = () => {
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<PersonalizedRecommendation | null>(null);

  // Generate comprehensive personalized recommendations
  const generateRecommendations = useCallback(async (
    phriResult: EnhancedPHRIResult,
    userConditions: string[],
    currentLocation?: { lat: number; lng: number },
    temperature?: number,
    humidity?: number
  ): Promise<PersonalizedRecommendation> => {
    setLoading(true);
    try {
      const generalAdvice: string[] = [];
      const locationBasedAdvice: string[] = [];
      const healthTips: string[] = [];
      const weatherConsiderations: string[] = [];
      const timingRecommendations: string[] = [];

      // General advice based on PHRI level
      if (phriResult.alertLevel === 'emergency' || phriResult.alertLevel === 'urgent') {
        generalAdvice.push('หลีกเลี่ยงการออกนอกอาคารในช่วง 06:00-10:00 และ 18:00-22:00');
        generalAdvice.push('ใช้แอปพลิเคชันตรวจสอบคุณภาพอากาศก่อนออกจากบ้าน');
        generalAdvice.push('ติดตามข่าวสารอัพเดตเกี่ยวกับคุณภาพอากาศ');
      }

      // Health-specific tips
      if (userConditions.includes('asthma')) {
        healthTips.push('ผู้ป่วยหอบหืด: พกยาขยายหลอดลมติดตัวเสมอ');
        healthTips.push('หลีกเลี่ยงกิจกรรมที่ทำให้หายใจหนัก');
        healthTips.push('เตรียมแผนฉุกเฉินกรณีหอบหืดกำเริบ');
      }
      if (userConditions.includes('COPD')) {
        healthTips.push('ผู้ป่วย COPD: ใช้ออกซิเจนตามแพทย์สั่ง');
        healthTips.push('ออกกำลังกายเบาๆ ภายในอาคาร');
      }
      if (userConditions.includes('heart disease')) {
        healthTips.push('โรคหัวใจ: หลีกเลี่ยงความเครียดและออกกำลังกายหนัก');
        healthTips.push('ตรวจวัดความดันโลหิตเป็นประจำ');
      }
      if (userConditions.includes('allergy')) {
        healthTips.push('โรคภูมิแพ้: ทำความสะอาดบ้านเป็นประจำ');
        healthTips.push('หลีกเลี่ยงสารก่อภูมิแพ้');
      }

      // Weather-based considerations
      if (temperature !== undefined) {
        if (temperature > 35) {
          weatherConsiderations.push('🌡️ อากาศร้อนมาก: ดื่มน้ำมากๆ หลีกเลี่ยงแดด');
        } else if (temperature < 15) {
          weatherConsiderations.push('🌡️ อากาศเย็น: สวมเสื้อกันหนาว ระวังไวรัส');
        }
      }

      if (humidity !== undefined) {
        if (humidity > 80) {
          weatherConsiderations.push('💧 ความชื้นสูง: ระวังเชื้อราและแบคทีเรีย');
        } else if (humidity < 30) {
          weatherConsiderations.push('💧 อากาศแห้ง: ใช้เครื่องเพิ่มความชื้น ดื่มน้ำมากขึ้น');
        }
      }

      // Timing recommendations
      const currentHour = new Date().getHours();
      if (phriResult.phri > 6) {
        if (currentHour >= 6 && currentHour <= 10) {
          timingRecommendations.push('⏰ ช่วงเช้า: หลีกเลี่ยงออกกำลังกายกลางแจ้ง');
        } else if (currentHour >= 18 && currentHour <= 22) {
          timingRecommendations.push('⏰ ช่วงเย็น: ฝุ่นมักสะสมสูง หลีกเลี่ยงการออกนอกอาคาร');
        }
        timingRecommendations.push('📅 แนะนำเลื่อนกิจกรรมกลางแจ้งไปวันอื่น');
      } else if (phriResult.phri < 3) {
        timingRecommendations.push('✅ เหมาะสำหรับกิจกรรมกลางแจ้งในเวลา 09:00-17:00');
      }

      // Location-based advice (if location available)
      const nearbyPlaces: NearbyPlace[] = [];
      if (currentLocation) {
        locationBasedAdvice.push(`📍 ตำแหน่งปัจจุบัน: ${phriResult.location}`);
        
        if (phriResult.phri > 6) {
          locationBasedAdvice.push('หลีกเลี่ยงพื้นที่ใกล้ถนนใหญ่และโรงงาน');
          locationBasedAdvice.push('มุ่งหาพื้นที่ที่มีต้นไม้และเขียวชอุ่ม');
        }

        // Simulated nearby places (in real app, fetch from API)
        if (phriResult.alertLevel === 'urgent' || phriResult.alertLevel === 'emergency') {
          nearbyPlaces.push({
            name: 'โรงพยาบาลใกล้เคียง',
            type: 'hospital',
            distance: 1500,
            recommendation: 'สำหรับกรณีฉุกเฉิน',
          });
          nearbyPlaces.push({
            name: 'คลินิกใกล้บ้าน',
            type: 'clinic',
            distance: 500,
            recommendation: 'ปรึกษาแพทย์หากมีอาการ',
          });
        }

        // Indoor alternatives
        if (phriResult.phri > 3) {
          nearbyPlaces.push({
            name: 'ห้างสรรพสินค้า (มีเครื่องฟอกอากาศ)',
            type: 'shopping_mall',
            distance: 2000,
            pm25Level: 15,
            recommendation: 'ทางเลือกสำหรับกิจกรรมในร่ม',
          });
        } else {
          nearbyPlaces.push({
            name: 'สวนสาธารณะ',
            type: 'park',
            distance: 1000,
            pm25Level: 25,
            recommendation: 'เหมาะสำหรับเดินออกกำลังกาย',
          });
        }
      }

      // Call backend API for additional health advice
      try {
        const { data: apiData } = await supabase.functions.invoke('personalized-health-advice', {
          body: {
            phri: phriResult.phri,
            alertLevel: phriResult.alertLevel,
            conditions: userConditions,
            location: currentLocation,
          },
        });

        if (apiData?.additionalTips) {
          healthTips.push(...apiData.additionalTips);
        }
      } catch (error) {
        console.log('Additional health advice API not available');
      }

      const result: PersonalizedRecommendation = {
        generalAdvice,
        locationBasedAdvice,
        healthTips,
        nearbyPlaces,
        weatherConsiderations,
        timingRecommendations,
      };

      setRecommendations(result);
      return result;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    generateRecommendations,
    recommendations,
    loading,
  };
};
