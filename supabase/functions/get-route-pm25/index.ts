import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    let { startLat, startLng, endLat, endLng, destination } = body;
    
    console.log('Route PM2.5 request:', { startLat, startLng, endLat, endLng, destination });

    const MAPBOX_API_KEY = Deno.env.get('MAPBOX_API_KEY');

    if (!MAPBOX_API_KEY) {
      console.error('Missing MAPBOX_API_KEY');
      throw new Error('MAPBOX_API_KEY not configured');
    }

    // If destination string is provided, geocode it first
    if (destination && !endLat && !endLng) {
      console.log('Geocoding destination:', destination);
      const geocodeUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(destination)}.json?access_token=${MAPBOX_API_KEY}&country=th&limit=1`;
      
      const geocodeResponse = await fetch(geocodeUrl);
      const geocodeData = await geocodeResponse.json();
      
      console.log('Geocode response status:', geocodeResponse.status);
      console.log('Geocode response data:', geocodeData);
      
      if (!geocodeResponse.ok) {
        console.error('Mapbox geocoding error:', geocodeData);
        throw new Error(`Failed to geocode destination: ${geocodeData.message || 'Unknown error'}`);
      }

      if (!geocodeData.features || geocodeData.features.length === 0) {
        throw new Error('ไม่พบสถานที่ที่ค้นหา');
      }

      [endLng, endLat] = geocodeData.features[0].center;
      console.log('Geocoded successfully:', { 
        endLat, 
        endLng, 
        placeName: geocodeData.features[0].place_name 
      });
    }

    // Validate coordinates
    if (!endLat || !endLng || !startLat || !startLng) {
      throw new Error('Missing required coordinates');
    }

    // Get multiple route alternatives from Mapbox
    const mapboxUrl = `https://api.mapbox.com/directions/v5/mapbox/driving/${startLng},${startLat};${endLng},${endLat}?alternatives=true&geometries=geojson&steps=true&access_token=${MAPBOX_API_KEY}`;
    
    const mapboxResponse = await fetch(mapboxUrl);
    
    if (!mapboxResponse.ok) {
      console.error('Mapbox error:', await mapboxResponse.text());
      throw new Error('Failed to get routes from Mapbox');
    }

    const mapboxData = await mapboxResponse.json();
    const routes = mapboxData.routes || [];

    if (routes.length === 0) {
      throw new Error('No routes found');
    }

    // Analyze PM2.5 along each route
    const routesWithPM25 = await Promise.all(
      routes.map(async (route: any, index: number) => {
        const coordinates = route.geometry.coordinates;
        
        // Sample points along the route every 1km for detailed PM2.5 data
        const samplePoints: number[][] = [];
        const totalDistance = route.distance; // meters
        const sampleInterval = 1000; // 1km for detailed real-time data
        const numSamples = Math.ceil(totalDistance / sampleInterval); // All samples needed
        
        for (let i = 0; i <= numSamples; i++) {
          const ratio = i / numSamples;
          const coordIndex = Math.floor(ratio * (coordinates.length - 1));
          samplePoints.push(coordinates[coordIndex]);
        }

        // Get PM2.5 data for each sample point using IQAir API
        const IQAIR_API_KEY = Deno.env.get('IQAIR_API_KEY');
        
        if (!IQAIR_API_KEY) {
          console.error('Missing IQAIR_API_KEY');
          throw new Error('IQAIR_API_KEY not configured');
        }

        const pm25Values = await Promise.all(
          samplePoints.map(async ([lng, lat]) => {
            try {
              const airQualityUrl = `http://api.airvisual.com/v2/nearest_city?lat=${lat}&lon=${lng}&key=${IQAIR_API_KEY}`;
              const response = await fetch(airQualityUrl);
              
              if (!response.ok) {
                console.error(`IQAir error for ${lat},${lng}:`, response.status);
                return null;
              }
              
              const data = await response.json();
              
              if (data.data?.current?.pollution?.aqius !== undefined) {
                return data.data.current.pollution.aqius;
              }
              return null;
            } catch (error) {
              console.error(`Error fetching PM2.5 for point ${lat},${lng}:`, error);
              return null;
            }
          })
        );

        // Calculate average PM2.5 (excluding null values)
        const validPM25 = pm25Values.filter(v => v !== null) as number[];
        const avgPM25 = validPM25.length > 0 
          ? validPM25.reduce((sum, val) => sum + val, 0) / validPM25.length 
          : 0;
        
        const maxPM25 = validPM25.length > 0 ? Math.max(...validPM25) : 0;

        // Health alert based on PM2.5 levels
        let healthAlert = "เส้นทางนี้ปลอดภัย";
        if (avgPM25 > 50) {
          healthAlert = "หลีกเลี่ยงเส้นทางนี้ ค่าฝุ่นสูง";
        }

        return {
          routeIndex: index,
          geometry: route.geometry,
          distance: route.distance,
          duration: route.duration,
          averagePM25: Math.round(avgPM25),
          maxPM25: Math.round(maxPM25),
          healthAlert: healthAlert,
          pm25Samples: pm25Values.filter(v => v !== null).map(v => Math.round(v as number)),
          sampleLocations: samplePoints,
        };
      })
    );

    // Sort routes by average PM2.5 (lower is better)
    routesWithPM25.sort((a, b) => a.averagePM25 - b.averagePM25);

    console.log('Routes analyzed:', routesWithPM25.map(r => ({
      index: r.routeIndex,
      avgPM25: r.averagePM25,
      maxPM25: r.maxPM25,
      distance: r.distance,
      duration: r.duration
    })));

    return new Response(JSON.stringify({ 
      routes: routesWithPM25,
      recommendedRoute: routesWithPM25[0], // Route with lowest PM2.5
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in get-route-pm25:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการวิเคราะห์เส้นทาง' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
