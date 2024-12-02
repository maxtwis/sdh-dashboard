// src/components/dashboard/SDHDashboardWrapper.tsx
'use client';

import { ErrorBoundary } from 'react-error-boundary';
import ErrorFallback from '@/components/ErrorBoundary';  // Updated import path
import SDHDashboard from '@/components/dashboard/sdh-dashboard';

export default function SDHDashboardWrapper() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <SDHDashboard />
    </ErrorBoundary>
  );
}