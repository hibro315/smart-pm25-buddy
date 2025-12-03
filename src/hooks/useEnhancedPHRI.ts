import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { LocalNotifications } from '@capacitor/local-notifications';

// Enhanced PHRI Input Data Structure
export interface EnhancedPHRIInput {
  // Environmental factors
  pm25: number;
  aqi: number;
  pm10?: number;
  co?: number;
  no2?: number;
  o3?: number;
  so2?: number;
  temperature?: number;
  humidity?: number;
  pressure?: number;
  wind?: number;
  nearbyStations?: Array<{
    name: string;
    aqi: number;
    distance: number;
  }>;
  
  // Personal factors
  age: number;
  gender: string;
  weight?: number;
  chronicConditions: string[];
  dustSensitivity: 'low' | 'medium' | 'high';
  physicalActivity: 'sedentary' | 'moderate' | 'active';
  hasAirPurifier: boolean;
  
  // Behavioral factors
  outdoorTime: number; // minutes
  wearingMask: boolean;
  exerciseIntensity?: 'none' | 'light' | 'moderate' | 'vigorous';
  
  // Symptoms today
  hasSymptoms: boolean;
  symptoms: string[];
  
  // Location
  location?: string;
  latitude?: number;
  longitude?: number;
}

// Enhanced PHRI Result with detailed breakdown
export interface EnhancedPHRIResult {
  phri: number; // 0-10 scale
  alertLevel: 'info' | 'warning' | 'urgent' | 'emergency';
  recommendation: string;
  personalizedAdvice: string[];
  timestamp: string;
  location: string;
  
  // Score breakdown
  environmentalScore: number;
  weatherScore: number;
  aqiScore: number;
  nearbyAreaScore: number;
  personalScore: number;
  behavioralScore: number;
  symptomScore: number;
  protectiveScore: number;
  
  // Detailed factors
  riskFactors: string[];
  protectiveFactors: string[];
  
  // Actions recommended
  immediateActions: string[];
  preventiveMeasures: string[];
}

