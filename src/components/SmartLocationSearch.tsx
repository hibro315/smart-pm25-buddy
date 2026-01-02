import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { MapPin, Search, Clock, Star, Navigation, Loader2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface SearchResult {
  id: string;
  place_name: string;
  text: string;
  center: [number, number]; // [lng, lat]
  place_type: string[];
  context?: Array<{ id: string; text: string }>;
}

interface SmartLocationSearchProps {
  onSelectLocation: (location: { 
    name: string; 
    lat: number; 
    lng: number;
    fullAddress: string;
  }) => void;
  currentLat: number;
  currentLng: number;
  placeholder?: string;
  className?: string;
}

const RECENT_SEARCHES_KEY = "recent_location_searches";
const MAX_RECENT = 5;

export const SmartLocationSearch = ({
  onSelectLocation,
  currentLat,
  currentLng,
  placeholder = "ค้นหาสถานที่...",
  className,
}: SmartLocationSearchProps) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [recentSearches, setRecentSearches] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  // Load Mapbox token and recent searches
  useEffect(() => {
    const loadToken = async () => {
      const { data } = await supabase.functions.invoke("get-mapbox-token");
      if (data?.token) {
        setMapboxToken(data.token);
      }
    };
    loadToken();

    // Load recent searches from localStorage
    const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (stored) {
      try {
        setRecentSearches(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse recent searches:", e);
      }
    }
  }, []);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Geocoding search with debounce
  const searchPlaces = useCallback(async (searchQuery: string) => {
    if (!mapboxToken || searchQuery.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      // Mapbox Geocoding API with proximity bias and Thai language
      const url = new URL("https://api.mapbox.com/geocoding/v5/mapbox.places/" + encodeURIComponent(searchQuery) + ".json");
      url.searchParams.set("access_token", mapboxToken);
      url.searchParams.set("proximity", `${currentLng},${currentLat}`);
      url.searchParams.set("language", "th,en");
      url.searchParams.set("country", "TH"); // Prioritize Thailand
      url.searchParams.set("types", "address,poi,place,locality,neighborhood");
      url.searchParams.set("limit", "8");
      url.searchParams.set("autocomplete", "true");

      const response = await fetch(url.toString());
      const data = await response.json();

      if (data.features) {
        setResults(data.features.map((f: any) => ({
          id: f.id,
          place_name: f.place_name,
          text: f.text,
          center: f.center,
          place_type: f.place_type,
          context: f.context,
        })));
      }
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setLoading(false);
    }
  }, [mapboxToken, currentLat, currentLng]);

  // Debounced search
  const handleInputChange = (value: string) => {
    setQuery(value);
    setShowDropdown(true);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      searchPlaces(value);
    }, 300);
  };

  // Save to recent searches
  const saveToRecent = (result: SearchResult) => {
    const updated = [
      result,
      ...recentSearches.filter(r => r.id !== result.id)
    ].slice(0, MAX_RECENT);
    
    setRecentSearches(updated);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  };

  // Handle selection
  const handleSelect = (result: SearchResult) => {
    saveToRecent(result);
    setQuery(result.text);
    setShowDropdown(false);
    
    onSelectLocation({
      name: result.text,
      lat: result.center[1],
      lng: result.center[0],
      fullAddress: result.place_name,
    });
  };

  // Get place type icon
  const getPlaceIcon = (types: string[]) => {
    if (types.includes("poi")) return <MapPin className="w-4 h-4 text-primary" />;
    if (types.includes("address")) return <Navigation className="w-4 h-4 text-muted-foreground" />;
    return <MapPin className="w-4 h-4 text-muted-foreground" />;
  };

  // Calculate distance from current location
  const getDistance = (lng: number, lat: number): string => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat - currentLat) * Math.PI / 180;
    const dLng = (lng - currentLng) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(currentLat * Math.PI / 180) * Math.cos(lat * Math.PI / 180) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;

    if (distance < 1) {
      return `${Math.round(distance * 1000)} ม.`;
    }
    return `${distance.toFixed(1)} กม.`;
  };

  const showRecent = showDropdown && query.length < 2 && recentSearches.length > 0;
  const showResults = showDropdown && results.length > 0 && query.length >= 2;

  return (
    <div className={cn("relative", className)}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => setShowDropdown(true)}
          placeholder={placeholder}
          className="pl-10 pr-10 bg-background/80 backdrop-blur-sm border-border/50 focus:border-primary/50 transition-colors"
        />
        {query && (
          <button
            onClick={() => {
              setQuery("");
              setResults([]);
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary animate-spin" />
        )}
      </div>

      {/* Dropdown */}
      {(showRecent || showResults) && (
        <div
          ref={dropdownRef}
          className={cn(
            "absolute top-full left-0 right-0 mt-2 z-50",
            "bg-card/95 backdrop-blur-xl border border-border/50 rounded-xl shadow-elevated",
            "overflow-hidden animate-fade-in"
          )}
        >
          {/* Recent Searches */}
          {showRecent && (
            <div className="p-2">
              <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground uppercase tracking-wider">
                <Clock className="w-3 h-3" />
                <span>ค้นหาล่าสุด</span>
              </div>
              {recentSearches.map((result) => (
                <button
                  key={result.id}
                  onClick={() => handleSelect(result)}
                  className={cn(
                    "w-full flex items-start gap-3 px-3 py-3 rounded-lg",
                    "hover:bg-muted/50 transition-colors text-left"
                  )}
                >
                  <Clock className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{result.text}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {result.place_name}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {getDistance(result.center[0], result.center[1])}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Search Results */}
          {showResults && (
            <div className="p-2 max-h-[300px] overflow-y-auto">
              {results.map((result) => (
                <button
                  key={result.id}
                  onClick={() => handleSelect(result)}
                  className={cn(
                    "w-full flex items-start gap-3 px-3 py-3 rounded-lg",
                    "hover:bg-muted/50 transition-colors text-left"
                  )}
                >
                  <div className="mt-0.5 shrink-0">
                    {getPlaceIcon(result.place_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground">{result.text}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {result.context?.map(c => c.text).join(", ") || result.place_name}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {getDistance(result.center[0], result.center[1])}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* No results */}
          {showDropdown && query.length >= 2 && !loading && results.length === 0 && (
            <div className="p-6 text-center text-muted-foreground">
              <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>ไม่พบสถานที่ที่ค้นหา</p>
              <p className="text-sm">ลองค้นหาด้วยคำอื่น</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
