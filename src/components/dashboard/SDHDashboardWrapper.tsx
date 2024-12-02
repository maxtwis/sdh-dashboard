'use client';

import { ErrorBoundary } from 'react-error-boundary';
import { ErrorFallback } from '@/components/ErrorBoundary/index'
import SDHDashboard from '@/components/dashboard/sdh-dashboard';

export default function SDHDashboardWrapper() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <SDHDashboard />
    </ErrorBoundary>
  );
}