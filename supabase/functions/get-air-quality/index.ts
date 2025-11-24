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

    const OPENWEATHER_API_KEY = Deno.env.get('OPENWEATHER_API_KEY');

    if (!OPENWEATHER_API_KEY) {
      console.error('Missing OPENWEATHER_API_KEY');
      throw new Error('OPENWEATHER_API_KEY not configured');
    }

    // Fetch air quality data from OpenWeatherMap Air Pollution API
    const airQualityUrl = `http://api.openweathermap.org/data/2.5/air_pollution?lat=${latitude}&lon=${longitude}&appid=${OPENWEATHER_API_KEY}`;
    
    const airQualityResponse = await fetch(airQualityUrl);

    if (!airQualityResponse.ok) {
      const errorText = await airQualityResponse.text();
      console.error('OpenWeatherMap API error:', airQualityResponse.status, errorText);
      throw new Error(`OpenWeatherMap API error: ${airQualityResponse.status}`);
    }

    const airQualityData = await airQualityResponse.json();
    console.log('OpenWeatherMap data received:', airQualityData);

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

    // Extract air quality data from OpenWeatherMap
    const components = airQualityData.list?.[0]?.components || {};
    const mainData = airQualityData.list?.[0]?.main || {};
    
    // OpenWeatherMap provides concentrations in μg/m³
    const pm25 = Math.round(components.pm2_5 || 0);
    const pm10 = Math.round(components.pm10 || 0);
    const no2 = Math.round(components.no2 || 0);
    const o3 = Math.round(components.o3 || 0);
    const so2 = Math.round(components.so2 || 0);
    const co = Math.round(components.co || 0);
    
    // OpenWeatherMap AQI (1-5 scale), convert to US AQI scale (0-500)
    const owmAqi = mainData.aqi || 1;
    const aqiConversion = [0, 50, 100, 150, 200, 300]; // Approximate conversion
    const aqi = aqiConversion[owmAqi] || 50;
    
    const timestamp = new Date().toISOString();

    // Fetch weather data for temperature and humidity
    const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${OPENWEATHER_API_KEY}&units=metric`;
    let temperature = 25;
    let humidity = 60;
    
    try {
      const weatherResponse = await fetch(weatherUrl);
      if (weatherResponse.ok) {
        const weatherData = await weatherResponse.json();
        temperature = Math.round(weatherData.main?.temp || 25);
        humidity = Math.round(weatherData.main?.humidity || 60);
      }
    } catch (error) {
      console.error('Weather fetch error:', error);
    }
    
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
        source: 'OpenWeatherMap'
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
