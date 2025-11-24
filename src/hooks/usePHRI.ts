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
}

interface PHRIResult {
  phri: number;
  riskLevel: 'safe' | 'moderate' | 'high';
  color: string;
  advice: string;
}

export const usePHRI = () => {
  const [loading, setLoading] = useState(false);

  // Calculate PHRI using the formula: PHRI = (AQI × OutdoorTime) / (Age × HealthFactor)
  const calculatePHRI = (data: PHRIData): PHRIResult => {
    const healthFactor = data.hasSymptoms ? 1 : 0.8;
    const phri = (data.aqi * data.outdoorTime) / (data.age * healthFactor);

    let riskLevel: 'safe' | 'moderate' | 'high' = 'safe';
    let color = 'hsl(var(--success))';
    let advice = 'สามารถทำกิจกรรมกลางแจ้งได้ตามปกติ';

    if (phri >= 100) {
      riskLevel = 'high';
      color = 'hsl(var(--destructive))';
      advice = 'ควรพักในร่มทันที และสังเกตอาการผิดปกติ';
    } else if (phri >= 50) {
      riskLevel = 'moderate';
      color = 'hsl(var(--warning))';
      advice = 'ควรสวมหน้ากาก N95 และลดเวลาอยู่กลางแจ้ง';
    }

    return { phri: Math.round(phri * 100) / 100, riskLevel, color, advice };
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

      toast({
        title: 'บันทึกข้อมูลสำเร็จ',
        description: `ระดับความเสี่ยง: ${result.riskLevel === 'safe' ? 'ปลอดภัย' : result.riskLevel === 'moderate' ? 'ปานกลาง' : 'สูง'}`,
      });

      // Send notification if PHRI is high
      if (result.phri >= 50) {
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

  // Send notification for high PHRI
  const sendPHRINotification = async (result: PHRIResult) => {
    try {
      const permission = await LocalNotifications.requestPermissions();
      if (permission.display !== 'granted') return;

      await LocalNotifications.schedule({
        notifications: [
          {
            title: result.riskLevel === 'high' ? '⚠️ เตือนภัย! ความเสี่ยงสูง' : '⚠️ แจ้งเตือน: ความเสี่ยงปานกลาง',
            body: `PHRI: ${result.phri} - ${result.advice}`,
            id: Date.now(),
            schedule: { at: new Date(Date.now() + 100) },
            sound: 'default',
            attachments: undefined,
            actionTypeId: '',
            extra: null,
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
