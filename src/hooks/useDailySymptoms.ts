import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface DailySymptom {
  cough: boolean;
  cough_severity?: number;
  sneeze: boolean;
  sneeze_severity?: number;
  wheezing: boolean;
  wheezing_severity?: number;
  chest_tightness: boolean;
  chest_tightness_severity?: number;
  eye_irritation: boolean;
  eye_irritation_severity?: number;
  fatigue: boolean;
  fatigue_severity?: number;
  shortness_of_breath: boolean;
  shortness_of_breath_severity?: number;
  notes?: string;
}

export const useDailySymptoms = () => {
  const [todaySymptoms, setTodaySymptoms] = useState<DailySymptom | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadTodaySymptoms();
  }, []);

  const loadTodaySymptoms = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('daily_symptoms')
        .select('*')
        .eq('user_id', user.id)
        .eq('log_date', today)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setTodaySymptoms({
          cough: data.cough,
          cough_severity: data.cough_severity,
          sneeze: data.sneeze,
          sneeze_severity: data.sneeze_severity,
          wheezing: data.wheezing,
          wheezing_severity: data.wheezing_severity,
          chest_tightness: data.chest_tightness,
          chest_tightness_severity: data.chest_tightness_severity,
          eye_irritation: data.eye_irritation,
          eye_irritation_severity: data.eye_irritation_severity,
          fatigue: data.fatigue,
          fatigue_severity: data.fatigue_severity,
          shortness_of_breath: data.shortness_of_breath,
          shortness_of_breath_severity: data.shortness_of_breath_severity,
          notes: data.notes,
        });
      }
    } catch (error) {
      console.error('Error loading symptoms:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSymptoms = async (symptoms: DailySymptom) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: 'ผิดพลาด',
          description: 'กรุณาเข้าสู่ระบบก่อน',
          variant: 'destructive',
        });
        return;
      }

      const today = new Date().toISOString().split('T')[0];

      // Calculate symptom score
      const symptomScore = calculateSymptomScore(symptoms);

      const { error } = await supabase
        .from('daily_symptoms')
        .upsert({
          user_id: user.id,
          log_date: today,
          ...symptoms,
          symptom_score: symptomScore,
        }, {
          onConflict: 'user_id,log_date'
        });

      if (error) {
        console.error('Supabase error details:', error);
        throw error;
      }

      setTodaySymptoms(symptoms);

      toast({
        title: 'บันทึกสำเร็จ',
        description: `คะแนนอาการของคุณวันนี้: ${symptomScore}/100`,
      });

      return symptomScore;
    } catch (error: any) {
      console.error('Error saving symptoms:', error);
      toast({
        title: 'ไม่สามารถบันทึกได้',
        description: error.message || 'เกิดข้อผิดพลาดในการบันทึกอาการ',
        variant: 'destructive',
      });
      return undefined;
    }
  };

  const calculateSymptomScore = (symptoms: DailySymptom): number => {
    let score = 0;
    const weights = {
      cough: 15,
      sneeze: 10,
      wheezing: 20,
      chest_tightness: 20,
      eye_irritation: 10,
      fatigue: 15,
      shortness_of_breath: 25,
    };

    if (symptoms.cough) {
      score += weights.cough + (symptoms.cough_severity || 0) * 0.5;
    }
    if (symptoms.sneeze) {
      score += weights.sneeze + (symptoms.sneeze_severity || 0) * 0.3;
    }
    if (symptoms.wheezing) {
      score += weights.wheezing + (symptoms.wheezing_severity || 0) * 0.7;
    }
    if (symptoms.chest_tightness) {
      score += weights.chest_tightness + (symptoms.chest_tightness_severity || 0) * 0.7;
    }
    if (symptoms.eye_irritation) {
      score += weights.eye_irritation + (symptoms.eye_irritation_severity || 0) * 0.3;
    }
    if (symptoms.fatigue) {
      score += weights.fatigue + (symptoms.fatigue_severity || 0) * 0.5;
    }
    if (symptoms.shortness_of_breath) {
      score += weights.shortness_of_breath + (symptoms.shortness_of_breath_severity || 0) * 0.8;
    }

    return Math.min(Math.round(score), 100);
  };

  const getSymptomScore = (): number => {
    if (!todaySymptoms) return 0;
    return calculateSymptomScore(todaySymptoms);
  };

  return {
    todaySymptoms,
    loading,
    saveSymptoms,
    getSymptomScore,
    hasLoggedToday: todaySymptoms !== null,
  };
};