export const useEnhancedPHRI = () => {
  const [loading, setLoading] = useState(false);

  // Calculate Enhanced PHRI (0-10 scale)
  const calculateEnhancedPHRI = useCallback((input: EnhancedPHRIInput): EnhancedPHRIResult => {
    try {
      // 1. Environmental Score (0-3 points)
      let environmentalScore = 0;
      if (input.pm25 > 150) environmentalScore = 3.0;
      else if (input.pm25 > 90) environmentalScore = 2.5;
      else if (input.pm25 > 50) environmentalScore = 2.0;
      else if (input.pm25 > 37) environmentalScore = 1.5;
      else if (input.pm25 > 12) environmentalScore = 1.0;
      else environmentalScore = 0.3;

      // Add other pollutants
      if (input.pm10 && input.pm10 > 150) environmentalScore += 0.3;
      if (input.co && input.co > 15) environmentalScore += 0.2;
      if (input.no2 && input.no2 > 200) environmentalScore += 0.2;
      if (input.o3 && input.o3 > 100) environmentalScore += 0.2;

      // 2. Weather Score (0-1.5 points)
      let weatherScore = 0;
      if (input.temperature !== undefined) {
        if (input.temperature > 35 || input.temperature < 10) weatherScore += 0.5;
        else if (input.temperature > 30 || input.temperature < 15) weatherScore += 0.3;
      }
      if (input.humidity !== undefined) {
        if (input.humidity > 80 || input.humidity < 30) weatherScore += 0.3;
        else if (input.humidity > 70 || input.humidity < 40) weatherScore += 0.2;
      }
      if (input.pressure !== undefined) {
        if (input.pressure < 1000 || input.pressure > 1025) weatherScore += 0.2;
      }
      if (input.wind !== undefined) {
        // Low wind means poor dispersion of pollutants
        if (input.wind < 1) weatherScore += 0.3;
        else if (input.wind < 2) weatherScore += 0.15;
        // Very high wind can stir up dust
        else if (input.wind > 10) weatherScore += 0.2;
      }

      // 3. AQI Score (0-1.5 points)
      let aqiScore = 0;
      if (input.aqi > 300) aqiScore = 1.5;
      else if (input.aqi > 200) aqiScore = 1.2;
      else if (input.aqi > 150) aqiScore = 1.0;
      else if (input.aqi > 100) aqiScore = 0.7;
      else if (input.aqi > 50) aqiScore = 0.4;

      // 3.5. Nearby Area Score (0-1 points)
      let nearbyAreaScore = 0;
      if (input.nearbyStations && input.nearbyStations.length > 0) {
        const avgNearbyAQI = input.nearbyStations.reduce((sum, station) => sum + station.aqi, 0) / input.nearbyStations.length;
        const aqiDifference = avgNearbyAQI - input.aqi;
        
        // If nearby areas are worse, increase risk
        if (aqiDifference > 50) nearbyAreaScore += 0.7;
        else if (aqiDifference > 20) nearbyAreaScore += 0.4;
        else if (aqiDifference > 0) nearbyAreaScore += 0.2;
        
        // Check if all nearby areas are unhealthy
        const allUnhealthy = input.nearbyStations.every(station => station.aqi > 100);
        if (allUnhealthy) nearbyAreaScore += 0.3;
      }

      // 4. Personal Score (0-2.5 points)
      let personalScore = 0;
      const highRiskConditions = ['asthma', 'COPD', 'heart disease', 'lung disease'];
      const moderateRiskConditions = ['allergy', 'diabetes', 'hypertension'];

      input.chronicConditions.forEach(condition => {
        if (highRiskConditions.includes(condition)) personalScore += 0.7;
        else if (moderateRiskConditions.includes(condition)) personalScore += 0.4;
        else personalScore += 0.2;
      });

      // Age factor
      if (input.age < 5) personalScore += 0.8;
      else if (input.age < 12) personalScore += 0.5;
      else if (input.age > 65) personalScore += 0.6;
      else if (input.age > 55) personalScore += 0.3;

      // Dust sensitivity
      if (input.dustSensitivity === 'high') personalScore += 0.7;
      else if (input.dustSensitivity === 'medium') personalScore += 0.4;

      // 5. Behavioral Score (0-2 points)
      let behavioralScore = 0;

      // Outdoor time (0-1.2 points)
      const outdoorFactor = Math.min(input.outdoorTime / 180, 1);
      behavioralScore += outdoorFactor * 1.2;

      // Physical activity
      if (input.physicalActivity === 'active') behavioralScore += 0.5;
      else if (input.physicalActivity === 'moderate') behavioralScore += 0.3;

      // Exercise intensity during high pollution
      if (input.pm25 > 37 && input.exerciseIntensity) {
        if (input.exerciseIntensity === 'vigorous') behavioralScore += 0.4;
        else if (input.exerciseIntensity === 'moderate') behavioralScore += 0.2;
      }

      // 6. Symptom Score (0-1.5 points)
      let symptomScore = 0;
      if (input.hasSymptoms) {
        const severeSymptoms = ['shortness of breath', 'chest pain', 'severe cough'];
        const moderateSymptoms = ['cough', 'sore throat', 'nasal congestion'];

        input.symptoms.forEach(symptom => {
          if (severeSymptoms.includes(symptom)) symptomScore += 0.5;
          else if (moderateSymptoms.includes(symptom)) symptomScore += 0.3;
          else symptomScore += 0.2;
        });
      }

      // 7. Protective Score (subtract 0-2 points)
      let protectiveScore = 0;
      if (input.wearingMask) {
        // N95 effectiveness varies by PM2.5 level
        if (input.pm25 > 75) protectiveScore += 0.8;
        else protectiveScore += 0.6;
      }
      if (input.hasAirPurifier) protectiveScore += 0.5;
      if (input.outdoorTime < 30) protectiveScore += 0.3;

      // Calculate final PHRI (0-10)
      let phri = environmentalScore + weatherScore + aqiScore + nearbyAreaScore +
                 personalScore + behavioralScore + symptomScore - protectiveScore;
      
      phri = Math.max(0, Math.min(10, phri));
      phri = Math.round(phri * 10) / 10;

      // Determine alert level
      let alertLevel: 'info' | 'warning' | 'urgent' | 'emergency';
      if (phri >= 8) alertLevel = 'emergency';
      else if (phri >= 6) alertLevel = 'urgent';
      else if (phri >= 3) alertLevel = 'warning';
      else alertLevel = 'info';

      // Generate recommendations
      const riskFactors: string[] = [];
      const protectiveFactors: string[] = [];
      const immediateActions: string[] = [];
      const preventiveMeasures: string[] = [];
      const personalizedAdvice: string[] = [];

      // Analyze risk factors
      if (input.pm25 > 75) riskFactors.push(`PM2.5 สูงมาก: ${input.pm25} µg/m³`);
      if (input.aqi > 150) riskFactors.push(`AQI อันตราย: ${input.aqi}`);
      if (input.outdoorTime > 60) riskFactors.push(`อยู่นอกอาคารนาน: ${input.outdoorTime} นาที`);
      if (input.chronicConditions.length > 0) {
        riskFactors.push(`มีโรคประจำตัว: ${input.chronicConditions.join(', ')}`);
      }

      // Analyze protective factors
      if (input.wearingMask) protectiveFactors.push('สวมหน้ากาก');
      if (input.hasAirPurifier) protectiveFactors.push('มีเครื่องฟอกอากาศ');
      if (input.outdoorTime < 30) protectiveFactors.push('จำกัดเวลานอกอาคาร');

      // Generate immediate actions based on PHRI level
      if (alertLevel === 'emergency') {
        immediateActions.push('🚨 เข้าอาคารทันที หลีกเลี่ยงการออกนอกอาคาร');
        immediateActions.push('ปิดประตูหน้าต่างทั้งหมด');
        immediateActions.push('เปิดเครื่องฟอกอากาศเต็มกำลัง');
        if (input.chronicConditions.length > 0) {
          immediateActions.push('⚠️ เตรียมยาฉุกเฉินพร้อมใช้');
          immediateActions.push('ติดต่อแพทย์หากมีอาการผิดปกติ');
        }
      } else if (alertLevel === 'urgent') {
        immediateActions.push('⚠️ จำกัดกิจกรรมกลางแจ้งให้น้อยที่สุด');
        immediateActions.push('สวมหน้ากาก N95 ทุกครั้งที่ออกนอกบ้าน');
        immediateActions.push('เปิดเครื่องฟอกอากาศในบ้าน');
      } else if (alertLevel === 'warning') {
        immediateActions.push('ลดเวลากิจกรรมกลางแจ้ง');
        immediateActions.push('สวมหน้ากากเมื่อออกนอกอาคาร');
      }

      // Generate preventive measures
      preventiveMeasures.push('ตรวจสอบค่า PM2.5 ก่อนออกนอกอาคาร');
      if (!input.hasAirPurifier) {
        preventiveMeasures.push('พิจารณาติดตั้งเครื่องฟอกอากาศ');
      }
      if (input.chronicConditions.length > 0) {
        preventiveMeasures.push('พกยาประจำตัวติดตัวเสมอ');
        preventiveMeasures.push('นัดพบแพทย์เป็นประจำ');
      }

      // Generate personalized advice
      if (input.chronicConditions.includes('asthma')) {
        personalizedAdvice.push('🫁 ผู้ป่วยหอบหืด: เตรียมยาขยายหลอดลม');
      }
      if (input.chronicConditions.includes('COPD')) {
        personalizedAdvice.push('🫁 ผู้ป่วย COPD: หลีกเลี่ยงควันและสารระคาย');
      }
      if (input.chronicConditions.includes('heart disease')) {
        personalizedAdvice.push('❤️ โรคหัวใจ: ลดความเครียด พักผ่อนเพียงพอ');
      }
      if (input.age < 5) {
        personalizedAdvice.push('👶 เด็กเล็ก: ระมัดระวังเป็นพิเศษ ลดเวลานอกอาคาร');
      } else if (input.age > 65) {
        personalizedAdvice.push('👴 ผู้สูงอายุ: สังเกตอาการเหนื่อยหอบ แน่นหน้าอก');
      }

      // Main recommendation
      let recommendation = '';
      if (alertLevel === 'emergency') {
        recommendation = '🚨 ฉุกเฉิน: อยู่ในอาคารเท่านั้น ปิดประตูหน้าต่าง';
      } else if (alertLevel === 'urgent') {
        recommendation = '⚠️ เร่งด่วน: หลีกเลี่ยงกิจกรรมกลางแจ้ง สวม N95';
      } else if (alertLevel === 'warning') {
        recommendation = '⚠️ เตือน: ลดกิจกรรมกลางแจ้ง สวมหน้ากาก';
      } else {
        recommendation = 'ℹ️ ปลอดภัย: สามารถทำกิจกรรมตามปกติ';
      }

      return {
        phri,
        alertLevel,
        recommendation,
        personalizedAdvice,
        timestamp: new Date().toISOString(),
        location: input.location || 'ไม่ระบุตำแหน่ง',
        environmentalScore: Math.round(environmentalScore * 10) / 10,
        weatherScore: Math.round(weatherScore * 10) / 10,
        aqiScore: Math.round(aqiScore * 10) / 10,
        nearbyAreaScore: Math.round(nearbyAreaScore * 10) / 10,
        personalScore: Math.round(personalScore * 10) / 10,
        behavioralScore: Math.round(behavioralScore * 10) / 10,
        symptomScore: Math.round(symptomScore * 10) / 10,
        protectiveScore: Math.round(protectiveScore * 10) / 10,
        riskFactors,
        protectiveFactors,
        immediateActions,
        preventiveMeasures,
      };
    } catch (error) {
      console.error('Error calculating enhanced PHRI:', error);
      return {
        phri: 0,
        alertLevel: 'info',
        recommendation: 'ไม่สามารถคำนวณความเสี่ยงได้',
        personalizedAdvice: [],
        timestamp: new Date().toISOString(),
        location: 'Error',
        environmentalScore: 0,
        weatherScore: 0,
        aqiScore: 0,
        nearbyAreaScore: 0,
        personalScore: 0,
        behavioralScore: 0,
        symptomScore: 0,
        protectiveScore: 0,
        riskFactors: [],
        protectiveFactors: [],
        immediateActions: [],
        preventiveMeasures: [],
      };
    }
  }, []);

  // Save PHRI log with exposure history (checks if already saved today)
  const saveEnhancedPHRILog = useCallback(async (
    input: EnhancedPHRIInput,
    result: EnhancedPHRIResult
  ): Promise<boolean> => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return false;
      }

      const today = new Date().toISOString().split('T')[0];

      // Check if already saved today
      const { data: existingLog } = await supabase
        .from('health_logs')
        .select('id')
        .eq('user_id', user.id)
        .eq('log_date', today)
        .maybeSingle();

      if (existingLog) {
        // Update existing record
        const { error } = await supabase
          .from('health_logs')
          .update({
            aqi: input.aqi,
            pm25: input.pm25,
            pm10: input.pm10 || null,
            co: input.co || null,
            no2: input.no2 || null,
            o3: input.o3 || null,
            so2: input.so2 || null,
            outdoor_time: input.outdoorTime,
            has_symptoms: input.hasSymptoms,
            symptoms: input.symptoms,
            phri: result.phri,
            location: result.location,
            wearing_mask: input.wearingMask,
          })
          .eq('id', existingLog.id);

        if (error) throw error;
      } else {
        // Insert new record
        const { error } = await supabase.from('health_logs').insert({
          user_id: user.id,
          log_date: today,
          aqi: input.aqi,
          pm25: input.pm25,
          pm10: input.pm10 || null,
          co: input.co || null,
          no2: input.no2 || null,
          o3: input.o3 || null,
          so2: input.so2 || null,
          outdoor_time: input.outdoorTime,
          age: input.age,
          gender: input.gender,
          has_symptoms: input.hasSymptoms,
          symptoms: input.symptoms,
          phri: result.phri,
          location: result.location,
          wearing_mask: input.wearingMask,
        });

        if (error) throw error;

        toast({
          title: 'บันทึกข้อมูลสำเร็จ',
          description: `PHRI: ${result.phri}/10 - PM2.5: ${input.pm25} µg/m³`,
        });
      }

      // Send notification if warning or higher
      if (result.phri >= 3) {
        await sendPHRINotification(result);
      }

      return true;
    } catch (error) {
      console.error('Error saving PHRI log:', error);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Send push notification
  const sendPHRINotification = async (result: EnhancedPHRIResult) => {
    try {
      const permission = await LocalNotifications.requestPermissions();
      if (permission.display !== 'granted') return;

      const titles = {
        emergency: '🚨 ฉุกเฉิน! ความเสี่ยงสูงมาก',
        urgent: '⚠️ เร่งด่วน! ความเสี่ยงสูง',
        warning: '⚠️ แจ้งเตือน: ความเสี่ยงปานกลาง',
        info: 'ℹ️ ข้อมูล: สถานการณ์ปลอดภัย',
      };

      await LocalNotifications.schedule({
        notifications: [
          {
            title: titles[result.alertLevel],
            body: `PHRI: ${result.phri}/10\n${result.recommendation}\n${result.personalizedAdvice.join('\n')}`,
            id: Date.now(),
            schedule: { at: new Date(Date.now() + 100) },
            sound: 'default',
            attachments: undefined,
            actionTypeId: '',
            extra: {
              phri: result.phri,
              alertLevel: result.alertLevel,
              timestamp: result.timestamp,
            },
          },
        ],
      });
    } catch (error) {
      console.error('Notification error:', error);
    }
  };

  return {
    calculateEnhancedPHRI,
    saveEnhancedPHRILog,
    loading,
  };
};
