/**
 * Glowing Route Layer Component
 * 
 * Displays routes as glowing light paths rather than solid lines.
 * Safe routes glow brighter, risky routes appear dimmer/warmer.
 * Creates a futuristic, calm navigation aesthetic.
 * 
 * @version 2.0.0 - Futuristic Health Navigation
 */

import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import { RouteWithPM25 } from '@/hooks/useRoutePM25';

interface GlowingRouteLayerProps {
  map: mapboxgl.Map | null;
  routes: RouteWithPM25[];
  selectedIndex: number;
  showAllRoutes?: boolean;
  onRouteClick?: (index: number) => void;
}

// Soft, clinical color palette
const ROUTE_COLORS = {
  safe: {
    core: '#4ade80',
    glow: 'rgba(74, 222, 128, 0.4)',
  },
  moderate: {
    core: '#fbbf24',
    glow: 'rgba(251, 191, 36, 0.35)',
  },
  unhealthy: {
    core: '#fb923c',
    glow: 'rgba(251, 146, 60, 0.3)',
  },
  dangerous: {
    core: '#f87171',
    glow: 'rgba(248, 113, 113, 0.25)',
  },
};

export const GlowingRouteLayer = ({
  map,
  routes,
  selectedIndex,
  showAllRoutes = true,
  onRouteClick,
}: GlowingRouteLayerProps) => {
  const layerIdsRef = useRef<string[]>([]);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  useEffect(() => {
    if (!map || routes.length === 0) return;

    // Cleanup previous layers
    cleanupLayers(map, layerIdsRef.current);
    cleanupMarkers(markersRef.current);
    layerIdsRef.current = [];
    markersRef.current = [];

    // Render non-selected routes first (behind)
    if (showAllRoutes) {
      routes.forEach((route, index) => {
        if (index !== selectedIndex) {
          renderGhostRoute(map, route, index, layerIdsRef);
        }
      });
    }

    // Render selected route on top
    const selectedRoute = routes[selectedIndex];
    if (selectedRoute) {
      renderGlowingRoute(map, selectedRoute, selectedIndex, layerIdsRef);
      renderDestinationMarker(map, selectedRoute, markersRef);
      
      // Fit bounds with padding
      const bounds = new mapboxgl.LngLatBounds();
      selectedRoute.geometry.coordinates.forEach((coord: number[]) => {
        bounds.extend(coord as [number, number]);
      });
      map.fitBounds(bounds, { 
        padding: { top: 100, bottom: 200, left: 60, right: 60 },
        duration: 800,
      });
    }

    return () => {
      cleanupLayers(map, layerIdsRef.current);
      cleanupMarkers(markersRef.current);
    };
  }, [map, routes, selectedIndex, showAllRoutes]);

  return null;
};

function cleanupLayers(map: mapboxgl.Map, layerIds: string[]) {
  try {
    if (map.getStyle()) {
      layerIds.forEach(id => {
        if (map.getLayer(id)) map.removeLayer(id);
        if (map.getSource(id)) map.removeSource(id);
      });
    }
  } catch (e) {
    // Map may have been removed
  }
}

function cleanupMarkers(markers: mapboxgl.Marker[]) {
  markers.forEach(m => m.remove());
}

function getRouteColors(pm25: number) {
  if (pm25 <= 25) return ROUTE_COLORS.safe;
  if (pm25 <= 50) return ROUTE_COLORS.moderate;
  if (pm25 <= 100) return ROUTE_COLORS.unhealthy;
  return ROUTE_COLORS.dangerous;
}

