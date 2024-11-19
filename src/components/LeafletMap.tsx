'use client';

import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface LeafletMapProps {
  data: {
    year: string;
    total: number;
    disaggregation: any[];
    district_data?: {
      district_code: string;
      district_name: string;
      value: number;
    }[];
  }[];
  geojsonData: any;
  selectedYear: string;
  unit: string;
  indicatorId: string;
}

const LeafletMap: React.FC<LeafletMapProps> = ({ 
  data, 
  geojsonData, 
  selectedYear,
  unit,
}) => {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const geoJsonLayerRef = useRef<L.GeoJSON | null>(null);
  const legendRef = useRef<L.Control | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Fix leaflet icon paths
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    });

    if (!mapRef.current) {
      mapRef.current = L.map(containerRef.current).setView([13.7563, 100.5018], 11);
      
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(mapRef.current);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !geojsonData || !data || !selectedYear) return;

    const map = mapRef.current;

    // Remove existing GeoJSON layer and legend
    if (geoJsonLayerRef.current) {
      map.removeLayer(geoJsonLayerRef.current);
    }
    if (legendRef.current) {
      map.removeControl(legendRef.current);
    }

    // Find the data for selected year
    const yearData = data.find(d => d.year === selectedYear);
    console.log('Year data:', yearData);

    const districtData = yearData?.district_data || [];
    console.log('District data:', districtData);

    if (districtData.length === 0) {
      console.log('No district data available for', selectedYear);
      return;
    }

    // Calculate color intervals
    const values = districtData.map(d => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;
    const intervals = 5;
    const step = range / intervals;

    // Color function using intervals
    const getColor = (value: number) => {
      if (isNaN(value)) return '#ffffff';
      const normalizedValue = (value - min) / range;
      if (normalizedValue <= 0.2) return '#fee5d9';
      if (normalizedValue <= 0.4) return '#fcae91';
      if (normalizedValue <= 0.6) return '#fb6a4a';
      if (normalizedValue <= 0.8) return '#de2d26';
      return '#a50f15';
    };

    // Create legend
    const legend = new L.Control({ position: 'bottomright' });
    legendRef.current = legend;

    legend.onAdd = () => {
      const div = L.DomUtil.create('div', 'info legend');
      div.style.backgroundColor = 'white';
      div.style.padding = '6px 8px';
      div.style.border = '1px solid #ccc';
      div.style.borderRadius = '4px';
      
      // Add legend title
      div.innerHTML = '<strong>Value Range</strong><br>';
      
      // Add legend items
      for (let i = 0; i < intervals; i++) {
        const from = min + (step * i);
        const to = min + (step * (i + 1));
        div.innerHTML += 
          `<i style="background:${getColor(from + (step/2))}; display: inline-block; width: 18px; height: 18px; margin-right: 8px; opacity: 0.7"></i>` +
          `${from.toFixed(1)}${i === intervals - 1 ? '+' : '–' + to.toFixed(1)} ${unit}<br>`;
      }
      
      return div;
    };

    // Create GeoJSON layer
    geoJsonLayerRef.current = L.geoJSON(geojsonData, {
      style: (feature) => {
    // Convert dcode to string for comparison since CSV likely has string codes
    const districtCode = feature?.properties?.dcode?.toString();
    const district = districtData.find(d => d.district_code === districtCode);
    console.log('Feature dcode:', districtCode, 'District found:', district); // Debug log

    return {
        fillColor: district ? getColor(district.value) : '#ffffff',
        weight: 1,
        opacity: 1,
        color: '#666',
        fillOpacity: 0.7
    };
    },
    onEachFeature: (feature, layer) => {
        // Convert dcode to string here as well
        const districtCode = feature.properties.dcode?.toString();
        const district = districtData.find(d => d.district_code === districtCode);
        if (district) {
            layer.bindPopup(`
              <div class="p-2">
                <strong>${feature.properties.DISTRICT_N}</strong><br>
                Value: ${district.value?.toFixed(2)} ${unit}
              </div>
            `);
            
            layer.on({
              mouseover: (e) => {
                const layer = e.target;
                layer.setStyle({
                  weight: 3,
                  color: '#333',
                  fillOpacity: 0.9
                });
                layer.bringToFront();
              },
              mouseout: (e) => {
                geoJsonLayerRef.current?.resetStyle(e.target);
              }
            });
          }
        }
    }).addTo(map);

    // Add legend to map
    legend.addTo(map);

    if (geoJsonLayerRef.current.getBounds().isValid()) {
      map.fitBounds(geoJsonLayerRef.current.getBounds());
    }

  }, [data, geojsonData, selectedYear, unit]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
};

export default LeafletMap;