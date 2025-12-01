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
    const { latitude, longitude } = await req.json();

    console.log('Fetching air quality data for:', { latitude, longitude });

    // Validate coordinates
    if (!latitude || !longitude || 
        latitude < -90 || latitude > 90 || 
        longitude < -180 || longitude > 180) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid coordinates',
          pm25: 35,
          aqi: 75,
          location: 'ตำแหน่งไม่ถูกต้อง',
          timestamp: new Date().toISOString(),
          temperature: 28,
          humidity: 65,
          source: 'Fallback'
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const IQAIR_API_KEY = Deno.env.get('IQAIR_API_KEY');
    
    if (!IQAIR_API_KEY) {
      console.error('IQAIR_API_KEY not configured');
      return new Response(
        JSON.stringify({ 
          error: 'API key not configured',
          pm25: 35,
          aqi: 75,
          location: 'Configuration Error',
          timestamp: new Date().toISOString(),
          temperature: 28,
          humidity: 65,
          source: 'Fallback'
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Fetch air quality data from IQAir API
    const airQualityUrl = `http://api.airvisual.com/v2/nearest_city?lat=${latitude}&lon=${longitude}&key=${IQAIR_API_KEY}`;
    
    const airQualityResponse = await fetch(airQualityUrl, {
      headers: {
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!airQualityResponse.ok) {
      const errorText = await airQualityResponse.text();
      console.error('IQAir API error:', airQualityResponse.status, errorText);
      
      // Return fallback data instead of throwing error
      return new Response(
        JSON.stringify({
          pm25: 35,
          pm10: 50,
          no2: 30,
          o3: 40,
          so2: 10,
          co: 500,
          aqi: 75,
          location: `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`,
          timestamp: new Date().toISOString(),
          temperature: 28,
          humidity: 65,
          source: 'Fallback',
          error: 'API temporarily unavailable',
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const airQualityData = await airQualityResponse.json();
    console.log('IQAir data received:', airQualityData);

    // Check if IQAir API returned valid data
    if (airQualityData.status !== 'success' || !airQualityData.data) {
      console.error('IQAir API returned invalid data:', airQualityData);
      
      // Return fallback data
      return new Response(
        JSON.stringify({
          pm25: 35,
          pm10: 50,
          no2: 30,
          o3: 40,
          so2: 10,
          co: 500,
          aqi: 75,
          location: `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`,
          timestamp: new Date().toISOString(),
          temperature: 28,
          humidity: 65,
          source: 'Fallback',
          error: 'API returned invalid data',
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const data = airQualityData.data;
    
    // Extract location name from IQAir data
    const location = `${data.city}, ${data.state}, ${data.country}`;
    
    // Extract air quality data from IQAir
    const current = data.current;
    const pollution = current.pollution;
    const weather = current.weather;
    
    // IQAir provides AQI (US EPA standard) and pollutant concentrations
    const aqi = Math.round(pollution.aqius || 0);
    const pm25 = Math.round(pollution.p2?.conc || 0);
    const pm10 = Math.round(pollution.p1?.conc || 0);
    
    // IQAir doesn't provide other pollutants in basic plan, use defaults
    const no2 = 0;
    const o3 = 0;
    const so2 = 0;
    const co = 0;
    
    // Extract temperature and humidity from IQAir weather data
    const temperature = Math.round(weather.tp || 28);
    const humidity = Math.round(weather.hu || 65);
    
    const timestamp = new Date().toISOString();
    
    console.log('Processed data:', { 
      pm25, pm10, no2, o3, so2, co, aqi,
      location, temperature, humidity 
    });
    
    return new Response(
      JSON.stringify({
        pm25,
        pm10,
        no2,
        o3,
        so2,
        co,
        aqi,
        location,
        timestamp,
        temperature,
        humidity,
        source: 'IQAir'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in get-air-quality function:', error);
    
    // Always return data, even if it's fallback
    return new Response(
      JSON.stringify({ 
        pm25: 35,
        pm10: 50,
        no2: 30,
        o3: 40,
        so2: 10,
        co: 500,
        aqi: 75,
        location: 'Bangkok, Thailand',
        timestamp: new Date().toISOString(),
        temperature: 28,
        humidity: 65,
        source: 'Fallback',
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
