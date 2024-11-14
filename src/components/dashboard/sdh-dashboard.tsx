"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  ArrowLeft, Download, LineChart, Table, ChevronRight, PlusCircle,
  Edit2, Save, Target, Activity, TrendingUp, TrendingDown, 
  AlertTriangle, 
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { supabase } from '@/lib/supabase';

// Chart colors
const colors = [
  '#2563EB', // blue
  '#10B981', // green
  '#8B5CF6', // purple
  '#F59E0B', // amber
  '#EF4444', // red
  '#EC4899', // pink
];
const STATUS_FILTERS: StatusFilter[] = [
  {
    label: 'All Indicators',
    value: 'all',
    color: {
      bg: 'bg-gray-100',
      text: 'text-gray-800',
      ring: 'ring-gray-400',
    },
    getCount: (stats) => stats.total,
    filterFn: () => true,
  },
  {
    label: 'Target Achieved',
    value: 'target-achieved',
    color: {
      bg: 'bg-green-100',
      text: 'text-green-800',
      ring: 'ring-green-400',
    },
    getCount: (stats) => stats.targetAchieved + stats.targetAchievedButDeclining,
    filterFn: (indicator) => indicator.status === 'Target Achieved',
  },
  {
    label: 'Improving',
    value: 'improving',
    color: {
      bg: 'bg-blue-100',
      text: 'text-blue-800',
      ring: 'ring-blue-400',
    },
    getCount: (stats) => stats.improving,
    filterFn: (indicator) => indicator.status === 'Improving',
  },
  {
    label: 'Getting Worse',
    value: 'getting-worse',
    color: {
      bg: 'bg-red-100',
      text: 'text-red-800',
      ring: 'ring-red-400',
    },
    getCount: (stats) => stats.needsAttention,
    filterFn: (indicator) => indicator.status === 'Getting Worse',
  },
  {
    label: 'Little or No Change',
    value: 'little-change',
    color: {
      bg: 'bg-yellow-100',
      text: 'text-yellow-800',
      ring: 'ring-yellow-400',
    },
    getCount: (stats) => stats.littleChange,
    filterFn: (indicator) => indicator.status === 'Little or No Change',
  },
  {
    label: 'No Data',
    value: 'no-data',
    color: {
      bg: 'bg-gray-100',
      text: 'text-gray-600',
      ring: 'ring-gray-400',
    },
    getCount: (stats) => stats.noData,
    filterFn: (indicator) => indicator.status === 'No Data',
  },
  {
    label: 'Baseline Only',
    value: 'baseline-only',
    color: {
      bg: 'bg-gray-100',
      text: 'text-gray-600',
      ring: 'ring-gray-400',
    },
    getCount: (stats) => stats.baselineOnly,
    filterFn: (indicator) => indicator.status === 'Baseline Only',
  },
];

// Core interfaces
interface DisaggregationData {
  category: string;
  value: string;
  percentage: number;
}

interface TimeSeriesDataPoint {
  year: string;
  total: number;
  disaggregation: DisaggregationData[];
}

interface IndicatorDetails {
  methodology: string;
  dataSources: string[];
  targetMethod: string;
  relevantPolicies: Array<{
    title: string;
    description: string;
  }>;
}

interface Indicator {
  id: string;
  domain: string;
  subdomain: string;
  title: string;
  description: string;
  unit: string;
  indicatorType: 'direct' | 'reverse';
  target: number;
  baseline: number;
  current: number;
  currentYear: number;
  warning?: string;
  status: 'Target Achieved' | 'Improving' | 'Getting Worse' | 'Little or No Change' | 'No Data' | 'Baseline Only';
  timeSeriesData: TimeSeriesDataPoint[];
  disaggregationTypes: string[];
  details: IndicatorDetails;
}

interface EditIndicatorFormProps {
  indicator: Indicator;
  onSave: (updatedIndicator: Indicator) => void;
  onCancel: () => void;
}

interface DataChartProps {
  data: TimeSeriesDataPoint[];
  disaggregationTypes: string[];
  unit: string;
}

interface DataTableProps {
  data: TimeSeriesDataPoint[];
  disaggregationTypes: string[];
  unit: string;
}

interface IndicatorOverviewProps {
  indicator: Indicator;
}

interface IndicatorCardProps {
  indicator: Indicator;
  onClick: () => void;
}

interface ProgressSegmentProps {
  progress: number;
  status: Indicator['status'];
  indicatorType: 'direct' | 'reverse';
}

interface DatabaseIndicator {
  id: string;
  description?: string;
  details?: {
    methodology?: string;
    dataSources?: string[];
    targetMethod?: string;
    relevantPolicies?: Array<{
      title: string;
      description: string;
    }>;
  };
}

interface StatusFilter {
  label: string;
  value: string;
  color: {
    bg: string;
    text: string;
    ring: string;
  };
  getCount: (stats: SummaryStats) => number;
  filterFn: (indicator: Indicator) => boolean;
}

interface SummaryStats {
  total: number;
  targetAchieved: number;
  targetAchievedButDeclining: number;
  improving: number;
  needsAttention: number;
  littleChange: number;
  noData: number;
  baselineOnly: number;
}

const ProgressSegment: React.FC<ProgressSegmentProps> = ({ progress, status, indicatorType }) => {
  const getProgressColors = () => {
    // Handle baseline only case first
    if (status === 'Baseline Only') {
      return 'bg-gray-300';
    }
    
    // Handle other statuses
    if (status === 'Target Achieved') {
      return 'bg-green-500';
    }
    
    if (status === 'Improving') {
      if (progress < 25) return 'bg-yellow-500';
      if (progress < 50) return 'bg-yellow-400';
      if (progress < 75) return 'bg-blue-400';
      return 'bg-blue-500';
    }
    
    if (status === 'Getting Worse') {
      return 'bg-red-500';
    }

    if (status === 'No Data') {
      return 'bg-gray-400';
    }
    
    return 'bg-gray-400'; // Default for 'Little or No Change' and fallback
  };

  // For baseline only data, we want to show just the baseline marker
  if (status === 'Baseline Only') {
    return (
      <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
        <div className="absolute top-0 h-full w-full bg-gray-100" />
        <div 
          className="absolute top-0 h-full w-0.5 bg-gray-600"
          style={{ left: '0%' }}
        />
        <div
          className="absolute top-0 h-full w-0.5 bg-blue-800 opacity-50"
          style={{ right: '0%' }}
        />
      </div>
    );
  }

  // For no data, show empty bar
  if (status === 'No Data') {
    return (
      <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
        <div className="absolute top-0 h-full w-full bg-gray-100" />
      </div>
    );
  }

  // For all other cases, show progress bar
  return (
    <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
      {/* Progress bar */}
      <div 
        className={`h-full transition-all duration-500 ${getProgressColors()}`}
        style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
      />

      {/* Baseline marker */}
      <div 
        className="absolute top-0 h-full w-0.5 bg-gray-600"
        style={{ left: '0%' }}
      />

      {/* Target marker (only show if not achieved) */}
      {progress < 100 && status !== 'Target Achieved' && (
        <div 
          className="absolute top-0 h-full w-0.5 bg-blue-800"
          style={{ left: '100%', transform: 'translateX(-1px)' }}
        />
      )}

      {/* Optional: Add reference lines for important thresholds */}
      {status === 'Improving' && (
        <>
          <div 
            className="absolute top-0 h-full w-px bg-gray-400 opacity-25"
            style={{ left: '25%' }}
          />
          <div 
            className="absolute top-0 h-full w-px bg-gray-400 opacity-25"
            style={{ left: '50%' }}
          />
          <div 
            className="absolute top-0 h-full w-px bg-gray-400 opacity-25"
            style={{ left: '75%' }}
          />
        </>
      )}
    </div>
  );
};