function renderGlowingRoute(
  map: mapboxgl.Map,
  route: RouteWithPM25,
  index: number,
  layerIdsRef: React.MutableRefObject<string[]>
) {
  const colors = getRouteColors(route.averagePM25);
  const baseId = `route-glow-${index}`;

  // Outer glow (largest, most diffuse)
  const outerGlowId = `${baseId}-outer`;
  map.addSource(outerGlowId, {
    type: 'geojson',
    data: { type: 'Feature', properties: {}, geometry: route.geometry },
  });
  map.addLayer({
    id: outerGlowId,
    type: 'line',
    source: outerGlowId,
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: {
      'line-color': colors.glow,
      'line-width': 24,
      'line-blur': 12,
      'line-opacity': 0.4,
    },
  });
  layerIdsRef.current.push(outerGlowId);

  // Middle glow
  const midGlowId = `${baseId}-mid`;
  map.addSource(midGlowId, {
    type: 'geojson',
    data: { type: 'Feature', properties: {}, geometry: route.geometry },
  });
  map.addLayer({
    id: midGlowId,
    type: 'line',
    source: midGlowId,
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: {
      'line-color': colors.glow,
      'line-width': 14,
      'line-blur': 6,
      'line-opacity': 0.6,
    },
  });
  layerIdsRef.current.push(midGlowId);

  // Core line (brightest)
  const coreId = `${baseId}-core`;
  map.addSource(coreId, {
    type: 'geojson',
    data: { type: 'Feature', properties: {}, geometry: route.geometry },
  });
  map.addLayer({
    id: coreId,
    type: 'line',
    source: coreId,
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: {
      'line-color': colors.core,
      'line-width': 5,
      'line-opacity': 0.95,
    },
  });
  layerIdsRef.current.push(coreId);

  // Animated pulse effect (subtle)
  const pulseId = `${baseId}-pulse`;
  map.addSource(pulseId, {
    type: 'geojson',
    data: { type: 'Feature', properties: {}, geometry: route.geometry },
  });
  map.addLayer({
    id: pulseId,
    type: 'line',
    source: pulseId,
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: {
      'line-color': '#ffffff',
      'line-width': 2,
      'line-opacity': 0.3,
      'line-dasharray': [0, 4, 3],
    },
  });
  layerIdsRef.current.push(pulseId);

  // Animate dash
  let step = 0;
  const animateDash = () => {
    step = (step + 1) % 100;
    if (map.getLayer(pulseId)) {
      map.setPaintProperty(pulseId, 'line-dasharray', [
        step * 0.1,
        4,
        3,
      ]);
      requestAnimationFrame(animateDash);
    }
  };
  animateDash();
}

function renderGhostRoute(
  map: mapboxgl.Map,
  route: RouteWithPM25,
  index: number,
  layerIdsRef: React.MutableRefObject<string[]>
) {
  const layerId = `route-ghost-${index}`;
  
  map.addSource(layerId, {
    type: 'geojson',
    data: { type: 'Feature', properties: {}, geometry: route.geometry },
  });
  map.addLayer({
    id: layerId,
    type: 'line',
    source: layerId,
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: {
      'line-color': 'rgba(148, 163, 184, 0.4)',
      'line-width': 4,
      'line-dasharray': [2, 4],
      'line-blur': 1,
    },
  });
  layerIdsRef.current.push(layerId);
}

function renderDestinationMarker(
  map: mapboxgl.Map,
  route: RouteWithPM25,
  markersRef: React.MutableRefObject<mapboxgl.Marker[]>
) {
  const coords = route.geometry.coordinates;
  const destCoord = coords[coords.length - 1];
  const colors = getRouteColors(route.averagePM25);

  const el = document.createElement('div');
  el.innerHTML = `
    <div class="destination-marker" style="
      position: relative;
      width: 44px;
      height: 44px;
    ">
      <div style="
        position: absolute;
        inset: 0;
        background: radial-gradient(circle, ${colors.glow} 0%, transparent 70%);
        border-radius: 50%;
        animation: destPulse 2s ease-in-out infinite;
      "></div>
      <div style="
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 24px;
        height: 24px;
        background: linear-gradient(135deg, ${colors.core}, ${colors.core}dd);
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 4px 20px ${colors.glow};
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
          <circle cx="12" cy="12" r="4"/>
        </svg>
      </div>
    </div>
    <style>
      @keyframes destPulse {
        0%, 100% { transform: scale(1); opacity: 0.8; }
        50% { transform: scale(1.3); opacity: 0.4; }
      }
    </style>
  `;

  const marker = new mapboxgl.Marker(el)
    .setLngLat(destCoord as [number, number])
    .addTo(map);
  
  markersRef.current.push(marker);

  // Add origin marker
  const originCoord = coords[0];
  const originEl = document.createElement('div');
  originEl.innerHTML = `
    <div style="
      width: 18px;
      height: 18px;
      background: linear-gradient(135deg, #06b6d4, #0891b2);
      border: 3px solid white;
      border-radius: 50%;
      box-shadow: 0 2px 12px rgba(6, 182, 212, 0.5);
    "></div>
  `;

  const originMarker = new mapboxgl.Marker(originEl)
    .setLngLat(originCoord as [number, number])
    .addTo(map);
  
  markersRef.current.push(originMarker);
}

export default GlowingRouteLayer;
