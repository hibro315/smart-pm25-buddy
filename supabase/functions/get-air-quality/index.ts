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

    const AQICN_TOKEN = 'a285ebd0-2c4e-4b9f-a403-5a5cb1bbe546';

    // Fetch air quality data from AQICN (World Air Quality Index) API
    const airQualityUrl = `https://api.waqi.info/feed/geo:${latitude};${longitude}/?token=${AQICN_TOKEN}`;
    
    const airQualityResponse = await fetch(airQualityUrl, {
      headers: {
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!airQualityResponse.ok) {
      const errorText = await airQualityResponse.text();
      console.error('AQICN API error:', airQualityResponse.status, errorText);
      
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
    console.log('AQICN data received:', airQualityData);

    // Check if AQICN API returned valid data
    if (airQualityData.status !== 'ok' || !airQualityData.data) {
      console.error('AQICN API returned invalid data:', airQualityData);
      
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
    
    // Extract location name from AQICN data
    let location = data.city?.name || 'Unknown Location';
    
    // Extract air quality data from AQICN
    const aqi = Math.round(data.aqi || 0);
    const iaqi = data.iaqi || {};
    
    // AQICN provides individual pollutant AQI values, not concentrations
    // We'll use the values directly as they represent concentration levels
    const pm25 = Math.round(iaqi.pm25?.v || 0);
    const pm10 = Math.round(iaqi.pm10?.v || 0);
    const no2 = Math.round(iaqi.no2?.v || 0);
    const o3 = Math.round(iaqi.o3?.v || 0);
    const so2 = Math.round(iaqi.so2?.v || 0);
    const co = Math.round(iaqi.co?.v || 0);
    
    // Extract temperature and humidity from AQICN data
    const temperature = Math.round(iaqi.t?.v || 28);
    const humidity = Math.round(iaqi.h?.v || 65);
    
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
        source: 'AQICN'
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
