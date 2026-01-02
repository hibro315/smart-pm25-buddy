import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import AQICNDataService, { NormalizedAQIData } from '@/data/AQICNDataService';

interface AQIHeatmapLayerProps {
  map: mapboxgl.Map | null;
  centerLat: number;
  centerLng: number;
  enabled?: boolean;
}

// Official AQI color scale (EPA standard)
const AQI_COLOR_STOPS: [number, string][] = [
  [0, '#00e400'],    // Good (0-50)
  [51, '#ffff00'],   // Moderate (51-100)
  [101, '#ff7e00'],  // Unhealthy for Sensitive (101-150)
  [151, '#ff0000'],  // Unhealthy (151-200)
  [201, '#8f3f97'],  // Very Unhealthy (201-300)
  [301, '#7e0023'],  // Hazardous (301+)
];

export const AQIHeatmapLayer = ({ 
  map, 
  centerLat, 
  centerLng, 
  enabled = true 
}: AQIHeatmapLayerProps) => {
  const stationsRef = useRef<NormalizedAQIData[]>([]);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  useEffect(() => {
    if (!map || !enabled) return;

    const loadAQIData = async () => {
      try {
        // Use the cached AQICN token from secrets
        const cacheKey = `aqi-${centerLat.toFixed(2)}-${centerLng.toFixed(2)}`;
        const cachedData = AQICNDataService.getCachedData(cacheKey) as NormalizedAQIData | null;
        
        if (cachedData) {
          stationsRef.current = [cachedData];
          renderHeatmap(map, [cachedData]);
          renderStationMarkers(map, [cachedData]);
        }
        
        // Fetch fresh data
        const freshData = await AQICNDataService.fetchAQIData(centerLat, centerLng, 'cf980db5-197e-4fef-83c9-d725f1bb62c9', true) as NormalizedAQIData | null;
        
        if (freshData) {
          stationsRef.current = [freshData];
          renderHeatmap(map, [freshData]);
          renderStationMarkers(map, [freshData]);
        }
      } catch (error) {
        console.error('Failed to load AQI data for heatmap:', error);
      }
    };

    loadAQIData();

    return () => {
      // Cleanup markers first
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];
      
      // Only cleanup layers if map still exists and has style
      try {
        if (map && map.getStyle()) {
          if (map.getLayer('aqi-heatmap')) {
            map.removeLayer('aqi-heatmap');
          }
          if (map.getSource('aqi-stations')) {
            map.removeSource('aqi-stations');
          }
        }
      } catch (e) {
        // Map may have been removed, ignore cleanup errors
      }
    };
  }, [map, centerLat, centerLng, enabled]);

  const renderHeatmap = (mapInstance: mapboxgl.Map, stations: NormalizedAQIData[]) => {
    // Remove existing layers
    if (mapInstance.getLayer('aqi-heatmap')) {
      mapInstance.removeLayer('aqi-heatmap');
    }
    if (mapInstance.getSource('aqi-stations')) {
      mapInstance.removeSource('aqi-stations');
    }

    if (stations.length === 0) return;

    // Create GeoJSON from stations
    const geojson: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: stations.map(station => ({
        type: 'Feature',
        properties: {
          aqi: station.aqi,
          pm25: station.pm25,
          stationName: station.stationName,
        },
        geometry: {
          type: 'Point',
          coordinates: [station.longitude, station.latitude],
        },
      })),
    };

    mapInstance.addSource('aqi-stations', {
      type: 'geojson',
      data: geojson,
    });

    // Add heatmap layer
    mapInstance.addLayer({
      id: 'aqi-heatmap',
      type: 'heatmap',
      source: 'aqi-stations',
      maxzoom: 15,
      paint: {
        // Weight based on PM2.5 value
        'heatmap-weight': [
          'interpolate',
          ['linear'],
          ['get', 'pm25'],
          0, 0.1,
          50, 0.5,
          100, 0.8,
          200, 1,
        ],
        // Intensity increases with zoom
        'heatmap-intensity': [
          'interpolate',
          ['linear'],
          ['zoom'],
          8, 0.5,
          12, 1.5,
        ],
        // Color gradient based on PM2.5
        'heatmap-color': [
          'interpolate',
          ['linear'],
          ['heatmap-density'],
          0, 'rgba(0, 228, 0, 0)',
          0.2, 'rgba(0, 228, 0, 0.4)',
          0.4, 'rgba(255, 255, 0, 0.6)',
          0.6, 'rgba(255, 126, 0, 0.7)',
          0.8, 'rgba(255, 0, 0, 0.8)',
          1, 'rgba(127, 0, 35, 0.9)',
        ],
        // Radius decreases with zoom
        'heatmap-radius': [
          'interpolate',
          ['linear'],
          ['zoom'],
          8, 40,
          12, 25,
          15, 15,
        ],
        // Fade opacity at high zoom
        'heatmap-opacity': [
          'interpolate',
          ['linear'],
          ['zoom'],
          12, 0.8,
          15, 0.3,
        ],
      },
    });
  };

  const renderStationMarkers = (mapInstance: mapboxgl.Map, stations: NormalizedAQIData[]) => {
    // Clear existing markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    stations.forEach(station => {
      const color = getAQIColor(station.aqi);
      
      const el = document.createElement('div');
      el.className = 'aqi-station-marker';
      el.style.cssText = `
        width: 32px;
        height: 32px;
        background-color: ${color};
        border: 2px solid white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        font-weight: bold;
        color: ${station.aqi > 150 ? 'white' : 'black'};
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        cursor: pointer;
        transition: transform 0.2s ease;
      `;
      el.textContent = station.aqi.toString();
      el.onmouseenter = () => { el.style.transform = 'scale(1.2)'; };
      el.onmouseleave = () => { el.style.transform = 'scale(1)'; };

      const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
        <div style="padding: 8px; font-family: sans-serif;">
          <div style="font-weight: bold; margin-bottom: 4px;">${station.stationName}</div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; font-size: 12px;">
            <span>AQI:</span><span style="font-weight: bold; color: ${color}">${station.aqi}</span>
            <span>PM2.5:</span><span>${station.pm25} µg/m³</span>
            ${station.pm10 ? `<span>PM10:</span><span>${station.pm10} µg/m³</span>` : ''}
          </div>
          <div style="margin-top: 6px; font-size: 10px; color: #666;">
            อัปเดต: ${new Date(station.timestamp).toLocaleTimeString('th-TH')}
          </div>
        </div>
      `);

      const marker = new mapboxgl.Marker(el)
        .setLngLat([station.longitude, station.latitude])
        .setPopup(popup)
        .addTo(mapInstance);

      markersRef.current.push(marker);
    });
  };

  const getAQIColor = (aqi: number): string => {
    for (let i = AQI_COLOR_STOPS.length - 1; i >= 0; i--) {
      if (aqi >= AQI_COLOR_STOPS[i][0]) {
        return AQI_COLOR_STOPS[i][1];
      }
    }
    return AQI_COLOR_STOPS[0][1];
  };

  return null; // This component only manages map layers
};

export default AQIHeatmapLayer;
