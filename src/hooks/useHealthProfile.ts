import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface HealthProfile {
  userId?: string;
  chronicConditions: string[];
  dustSensitivity: 'low' | 'medium' | 'high';
  physicalActivity: 'sedentary' | 'moderate' | 'active';
  hasAirPurifier: boolean;
  age: number;
  gender: string;
  weight?: number;
  createdAt?: string;
  updatedAt?: string;
}

const DEFAULT_PROFILE: HealthProfile = {
  chronicConditions: [],
  dustSensitivity: 'medium',
  physicalActivity: 'moderate',
  hasAirPurifier: false,
  age: 30,
  gender: 'other',
};

export const useHealthProfile = () => {
  const [profile, setProfile] = useState<HealthProfile>(DEFAULT_PROFILE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load profile from localStorage on mount
  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      
      // Try to load from Supabase if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Load from Supabase (future implementation)
        // For now, load from localStorage
        const stored = localStorage.getItem('healthProfile');
        if (stored) {
          setProfile(JSON.parse(stored));
        }
      } else {
        // Load from localStorage for non-authenticated users
        const stored = localStorage.getItem('healthProfile');
        if (stored) {
          setProfile(JSON.parse(stored));
        }
      }
    } catch (error) {
      console.error('Error loading health profile:', error);
      toast({
        title: 'ไม่สามารถโหลดข้อมูลโปรไฟล์',
        description: 'กรุณาลองใหม่อีกครั้ง',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async (newProfile: HealthProfile) => {
    try {
      setSaving(true);
      
      // Validate profile data
      if (!newProfile.age || newProfile.age < 1 || newProfile.age > 150) {
        throw new Error('อายุต้องอยู่ระหว่าง 1-150 ปี');
      }

      // Save to localStorage
      localStorage.setItem('healthProfile', JSON.stringify(newProfile));
      setProfile(newProfile);

      // Try to save to Supabase if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Future: Save to Supabase table
        // await supabase.from('health_profiles').upsert({...})
      }

      toast({
        title: 'บันทึกโปรไฟล์สำเร็จ',
        description: 'ข้อมูลสุขภาพของคุณถูกบันทึกแล้ว',
      });

      return true;
    } catch (error) {
      console.error('Error saving health profile:', error);
      toast({
        title: 'ไม่สามารถบันทึกโปรไฟล์',
        description: error instanceof Error ? error.message : 'กรุณาลองใหม่อีกครั้ง',
        variant: 'destructive',
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const updateProfile = async (updates: Partial<HealthProfile>) => {
    const newProfile = { ...profile, ...updates };
    return saveProfile(newProfile);
  };

  const resetProfile = () => {
    setProfile(DEFAULT_PROFILE);
    localStorage.removeItem('healthProfile');
    toast({
      title: 'รีเซ็ตโปรไฟล์สำเร็จ',
      description: 'ข้อมูลถูกรีเซ็ตเป็นค่าเริ่มต้น',
    });
  };

  return {
    profile,
    loading,
    saving,
    loadProfile,
    saveProfile,
    updateProfile,
    resetProfile,
  };
};
