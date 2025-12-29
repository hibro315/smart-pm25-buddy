import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RouteParams {
  startLat: number;
  startLng: number;
  endLat?: number;
  endLng?: number;
  destination?: string;
  hasRespiratoryCondition?: boolean;
  chronicConditions?: string[];
}

// Get PM2.5 from AQICN API
async function getPM25FromAQICN(lat: number, lng: number, apiKey: string): Promise<number | null> {
  try {
    const response = await fetch(
      `https://api.waqi.info/feed/geo:${lat};${lng}/?token=${apiKey}`
    );
    
    if (!response.ok) return null;
    
    const data = await response.json();
    
    if (data.status === 'ok' && data.data?.iaqi?.pm25?.v !== undefined) {
      return data.data.iaqi.pm25.v;
    }
    
    // Fallback to AQI if PM2.5 not available
    if (data.status === 'ok' && data.data?.aqi !== undefined) {
      return Math.round(data.data.aqi * 0.7);
    }
    
    return null;
  } catch (error) {
    console.error('AQICN API error:', error);
    return null;
  }
}

// Generate health alert based on PM2.5 and health conditions
function generateHealthAlert(
  avgPM25: number, 
  maxPM25: number,
  hasRespiratoryCondition: boolean,
  chronicConditions: string[]
): { alert: string; severity: string; recommendations: string[] } {
  const recommendations: string[] = [];
  let severity = 'good';
  let alert = '';

  const hasAsthma = chronicConditions.includes('asthma');
  const hasCOPD = chronicConditions.includes('copd');
  const hasHeartDisease = chronicConditions.includes('heart_disease');
  const hasAllergy = chronicConditions.includes('allergy');

  // Adjust thresholds for respiratory patients
  const warningThreshold = hasRespiratoryCondition ? 25 : 50;
  const dangerThreshold = hasRespiratoryCondition ? 50 : 100;
  const criticalThreshold = hasRespiratoryCondition ? 75 : 150;

  if (avgPM25 <= 15) {
    severity = 'good';
    alert = 'คุณภาพอากาศดี ปลอดภัยสำหรับทุกคน';
    recommendations.push('สามารถเดินทางได้ตามปกติ');
  } else if (avgPM25 <= warningThreshold) {
    severity = 'moderate';
    alert = hasRespiratoryCondition 
      ? '⚠️ คุณภาพอากาศปานกลาง - ควรระวังสำหรับผู้ป่วยระบบทางเดินหายใจ'
      : 'คุณภาพอากาศปานกลาง';
    
    if (hasAsthma) recommendations.push('พกยาพ่นติดตัว');
    if (hasCOPD) recommendations.push('หลีกเลี่ยงการออกกำลังกายหนัก');
    recommendations.push('สวมหน้ากากอนามัยหากมีอาการ');
  } else if (avgPM25 <= dangerThreshold) {
    severity = 'unhealthy';
    alert = hasRespiratoryCondition
      ? '🔴 ไม่แนะนำให้เดินทางเส้นทางนี้'
      : '⚠️ คุณภาพอากาศไม่ดี - ควรสวมหน้ากาก N95';
    
    recommendations.push('สวมหน้ากาก N95 ตลอดการเดินทาง');
    if (hasAsthma) recommendations.push('🚨 ผู้ป่วยหืด: พิจารณาเลื่อนการเดินทาง');
    if (hasCOPD) recommendations.push('🚨 ผู้ป่วย COPD: ควรเลี่ยงเส้นทางนี้');
    if (hasHeartDisease) recommendations.push('ผู้ป่วยโรคหัวใจ: ลดกิจกรรมกลางแจ้ง');
  } else if (avgPM25 <= criticalThreshold) {
    severity = 'very-unhealthy';
    alert = '🔴 คุณภาพอากาศแย่มาก - ไม่แนะนำให้เดินทาง';
    
    recommendations.push('หลีกเลี่ยงการเดินทางหากเป็นไปได้');
    recommendations.push('สวมหน้ากาก N95 และลดเวลาอยู่กลางแจ้ง');
    if (hasRespiratoryCondition) {
      recommendations.push('🚨 ผู้ป่วยระบบหายใจ: ควรเลื่อนการเดินทางเด็ดขาด');
    }
  } else {
    severity = 'hazardous';
    alert = '🚨 อันตราย! ห้ามเดินทางเส้นทางนี้';
    
    recommendations.push('งดการเดินทางทุกกรณี');
    recommendations.push('อยู่ในอาคารที่มีเครื่องฟอกอากาศ');
    if (hasRespiratoryCondition) {
      recommendations.push('🆘 ติดต่อแพทย์ทันทีหากมีอาการผิดปกติ');
    }
  }

  // Add max PM2.5 warning if significantly higher than average
  if (maxPM25 > avgPM25 * 1.5 && maxPM25 > warningThreshold) {
    recommendations.push(`⚠️ มีจุดที่ PM2.5 สูงถึง ${Math.round(maxPM25)} µg/m³`);
  }

  return { alert, severity, recommendations };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const params: RouteParams = await req.json();
    const { startLat, startLng, destination, hasRespiratoryCondition = false, chronicConditions = [] } = params;
    let { endLat, endLng } = params;

    console.log('Route PM2.5 request:', { startLat, startLng, endLat, endLng, destination, hasRespiratoryCondition });

    const MAPBOX_API_KEY = Deno.env.get('MAPBOX_API_KEY');
    const AQICN_API_KEY = Deno.env.get('AQICN_API_KEY');

    if (!MAPBOX_API_KEY) {
      throw new Error('MAPBOX_API_KEY not configured');
    }
    if (!AQICN_API_KEY) {
      throw new Error('AQICN_API_KEY not configured');
    }

    // Geocode destination if provided
    if (destination && (!endLat || !endLng)) {
      console.log('Geocoding destination:', destination);
      const geocodeUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(destination)}.json?access_token=${MAPBOX_API_KEY}&country=TH&limit=1`;
      
      const geocodeResponse = await fetch(geocodeUrl);
      const geocodeData = await geocodeResponse.json();
      
      if (geocodeData.features && geocodeData.features.length > 0) {
        [endLng, endLat] = geocodeData.features[0].center;
        console.log('Geocoded to:', { endLat, endLng });
      } else {
        throw new Error('ไม่พบสถานที่ที่ค้นหา');
      }
    }

    if (!endLat || !endLng) {
      throw new Error('กรุณาระบุจุดหมายปลายทาง');
    }

    // Get routes from Mapbox
    console.log('Fetching routes from Mapbox...');
    const directionsUrl = `https://api.mapbox.com/directions/v5/mapbox/driving/${startLng},${startLat};${endLng},${endLat}?alternatives=true&geometries=geojson&overview=full&access_token=${MAPBOX_API_KEY}`;
    
    const directionsResponse = await fetch(directionsUrl);
    const directionsData = await directionsResponse.json();

    if (!directionsData.routes || directionsData.routes.length === 0) {
      throw new Error('ไม่พบเส้นทาง');
    }

    console.log(`Found ${directionsData.routes.length} routes`);

    // Analyze PM2.5 for each route
    const analyzedRoutes = await Promise.all(
      directionsData.routes.map(async (route: any, index: number) => {
        const coordinates = route.geometry.coordinates;
        
        // Sample points along route (every ~2km or at least 5 points)
        const totalDistance = route.distance;
        const numSamples = Math.max(5, Math.ceil(totalDistance / 2000));
        const samplePoints: number[][] = [];
        
        for (let i = 0; i < numSamples; i++) {
          const ratio = i / (numSamples - 1);
          const coordIndex = Math.floor(ratio * (coordinates.length - 1));
          samplePoints.push(coordinates[coordIndex]);
        }

        // Get PM2.5 for each sample point from AQICN
        const pm25Values: number[] = [];
        const sampleLocations: number[][] = [];
        
        for (const point of samplePoints) {
          const pm25 = await getPM25FromAQICN(point[1], point[0], AQICN_API_KEY);
          if (pm25 !== null) {
            pm25Values.push(pm25);
            sampleLocations.push(point);
          }
        }

        // Calculate average and max PM2.5
        const averagePM25 = pm25Values.length > 0
          ? Math.round(pm25Values.reduce((a, b) => a + b, 0) / pm25Values.length)
          : 0;
        const maxPM25 = pm25Values.length > 0 ? Math.max(...pm25Values) : 0;

        // Generate health alert
        const { alert, severity, recommendations } = generateHealthAlert(
          averagePM25,
          maxPM25,
          hasRespiratoryCondition,
          chronicConditions
        );

        return {
          routeIndex: index,
          geometry: route.geometry,
          distance: Math.round(route.distance / 1000 * 10) / 10,
          duration: Math.round(route.duration / 60),
          averagePM25,
          maxPM25,
          healthAlert: alert,
          alertSeverity: severity,
          recommendations,
          pm25Samples: pm25Values.map(v => Math.round(v)),
          sampleLocations,
        };
      })
    );

    // Sort by average PM2.5 (lowest first = healthiest route)
    analyzedRoutes.sort((a, b) => a.averagePM25 - b.averagePM25);

    const recommendedRoute = analyzedRoutes[0];
    
    // Add comparison message
    if (analyzedRoutes.length > 1) {
      const pm25Difference = analyzedRoutes[analyzedRoutes.length - 1].averagePM25 - recommendedRoute.averagePM25;
      if (pm25Difference > 10) {
        recommendedRoute.recommendations.unshift(
          `✅ เส้นทางนี้ดีกว่าเส้นอื่น ${pm25Difference} µg/m³`
        );
      }
    }

    console.log('Route analysis complete:', {
      totalRoutes: analyzedRoutes.length,
      recommendedPM25: recommendedRoute.averagePM25,
    });

    return new Response(
      JSON.stringify({
        routes: analyzedRoutes,
        recommendedRoute,
        destinationCoords: { lat: endLat, lng: endLng },
        timestamp: new Date().toISOString(),
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('Error in get-route-pm25:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