const mergeIndicatorData = async (
  newIndicators: Indicator[],
  supabase: any
): Promise<Indicator[]> => {
  // Fetch existing indicators from database
  const { data: existingData, error } = await supabase
    .from('indicators')
    .select('*');

  if (error) {
    console.error('Error fetching existing indicators:', error);
    throw error;
  }

  // Convert existing data to a map for easy lookup
  const existingIndicators = new Map<string, DatabaseIndicator>(
    existingData.map((indicator: DatabaseIndicator) => [indicator.id, indicator])
  );

  // Merge new data with existing data
  return newIndicators.map(newIndicator => {
    const existingIndicator = existingIndicators.get(newIndicator.id);
    
    if (!existingIndicator) {
      // Ensure new indicator has all required fields
      return {
        ...newIndicator,
        description: newIndicator.description || '',
        details: {
          methodology: newIndicator.details.methodology || '',
          dataSources: newIndicator.details.dataSources || [],
          targetMethod: newIndicator.details.targetMethod || '',
          relevantPolicies: newIndicator.details.relevantPolicies || []
        }
      };
    }

    // Merge with existing data
    return {
      ...newIndicator,
      description: newIndicator.description || existingIndicator.description || '',
      details: {
        methodology: newIndicator.details.methodology || 
                    existingIndicator.details?.methodology || '',
        dataSources: newIndicator.details.dataSources.length > 0 
          ? newIndicator.details.dataSources 
          : existingIndicator.details?.dataSources || [],
        targetMethod: newIndicator.details.targetMethod || 
                     existingIndicator.details?.targetMethod || '',
        relevantPolicies: existingIndicator.details?.relevantPolicies || []
      }
    };
  });
};

// Unit System
class UnitSystem {
  static isPercentage(unit: string): boolean {
    return unit === '%' || unit.toLowerCase().includes('percent');
  }

  static formatValue(value: number, precision: number = 1): string {
    if (isNaN(value)) {
      return 'No data';
    }
    return value.toFixed(precision);
  }

  static calculateProgress(
    current: number, 
    baseline: number, 
    target: number, 
    indicatorType: 'direct' | 'reverse'
  ): number {
    if (isNaN(current) || isNaN(baseline) || isNaN(target)) {
      return 0;
    }

    // For direct indicators (higher is better)
    if (indicatorType === 'direct') {
      // If we've met or exceeded target
      if (current >= target) {
        return 100;
      }
      // Calculate regular progress
      const range = target - baseline;
      const achievement = current - baseline;
      return Math.min(100, Math.max(0, (achievement / range) * 100));
    } 
    // For reverse indicators (lower is better)
    else {
      // If we've met or exceeded target (gone lower)
      if (current <= target) {
        return 100;
      }
      // If we've gotten worse than baseline
      if (current > baseline) {
        return 0;
      }
      // Calculate progress for values between baseline and target
      const range = baseline - target;
      const improvement = baseline - current;
      return Math.min(100, Math.max(0, (improvement / range) * 100));
    }
  }

  static calculateStatus(
    current: number,
    baseline: number,
    target: number,
    indicatorType: 'direct' | 'reverse',
    numberOfYears: number
): Indicator['status'] {
    // First, check if there's only baseline data or no data
    if (numberOfYears <= 1) {
        return 'Baseline Only';
    }

    // Check for missing critical values
    if (isNaN(baseline) || isNaN(target)) {
        return 'No Data';
    }

    // For indicators with only baseline year (like ECON-04),
    // current should be same as baseline
    if (current === baseline) {
        return 'Baseline Only';
    }

    // Only proceed with other checks if we have more than baseline data
    const isTarget = indicatorType === 'direct' ? 
        current >= target : 
        current <= target;

    if (isTarget) {
        const isDecline = indicatorType === 'direct' ?
            current < baseline :
            current > baseline;

        if (isDecline) {
            return 'Getting Worse';
        }
        return 'Target Achieved';
    }

    const isImproving = indicatorType === 'direct' ? 
        current >= baseline : 
        current <= baseline;

    if (!isImproving) {
        return 'Getting Worse';
    }

    const progress = this.calculateProgress(current, baseline, target, indicatorType);
    if (progress >= 25) {
        return 'Improving';
    } else {
        return 'Little or No Change';
    }
  }
}

// Helper Functions
const formatValue = (value: number | null | undefined, unit: string): string => {
  if (value === null || value === undefined || isNaN(value)) {
    return 'No data';
  }
  return value.toFixed(1);
};

const formatCategoryName = (category: string): string => 
  category.split('_').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');


// CSV Export Function
const handleDownloadCSV = (indicator: Indicator) => {
  if (!indicator?.timeSeriesData?.length) return;

  try {
    // Get all unique disaggregation values for each type
    const disaggregationColumns = indicator.disaggregationTypes.flatMap(category =>
      Array.from(new Set(
        indicator.timeSeriesData.flatMap(point =>
          point.disaggregation
            .filter(d => d.category === category)
            .map(d => `${formatCategoryName(category)} - ${formatCategoryName(d.value)}`)
        )
      ))
    );

    // Create CSV headers
    const headers = ['Year', 'Total', ...disaggregationColumns];
    
    // Convert data to CSV format
    const csvContent = [
      headers.join(','),
      ...indicator.timeSeriesData.map(point => {
        const disaggregationValues = disaggregationColumns.map(column => {
          const [category, value] = column.split(' - ').map(s => s.toLowerCase());
          const data = point.disaggregation.find(
            d => d.category.toLowerCase() === category && 
                 d.value.toLowerCase() === value
          );
          return data ? data.percentage.toFixed(1) : '';
        });

        return [
          point.year,
          point.total.toFixed(1),
          ...disaggregationValues
        ].join(',');
      })
    ].join('\n');

    // Create and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${indicator.id}_data.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Error downloading CSV:', error);
    alert('Error downloading CSV file');
  }
};

// Status Style Helper
const getStatusStyles = (status: Indicator['status']) => {
  switch (status) {
    case 'Target Achieved':
      return {
        bg: 'bg-green-100',
        text: 'text-green-800',
        border: 'border-green-200',
        dot: 'bg-green-500'
      };
    case 'Improving':
      return {
        bg: 'bg-blue-100',
        text: 'text-blue-800',
        border: 'border-blue-200',
        dot: 'bg-blue-500'
      };
    case 'Getting Worse':
      return {
        bg: 'bg-red-100',
        text: 'text-red-800',
        border: 'border-red-200',
        dot: 'bg-red-500'
      };
    case 'No Data':
      return {
        bg: 'bg-gray-100',
        text: 'text-gray-800',
        border: 'border-gray-200',
        dot: 'bg-gray-500'
      };
      case 'Baseline Only':
        return {
          bg: 'bg-gray-100',
          text: 'text-gray-800',
          border: 'border-gray-200',
          dot: 'bg-gray-500'
        };
    default:
      return {
        bg: 'bg-yellow-100',
        text: 'text-yellow-800',
        border: 'border-yellow-200',
        dot: 'bg-yellow-500'
      };
  }
};

