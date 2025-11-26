import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { LocalNotifications } from '@capacitor/local-notifications';

interface PHRIData {
  aqi: number;
  pm25: number;
  pm10?: number;
  co?: number;
  no2?: number;
  o3?: number;
  so2?: number;
  outdoorTime: number;
  age: number;
  gender: string;
  hasSymptoms: boolean;
  symptoms: string[];
  location?: string;
  wearingMask?: boolean;
  // Enhanced personal factors
  chronicConditions?: string[]; // asthma, allergy, COPD, heart disease
  dustSensitivity?: 'low' | 'medium' | 'high';
  physicalActivity?: 'sedentary' | 'moderate' | 'active';
  hasAirPurifier?: boolean;
  weight?: number;
}

interface PHRIResult {
  phri: number; // 0-10 scale
  riskLevel: 'info' | 'warning' | 'urgent' | 'emergency';
  color: string;
  advice: string;
  personalizedAdvice: string;
  environmentalScore: number;
  personalScore: number;
  behavioralScore: number;
  symptomScore: number;
  protectiveScore: number;
}

export const usePHRI = () => {
  const [loading, setLoading] = useState(false);

  // Enhanced PHRI Calculation (0-10 scale)
  // Environmental + Personal + Behavioral + Symptoms + Protective factors
  const calculatePHRI = (data: PHRIData): PHRIResult => {
    try {
      // 1. Environmental Score (0-3 points)
      let environmentalScore = 0;
      if (data.pm25 > 150) environmentalScore = 3;
      else if (data.pm25 > 90) environmentalScore = 2.5;
      else if (data.pm25 > 50) environmentalScore = 2;
      else if (data.pm25 > 35) environmentalScore = 1.5;
      else if (data.pm25 > 12) environmentalScore = 1;
      
      // Add AQI trend consideration
      if (data.aqi > 200) environmentalScore += 0.5;

      // 2. Personal Factors Score (0-2.5 points)
      let personalScore = 0;
      const conditions = data.chronicConditions || [];
      
      if (conditions.includes('asthma')) personalScore += 0.8;
      if (conditions.includes('COPD')) personalScore += 0.8;
      if (conditions.includes('heart disease')) personalScore += 0.6;
      if (conditions.includes('allergy')) personalScore += 0.5;
      
      // Age factor
      if (data.age < 5 || data.age > 65) personalScore += 0.4;
      else if (data.age < 12 || data.age > 55) personalScore += 0.2;
      
      // Dust sensitivity
      if (data.dustSensitivity === 'high') personalScore += 0.6;
      else if (data.dustSensitivity === 'medium') personalScore += 0.3;

      // 3. Behavioral Factors Score (0-2 points)
      let behavioralScore = 0;
      
      // Outdoor time (normalized to 0-1)
      const outdoorFactor = Math.min(data.outdoorTime / 180, 1); // 3 hours = max
      behavioralScore += outdoorFactor * 1.2;
      
      // Physical activity
      if (data.physicalActivity === 'active') behavioralScore += 0.5;
      else if (data.physicalActivity === 'moderate') behavioralScore += 0.3;

      // 4. Symptom Score (0-1.5 points)
      let symptomScore = 0;
      if (data.hasSymptoms) {
        symptomScore = Math.min(data.symptoms.length * 0.3, 1.5);
      }

      // 5. Protective Factors (subtract 0-1 point)
      let protectiveScore = 0;
      if (data.wearingMask) protectiveScore += 0.5;
      if (data.hasAirPurifier) protectiveScore += 0.3;

      // Calculate final PHRI (0-10)
      let phri = environmentalScore + personalScore + behavioralScore + symptomScore - protectiveScore;
      phri = Math.max(0, Math.min(10, phri)); // Clamp to 0-10
      phri = Math.round(phri * 10) / 10; // Round to 1 decimal

      // Determine risk level and advice
      let riskLevel: 'info' | 'warning' | 'urgent' | 'emergency';
      let color: string;
      let advice: string;
      let personalizedAdvice: string;

      if (phri >= 9) {
        riskLevel = 'emergency';
        color = 'hsl(0 84% 60%)';
        advice = '⚠️ ภาวะฉุกเฉิน: อยู่ในอาคารเท่านั้น ปิดประตูหน้าต่าง';
        personalizedAdvice = generatePersonalizedAdvice(data, 'emergency');
      } else if (phri >= 6) {
        riskLevel = 'urgent';
        color = 'hsl(var(--destructive))';
        advice = '🚨 เร่งด่วน: หลีกเลี่ยงกิจกรรมกลางแจ้ง เปิดเครื่องฟอกอากาศ';
        personalizedAdvice = generatePersonalizedAdvice(data, 'urgent');
      } else if (phri >= 3) {
        riskLevel = 'warning';
        color = 'hsl(var(--warning))';
        advice = '⚠️ เตือน: ลดกิจกรรมกลางแจ้ง สวมหน้ากาก N95';
        personalizedAdvice = generatePersonalizedAdvice(data, 'warning');
      } else {
        riskLevel = 'info';
        color = 'hsl(var(--success))';
        advice = 'ℹ️ ปลอดภัย: สามารถทำกิจกรรมตามปกติ';
        personalizedAdvice = generatePersonalizedAdvice(data, 'info');
      }

      return {
        phri,
        riskLevel,
        color,
        advice,
        personalizedAdvice,
        environmentalScore: Math.round(environmentalScore * 10) / 10,
        personalScore: Math.round(personalScore * 10) / 10,
        behavioralScore: Math.round(behavioralScore * 10) / 10,
        symptomScore: Math.round(symptomScore * 10) / 10,
        protectiveScore: Math.round(protectiveScore * 10) / 10,
      };
    } catch (error) {
      console.error('Error calculating PHRI:', error);
      // Return safe default
      return {
        phri: 0,
        riskLevel: 'info',
        color: 'hsl(var(--success))',
        advice: 'ไม่สามารถคำนวณความเสี่ยงได้ กรุณาลองใหม่อีกครั้ง',
        personalizedAdvice: '',
        environmentalScore: 0,
        personalScore: 0,
        behavioralScore: 0,
        symptomScore: 0,
        protectiveScore: 0,
      };
    }
  };

  // Generate personalized advice based on user's health profile
  const generatePersonalizedAdvice = (
    data: PHRIData,
    level: 'info' | 'warning' | 'urgent' | 'emergency'
  ): string => {
    const conditions = data.chronicConditions || [];
    const adviceParts: string[] = [];

    if (level === 'emergency') {
      if (conditions.includes('asthma')) {
        adviceParts.push('ผู้ป่วยหอบหืด: เตรียมยาขยายหลอดลม พร้อมใช้ตลอดเวลา');
      }
      if (conditions.includes('COPD')) {
        adviceParts.push('ผู้ป่วย COPD: ใช้ออกซิเจน หากมีอาการหายใจลำบาก');
      }
      if (conditions.includes('heart disease')) {
        adviceParts.push('โรคหัวใจ: หลีกเลี่ยงความเครียด พักผ่อนเพียงพอ');
      }
      if (data.age < 5) {
        adviceParts.push('เด็กเล็ก: ห้ามออกนอกบ้านโดยเด็ดขาด');
      } else if (data.age > 65) {
        adviceParts.push('ผู้สูงอายุ: สังเกตอาการเหนื่อยหอบ แน่นหน้าอก');
      }
      adviceParts.push('พิจารณาปรึกษาแพทย์หากมีอาการผิดปกติ');
    } else if (level === 'urgent') {
      if (conditions.includes('asthma') || conditions.includes('allergy')) {
        adviceParts.push('สวมหน้ากาก N95 ทุกครั้งที่ออกนอกบ้าน');
      }
      if (!data.hasAirPurifier) {
        adviceParts.push('แนะนำให้ใช้เครื่องฟอกอากาศในบ้าน');
      }
      if (data.outdoorTime > 60) {
        adviceParts.push('ลดเวลาอยู่กลางแจ้งให้น้อยกว่า 30 นาที');
      }
    } else if (level === 'warning') {
      if (conditions.length > 0) {
        adviceParts.push('สวมหน้ากากเมื่อออกนอกบ้าน');
      }
      if (data.physicalActivity === 'active') {
        adviceParts.push('ลดความเข้มข้นของการออกกำลังกาย');
      }
    } else {
      if (data.pm25 < 12) {
        adviceParts.push('คุณภาพอากาศดีมาก เหมาะสำหรับกิจกรรมกลางแจ้ง');
      }
    }

    return adviceParts.join(' • ');
  };

  // Save health log to database
  const saveHealthLog = async (data: PHRIData): Promise<PHRIResult | null> => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: 'ไม่สามารถบันทึกข้อมูลได้',
          description: 'กรุณาเข้าสู่ระบบก่อน',
          variant: 'destructive',
        });
        return null;
      }

      const result = calculatePHRI(data);

      const { error } = await supabase.from('health_logs').insert({
        user_id: user.id,
        aqi: data.aqi,
        pm25: data.pm25,
        pm10: data.pm10 || null,
        co: data.co || null,
        no2: data.no2 || null,
        o3: data.o3 || null,
        so2: data.so2 || null,
        outdoor_time: data.outdoorTime,
        age: data.age,
        gender: data.gender,
        has_symptoms: data.hasSymptoms,
        symptoms: data.symptoms,
        phri: result.phri,
        location: data.location,
        wearing_mask: data.wearingMask || false,
      });

      if (error) throw error;

      const riskLevelText = {
        info: 'ปลอดภัย',
        warning: 'เตือน',
        urgent: 'เร่งด่วน',
        emergency: 'ฉุกเฉิน',
      };

      toast({
        title: 'บันทึกข้อมูลสำเร็จ',
        description: `ระดับความเสี่ยง: ${riskLevelText[result.riskLevel]} (PHRI: ${result.phri}/10)`,
      });

      // Send notification if PHRI is warning or higher
      if (result.phri >= 3) {
        await sendPHRINotification(result);
      }

      return result;
    } catch (error) {
      console.error('Error saving health log:', error);
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถบันทึกข้อมูลได้',
        variant: 'destructive',
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Send personalized notification based on PHRI level
  const sendPHRINotification = async (result: PHRIResult) => {
    try {
      const permission = await LocalNotifications.requestPermissions();
      if (permission.display !== 'granted') return;

      const notificationConfig = {
        emergency: {
          title: '🚨 ฉุกเฉิน! ความเสี่ยงสูงมาก',
          sound: 'default',
          urgency: true,
        },
        urgent: {
          title: '⚠️ เร่งด่วน! ความเสี่ยงสูง',
          sound: 'default',
          urgency: true,
        },
        warning: {
          title: '⚠️ แจ้งเตือน: ความเสี่ยงปานกลาง',
          sound: 'default',
          urgency: false,
        },
        info: {
          title: 'ℹ️ ข้อมูล: สถานการณ์ปลอดภัย',
          sound: undefined,
          urgency: false,
        },
      };

      const config = notificationConfig[result.riskLevel];
      
      await LocalNotifications.schedule({
        notifications: [
          {
            title: config.title,
            body: `PHRI: ${result.phri}/10\n${result.advice}\n${result.personalizedAdvice}`,
            id: Date.now(),
            schedule: { at: new Date(Date.now() + 100) },
            sound: config.sound,
            attachments: undefined,
            actionTypeId: '',
            extra: { phri: result.phri, riskLevel: result.riskLevel },
          },
        ],
      });
    } catch (error) {
      console.error('Notification error:', error);
    }
  };

  // Fetch health logs with better error handling
  const fetchHealthLogs = async (limit: number = 10) => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('Error getting user:', userError);
        return [];
      }
      
      if (!user) {
        console.log('No authenticated user');
        return [];
      }

      const { data, error } = await supabase
        .from('health_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching health logs:', error);
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error('Unexpected error fetching health logs:', error);
      return [];
    }
  };

  return {
    calculatePHRI,
    saveHealthLog,
    fetchHealthLogs,
    loading,
  };
};
