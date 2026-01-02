import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface ProfileRequiredGuardProps {
  children: React.ReactNode;
  onProfileRequired: () => void;
}

export const ProfileRequiredGuard = ({ children, onProfileRequired }: ProfileRequiredGuardProps) => {
  const [isChecking, setIsChecking] = useState(true);
  const [hasProfile, setHasProfile] = useState(false);

  useEffect(() => {
    checkProfileStatus();
  }, []);

  const checkProfileStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setIsChecking(false);
        return;
      }

      // Check if user has a health profile in database
      const { data: profileData, error } = await supabase
        .from('health_profiles')
        .select('id, age, gender, dust_sensitivity, physical_activity')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking profile:', error);
      }

      // Check if profile exists and has required fields
      const profileComplete = profileData && 
        profileData.age && 
        profileData.gender && 
        profileData.dust_sensitivity &&
        profileData.physical_activity;

      if (profileComplete) {
        setHasProfile(true);
      } else {
        // Trigger profile required callback
        onProfileRequired();
      }
    } catch (error) {
      console.error('Profile check error:', error);
    } finally {
      setIsChecking(false);
    }
  };

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-gradient-to-r from-primary to-accent animate-pulse-glow" />
            <Loader2 className="absolute inset-0 m-auto h-8 w-8 animate-spin text-primary-foreground" />
          </div>
          <p className="text-muted-foreground animate-pulse">กำลังตรวจสอบข้อมูลสุขภาพ...</p>
        </motion.div>
      </div>
    );
  }

  if (!hasProfile) {
    return null; // Will be handled by parent
  }

  return <>{children}</>;
};
