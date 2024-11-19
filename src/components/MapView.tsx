'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

const LeafletMap = dynamic(
  () => import('./LeafletMap'),
  { 
    ssr: false,
    loading: () => (
      <div className="w-full h-[600px] flex items-center justify-center bg-gray-100 rounded-lg">
        Loading map...
      </div>
    )
  }
);

interface MapViewProps {
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
  indicatorId: string;
  unit: string;
}

const MapView: React.FC<MapViewProps> = ({ data, geojsonData, indicatorId, unit }) => {
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [yearOptions, setYearOptions] = useState<string[]>([]);

  useEffect(() => {
    if (data) {
      const years = Array.from(new Set(data.map(d => d.year))).sort();
      setYearOptions(years);
      setSelectedYear(years[years.length - 1]);
    }
  }, [data]);

  if (!selectedYear) {
    return <div>Loading...</div>;
  }

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
        <LeafletMap
          data={data}
          geojsonData={geojsonData}
          selectedYear={selectedYear}
          unit={unit}
          indicatorId={indicatorId}
        />
      </div>
    </div>
  );
};

export default MapView;