import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface VitalSignsData {
  heartRate: number;
  respirationRate: number;
  temperature: number;
  bpSystolic: number;
  bpDiastolic: number;
  spo2: number;
}

interface ProcessedVitalSigns {
  hr: number;
  rr: number;
  temp: number;
  sys: number;
  dia: number;
  spo2: number;
  pulsePressure: number;
  map: number;
  shockIndex: number;
  timestamp: number;
}

interface RiskResult {
  score: number;
  level: 'LOW' | 'MEDIUM' | 'HIGH';
  color: string;
  advice: string;
}

interface TrendResult {
  hr: string;
  rr: string;
  temp: string;
  sys: string;
  spo2: string;
}

export const useVitalSigns = () => {
  const [loading, setLoading] = useState(false);

  // Feature Engineering
  const processPHRI = (raw: VitalSignsData): ProcessedVitalSigns => {
    const pulsePressure = raw.bpSystolic - raw.bpDiastolic;
    const map = raw.bpDiastolic + pulsePressure / 3;
    const shockIndex = raw.heartRate / raw.bpSystolic;

    return {
      hr: raw.heartRate,
      rr: raw.respirationRate,
      temp: raw.temperature,
      sys: raw.bpSystolic,
      dia: raw.bpDiastolic,
      spo2: raw.spo2,
      pulsePressure,
      map,
      shockIndex,
      timestamp: Date.now(),
    };
  };

  // AI Risk Scoring
  const aiRiskScore = (phri: ProcessedVitalSigns): RiskResult => {
    let score = 0;

    // Heart Rate
    if (phri.hr < 50 || phri.hr > 110) score += 2;
    else if (phri.hr < 60 || phri.hr > 100) score += 1;

    // Respiration Rate
    if (phri.rr < 10 || phri.rr > 25) score += 2;
    else if (phri.rr < 12 || phri.rr > 20) score += 1;

    // Temperature
    if (phri.temp >= 38 || phri.temp < 35.5) score += 2;
    else if (phri.temp > 37.3) score += 1;

    // Blood Pressure
    if (phri.sys < 90 || phri.sys > 150) score += 2;
    if (phri.dia < 50 || phri.dia > 95) score += 1;

    // SpO2
    if (phri.spo2 < 92) score += 2;
    else if (phri.spo2 < 95) score += 1;

    // Shock Index
    if (phri.shockIndex > 0.9) score += 2;

    let level: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
    let color = 'hsl(var(--success))';
    let advice = 'ค่าสัญญาณชีพอยู่ในเกณฑ์ปกติ';

    if (score >= 6) {
      level = 'HIGH';
      color = 'hsl(var(--destructive))';
      advice = '⚠️ เสี่ยงสูง! ควรปรึกษาแพทย์ทันที';
    } else if (score >= 3) {
      level = 'MEDIUM';
      color = 'hsl(var(--warning))';
      advice = '⚠️ เสี่ยงปานกลาง ควรติดตามอาการอย่างใกล้ชิด';
    }

    return { score, level, color, advice };
  };

  // Anomaly Detection
  const detectAnomaly = (phri: ProcessedVitalSigns): string[] => {
    const anomalies: string[] = [];

    if (phri.hr < 30 || phri.hr > 200) anomalies.push('Heart rate unrealistic');
    if (phri.rr < 5 || phri.rr > 40) anomalies.push('Respiration rate unrealistic');
    if (phri.temp < 33 || phri.temp > 42) anomalies.push('Temperature unrealistic');
    if (phri.sys < 60 || phri.sys > 220) anomalies.push('Systolic BP unrealistic');
    if (phri.dia < 30 || phri.dia > 150) anomalies.push('Diastolic BP unrealistic');
    if (phri.spo2 < 50 || phri.spo2 > 100) anomalies.push('SpO₂ unrealistic');

    return anomalies;
  };

  // Trend Prediction
  const predictTrend = (history: any[], field: string): string => {
    if (history.length < 3) return 'NOT_ENOUGH_DATA';

    const last = history.slice(-3).map((v) => v[field]);
    const slope = (last[2] - last[0]) / 2;

    if (slope > 2) return 'RISING';
    if (slope < -2) return 'FALLING';
    return 'STABLE';
  };

  // Save to database
  const saveVitalSigns = async (
    data: VitalSignsData,
    history: any[] = []
  ): Promise<{ risk: RiskResult; anomalies: string[]; trends: TrendResult } | null> => {
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

      const processed = processPHRI(data);
      const risk = aiRiskScore(processed);
      const anomalies = detectAnomaly(processed);
      const trends: TrendResult = {
        hr: predictTrend(history, 'heart_rate'),
        rr: predictTrend(history, 'respiration_rate'),
        temp: predictTrend(history, 'temperature'),
        sys: predictTrend(history, 'bp_systolic'),
        spo2: predictTrend(history, 'spo2'),
      };

      if (anomalies.length > 0) {
        toast({
          title: '⚠️ ตรวจพบข้อมูลผิดปกติ',
          description: anomalies.join(', '),
          variant: 'destructive',
        });
      }

      const { error } = await supabase.from('vital_signs').insert({
        user_id: user.id,
        heart_rate: processed.hr,
        respiration_rate: processed.rr,
        temperature: processed.temp,
        bp_systolic: processed.sys,
        bp_diastolic: processed.dia,
        spo2: processed.spo2,
        pulse_pressure: processed.pulsePressure,
        mean_arterial_pressure: processed.map,
        shock_index: processed.shockIndex,
        risk_score: risk.score,
        risk_level: risk.level,
        anomalies: anomalies,
        trends: trends,
      } as any);

      if (error) throw error;

      toast({
        title: 'บันทึกข้อมูลสำเร็จ',
        description: `ระดับความเสี่ยง: ${risk.level}`,
      });

      return { risk, anomalies, trends };
    } catch (error) {
      console.error('Error saving vital signs:', error);
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

  // Fetch history
  const fetchVitalSigns = async (limit: number = 10) => {
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
        .from('vital_signs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching vital signs:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Unexpected error fetching vital signs:', error);
      return [];
    }
  };

  return {
    saveVitalSigns,
    fetchVitalSigns,
    loading,
  };
};