// File Processing Helper
const processCSVData = (data: any[]): Indicator[] => {
  const processedData = {} as Record<string, Indicator>;

  data.forEach(row => {
    const id = row['Indicator ID'];
    if (!processedData[id]) {
      // Get all unique disaggregation types for this indicator
      const disaggregationTypes = Array.from(new Set(
        data
          .filter(r => r['Indicator ID'] === id)
          .map(r => r['Disaggregation Category'])
          .filter(Boolean)
      ));

      // Get all years with valid data for this indicator
      const yearsWithData = Array.from(new Set(
        data
          .filter(r => 
            r['Indicator ID'] === id && 
            r['Total'] && 
            !isNaN(parseFloat(r['Total']))
          )
          .map(r => r['Year'])
      )).sort((a, b) => parseInt(a) - parseInt(b));

      // Count actual years with valid data
      const numberOfYears = yearsWithData.length;
      
      // Parse numeric values
      const current = row['Current'] ? parseFloat(row['Current']) : NaN;
      const baseline = row['Baseline'] ? parseFloat(row['Baseline']) : NaN;
      const target = row['Target'] ? parseFloat(row['Target']) : NaN;
      const year = row['Year'] ? parseInt(row['Year']) : NaN;

      // Process methodology and data sources
      const methodology = row['Methodology'] || '';
      const dataSources = row['DataSources'] ? 
        row['DataSources'].split(';').map((s: string) => s.trim()) : 
        [];

      // Create warning message
      let warning = '';
      if (isNaN(current)) warning = 'Missing current value';
      else if (isNaN(baseline)) warning = 'Missing baseline value';
      else if (isNaN(target)) warning = 'Missing target value';
      else if (numberOfYears <= 1) warning = 'Only baseline data available';

      // Initial status calculation
      const status = UnitSystem.calculateStatus(
        current,
        baseline,
        target,
        (row['IndicatorType']?.toLowerCase() || 'direct') as 'direct' | 'reverse',
        numberOfYears
      );

      // Create initial indicator object
      processedData[id] = {
        id,
        domain: row['Domain'],
        subdomain: row['Subdomain'],
        title: row['Indicator Title'],
        description: row['Description'] || '',
        unit: row['Unit'] || '%',
        indicatorType: (row['IndicatorType'] || 'direct').toLowerCase() as 'direct' | 'reverse',
        target,
        baseline,
        current,
        currentYear: year,
        warning,
        status,
        disaggregationTypes,
        timeSeriesData: [],
        details: {
          methodology,
          dataSources,
          targetMethod: row['TargetMethod'] || '',
          relevantPolicies: []
        }
      };
    }
    
    // Process time series data
    const timeSeriesTotal = row['Total'] ? parseFloat(row['Total']) : NaN;
    if (!isNaN(timeSeriesTotal) && row['Year']) {
      let timeSeriesPoint = processedData[id].timeSeriesData.find(
        t => t.year === row['Year']
      );

      if (!timeSeriesPoint) {
        timeSeriesPoint = {
          year: row['Year'],
          total: timeSeriesTotal,
          disaggregation: []
        };
        processedData[id].timeSeriesData.push(timeSeriesPoint);
      }

      // Process disaggregation data
      if (row['Disaggregation Category'] && 
          row['Disaggregation Value'] && 
          row['Percentage']) {
        const percentage = parseFloat(row['Percentage']);
        if (!isNaN(percentage)) {
          // Check if this disaggregation already exists
          const existingDisaggregation = timeSeriesPoint.disaggregation.find(
            d => d.category === row['Disaggregation Category'] && 
                 d.value === row['Disaggregation Value']
          );

          if (!existingDisaggregation) {
            timeSeriesPoint.disaggregation.push({
              category: row['Disaggregation Category'],
              value: row['Disaggregation Value'],
              percentage
            });
          }
        }
      }
    }
  });

  // Post-processing: Sort time series data and validate
  Object.values(processedData).forEach(indicator => {
    // Filter out invalid data points
    indicator.timeSeriesData = indicator.timeSeriesData.filter(point => 
      !isNaN(point.total) && point.total !== null
    );

    // Sort time series data by year
    indicator.timeSeriesData.sort((a, b) => 
      parseInt(a.year) - parseInt(b.year)
    );
    
    // Sort disaggregation data
    indicator.timeSeriesData.forEach(point => {
      point.disaggregation.sort((a, b) => 
        a.category.localeCompare(b.category) || 
        a.value.localeCompare(b.value)
      );
    });

    // Count actual years with valid data after processing
    const validYearsCount = indicator.timeSeriesData.length;

    // Update validation and status
    if (validYearsCount === 0) {
      indicator.warning = 'No time series data available';
      indicator.status = 'No Data';
    } else if (validYearsCount === 1) {
      indicator.warning = 'Only baseline data available';
      indicator.status = 'Baseline Only';
    }

    // Set current value to latest available if not explicitly provided
    if (isNaN(indicator.current) && indicator.timeSeriesData.length > 0) {
      const latestData = indicator.timeSeriesData[indicator.timeSeriesData.length - 1];
      indicator.current = latestData.total;
      indicator.currentYear = parseInt(latestData.year);
    }

    // Final status calculation with accurate year count
    indicator.status = UnitSystem.calculateStatus(
      indicator.current,
      indicator.baseline,
      indicator.target,
      indicator.indicatorType,
      validYearsCount
    );
  });

  return Object.values(processedData);
};

