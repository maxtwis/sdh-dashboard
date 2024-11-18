'use client';

import dynamic from 'next/dynamic';

const DynamicMapView = dynamic(
  () => import('./MapView'),
  { 
    ssr: false,
    loading: () => (
      <div className="w-full h-[600px] flex items-center justify-center bg-gray-100 rounded-lg">
        Loading map...
      </div>
    )
  }
);

export default DynamicMapView;