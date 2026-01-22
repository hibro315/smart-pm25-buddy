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
          pressure: 1013,
          wind: 0,
          nearbyStations: [],
          source: 'Fallback'
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const AQICN_API_KEY = Deno.env.get('AQICN_API_KEY');
    
    if (!AQICN_API_KEY) {
      console.error('AQICN_API_KEY not configured');
      return new Response(
        JSON.stringify({ 
          error: 'API key not configured',
          pm25: 35,
          aqi: 75,
          location: 'Configuration Error',
          timestamp: new Date().toISOString(),
          temperature: 28,
          humidity: 65,
          pressure: 1013,
          wind: 0,
          nearbyStations: [],
          source: 'Fallback'
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Fetch air quality data from AQICN API
    const airQualityUrl = `https://api.waqi.info/feed/geo:${latitude};${longitude}/?token=${AQICN_API_KEY}`;
    
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
          pressure: 1013,
          wind: 0,
          nearbyStations: [],
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
          pressure: 1013,
          wind: 0,
          nearbyStations: [],
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
    const cityName = data.city?.name || `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`;
    const location = cityName;
    
    // Extract the main AQI value (composite index)
    const aqi = Math.round(data.aqi || 0);
    
    // AQICN provides individual pollutant measurements in iaqi object
    // NOTE: iaqi values are AQI sub-indices, NOT actual concentrations!
    // We need to convert PM2.5 AQI sub-index back to µg/m³ concentration
    const iaqi = data.iaqi || {};
    
    // Get PM2.5 AQI sub-index
    const pm25AqiSubIndex = iaqi.pm25?.v || 0;
    
    // Convert PM2.5 AQI sub-index to actual µg/m³ concentration using US EPA breakpoints
    // Reference: https://www.airnow.gov/aqi/aqi-basics/
    const convertPm25AqiToUgm3 = (aqiValue: number): number => {
      if (aqiValue <= 0) return 0;
      if (aqiValue <= 50) return (aqiValue / 50) * 12.0;
      if (aqiValue <= 100) return 12.1 + ((aqiValue - 51) / 49) * (35.4 - 12.1);
      if (aqiValue <= 150) return 35.5 + ((aqiValue - 101) / 49) * (55.4 - 35.5);
      if (aqiValue <= 200) return 55.5 + ((aqiValue - 151) / 49) * (150.4 - 55.5);
      if (aqiValue <= 300) return 150.5 + ((aqiValue - 201) / 99) * (250.4 - 150.5);
      if (aqiValue <= 400) return 250.5 + ((aqiValue - 301) / 99) * (350.4 - 250.5);
      if (aqiValue <= 500) return 350.5 + ((aqiValue - 401) / 99) * (500.4 - 350.5);
      return 500.5;
    };
    
    // PM2.5 in µg/m³ (actual concentration)
    const pm25 = Math.round(convertPm25AqiToUgm3(pm25AqiSubIndex) * 10) / 10;
    
    // Similarly convert PM10 AQI to µg/m³
    const pm10AqiSubIndex = iaqi.pm10?.v || 0;
    const convertPm10AqiToUgm3 = (aqiValue: number): number => {
      if (aqiValue <= 0) return 0;
      if (aqiValue <= 50) return (aqiValue / 50) * 54;
      if (aqiValue <= 100) return 55 + ((aqiValue - 51) / 49) * (154 - 55);
      if (aqiValue <= 150) return 155 + ((aqiValue - 101) / 49) * (254 - 155);
      if (aqiValue <= 200) return 255 + ((aqiValue - 151) / 49) * (354 - 255);
      if (aqiValue <= 300) return 355 + ((aqiValue - 201) / 99) * (424 - 355);
      if (aqiValue <= 400) return 425 + ((aqiValue - 301) / 99) * (504 - 425);
      if (aqiValue <= 500) return 505 + ((aqiValue - 401) / 99) * (604 - 505);
      return 605;
    };
    const pm10 = Math.round(convertPm10AqiToUgm3(pm10AqiSubIndex));
    
    // Other pollutants (keep as AQI sub-indices for now, commonly used this way)
    const no2 = Math.round(iaqi.no2?.v || 0);
    const o3 = Math.round(iaqi.o3?.v || 0);
    const so2 = Math.round(iaqi.so2?.v || 0);
    const co = Math.round(iaqi.co?.v || 0);
    
    // Extract temperature and humidity from AQICN weather data
    const temperature = Math.round(iaqi.t?.v || 28);
    const humidity = Math.round(iaqi.h?.v || 65);
    const pressure = Math.round(iaqi.p?.v || 1013);
    const wind = Math.round(iaqi.w?.v || 0);
    
    // Parse timestamp from AQICN
    const timestamp = data.time?.iso || new Date().toISOString();
    
    // Fetch nearby stations for comparison (within ~5km radius)
    let nearbyStations = [];
    try {
      const searchUrl = `https://api.waqi.info/v2/map/bounds/?latlng=${latitude-0.05},${longitude-0.05},${latitude+0.05},${longitude+0.05}&token=${AQICN_API_KEY}`;
      const searchResponse = await fetch(searchUrl, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(5000),
      });
      
      if (searchResponse.ok) {
        const searchData = await searchResponse.json();
        if (searchData.status === 'ok' && searchData.data) {
          nearbyStations = searchData.data
            .filter((station: any) => station.uid !== data.idx)
            .slice(0, 3)
            .map((station: any) => ({
              name: station.station?.name || 'Unknown',
              aqi: station.aqi || 0,
              distance: calculateDistance(
                latitude, longitude,
                station.lat || latitude, station.lon || longitude
              )
            }));
        }
      }
    } catch (error) {
      console.log('Could not fetch nearby stations:', error);
    }
    
    console.log('Processed data:', { 
      pm25, pm10, no2, o3, so2, co, aqi,
      location, temperature, humidity, pressure, wind,
      nearbyStationsCount: nearbyStations.length
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
        pressure,
        wind,
        nearbyStations,
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
        pressure: 1013,
        wind: 0,
        nearbyStations: [],
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

// Helper function to calculate distance between two coordinates
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return Math.round(R * c * 10) / 10; // Round to 1 decimal
}
