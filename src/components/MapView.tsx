import React, { useEffect, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface MapViewProps {
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
}

const MapView: React.FC<MapViewProps> = ({ data, geojsonData, indicatorId, unit }) => {
  const [map, setMap] = useState<L.Map | null>(null);
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [yearOptions, setYearOptions] = useState<string[]>([]);

  useEffect(() => {
    // Fix leaflet icon paths
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    });

    if (!map) {
      const mapInstance = L.map('map').setView([13.7563, 100.5018], 11);
      
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(mapInstance);

      setMap(mapInstance);
    }

    if (data) {
      const years = Array.from(new Set(data.map(d => d.year))).sort();
      setYearOptions(years);
      setSelectedYear(years[years.length - 1]);
    }

    return () => {
      map?.remove();
    };
  }, []);

  useEffect(() => {
    if (!map || !geojsonData || !data || !selectedYear) return;

    map.eachLayer((layer) => {
      if (layer instanceof L.GeoJSON) {
        map.removeLayer(layer);
      }
    });

    const yearData = data.filter(d => d.year === selectedYear);
    const districtData = yearData.filter(d => d.district_code && d.value);

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

    const legendDiv = L.DomUtil.create('div', 'legend');
    legendDiv.innerHTML = `
      <div class="bg-white p-3 rounded shadow">
        <h4 class="text-sm font-semibold mb-2">Legend</h4>
        <div class="space-y-1">
          <div class="flex items-center gap-2">
            <div style="width: 20px; height: 20px; background: ${getColor(min)}"></div>
            <span class="text-xs">${min.toFixed(2)} ${unit}</span>
          </div>
          <div class="flex items-center gap-2">
            <div style="width: 20px; height: 20px; background: ${getColor((min + max) / 2)}"></div>
            <span class="text-xs">${((min + max) / 2).toFixed(2)} ${unit}</span>
          </div>
          <div class="flex items-center gap-2">
            <div style="width: 20px; height: 20px; background: ${getColor(max)}"></div>
            <span class="text-xs">${max.toFixed(2)} ${unit}</span>
          </div>
        </div>
      </div>
    `;

    const LegendControl = L.Control.extend({
      options: {
        position: 'bottomright'
      },
      onAdd: function() {
        return legendDiv;
      }
    });
    new LegendControl().addTo(map);

    if (geoJsonLayer.getBounds().isValid()) {
      map.fitBounds(geoJsonLayer.getBounds());
    }

  }, [map, geojsonData, data, selectedYear, unit]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium">Select Year:</label>
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(e.target.value)}
          className="p-2 border rounded"
        >
          {yearOptions.map(year => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
      </div>
      <div className="w-full h-[600px] relative border rounded">
        <div id="map" className="w-full h-full" />
      </div>
    </div>
  );
};

export default MapView;