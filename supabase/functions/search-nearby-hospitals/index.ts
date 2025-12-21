import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PlaceResult {
  place_id: string;
  name: string;
  vicinity: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  rating?: number;
  user_ratings_total?: number;
  opening_hours?: {
    open_now: boolean;
  };
  types?: string[];
  photos?: Array<{
    photo_reference: string;
  }>;
}

interface PlaceDetailsResult {
  formatted_phone_number?: string;
  international_phone_number?: string;
  formatted_address?: string;
  website?: string;
  opening_hours?: {
    open_now: boolean;
    weekday_text?: string[];
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GOOGLE_PLACES_API_KEY = Deno.env.get('GOOGLE_PLACES_API_KEY');

    if (!GOOGLE_PLACES_API_KEY) {
      console.error('GOOGLE_PLACES_API_KEY is not configured');
      throw new Error('GOOGLE_PLACES_API_KEY is not configured');
    }

    const { latitude, longitude, radius = 5000 } = await req.json();

    if (!latitude || !longitude) {
      throw new Error('Latitude and longitude are required');
    }

    console.log(`Searching hospitals near: ${latitude}, ${longitude}, radius: ${radius}m`);

    // Search for hospitals using Google Places API
    const searchUrl = new URL('https://maps.googleapis.com/maps/api/place/nearbysearch/json');
    searchUrl.searchParams.set('location', `${latitude},${longitude}`);
    searchUrl.searchParams.set('radius', radius.toString());
    searchUrl.searchParams.set('type', 'hospital');
    searchUrl.searchParams.set('language', 'th');
    searchUrl.searchParams.set('key', GOOGLE_PLACES_API_KEY);

    console.log('Fetching from Google Places API...');
    
    const searchResponse = await fetch(searchUrl.toString());
    const searchData = await searchResponse.json();

    if (searchData.status !== 'OK' && searchData.status !== 'ZERO_RESULTS') {
      console.error('Google Places API error:', searchData);
      throw new Error(`Google Places API error: ${searchData.status}`);
    }

    console.log(`Found ${searchData.results?.length || 0} hospitals`);

    // Process results
    const hospitals = await Promise.all(
      (searchData.results || []).slice(0, 10).map(async (place: PlaceResult) => {
        // Get place details for phone number
        let phoneNumber = '';
        let address = place.vicinity || '';
        let isOpen24h = false;
        
        try {
          const detailsUrl = new URL('https://maps.googleapis.com/maps/api/place/details/json');
          detailsUrl.searchParams.set('place_id', place.place_id);
          detailsUrl.searchParams.set('fields', 'formatted_phone_number,international_phone_number,formatted_address,opening_hours');
          detailsUrl.searchParams.set('language', 'th');
          detailsUrl.searchParams.set('key', GOOGLE_PLACES_API_KEY);

          const detailsResponse = await fetch(detailsUrl.toString());
          const detailsData = await detailsResponse.json();

          if (detailsData.status === 'OK' && detailsData.result) {
            const details: PlaceDetailsResult = detailsData.result;
            phoneNumber = details.formatted_phone_number || details.international_phone_number || '';
            address = details.formatted_address || place.vicinity || '';
            
            // Check if open 24 hours (simplified check)
            if (details.opening_hours?.weekday_text) {
              isOpen24h = details.opening_hours.weekday_text.some(
                (text: string) => text.includes('24') || text.includes('เปิดตลอด')
              );
            }
          }
        } catch (detailError) {
          console.log(`Failed to get details for ${place.name}:`, detailError);
        }

        // Calculate distance
        const distance = calculateDistance(latitude, longitude, place.geometry.location.lat, place.geometry.location.lng);

        return {
          id: place.place_id,
          name: place.name,
          distance: distance,
          distanceText: formatDistance(distance),
          phone: phoneNumber,
          emergencyPhone: phoneNumber ? phoneNumber : undefined,
          address: address,
          specialties: ['โรงพยาบาล'],
          rating: place.rating || undefined,
          isOpen24h: isOpen24h || (place.opening_hours?.open_now ?? true),
          lat: place.geometry.location.lat,
          lng: place.geometry.location.lng,
          isOpenNow: place.opening_hours?.open_now ?? undefined,
        };
      })
    );

    // Sort by distance
    hospitals.sort((a, b) => a.distance - b.distance);

    console.log('Processed hospitals:', hospitals.length);

    return new Response(
      JSON.stringify({ 
        hospitals,
        source: 'google_places',
        timestamp: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in search-nearby-hospitals function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        hospitals: [],
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

// Calculate distance between two points using Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)} ม.`;
  }
  return `${km.toFixed(1)} กม.`;
}
