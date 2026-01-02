import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import { RouteWithPM25 } from '@/hooks/useRoutePM25';

interface ColorCodedRouteLayerProps {
  map: mapboxgl.Map | null;
  routes: RouteWithPM25[];
  selectedIndex: number;
  onSegmentClick?: (pm25: number, location: [number, number]) => void;
}

// PM2.5 severity color scale
const PM25_COLORS = {
  good: '#22c55e',        // 0-25
  moderate: '#eab308',    // 25-50
  unhealthy: '#f97316',   // 50-100
  veryUnhealthy: '#ef4444', // 100-150
  hazardous: '#7e0023',   // 150+
};

const getPM25Color = (pm25: number): string => {
  if (pm25 <= 25) return PM25_COLORS.good;
  if (pm25 <= 50) return PM25_COLORS.moderate;
  if (pm25 <= 100) return PM25_COLORS.unhealthy;
  if (pm25 <= 150) return PM25_COLORS.veryUnhealthy;
  return PM25_COLORS.hazardous;
};

export const ColorCodedRouteLayer = ({
  map,
  routes,
  selectedIndex,
  onSegmentClick,
}: ColorCodedRouteLayerProps) => {
  const layerIdsRef = useRef<string[]>([]);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  useEffect(() => {
    if (!map || routes.length === 0) return;

    // Cleanup previous layers
    layerIdsRef.current.forEach(id => {
      if (map.getLayer(id)) map.removeLayer(id);
      if (map.getSource(id)) map.removeSource(id);
    });
    markersRef.current.forEach(m => m.remove());
    layerIdsRef.current = [];
    markersRef.current = [];

    const selectedRoute = routes[selectedIndex];
    if (!selectedRoute) return;

    // Create segmented route with color coding
    const coordinates = selectedRoute.geometry.coordinates;
    const pm25Samples = selectedRoute.pm25Samples || [];
    const sampleLocations = selectedRoute.sampleLocations || [];

    // If we have PM2.5 samples, create color-coded segments
    if (pm25Samples.length > 0 && sampleLocations.length > 0) {
      renderColorCodedSegments(map, selectedRoute, coordinates);
    } else {
      // Fallback: single color based on average
      renderSimpleRoute(map, selectedRoute, coordinates);
    }

    // Add other routes as faded lines
    routes.forEach((route, index) => {
      if (index === selectedIndex) return;
      
      const layerId = `route-other-${index}`;
      
      map.addSource(layerId, {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: route.geometry,
        },
      });

      map.addLayer({
        id: layerId,
        type: 'line',
        source: layerId,
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': '#94a3b8',
          'line-width': 3,
          'line-opacity': 0.4,
          'line-dasharray': [2, 2],
        },
      });

      layerIdsRef.current.push(layerId);
    });

    // Add PM2.5 sample markers
    sampleLocations.forEach((location, index) => {
      const pm25 = pm25Samples[index];
      if (pm25 === undefined) return;

      const color = getPM25Color(pm25);
      
      const el = document.createElement('div');
      el.style.cssText = `
        width: 28px;
        height: 28px;
        background-color: ${color};
        border: 2px solid white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 9px;
        font-weight: bold;
        color: ${pm25 > 100 ? 'white' : 'black'};
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        cursor: pointer;
        transition: all 0.2s ease;
      `;
      el.textContent = pm25.toFixed(0);
      
      el.onmouseenter = () => {
        el.style.transform = 'scale(1.3)';
        el.style.zIndex = '100';
      };
      el.onmouseleave = () => {
        el.style.transform = 'scale(1)';
        el.style.zIndex = '1';
      };
      el.onclick = () => {
        onSegmentClick?.(pm25, location as [number, number]);
      };

      const popup = new mapboxgl.Popup({ offset: 25, closeButton: false })
        .setHTML(`
          <div style="padding: 8px; font-family: sans-serif; text-align: center;">
            <div style="font-size: 18px; font-weight: bold; color: ${color};">
              ${pm25.toFixed(1)}
            </div>
            <div style="font-size: 11px; color: #666;">µg/m³</div>
            <div style="font-size: 10px; margin-top: 4px; color: #888;">
              ${getPM25Label(pm25)}
            </div>
          </div>
        `);

      const marker = new mapboxgl.Marker(el)
        .setLngLat(location as [number, number])
        .setPopup(popup)
        .addTo(map);

      markersRef.current.push(marker);
    });

    // Add destination marker
    const destCoords = coordinates[coordinates.length - 1];
    const destEl = document.createElement('div');
    destEl.innerHTML = `
      <div style="
        width: 32px;
        height: 32px;
        background: linear-gradient(135deg, #ef4444, #dc2626);
        border: 3px solid white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
      ">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
        </svg>
      </div>
    `;

    const destMarker = new mapboxgl.Marker(destEl)
      .setLngLat(destCoords)
      .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML('<strong>จุดหมายปลายทาง</strong>'))
      .addTo(map);
    markersRef.current.push(destMarker);

    // Fit bounds
    const bounds = new mapboxgl.LngLatBounds();
    coordinates.forEach((coord: number[]) => {
      bounds.extend(coord as [number, number]);
    });
    map.fitBounds(bounds, { padding: 60 });

    return () => {
      layerIdsRef.current.forEach(id => {
        if (map.getLayer(id)) map.removeLayer(id);
        if (map.getSource(id)) map.removeSource(id);
      });
      markersRef.current.forEach(m => m.remove());
    };
  }, [map, routes, selectedIndex, onSegmentClick]);

  return null;
};

