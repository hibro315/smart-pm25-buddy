/**
 * Interpolated AQI Heatmap Component
 * 
 * Displays an AQI heatmap with IDW (Inverse Distance Weighting) interpolation
 * using data from multiple nearby stations.
 * 
 * @version 1.0.0
 */

import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import AQICNDataService, { NormalizedAQIData, InterpolatedPoint } from '@/data/AQICNDataService';

interface InterpolatedAQIHeatmapProps {
  map: mapboxgl.Map | null;
  centerLat: number;
  centerLng: number;
  enabled?: boolean;
  opacity?: number;
  showStations?: boolean;
}

// AQI color scale (EPA standard)
const AQI_COLORS = {
  good: '#00e400',        // 0-50
  moderate: '#ffff00',    // 51-100
  sensitive: '#ff7e00',   // 101-150
  unhealthy: '#ff0000',   // 151-200
  veryUnhealthy: '#8f3f97', // 201-300
  hazardous: '#7e0023',   // 301+
};

export const InterpolatedAQIHeatmap = ({ 
  map, 
  centerLat, 
  centerLng, 
  enabled = true,
  opacity = 0.7,
  showStations = true,
}: InterpolatedAQIHeatmapProps) => {
  const stationsRef = useRef<NormalizedAQIData[]>([]);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [stationCount, setStationCount] = useState(0);

  useEffect(() => {
    if (!map || !enabled) {
      // Cleanup if disabled
      if (map) {
        cleanupLayers(map);
        cleanupMarkers();
      }
      return;
    }

    const loadAndRender = async () => {
      try {
        // Fetch nearby stations
        const stations = await AQICNDataService.fetchNearbyStations(
          centerLat,
          centerLng,
          30, // 30km radius
          'cf980db5-197e-4fef-83c9-d725f1bb62c9'
        );

        if (stations.length === 0) {
          console.log('[InterpolatedAQIHeatmap] No stations found, falling back to single station');
          const fallback = await AQICNDataService.fetchAQIData(
            centerLat,
            centerLng,
            'cf980db5-197e-4fef-83c9-d725f1bb62c9',
            true
          );
          if (fallback) {
            stations.push(fallback);
          }
        }

        stationsRef.current = stations;
        setStationCount(stations.length);

        // Generate interpolated grid
        const gridPoints = AQICNDataService.generateInterpolatedGrid(
          stations,
          centerLat,
          centerLng,
          15, // 15x15 grid
          20  // 20km radius
        );

        // Wait for map style to be ready
        if (map.isStyleLoaded()) {
          renderHeatmap(map, gridPoints, stations, opacity);
          if (showStations) {
            renderStationMarkers(map, stations);
          }
        } else {
          map.once('load', () => {
            renderHeatmap(map, gridPoints, stations, opacity);
            if (showStations) {
              renderStationMarkers(map, stations);
            }
          });
        }
      } catch (error) {
        console.error('[InterpolatedAQIHeatmap] Error loading data:', error);
      }
    };

    loadAndRender();

    return () => {
      if (map) {
        cleanupLayers(map);
        cleanupMarkers();
      }
    };
  }, [map, centerLat, centerLng, enabled, opacity, showStations]);

  const cleanupLayers = (mapInstance: mapboxgl.Map) => {
    try {
      if (mapInstance.getStyle()) {
        ['interpolated-heatmap', 'interpolated-circles', 'station-labels'].forEach(id => {
          if (mapInstance.getLayer(id)) mapInstance.removeLayer(id);
        });
        ['interpolated-grid', 'station-points'].forEach(id => {
          if (mapInstance.getSource(id)) mapInstance.removeSource(id);
        });
      }
    } catch (e) {
      // Map may have been removed
    }
  };

  const cleanupMarkers = () => {
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];
  };

  const renderHeatmap = (
    mapInstance: mapboxgl.Map,
    gridPoints: InterpolatedPoint[],
    stations: NormalizedAQIData[],
    opacityValue: number
  ) => {
    cleanupLayers(mapInstance);

    if (gridPoints.length === 0 && stations.length === 0) return;

    // Combine interpolated points with station data for more accurate rendering
    const allPoints = [
      ...gridPoints.map(p => ({
        type: 'Feature' as const,
        properties: {
          aqi: p.aqi,
          pm25: p.pm25,
          confidence: p.confidence,
          isStation: false,
        },
        geometry: {
          type: 'Point' as const,
          coordinates: [p.longitude, p.latitude],
        },
      })),
      ...stations.map(s => ({
        type: 'Feature' as const,
        properties: {
          aqi: s.aqi,
          pm25: s.pm25,
          confidence: 1,
          isStation: true,
        },
        geometry: {
          type: 'Point' as const,
          coordinates: [s.longitude, s.latitude],
        },
      })),
    ];

    const geojson: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: allPoints,
    };

    mapInstance.addSource('interpolated-grid', {
      type: 'geojson',
      data: geojson,
    });

    // Heatmap layer with AQI-based coloring
    mapInstance.addLayer({
      id: 'interpolated-heatmap',
      type: 'heatmap',
      source: 'interpolated-grid',
      maxzoom: 16,
      paint: {
        'heatmap-weight': [
          'interpolate', ['linear'], ['get', 'aqi'],
          0, 0.1,
          50, 0.3,
          100, 0.5,
          150, 0.7,
          200, 0.85,
          300, 1,
        ],
        'heatmap-intensity': [
          'interpolate', ['linear'], ['zoom'],
          8, 0.4,
          12, 0.8,
          16, 1.2,
        ],
        'heatmap-color': [
          'interpolate', ['linear'], ['heatmap-density'],
          0, 'rgba(0, 228, 0, 0)',
          0.15, 'rgba(0, 228, 0, 0.3)',
          0.3, 'rgba(255, 255, 0, 0.45)',
          0.5, 'rgba(255, 126, 0, 0.55)',
          0.7, 'rgba(255, 0, 0, 0.65)',
          0.85, 'rgba(143, 63, 151, 0.75)',
          1, 'rgba(126, 0, 35, 0.85)',
        ],
        'heatmap-radius': [
          'interpolate', ['linear'], ['zoom'],
          8, 50,
          10, 40,
          12, 30,
          14, 25,
          16, 20,
        ],
        'heatmap-opacity': opacityValue,
      },
    });

    // Circle layer for station points (visible at higher zoom)
    mapInstance.addLayer({
      id: 'interpolated-circles',
      type: 'circle',
      source: 'interpolated-grid',
      minzoom: 12,
      filter: ['==', ['get', 'isStation'], true],
      paint: {
        'circle-radius': [
          'interpolate', ['linear'], ['zoom'],
          12, 6,
          16, 12,
        ],
        'circle-color': [
          'interpolate', ['linear'], ['get', 'aqi'],
          0, AQI_COLORS.good,
          50, AQI_COLORS.good,
          51, AQI_COLORS.moderate,
          100, AQI_COLORS.moderate,
          101, AQI_COLORS.sensitive,
          150, AQI_COLORS.sensitive,
          151, AQI_COLORS.unhealthy,
          200, AQI_COLORS.unhealthy,
          201, AQI_COLORS.veryUnhealthy,
          300, AQI_COLORS.veryUnhealthy,
          301, AQI_COLORS.hazardous,
        ],
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 2,
        'circle-opacity': 0.9,
      },
    });
  };

  const renderStationMarkers = (mapInstance: mapboxgl.Map, stations: NormalizedAQIData[]) => {
    cleanupMarkers();

    stations.slice(0, 15).forEach(station => { // Limit to 15 markers for performance
      const color = getAQIColor(station.aqi);
      
      const el = document.createElement('div');
      el.className = 'aqi-station-marker';
      el.style.cssText = `
        width: 36px;
        height: 36px;
        background: linear-gradient(135deg, ${color} 0%, ${adjustColor(color, -20)} 100%);
        border: 2px solid rgba(255,255,255,0.9);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 11px;
        font-weight: bold;
        color: ${station.aqi > 150 ? 'white' : 'black'};
        box-shadow: 0 2px 8px rgba(0,0,0,0.25), 0 0 15px ${color}40;
        cursor: pointer;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
      `;
      el.textContent = station.aqi.toString();
      el.onmouseenter = () => { 
        el.style.transform = 'scale(1.2)'; 
        el.style.boxShadow = `0 4px 12px rgba(0,0,0,0.3), 0 0 25px ${color}60`;
      };
      el.onmouseleave = () => { 
        el.style.transform = 'scale(1)'; 
        el.style.boxShadow = `0 2px 8px rgba(0,0,0,0.25), 0 0 15px ${color}40`;
      };

      const popup = new mapboxgl.Popup({ offset: 25, closeButton: false }).setHTML(`
        <div style="padding: 12px; font-family: system-ui, sans-serif; min-width: 180px;">
          <div style="font-weight: 600; margin-bottom: 8px; font-size: 14px; color: #111;">${station.stationName}</div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 13px;">
            <span style="color: #666;">AQI:</span>
            <span style="font-weight: 600; color: ${color}">${station.aqi}</span>
            <span style="color: #666;">PM2.5:</span>
            <span style="font-weight: 500;">${station.pm25.toFixed(1)} µg/m³</span>
          </div>
          <div style="margin-top: 8px; font-size: 11px; color: #888; border-top: 1px solid #eee; padding-top: 8px;">
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
    if (aqi <= 50) return AQI_COLORS.good;
    if (aqi <= 100) return AQI_COLORS.moderate;
    if (aqi <= 150) return AQI_COLORS.sensitive;
    if (aqi <= 200) return AQI_COLORS.unhealthy;
    if (aqi <= 300) return AQI_COLORS.veryUnhealthy;
    return AQI_COLORS.hazardous;
  };

  const adjustColor = (hex: string, percent: number): string => {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.min(255, Math.max(0, (num >> 16) + amt));
    const G = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amt));
    const B = Math.min(255, Math.max(0, (num & 0x0000FF) + amt));
    return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
  };

  return null;
};

export default InterpolatedAQIHeatmap;
