import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    checkAuthAndProfile();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session);
      if (session) {
        checkProfileStatus(session.user.id);
      } else {
        setHasProfile(null);
        setIsChecking(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAuthAndProfile = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
      
      if (session) {
        await checkProfileStatus(session.user.id);
      } else {
        setIsChecking(false);
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setIsChecking(false);
    }
  };

  const checkProfileStatus = async (userId: string) => {
    try {
      const { data: profileData, error } = await supabase
        .from('health_profiles')
        .select('id, age, gender, dust_sensitivity, physical_activity')
        .eq('user_id', userId)
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

      setHasProfile(!!profileComplete);
    } catch (error) {
      console.error('Profile check error:', error);
      setHasProfile(false);
    } finally {
      setIsChecking(false);
    }
  };

  // Loading state
  if (isChecking || isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-gradient-to-r from-primary to-accent animate-pulse" />
            <Loader2 className="absolute inset-0 m-auto h-8 w-8 animate-spin text-primary-foreground" />
          </div>
          <p className="text-muted-foreground animate-pulse">กำลังตรวจสอบ...</p>
        </motion.div>
      </div>
    );
  }

  // Redirect to auth if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  // Redirect to profile setup if no profile
  if (hasProfile === false) {
    return <Navigate to="/profile-setup" replace />;
  }

  // Render children if authenticated and has profile
  return <>{children}</>;
};
