import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface RouteWithPM25 {
  routeIndex: number;
  geometry: any;
  distance: number;
  duration: number;
  averagePM25: number;
  maxPM25: number;
  healthAlert: string;
  alertSeverity: string;
  recommendations: string[];
  pm25Samples: number[];
  sampleLocations: number[][];
}

interface RouteParams {
  startLat: number;
  startLng: number;
  endLat?: number;
  endLng?: number;
  destination?: string;
  hasRespiratoryCondition?: boolean;
  chronicConditions?: string[];
}

export const useRoutePM25 = () => {
  const [routes, setRoutes] = useState<RouteWithPM25[]>([]);
  const [recommendedRoute, setRecommendedRoute] = useState<RouteWithPM25 | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const analyzeRoutes = async (params: RouteParams) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-route-pm25', {
        body: params
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setRoutes(data.routes);
      setRecommendedRoute(data.recommendedRoute);
      
      const severity = data.recommendedRoute.alertSeverity;
      toast({
        title: severity === 'good' ? '✅ พบเส้นทางที่ปลอดภัย' : 'วิเคราะห์เส้นทางสำเร็จ',
        description: `PM2.5 เฉลี่ย ${data.recommendedRoute.averagePM25} µg/m³`,
        variant: severity === 'hazardous' || severity === 'very-unhealthy' ? 'destructive' : 'default',
      });

      return data;
    } catch (error: any) {
      console.error('Error analyzing routes:', error);
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: error.message || 'ไม่สามารถวิเคราะห์เส้นทางได้',
        variant: 'destructive',
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    routes,
    recommendedRoute,
    loading,
    analyzeRoutes,
  };
};