// DataChart Component
const DataChart: React.FC<DataChartProps> = ({ 
  data, 
  disaggregationTypes, 
  unit 
}) => {
  const [selectedDisaggregation, setSelectedDisaggregation] = useState(disaggregationTypes[0]);
  const [selectedValues, setSelectedValues] = useState<string[]>([]);

  // Get unique values for selected disaggregation
  const disaggregationValues = Array.from(new Set(
    data.flatMap(point => 
      point.disaggregation
        .filter(d => d.category === selectedDisaggregation)
        .map(d => d.value)
    )
  )).sort();

  // Handle checkbox changes
  const handleValueToggle = (value: string) => {
    setSelectedValues(prev => {
      if (prev.includes(value)) {
        return prev.filter(v => v !== value);
      } else {
        return [...prev, value];
      }
    });
  };

  // Transform data for selected disaggregation and values
  const chartData = data.map(point => {
    const baseData = { year: point.year, total: point.total };
    const disaggregationData = point.disaggregation
      .filter(d => 
        d.category === selectedDisaggregation && 
        (selectedValues.length === 0 || selectedValues.includes(d.value))
      )
      .reduce((acc, d) => ({
        ...acc,
        [d.value]: d.percentage
      }), {});
    
    return { ...baseData, ...disaggregationData };
  });

  // Sort data by year
  const sortedChartData = [...chartData].sort((a, b) => parseInt(a.year) - parseInt(b.year));

  return (
    <div>
      <div className="flex gap-6 mb-4">
        {/* Category selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            View by
          </label>
          <select 
            value={selectedDisaggregation}
            onChange={(e) => {
              setSelectedDisaggregation(e.target.value);
              setSelectedValues([]); // Reset selected values when category changes
            }}
            className="p-2 border rounded w-48"
          >
            {disaggregationTypes.map(type => (
              <option key={type} value={type}>
                {formatCategoryName(type)}
              </option>
            ))}
          </select>
        </div>

        {/* Value selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Select values to display
          </label>
          <div className="space-y-2 max-h-40 overflow-y-auto border rounded p-2">
            <div className="mb-2">
              <Checkbox
                checked={selectedValues.length === disaggregationValues.length}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setSelectedValues(disaggregationValues);
                  } else {
                    setSelectedValues([]);
                  }
                }}
                id="select-all"
              />
              <label htmlFor="select-all" className="ml-2 text-sm">
                Select All
              </label>
            </div>
            {disaggregationValues.map((value) => (
              <div key={value} className="flex items-center">
                <Checkbox
                  checked={selectedValues.includes(value)}
                  onCheckedChange={() => handleValueToggle(value)}
                  id={value}
                />
                <label htmlFor={value} className="ml-2 text-sm">
                  {formatCategoryName(value)}
                </label>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <div className="h-[400px]">
        <ResponsiveContainer>
          <RechartsLineChart 
            data={sortedChartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="year"
              type="category"
              allowDuplicatedCategory={false}
            />
            <YAxis 
              domain={[
                (dataMin: number) => Math.floor(dataMin * 0.9),
                (dataMax: number) => Math.ceil(dataMax * 1.1)
              ]}
              tickFormatter={(value) => `${value.toFixed(1)}`}
            />
            <Tooltip 
              formatter={(value: number, name: string) => [
                `${value.toFixed(1)} ${unit}`,
                formatCategoryName(name)
              ]}
              labelFormatter={(label) => `Year: ${label}`}
            />
            <Legend formatter={(value) => formatCategoryName(value)} />
            <Line 
              type="monotone" 
              dataKey="total" 
              stroke={colors[0]} 
              name="Total" 
              strokeWidth={2}
              dot={{ r: 4 }}
            />
            {(selectedValues.length === 0 ? disaggregationValues : selectedValues)
              .map((value, index) => (
                <Line
                  key={value}
                  type="monotone"
                  dataKey={value}
                  stroke={colors[(index + 1) % colors.length]}
                  name={formatCategoryName(value)}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              ))}
          </RechartsLineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// DataTable Component
const DataTable: React.FC<DataTableProps> = ({ 
  data, 
  disaggregationTypes,
  unit
}) => {
  const [selectedDisaggregation, setSelectedDisaggregation] = useState(disaggregationTypes[0]);

  // Sort data by year
  const sortedData = [...data].sort((a, b) => parseInt(a.year) - parseInt(b.year));

  const disaggregationValues = Array.from(new Set(
    data.flatMap(point => 
      point.disaggregation
        .filter(d => d.category === selectedDisaggregation)
        .map(d => d.value)
    )
  )).sort();

  return (
    <div>
      {disaggregationTypes.length > 0 && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            View by
          </label>
          <select 
            value={selectedDisaggregation}
            onChange={(e) => setSelectedDisaggregation(e.target.value)}
            className="p-2 border rounded w-48"
          >
            {disaggregationTypes.map(type => (
              <option key={type} value={type}>
                {formatCategoryName(type)}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left">Year</th>
              <th className="px-4 py-2 text-left">Total</th>
              {disaggregationValues.map(value => (
                <th key={value} className="px-4 py-2 text-left">
                  {formatCategoryName(value)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedData.map((point, index) => (
              <tr key={point.year} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-4 py-2">{point.year}</td>
                <td className="px-4 py-2">
                  {formatValue(point.total, unit)}
                </td>
                {disaggregationValues.map(value => {
                  const disaggregationPoint = point.disaggregation.find(
                    d => d.category === selectedDisaggregation && d.value === value
                  );
                  return (
                    <td key={value} className="px-4 py-2">
                      {disaggregationPoint ? formatValue(disaggregationPoint.percentage, unit) : '-'}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// IndicatorOverview Component
const IndicatorOverview: React.FC<IndicatorOverviewProps> = ({ indicator }) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-gray-500 mb-2">Status</div>
          <div className="flex items-center">
            <div className={`flex items-center gap-2 px-2 py-1 rounded-full text-sm font-medium ${
              isNaN(indicator.current) || isNaN(indicator.baseline) || isNaN(indicator.target)
                ? 'bg-gray-100 text-gray-800 border border-gray-200'
                : indicator.status === 'Target Achieved'
                ? 'bg-green-100 text-green-800 border border-green-200'
                : indicator.status === 'Improving'
                ? 'bg-blue-100 text-blue-800 border border-blue-200'
                : indicator.status === 'Getting Worse'
                ? 'bg-red-100 text-red-800 border border-red-200'
                : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
            }`}>
              <span className={`h-2 w-2 rounded-full ${
                isNaN(indicator.current) || isNaN(indicator.baseline) || isNaN(indicator.target)
                  ? 'bg-gray-500'
                  : indicator.status === 'Target Achieved'
                  ? 'bg-green-500'
                  : indicator.status === 'Improving'
                  ? 'bg-blue-500'
                  : indicator.status === 'Getting Worse'
                  ? 'bg-red-500'
                  : 'bg-yellow-500'
              }`} />
              {indicator.status}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-purple-50 rounded-full">
              <Activity className="w-5 h-5 text-purple-600" />
            </div>
            <div className="text-sm text-gray-600">Most Recent Data</div>
          </div>
          <div className="flex items-baseline gap-1">
            <div className="text-2xl font-semibold text-gray-900">
              {formatValue(indicator.current, indicator.unit)}
            </div>
            <div className="text-sm text-gray-500">{indicator.unit}</div>
          </div>
          <div className="text-sm text-gray-500">
            ({indicator.currentYear || 'N/A'})
          </div>
        </div>
        
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-green-50 rounded-full">
              <Target className="w-5 h-5 text-green-600" />
            </div>
            <div className="text-sm text-gray-600">Target</div>
          </div>
          <div className="flex items-baseline gap-1">
            <div className="text-2xl font-semibold text-gray-900">
              {formatValue(indicator.target, indicator.unit)}
            </div>
            <div className="text-sm text-gray-500">{indicator.unit}</div>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-blue-50 rounded-full">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-sm text-gray-600">Baseline</div>
          </div>
          <div className="flex items-baseline gap-1">
            <div className="text-2xl font-semibold text-gray-900">
              {formatValue(indicator.baseline, indicator.unit)}
            </div>
            <div className="text-sm text-gray-500">{indicator.unit}</div>
          </div>
        </div>
      </div>

      {indicator.description && (
        <div className="py-4 border-t">
          <h3 className="font-semibold mb-2">Summary</h3>
          <p className="text-gray-600">{indicator.description}</p>
        </div>
      )}

      {indicator.disaggregationTypes.length > 0 && (
        <div className="py-4 border-t">
          <h3 className="font-semibold mb-2">Available Disaggregation</h3>
          <div className="flex flex-wrap gap-2">
            {indicator.disaggregationTypes.map(type => (
              <span key={type} className="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-600">
                {formatCategoryName(type)}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const IndicatorCard: React.FC<IndicatorCardProps> = ({ indicator, onClick }) => {
  // Check if we're declining from baseline despite meeting target
  const isTargetAchieved = indicator.indicatorType === 'direct' 
    ? indicator.current >= indicator.target 
    : indicator.current <= indicator.target;
    
  const isDecliningFromBaseline = indicator.indicatorType === 'direct'
    ? indicator.current < indicator.baseline
    : indicator.current > indicator.baseline;

  const showWarning = isTargetAchieved && isDecliningFromBaseline;

  // Calculate progress for display
  const progress = UnitSystem.calculateProgress(
    indicator.current,
    indicator.baseline,
    indicator.target,
    indicator.indicatorType
  );

  const getStatusDisplay = () => {
    if (indicator.timeSeriesData.length <= 1) {
      return 'Baseline Data Only';
    }
    
    if (indicator.status === 'Target Achieved' && isDecliningFromBaseline) {
      return 'Target Achieved but Declining';
    }
    
    if (indicator.status === 'Improving') {
      if (progress < 25) {
        return 'Initial Progress';
      } else if (progress < 50) {
        return 'Making Progress';
      } else if (progress < 75) {
        return 'Significant Progress';
      } else {
        return 'Near Target';
      }
    }
    return indicator.status;
  };

  const getStatusStyles = () => {
    if (indicator.timeSeriesData.length <= 1) {
      return {
        container: 'bg-gray-100 text-gray-800 border border-gray-200',
        dot: 'bg-gray-500'
      };
    }

    switch (indicator.status) {
      case 'Target Achieved':
        return {
          container: isDecliningFromBaseline 
            ? 'bg-amber-100 text-amber-800 border border-amber-200'
            : 'bg-green-100 text-green-800 border border-green-200',
          dot: isDecliningFromBaseline ? 'bg-amber-500' : 'bg-green-500'
        };
      case 'Improving':
        return {
          container: 'bg-blue-100 text-blue-800 border border-blue-200',
          dot: 'bg-blue-500'
        };
      case 'Getting Worse':
        return {
          container: 'bg-red-100 text-red-800 border border-red-200',
          dot: 'bg-red-500'
        };
      case 'No Data':
        return {
          container: 'bg-gray-100 text-gray-800 border border-gray-200',
          dot: 'bg-gray-500'
        };
      default:
        return {
          container: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
          dot: 'bg-yellow-500'
        };
    }
  };

  const formatValue = (value: number): string => {
    if (isNaN(value)) return 'No data';
    return value.toFixed(1);
  };

  const statusStyles = getStatusStyles();

  return (
    <Card 
      className="mb-4 cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <CardContent className="p-4">
        {/* Header with ID and domain */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-gray-500 text-sm">{indicator.id}</span>
            <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full text-sm">
              {indicator.subdomain}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium gap-1 ${statusStyles.container}`}>
              <span className={`w-2 h-2 rounded-full ${statusStyles.dot}`} />
              {getStatusDisplay()}
            </div>
          </div>
        </div>

        <h3 className="text-lg font-semibold mb-4">{indicator.title}</h3>

        {/* Values grid */}
        <div className="grid grid-cols-3 gap-8 mb-4">
          {/* Target */}
          <div>
            <div className="flex items-center gap-2 text-blue-600">
              <div className="p-2 bg-blue-50 rounded-full">
                <Target className="w-4 h-4" />
              </div>
              <span className="text-sm">
                Target {indicator.indicatorType === 'direct' ? '↑' : '↓'}
              </span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-semibold">
                {formatValue(indicator.target)}
              </span>
              <span className="text-sm text-gray-500">{indicator.unit}</span>
            </div>
          </div>

          {/* Current */}
          <div>
            <div className="flex items-center gap-2 text-gray-600">
              <div className="p-2 bg-gray-50 rounded-full">
                <Activity className="w-4 h-4" />
              </div>
              <span className="text-sm">Current ({indicator.currentYear || 'N/A'})</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-semibold">
                {formatValue(indicator.current)}
              </span>
              <span className="text-sm text-gray-500">{indicator.unit}</span>
            </div>
          </div>

          {/* Baseline */}
          <div>
            <div className={`flex items-center gap-2 ${showWarning ? 'text-amber-600' : 'text-gray-600'}`}>
              <div className={`p-2 rounded-full ${showWarning ? 'bg-amber-50' : 'bg-gray-50'}`}>
                <TrendingUp className="w-4 h-4" />
              </div>
              <span className="text-sm">Baseline</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className={`text-lg font-semibold ${showWarning ? 'text-amber-600' : ''}`}>
                {formatValue(indicator.baseline)}
              </span>
              <span className="text-sm text-gray-500">{indicator.unit}</span>
            </div>
          </div>
        </div>

        {/* Progress bar section with progress number */}
                <div className="space-y-2">
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm text-gray-600">Progress</span>
            <span className="text-sm font-medium">{progress.toFixed(1)}%</span>
          </div>
          <ProgressSegment 
            progress={progress}
            status={indicator.status}
            indicatorType={indicator.indicatorType}
          />
          <div className="flex justify-between text-sm text-gray-500">
            <span>Baseline</span>
            <span>{getStatusDisplay()}</span>
            <span>Target</span>
          </div>
        </div>

        {/* Warning message */}
        {showWarning && (
          <div className="mt-4 text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded-lg flex items-center gap-2">
            <TrendingDown className="w-4 h-4" />
            <span>
              While target is achieved, performance has declined from baseline value of{' '}
              {formatValue(indicator.baseline)} {indicator.unit}
            </span>
          </div>
        )}

        {/* Disaggregation tags */}
        {indicator.disaggregationTypes.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {indicator.disaggregationTypes.map(type => (
              <span key={type} className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                {formatCategoryName(type)}
              </span>
            ))}
          </div>
        )}

        {/* Warning badge for general warnings */}
        {indicator.warning && (
          <div className="mt-4 text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
            {indicator.warning}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Edit Form Component
const EditIndicatorForm: React.FC<EditIndicatorFormProps> = ({ 
  indicator, 
  onSave, 
  onCancel 
}) => {
  const [formData, setFormData] = useState({
    ...indicator,
    details: {
      ...indicator.details,
      dataSources: [...indicator.details.dataSources],
      relevantPolicies: [...indicator.details.relevantPolicies]
    }
  });

  const handleDataSourceChange = (index: number, value: string) => {
    const newSources = [...formData.details.dataSources];
    newSources[index] = value;
    setFormData(prev => ({
      ...prev,
      details: {
        ...prev.details,
        dataSources: newSources
      }
    }));
  };

  const addDataSource = () => {
    setFormData(prev => ({
      ...prev,
      details: {
        ...prev.details,
        dataSources: [...prev.details.dataSources, '']
      }
    }));
  };

  const removeDataSource = (index: number) => {
    setFormData(prev => ({
      ...prev,
      details: {
        ...prev.details,
        dataSources: prev.details.dataSources.filter((_, i) => i !== index)
      }
    }));
  };

  const handlePolicyChange = (index: number, field: 'title' | 'description', value: string) => {
    const newPolicies = [...formData.details.relevantPolicies];
    newPolicies[index] = {
      ...newPolicies[index],
      [field]: value
    };
    setFormData(prev => ({
      ...prev,
      details: {
        ...prev.details,
        relevantPolicies: newPolicies
      }
    }));
  };

  const addPolicy = () => {
    setFormData(prev => ({
      ...prev,
      details: {
        ...prev.details,
        relevantPolicies: [
          ...prev.details.relevantPolicies,
          { title: '', description: '' }
        ]
      }
    }));
  };

  const removePolicy = (index: number) => {
    setFormData(prev => ({
      ...prev,
      details: {
        ...prev.details,
        relevantPolicies: prev.details.relevantPolicies.filter((_, i) => i !== index)
      }
    }));
  };

  const handleSubmit = async () => {
    const newStatus = UnitSystem.calculateStatus(
      formData.current,
      formData.baseline,
      formData.target,
      formData.indicatorType,
      formData.timeSeriesData.length 
    );
    
    const updatedIndicator = { ...formData, status: newStatus };
    onSave(updatedIndicator);
  };

  return (
    <div className="space-y-6">
      {/* Basic Information */}
      <div className="grid grid-cols-4 gap-4">
        <div>
          <label className="text-sm font-medium">Current Value</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={isNaN(formData.current) ? '' : formData.current}
              onChange={e => setFormData(prev => ({ 
                ...prev, 
                current: e.target.value ? parseFloat(e.target.value) : NaN 
              }))}
              className="w-full mt-1 p-2 border rounded"
            />
            <span className="text-sm text-gray-500">{formData.unit}</span>
          </div>
        </div>
        <div>
          <label className="text-sm font-medium">Target Value</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={isNaN(formData.target) ? '' : formData.target}
              onChange={e => setFormData(prev => ({ 
                ...prev, 
                target: e.target.value ? parseFloat(e.target.value) : NaN 
              }))}
              className="w-full mt-1 p-2 border rounded"
            />
            <span className="text-sm text-gray-500">{formData.unit}</span>
          </div>
        </div>
        <div>
          <label className="text-sm font-medium">Baseline Value</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={isNaN(formData.baseline) ? '' : formData.baseline}
              onChange={e => setFormData(prev => ({ 
                ...prev, 
                baseline: e.target.value ? parseFloat(e.target.value) : NaN 
              }))}
              className="w-full mt-1 p-2 border rounded"
            />
            <span className="text-sm text-gray-500">{formData.unit}</span>
          </div>
        </div>
        <div>
          <label className="text-sm font-medium">Current Year</label>
          <input
            type="number"
            value={formData.currentYear || ''}
            onChange={(e) => setFormData(prev => ({ 
              ...prev, 
              currentYear: e.target.value ? parseInt(e.target.value) : formData.currentYear 
            }))}
            className="w-full mt-1 p-2 border rounded"
          />
        </div>
      </div>

      {/* Description Field */}
      <div>
        <label className="text-sm font-medium">Description</label>
        <textarea
          value={formData.description}
          onChange={e => setFormData(prev => ({
            ...prev,
            description: e.target.value
          }))}
          className="w-full mt-1 p-2 border rounded"
          rows={3}
          placeholder="Enter indicator description"
        />
      </div>

      <div>
        <label className="text-sm font-medium">Indicator Type</label>
        <select
          value={formData.indicatorType}
          onChange={e => setFormData(prev => ({ 
            ...prev, 
            indicatorType: e.target.value as 'direct' | 'reverse'
          }))}
          className="w-full mt-1 p-2 border rounded"
        >
          <option value="direct">Direct (Higher is Better)</option>
          <option value="reverse">Reverse (Lower is Better)</option>
        </select>
      </div>

      {/* Data Methodology Section */}
      <div>
        <h3 className="font-semibold mb-4">Data Methodology</h3>
        
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Target-Setting Method</label>
            <input
              type="text"
              value={formData.details.targetMethod}
              onChange={e => setFormData(prev => ({
                ...prev,
                details: { ...prev.details, targetMethod: e.target.value }
              }))}
              className="w-full mt-1 p-2 border rounded"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Methodology</label>
            <textarea
              value={formData.details.methodology}
              onChange={e => setFormData(prev => ({
                ...prev,
                details: { ...prev.details, methodology: e.target.value }
              }))}
              className="w-full mt-1 p-2 border rounded"
              rows={3}
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium">Data Sources</label>
              <Button
                size="sm"
                variant="outline"
                onClick={addDataSource}
                className="flex items-center gap-2"
              >
                <PlusCircle className="w-4 h-4" />
                Add Source
              </Button>
            </div>
            {formData.details.dataSources.map((source, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={source}
                  onChange={e => handleDataSourceChange(index, e.target.value)}
                  className="flex-1 p-2 border rounded"
                  placeholder="Enter data source"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => removeDataSource(index)}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Relevant Policies Section */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold">Relevant Policies</h3>
          <Button
            size="sm"
            variant="outline"
            onClick={addPolicy}
            className="flex items-center gap-2"
          >
            <PlusCircle className="w-4 h-4" />
            Add Policy
          </Button>
        </div>
        
        {formData.details.relevantPolicies.map((policy, index) => (
          <div key={index} className="border p-4 rounded-lg mb-4">
            <div className="flex justify-between mb-2">
              <h4 className="font-medium">Policy {index + 1}</h4>
              <Button
                variant="outline"
                size="sm"
                onClick={() => removePolicy(index)}
              >
                Remove
              </Button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Title</label>
                <input
                  type="text"
                  value={policy.title}
                  onChange={e => handlePolicyChange(index, 'title', e.target.value)}
                  className="w-full mt-1 p-2 border rounded"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <textarea
                  value={policy.description}
                  onChange={e => handlePolicyChange(index, 'description', e.target.value)}
                  className="w-full mt-1 p-2 border rounded"
                  rows={2}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Form Actions */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={handleSubmit}>Save Changes</Button>
      </div>
    </div>
  );
};

// Main Dashboard Export
export default function SDHDashboard() {
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [selectedDomain, setSelectedDomain] = useState<string>('');
  const [selectedIndicator, setSelectedIndicator] = useState<Indicator | null>(null);
  const [view, setView] = useState<'dashboard' | 'detail'>('dashboard');
  const [detailView, setDetailView] = useState<'chart' | 'table'>('chart');
  const [fileName, setFileName] = useState<string>('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');

  // Load data on component mount
  useEffect(() => {
    const loadIndicators = async () => {
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('indicators')
          .select('*');
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          const processedData = data.map(row => ({
            ...row,
            id: row.id,
            domain: row.domain,
            subdomain: row.subdomain,
            title: row.title,
            description: row.description || '',
            unit: row.unit,
            indicatorType: row.indicator_type,
            target: row.target,
            baseline: row.baseline,
            current: row.current,
            currentYear: row.current_year,
            warning: row.warning || '',
            status: row.status,
            timeSeriesData: row.time_series_data || [],
            disaggregationTypes: row.disaggregation_types || [],
            details: {
              methodology: row?.details?.methodology || '',
              dataSources: row?.details?.dataSources || [],
              targetMethod: row?.details?.targetMethod || '',
              relevantPolicies: row?.details?.relevantPolicies || []
            }
          }));

          // Sort indicators by their ID
          const sortedData = processedData.sort((a, b) => {
            // Extract numeric portion from ID (e.g., "ECON-01" -> "01")
            const aNum = parseInt(a.id.split('-')[1]);
            const bNum = parseInt(b.id.split('-')[1]);
            return aNum - bNum;
          });

          setIndicators(sortedData);
          setSelectedDomain(sortedData[0].domain);
        }
      } catch (error) {
        console.error('Error loading indicators:', error);
      } finally {
        setIsLoading(false);
      }
    };
  
    loadIndicators();
  }, []);

  const calculateSummaryStats = (): SummaryStats => {
    const total = indicators.length;
    const targetAchieved = indicators.filter(i => 
      i.status === 'Target Achieved' && 
      (i.indicatorType === 'direct' ? i.current >= i.baseline : i.current <= i.baseline)
    ).length;
    const targetAchievedButDeclining = indicators.filter(i => 
      i.status === 'Target Achieved' && 
      (i.indicatorType === 'direct' ? i.current < i.baseline : i.current > i.baseline)
    ).length;
    const improving = indicators.filter(i => i.status === 'Improving').length;
    const needsAttention = indicators.filter(i => i.status === 'Getting Worse').length;
    const littleChange = indicators.filter(i => i.status === 'Little or No Change').length;
    const noData = indicators.filter(i => i.status === 'No Data').length;
    const baselineOnly = indicators.filter(i => i.status === 'Baseline Only').length;
  
    return {
      total,
      targetAchieved,
      targetAchievedButDeclining,
      improving,
      needsAttention,
      littleChange,
      noData,
      baselineOnly
    };
  };
    
    const stats = calculateSummaryStats();
    
  
  // File Upload Handler
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
  
    setFileName(file.name);
    setIsLoading(true);
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const csv = e.target?.result as string;
        const lines = csv.split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        
        const data = lines.slice(1)
          .filter(line => line.trim())
          .map(line => {
            const values = line.split(',');
            return headers.reduce((obj, header, index) => {
              obj[header] = values[index]?.trim() || '';
              return obj;
            }, {} as Record<string, string>);
          });
  
        // Process CSV data into indicators
        const newIndicators = processCSVData(data).sort((a, b) => {
          const aNum = parseInt(a.id.split('-')[1]);
          const bNum = parseInt(b.id.split('-')[1]);
          return aNum - bNum;
        });
        
        // Merge with existing data
        const mergedIndicators = await mergeIndicatorData(newIndicators, supabase);
  
        // Format data for Supabase
        const supabaseData = mergedIndicators.map(indicator => ({
          id: indicator.id,
          domain: indicator.domain,
          subdomain: indicator.subdomain,
          title: indicator.title,
          description: indicator.description,
          unit: indicator.unit,
          indicator_type: indicator.indicatorType,
          target: indicator.target,
          baseline: indicator.baseline,
          current: indicator.current,
          current_year: indicator.currentYear,
          warning: indicator.warning || '',
          status: indicator.status,
          time_series_data: indicator.timeSeriesData,
          disaggregation_types: indicator.disaggregationTypes,
          details: indicator.details
        }));
  
        // Insert data in smaller batches
        const BATCH_SIZE = 50;
        for (let i = 0; i < supabaseData.length; i += BATCH_SIZE) {
          const batch = supabaseData.slice(i, i + BATCH_SIZE);
          const { error } = await supabase
            .from('indicators')
            .upsert(batch, { onConflict: 'id' });
  
          if (error) {
            console.error('Supabase error:', error);
            throw error;
          }
        }
  
        setIndicators(mergedIndicators);
        if (mergedIndicators.length > 0) {
          setSelectedDomain(mergedIndicators[0].domain);
        }
      } catch (error) {
        console.error('Error processing file:', error);
        alert(`Error processing or saving file: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        setIsLoading(false);
      }
    };
  
    reader.readAsText(file);
  };

  // Save indicator handler
  const handleSaveIndicator = async (updatedIndicator: Indicator) => {
    try {
      setIsLoading(true);
  
      // Ensure we preserve the currentYear
      const indicatorWithYear = {
        ...updatedIndicator,
        currentYear: updatedIndicator.currentYear || 
                    indicators.find(i => i.id === updatedIndicator.id)?.currentYear ||
                    new Date().getFullYear()  // fallback to current year if none exists
      };
        
      // Force status to 'Baseline Only' if only one year of data
      const finalStatus = indicatorWithYear.timeSeriesData.length <= 1 
        ? 'Baseline Only' 
        : indicatorWithYear.status;
  
      // Prepare the data in the format Supabase expects
      const supabaseData = {
        id: indicatorWithYear.id,
        domain: indicatorWithYear.domain,
        subdomain: indicatorWithYear.subdomain,
        title: indicatorWithYear.title,
        description: indicatorWithYear.description,
        unit: indicatorWithYear.unit,
        indicator_type: indicatorWithYear.indicatorType,
        target: indicatorWithYear.target,
        baseline: indicatorWithYear.baseline,
        current: indicatorWithYear.current,
        current_year: indicatorWithYear.currentYear,
        warning: indicatorWithYear.warning || '',
        status: finalStatus, // Use the forced status here
        time_series_data: indicatorWithYear.timeSeriesData,
        disaggregation_types: indicatorWithYear.disaggregationTypes,
        details: {
          methodology: indicatorWithYear.details.methodology,
          dataSources: indicatorWithYear.details.dataSources,
          targetMethod: indicatorWithYear.details.targetMethod,
          relevantPolicies: indicatorWithYear.details.relevantPolicies
        }
      };
          
      // Update in Supabase
      const { error } = await supabase
        .from('indicators')
        .upsert(supabaseData)
        .eq('id', indicatorWithYear.id);
  
      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
    
      // Update local state with the correct status
      const updatedIndicatorWithStatus = {
        ...indicatorWithYear,
        status: finalStatus
      };
  
      setIndicators(prev => 
        prev.map(ind => 
          ind.id === updatedIndicatorWithStatus.id ? updatedIndicatorWithStatus : ind
        )
      );
        
      setSelectedIndicator(updatedIndicatorWithStatus);
      setIsEditing(false);
    
      alert('Changes saved successfully');
    
    } catch (error) {
      console.error('Error saving indicator:', error);
      alert('Error saving changes. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Detail view rendering
  if (view === 'detail' && selectedIndicator) {
    return (
      <div className="p-6">
        <button 
          onClick={() => setView('dashboard')}
          className="flex items-center text-blue-600 hover:text-blue-800 mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </button>

        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm text-gray-500">{selectedIndicator.id}</span>
            <span className="text-sm text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
              {selectedIndicator.subdomain}
            </span>
          </div>
          <h1 className="text-2xl font-bold">{selectedIndicator.title}</h1>
        </div>

        {isAdmin && (
          <div className="flex justify-end mb-4">
            <Button
              onClick={() => setIsEditing(!isEditing)}
              className="flex items-center gap-2"
            >
              {isEditing ? (
                <>
                  <Save className="w-4 h-4" />
                  Save Changes
                </>
              ) : (
                <>
                  <Edit2 className="w-4 h-4" />
                  Edit Indicator
                </>
              )}
            </Button>
          </div>
        )}

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Objective Overview</TabsTrigger>
            <TabsTrigger value="data">Data</TabsTrigger>
            <TabsTrigger value="methodology">Data Methodology</TabsTrigger>
            <TabsTrigger value="policies">Relevant Policies</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <Card>
              <CardContent className="pt-6">
                {isEditing ? (
                  <EditIndicatorForm
                    indicator={selectedIndicator}
                    onSave={handleSaveIndicator}
                    onCancel={() => setIsEditing(false)}
                  />
                ) : (
                  <IndicatorOverview indicator={selectedIndicator} />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="data">
            <Card>
              <CardHeader>
                <CardTitle>Data Viewer</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center mb-6">
                  <div className="flex gap-2">
                    <Button
                      variant={detailView === 'chart' ? 'default' : 'outline'}
                      onClick={() => setDetailView('chart')}
                      className="flex items-center gap-2"
                    >
                      <LineChart className="w-4 h-4" />
                      Chart View
                    </Button>
                    <Button
                      variant={detailView === 'table' ? 'default' : 'outline'}
                      onClick={() => setDetailView('table')}
                      className="flex items-center gap-2"
                    >
                      <Table className="w-4 h-4" />
                      Table View
                    </Button>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => handleDownloadCSV(selectedIndicator)}
                    className="flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download CSV
                  </Button>
                </div>

                {detailView === 'chart' ? (
                  <DataChart 
                    data={selectedIndicator.timeSeriesData}
                    disaggregationTypes={selectedIndicator.disaggregationTypes}
                    unit={selectedIndicator.unit}
                  />
                ) : (
                  <DataTable 
                    data={selectedIndicator.timeSeriesData}
                    disaggregationTypes={selectedIndicator.disaggregationTypes}
                    unit={selectedIndicator.unit}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="methodology">
            <Card>
              <CardHeader>
                <CardTitle>Data Methodology and Measurement</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-2">Target-Setting Method</h3>
                  <p className="text-gray-600">
                    {selectedIndicator.details.targetMethod || 'Not specified'}
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Data Sources</h3>
                  <ul className="list-disc pl-4 space-y-2 text-gray-600">
                    {selectedIndicator.details.dataSources.length > 0 ? (
                      selectedIndicator.details.dataSources.map((source, index) => (
                        <li key={index}>{source}</li>
                      ))
                    ) : (
                      <li className="text-gray-500">No data sources specified</li>
                    )}
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Methodology</h3>
                  <p className="text-gray-600">
                    {selectedIndicator.details.methodology || 'Not specified'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="policies">
            <Card>
              <CardHeader>
                <CardTitle>Relevant Policies and Initiatives</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {selectedIndicator.details.relevantPolicies.length > 0 ? (
                    selectedIndicator.details.relevantPolicies.map((policy, index) => (
                      <div key={index} className="border-b pb-4 last:border-0">
                        <h3 className="font-semibold mb-2">{policy.title}</h3>
                        <p className="text-gray-600">{policy.description}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500">No policies specified</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Blue header - keep this unchanged */}
      <div className="bg-[#1A56DB] text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="h-8 w-8 bg-white rounded flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#1A56DB]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold">Social Determinants of Health Equity (SDHE) Dashboard</h1>
        </div>
        <div>
          <Button
            variant="outline"
            onClick={() => setIsAdmin(!isAdmin)}
            className={`bg-white text-[#1A56DB] hover:bg-blue-50 border-none ${isAdmin ? 'bg-blue-50' : ''}`}
          >
            {isAdmin ? 'Admin Mode' : 'View Mode'}
          </Button>
        </div>
      </div>
  
      <div className="p-6 pt-8">
        {/* Admin import section - keep this unchanged */}
        {isAdmin && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Import Data</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-lg file:border-0
                    file:text-sm file:font-semibold
                    file:bg-blue-50 file:text-blue-700
                    hover:file:bg-blue-100"
                />
                {fileName && (
                  <span className="text-sm text-gray-500">
                    File loaded: {fileName}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        )}
   
        {/* Summary statistics */}      
        <div className="grid grid-cols-4 gap-6 mb-6">
          {STATUS_FILTERS.map((filter) => (
            <Card 
              key={filter.value}
              className={`cursor-pointer transition-all hover:bg-gray-50 ${
                statusFilter === filter.value ? `ring-2 ${filter.color.ring}` : ''
              }`}
              onClick={() => setStatusFilter(filter.value)}
            >
              <CardHeader>
                <CardTitle className={`text-sm ${filter.color.text}`}>
                  {filter.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${filter.color.text}`}>
                  {filter.getCount(stats)}
                </div>
                {filter.value === 'target-achieved' && stats.targetAchievedButDeclining > 0 && (
                  <div className="text-xs text-amber-600 mt-1">
                    ({stats.targetAchievedButDeclining} declining from baseline)
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
  
        {/* Filter status indicator */}
        {statusFilter !== 'all' && (
          <div className="mb-4 flex items-center gap-2">
            <div className="text-sm text-gray-600">
              Filtering by: 
              <span className="font-medium ml-1">
                {STATUS_FILTERS.find(f => f.value === statusFilter)?.label}
              </span>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setStatusFilter('all')}
            >
              Clear Filter
            </Button>
          </div>
        )}
  
        {/* Main content area */}
        <div className="flex gap-6">
          {/* Domain navigation - keep this unchanged */}
          <Card className="w-64">
            <CardHeader>
              <CardTitle>Domains & Subdomains</CardTitle>
            </CardHeader>
            <CardContent>
              {indicators.length > 0 ? (
                Array.from(new Set(indicators.map(i => i.domain))).map(domain => (
                  <button
                    key={domain}
                    className={`flex items-center justify-between w-full p-2 text-left rounded-lg hover:bg-gray-100 ${
                      selectedDomain === domain ? 'bg-blue-50 text-blue-700' : ''
                    }`}
                    onClick={() => setSelectedDomain(domain)}
                  >
                    <span className="text-sm">{domain}</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ))
              ) : (
                <p className="text-sm text-gray-500">No data loaded</p>
              )}
            </CardContent>
          </Card>
  
          {/* Indicator cards */}
          <div className="flex-1">
            {selectedDomain && indicators.length > 0 ? (
              <>
                <h2 className="text-xl font-semibold mb-4">{selectedDomain}</h2>
                {indicators
                  .filter(i => i.domain === selectedDomain)
                  .filter(i => {
                    const activeFilter = STATUS_FILTERS.find(f => f.value === statusFilter);
                    return activeFilter ? activeFilter.filterFn(i) : true;
                  })
                  .map(indicator => (
                    <IndicatorCard
                      key={indicator.id}
                      indicator={indicator}
                      onClick={() => {
                        setSelectedIndicator(indicator);
                        setView('detail');
                      }}
                    />
                  ))}
              </>
            ) : (
              <div className="text-center py-8 text-gray-500">
                {indicators.length === 0 ? 
                  'Please import data to view indicators' : 
                  'Select a domain to view indicators'
                }
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 