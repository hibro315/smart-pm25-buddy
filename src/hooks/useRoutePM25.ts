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
  pm25Samples: number[];
  sampleLocations: number[][];
}

interface RouteParams {
  startLat: number;
  startLng: number;
  endLat?: number;
  endLng?: number;
  destination?: string;
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

      if (error) {
        throw error;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      setRoutes(data.routes);
      setRecommendedRoute(data.recommendedRoute);
      
      toast({
        title: 'วิเคราะห์เส้นทางสำเร็จ',
        description: `พบเส้นทางที่แนะนำ: PM2.5 เฉลี่ย ${data.recommendedRoute.averagePM25} µg/m³`,
      });

      return data;
    } catch (error: any) {
      console.error('Error analyzing routes:', error);
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถวิเคราะห์เส้นทางได้ กรุณาลองใหม่อีกครั้ง',
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
