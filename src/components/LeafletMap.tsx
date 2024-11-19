'use client';

import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface LeafletMapProps {
  data: {
    year: string;
    total: number;
    district_code?: string;
    district_name?: string;
    value?: number;
    disaggregation: any[];
  }[];
  geojsonData: any;
  indicatorId: string;
  unit: string;
  selectedYear: string;
}

const LeafletMap: React.FC<LeafletMapProps> = ({ 
  data, 
  geojsonData, 
  unit, 
  selectedYear 
}) => {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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

    // Clear existing layers
    map.eachLayer((layer) => {
      if (layer instanceof L.GeoJSON) {
        map.removeLayer(layer);
      }
    });

    const yearData = data.filter(d => d.year === selectedYear);
    const districtData = yearData.filter(d => d.district_code && d.value !== undefined);

    if (districtData.length === 0) {
      const noDataDiv = L.DomUtil.create('div', 'no-data-message');
      noDataDiv.innerHTML = `<div class="bg-white p-2 rounded shadow">No district data available for ${selectedYear}</div>`;
      const noDataControl = L.Control.extend({
        options: {
          position: 'topleft'
        },
        onAdd: function() {
          return noDataDiv;
        }
      });
      new noDataControl().addTo(map);
      return;
    }

    const values = districtData.map(d => d.value!);
    const min = Math.min(...values);
    const max = Math.max(...values);

    const getColor = (value: number) => {
      const normalized = (value - min) / (max - min);
      return `rgb(${255 * (1 - normalized)}, ${255 * (1 - normalized)}, 255)`;
    };

    const geoJsonLayer = L.geoJSON(geojsonData, {
      style: (feature) => {
        const district = districtData.find(d => d.district_code === feature?.properties.dcode);
        return {
          fillColor: district ? getColor(district.value!) : '#ffffff',
          weight: 1,
          opacity: 1,
          color: '#666',
          fillOpacity: 0.7
        };
      },
      onEachFeature: (feature, layer) => {
        const district = districtData.find(d => d.district_code === feature.properties.dcode);
        if (district) {
          layer.bindPopup(`
            <div class="p-2">
              <strong>${district.district_name}</strong><br>
              Value: ${district.value?.toFixed(2)} ${unit}
            </div>
          `);
        }
      }
    }).addTo(map);

    if (geoJsonLayer.getBounds().isValid()) {
      map.fitBounds(geoJsonLayer.getBounds());
    }

  }, [data, geojsonData, selectedYear, unit]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
};

export default LeafletMap;