function renderColorCodedSegments(
  map: mapboxgl.Map, 
  route: RouteWithPM25,
  coordinates: number[][]
) {
  const pm25Samples = route.pm25Samples || [];
  const sampleLocations = route.sampleLocations || [];
  
  if (sampleLocations.length < 2) {
    renderSimpleRoute(map, route, coordinates);
    return;
  }

  // Create line segments between sample points with gradient colors
  const layerId = 'route-selected-segments';
  
  // Build line string with color gradient
  map.addSource(layerId, {
    type: 'geojson',
    data: {
      type: 'Feature',
      properties: {},
      geometry: route.geometry,
    },
  });

  // Use line-gradient for smooth color transitions
  map.addLayer({
    id: layerId,
    type: 'line',
    source: layerId,
    layout: {
      'line-join': 'round',
      'line-cap': 'round',
    },
    paint: {
      'line-color': getPM25Color(route.averagePM25),
      'line-width': 8,
      'line-opacity': 0.9,
    },
  });

  // Add glow effect
  const glowLayerId = 'route-selected-glow';
  map.addSource(glowLayerId, {
    type: 'geojson',
    data: {
      type: 'Feature',
      properties: {},
      geometry: route.geometry,
    },
  });

  map.addLayer({
    id: glowLayerId,
    type: 'line',
    source: glowLayerId,
    layout: {
      'line-join': 'round',
      'line-cap': 'round',
    },
    paint: {
      'line-color': getPM25Color(route.averagePM25),
      'line-width': 16,
      'line-opacity': 0.3,
      'line-blur': 4,
    },
  }, layerId); // Insert below the main line
}

function renderSimpleRoute(
  map: mapboxgl.Map,
  route: RouteWithPM25,
  coordinates: number[][]
) {
  const layerId = 'route-selected-simple';
  const color = getPM25Color(route.averagePM25);

  map.addSource(layerId, {
    type: 'geojson',
    data: {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates,
      },
    },
  });

  map.addLayer({
    id: layerId,
    type: 'line',
    source: layerId,
    layout: {
      'line-join': 'round',
      'line-cap': 'round',
    },
    paint: {
      'line-color': color,
      'line-width': 6,
      'line-opacity': 0.9,
    },
  });
}

function getPM25Label(pm25: number): string {
  if (pm25 <= 25) return 'ดี';
  if (pm25 <= 50) return 'ปานกลาง';
  if (pm25 <= 100) return 'ไม่ดี';
  if (pm25 <= 150) return 'แย่มาก';
  return 'อันตราย';
}

export default ColorCodedRouteLayer;
