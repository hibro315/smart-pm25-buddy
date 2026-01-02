/**
 * Fog AQI Overlay Component
 * 
 * Creates atmospheric fog/mist visualization for air quality
 * instead of sharp point markers. Uses gradient overlays
 * to represent health-impact as a continuous field.
 * 
 * @version 2.0.0 - Futuristic Health Navigation
 */

import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import AQICNDataService, { NormalizedAQIData } from '@/data/AQICNDataService';

interface FogAQIOverlayProps {
  map: mapboxgl.Map | null;
  centerLat: number;
  centerLng: number;
  enabled?: boolean;
  opacity?: number;
}

// Soft, clinical color palette for health visualization
const FOG_COLORS = {
  safe: 'rgba(34, 197, 94, 0.15)',      // Soft green
  moderate: 'rgba(234, 179, 8, 0.2)',   // Soft amber
  unhealthy: 'rgba(249, 115, 22, 0.25)', // Soft orange
  dangerous: 'rgba(239, 68, 68, 0.3)',   // Soft red
  hazardous: 'rgba(126, 0, 35, 0.35)',   // Deep red
};

export const FogAQIOverlay = ({ 
  map, 
  centerLat, 
  centerLng, 
  enabled = true,
  opacity = 0.6
}: FogAQIOverlayProps) => {
  const layerAddedRef = useRef(false);
  const stationsRef = useRef<NormalizedAQIData[]>([]);

  useEffect(() => {
    if (!map || !enabled) {
      // Clean up if disabled
      if (map && layerAddedRef.current) {
        cleanupLayers(map);
        layerAddedRef.current = false;
      }
      return;
    }

    const loadAQIData = async () => {
      try {
        const freshData = await AQICNDataService.fetchAQIData(
          centerLat, 
          centerLng, 
          'cf980db5-197e-4fef-83c9-d725f1bb62c9', 
          true
        ) as NormalizedAQIData | null;
        
        if (freshData) {
          stationsRef.current = [freshData];
          renderFogOverlay(map, [freshData], opacity);
          layerAddedRef.current = true;
        }
      } catch (error) {
        console.error('Failed to load AQI data for fog overlay:', error);
      }
    };

    // Wait for map to be fully loaded
    if (map.isStyleLoaded()) {
      loadAQIData();
    } else {
      map.once('load', loadAQIData);
    }

    return () => {
      if (map) {
        cleanupLayers(map);
        layerAddedRef.current = false;
      }
    };
  }, [map, centerLat, centerLng, enabled, opacity]);

  return null;
};

function cleanupLayers(map: mapboxgl.Map) {
  try {
    if (map.getStyle()) {
      ['fog-aqi-layer', 'fog-aqi-glow', 'fog-aqi-ambient'].forEach(id => {
        if (map.getLayer(id)) map.removeLayer(id);
      });
      if (map.getSource('fog-aqi-source')) {
        map.removeSource('fog-aqi-source');
      }
    }
  } catch (e) {
    // Map may have been removed
  }
}

function renderFogOverlay(
  map: mapboxgl.Map, 
  stations: NormalizedAQIData[],
  opacity: number
) {
  cleanupLayers(map);
  
  if (stations.length === 0) return;

  // Create multiple overlapping circles for fog effect
  const features: GeoJSON.Feature[] = [];
  
  stations.forEach(station => {
    const pm25 = station.pm25;
    
    // Generate concentric fog circles for smooth gradient
    const radii = [0.02, 0.05, 0.08, 0.12, 0.18];
    const opacities = [0.4, 0.3, 0.2, 0.15, 0.08];
    
    radii.forEach((radius, i) => {
      features.push({
        type: 'Feature',
        properties: {
          pm25,
          radius: radius * 1000, // Convert to meters
          opacity: opacities[i] * opacity,
          color: getFogColor(pm25),
        },
        geometry: {
          type: 'Point',
          coordinates: [station.longitude, station.latitude],
        },
      });
    });
  });

  map.addSource('fog-aqi-source', {
    type: 'geojson',
    data: {
      type: 'FeatureCollection',
      features,
    },
  });

  // Ambient glow layer (largest, most diffuse)
  map.addLayer({
    id: 'fog-aqi-ambient',
    type: 'circle',
    source: 'fog-aqi-source',
    filter: ['==', ['get', 'radius'], 180],
    paint: {
      'circle-radius': [
        'interpolate', ['linear'], ['zoom'],
        8, 200,
        12, 400,
        16, 800,
      ],
      'circle-color': ['get', 'color'],
      'circle-opacity': ['get', 'opacity'],
      'circle-blur': 1,
    },
  });

  // Main fog layer with gradient
  map.addLayer({
    id: 'fog-aqi-glow',
    type: 'circle',
    source: 'fog-aqi-source',
    filter: ['!=', ['get', 'radius'], 180],
    paint: {
      'circle-radius': [
        'interpolate', ['linear'], ['zoom'],
        8, ['*', ['get', 'radius'], 0.1],
        12, ['*', ['get', 'radius'], 0.2],
        16, ['*', ['get', 'radius'], 0.4],
      ],
      'circle-color': ['get', 'color'],
      'circle-opacity': ['get', 'opacity'],
      'circle-blur': 0.8,
    },
  });

  // Heatmap layer for smooth interpolation
  map.addLayer({
    id: 'fog-aqi-layer',
    type: 'heatmap',
    source: 'fog-aqi-source',
    maxzoom: 18,
    paint: {
      'heatmap-weight': [
        'interpolate', ['linear'], ['get', 'pm25'],
        0, 0.1,
        25, 0.3,
        50, 0.5,
        100, 0.7,
        150, 0.9,
        200, 1,
      ],
      'heatmap-intensity': [
        'interpolate', ['linear'], ['zoom'],
        8, 0.3,
        12, 0.6,
        16, 0.9,
      ],
      'heatmap-color': [
        'interpolate', ['linear'], ['heatmap-density'],
        0, 'rgba(0, 0, 0, 0)',
        0.1, 'rgba(34, 197, 94, 0.1)',
        0.3, 'rgba(34, 197, 94, 0.2)',
        0.5, 'rgba(234, 179, 8, 0.25)',
        0.7, 'rgba(249, 115, 22, 0.3)',
        0.85, 'rgba(239, 68, 68, 0.35)',
        1, 'rgba(126, 0, 35, 0.4)',
      ],
      'heatmap-radius': [
        'interpolate', ['linear'], ['zoom'],
        8, 60,
        12, 90,
        16, 120,
      ],
      'heatmap-opacity': opacity,
    },
  });

  // Set fog atmosphere for immersive feel
  if (map.getFog) {
    map.setFog({
      color: 'rgb(240, 245, 250)',
      'high-color': 'rgb(200, 210, 220)',
      'horizon-blend': 0.1,
      'space-color': 'rgb(180, 200, 220)',
      'star-intensity': 0,
    });
  }
}

function getFogColor(pm25: number): string {
  if (pm25 <= 25) return FOG_COLORS.safe;
  if (pm25 <= 50) return FOG_COLORS.moderate;
  if (pm25 <= 100) return FOG_COLORS.unhealthy;
  if (pm25 <= 150) return FOG_COLORS.dangerous;
  return FOG_COLORS.hazardous;
}

export default FogAQIOverlay;
