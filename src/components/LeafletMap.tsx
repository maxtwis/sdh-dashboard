'use client';

import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface LeafletMapProps {
  data: TimeSeriesDataPoint[];
  geojsonData: any;
  indicatorId: string;
  unit: string;
  selectedYear: string;
}

interface DistrictDataPoint {
    district_code: string;
    district_name: string;
    value: number;
  }
  
  interface DisaggregationData {
    category: string;
    value: string;
    percentage: number;
  }
  
  interface TimeSeriesDataPoint {
    year: string;
    total: number;
    disaggregation: DisaggregationData[];
    district_data?: DistrictDataPoint[];
  }
  
  interface LeafletControlOptions extends L.ControlOptions {
    position: L.ControlPosition;
  }
  
  // Update MapViewProps to match the new data structure
  interface MapViewProps {
    data: TimeSeriesDataPoint[];
    geojsonData: any;
    indicatorId: string;
    unit: string;
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
    if (!mapRef.current || !geojsonData || !data || !selectedYear) return;
  
    const map = mapRef.current;
  
    // Clear existing layers
    map.eachLayer((layer) => {
      if (layer instanceof L.GeoJSON) {
        map.removeLayer(layer);
      }
    });
  
    // Find the data for selected year
    const yearData = data.find(d => d.year === selectedYear);
    
    // Get district data from the year's data point
    const districtData = yearData?.district_data || [];
  
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
  
    const values = districtData.map(d => d.value);
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
          fillColor: district ? getColor(district.value) : '#ffffff',
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