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

    const IQAIR_API_KEY = Deno.env.get('IQAIR_API_KEY');

    if (!IQAIR_API_KEY) {
      console.error('Missing IQAIR_API_KEY');
      throw new Error('IQAIR_API_KEY not configured');
    }

    // Fetch air quality data from IQAir API
    const airQualityUrl = `http://api.airvisual.com/v2/nearest_city?lat=${latitude}&lon=${longitude}&key=${IQAIR_API_KEY}`;
    
    const airQualityResponse = await fetch(airQualityUrl);

    if (!airQualityResponse.ok) {
      const errorText = await airQualityResponse.text();
      console.error('IQAir API error:', airQualityResponse.status, errorText);
      throw new Error(`IQAir API error: ${airQualityResponse.status}`);
    }

    const airQualityData = await airQualityResponse.json();
    console.log('IQAir data received:', airQualityData);

    // Fetch location name from Nominatim (OpenStreetMap)
    const geocodeUrl = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=th`;
    
    let location = 'Unknown Location';
    try {
      const geocodeResponse = await fetch(geocodeUrl, {
        headers: {
          'User-Agent': 'AirQualityApp/1.0'
        }
      });
      
      if (geocodeResponse.ok) {
        const geocodeData = await geocodeResponse.json();
        // Try to get district, city, or village name in Thai
        location = geocodeData.address?.suburb || 
                   geocodeData.address?.city || 
                   geocodeData.address?.town || 
                   geocodeData.address?.village || 
                   geocodeData.display_name?.split(',')[0] || 
                   'Unknown Location';
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      location = `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`;
    }

    // Extract air quality data from IQAir
    const pollution = airQualityData.data?.current?.pollution || {};
    const weather = airQualityData.data?.current?.weather || {};
    
    const pm25 = Math.round(pollution.aqius || 0); // US AQI
    const pm10 = 0; // IQAir doesn't provide PM10 in free tier
    const no2 = 0; // IQAir doesn't provide NO2 in free tier
    const o3 = 0; // IQAir doesn't provide O3 in free tier
    const so2 = 0; // IQAir doesn't provide SO2 in free tier
    const co = 0; // IQAir doesn't provide CO in free tier
    
    // Use IQAir's US AQI directly
    const aqi = pollution.aqius || 0;
    
    const timestamp = new Date().toISOString();

    // Get temperature and humidity from IQAir weather data
    const temperature = Math.round(weather.tp || 25);
    const humidity = Math.round(weather.hu || 60);
    
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
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
