import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PlaceV2 {
  id: string;
  displayName?: {
    text: string;
    languageCode: string;
  };
  formattedAddress?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  rating?: number;
  userRatingCount?: number;
  regularOpeningHours?: {
    openNow?: boolean;
    weekdayDescriptions?: string[];
  };
  internationalPhoneNumber?: string;
  nationalPhoneNumber?: string;
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

    // Use Google Places API (New) - Nearby Search
    const searchUrl = 'https://places.googleapis.com/v1/places:searchNearby';
    
    const requestBody = {
      includedTypes: ['hospital'],
      maxResultCount: 10,
      locationRestriction: {
        circle: {
          center: {
            latitude: latitude,
            longitude: longitude,
          },
          radius: radius,
        },
      },
      languageCode: 'th',
    };

    console.log('Fetching from Google Places API (New)...');
    
    const searchResponse = await fetch(searchUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.regularOpeningHours,places.internationalPhoneNumber,places.nationalPhoneNumber',
      },
      body: JSON.stringify(requestBody),
    });

    const searchData = await searchResponse.json();

    if (searchData.error) {
      console.error('Google Places API (New) error:', searchData.error);
      throw new Error(`Google Places API error: ${searchData.error.message || searchData.error.status}`);
    }

    const places: PlaceV2[] = searchData.places || [];
    console.log(`Found ${places.length} hospitals`);

    // Process results
    const hospitals = places.map((place: PlaceV2) => {
      const distance = calculateDistance(
        latitude, 
        longitude, 
        place.location?.latitude || 0, 
        place.location?.longitude || 0
      );

      // Check if open 24 hours
      let isOpen24h = false;
      if (place.regularOpeningHours?.weekdayDescriptions) {
        isOpen24h = place.regularOpeningHours.weekdayDescriptions.some(
          (text: string) => text.includes('24') || text.includes('เปิดตลอด')
        );
      }

      const phoneNumber = place.nationalPhoneNumber || place.internationalPhoneNumber || '';

      return {
        id: place.id,
        name: place.displayName?.text || 'โรงพยาบาล',
        distance: distance,
        distanceText: formatDistance(distance),
        phone: phoneNumber,
        emergencyPhone: phoneNumber || undefined,
        address: place.formattedAddress || '',
        specialties: ['โรงพยาบาล'],
        rating: place.rating || undefined,
        isOpen24h: isOpen24h || (place.regularOpeningHours?.openNow ?? true),
        lat: place.location?.latitude || 0,
        lng: place.location?.longitude || 0,
        isOpenNow: place.regularOpeningHours?.openNow ?? undefined,
      };
    });

    // Sort by distance
    hospitals.sort((a, b) => a.distance - b.distance);

    console.log('Processed hospitals:', hospitals.length);

    return new Response(
      JSON.stringify({ 
        hospitals,
        source: 'google_places_v2',
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
