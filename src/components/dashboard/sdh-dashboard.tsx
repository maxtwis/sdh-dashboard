"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft, Download, LineChart, Table, ChevronRight, PlusCircle,
  Edit2, Save
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
  relevantPolicies: Array<{
    title: string;
    description: string;
  }>;
  targetMethod: string;
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
  warning?: string;
  status: 'Target Achieved' | 'Improving' | 'Getting Worse' | 'Little or No Change' | 'No Data';
  currentYear: number;
  timeSeriesData: TimeSeriesDataPoint[];
  details: IndicatorDetails;
  disaggregationTypes: string[];
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

    let progress: number;
    if (indicatorType === 'direct') {
      progress = ((current - baseline) / (target - baseline)) * 100;
    } else {
      progress = ((baseline - current) / (baseline - target)) * 100;
    }

    return Math.min(Math.max(progress, 0), 100);
  }

  static calculateStatus(
    current: number,
    baseline: number,
    target: number,
    indicatorType: 'direct' | 'reverse'
  ): Indicator['status'] {
    if (isNaN(current) || isNaN(baseline) || isNaN(target)) {
      return 'No Data';
    }

    const isTarget = indicatorType === 'direct' ? 
      current >= target : 
      current <= target;

    if (isTarget) {
      return 'Target Achieved';
    }

    const isImproving = indicatorType === 'direct' ? 
      current > baseline : 
      current < baseline;

    const progress = this.calculateProgress(current, baseline, target, indicatorType);

    if (progress >= 25) {
      return 'Improving';
    } else if (!isImproving) {
      return 'Getting Worse';
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
  return UnitSystem.formatValue(value);
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
      const disaggregationTypes = Array.from(new Set(
        data
          .filter(r => r['Indicator ID'] === id)
          .map(r => r['Disaggregation Category'])
          .filter(Boolean)
      ));
      
      const current = row.Total ? parseFloat(row.Total) : NaN;
      const baseline = row.Baseline ? parseFloat(row.Baseline) : NaN;
      const target = row.Target ? parseFloat(row.Target) : NaN;
      const year = row.Year ? parseInt(row.Year) : NaN;

      processedData[id] = {
        id,
        domain: row.Domain,
        subdomain: row.Subdomain,
        title: row['Indicator Title'],
        description: row.Description || '',
        unit: row.Unit || '%',
        indicatorType: row.IndicatorType || 'direct',
        target,
        baseline,
        current,
        warning: row.Warning || '',
        status: UnitSystem.calculateStatus(current, baseline, target, row.IndicatorType || 'direct'),
        currentYear: year,
        disaggregationTypes,
        timeSeriesData: [],
        details: {
          methodology: row.Methodology || '',
          dataSources: row.DataSources ? row.DataSources.split(';') : [],
          targetMethod: row.TargetMethod || '',
          relevantPolicies: []
        }
      };
    }
    
    // Process time series data
    const timeSeriesTotal = row.Total ? parseFloat(row.Total) : NaN;
    if (!isNaN(timeSeriesTotal) && row.Year) {
      let timeSeriesPoint = processedData[id].timeSeriesData.find(
        t => t.year === row.Year
      );

      if (!timeSeriesPoint) {
        timeSeriesPoint = {
          year: row.Year,
          total: timeSeriesTotal,
          disaggregation: []
        };
        processedData[id].timeSeriesData.push(timeSeriesPoint);
      }

      if (row['Disaggregation Category'] && row['Disaggregation Value'] && row['Percentage']) {
        const percentage = parseFloat(row['Percentage']);
        if (!isNaN(percentage)) {
          timeSeriesPoint.disaggregation.push({
            category: row['Disaggregation Category'],
            value: row['Disaggregation Value'],
            percentage
          });
        }
      }
    }
  });

  return Object.values(processedData);
};

// ProgressSegment Component
const ProgressSegment: React.FC<ProgressSegmentProps> = ({ progress, status, indicatorType }) => {
  const getProgressColors = () => {
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
    
    return 'bg-gray-400';
  };

  return (
    <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
      <div 
        className={`h-full transition-all duration-500 ${getProgressColors()}`}
        style={{ width: `${progress}%` }}
      />
      {progress < 100 && (
        <div 
          className="absolute top-0 h-full w-0.5 bg-blue-800"
          style={{ left: '100%', transform: 'translateX(-1px)' }}
        />
      )}
      <div 
        className="absolute top-0 h-full w-0.5 bg-gray-400"
        style={{ left: '0%' }}
      />
    </div>
  );
};

// DataChart Component
const DataChart: React.FC<DataChartProps> = ({ data, disaggregationTypes, unit }) => {
  const [selectedDisaggregation, setSelectedDisaggregation] = useState(disaggregationTypes[0]);

  // Transform data for selected disaggregation
  const chartData = data.map(point => {
    const baseData = { year: point.year, total: point.total };
    const disaggregationData = point.disaggregation
      .filter(d => d.category === selectedDisaggregation)
      .reduce((acc, d) => ({
        ...acc,
        [d.value]: d.percentage
      }), {});
    
    return { ...baseData, ...disaggregationData };
  });

  // Sort data by year
  const sortedChartData = [...chartData].sort((a, b) => parseInt(a.year) - parseInt(b.year));

  // Get unique values for selected disaggregation
  const disaggregationValues = Array.from(new Set(
    data.flatMap(point => 
      point.disaggregation
        .filter(d => d.category === selectedDisaggregation)
        .map(d => d.value)
    )
  ));

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
            {disaggregationValues.map((value, index) => (
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
            <div className="p-2 bg-blue-50 rounded-full">
              <LineChart className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-sm text-gray-600">Most Recent Data</div>
          </div>
          <div className="flex items-baseline gap-1">
            <div className="text-2xl font-semibold">
              {formatValue(indicator.current, indicator.unit)}
            </div>
            <div className="text-sm text-gray-500">{indicator.unit}</div>
          </div>
          <div className="text-sm text-gray-500">({indicator.currentYear})</div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-gray-100 rounded-full">
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </div>
            <div className="text-sm text-gray-600">Target</div>
          </div>
          <div className="flex items-baseline gap-1">
            <div className="text-2xl font-semibold">
              {formatValue(indicator.target, indicator.unit)}
            </div>
            <div className="text-sm text-gray-500">{indicator.unit}</div>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-gray-100 rounded-full">
              <LineChart className="w-5 h-5 text-gray-600" />
            </div>
            <div className="text-sm text-gray-600">Baseline</div>
          </div>
          <div className="flex items-baseline gap-1">
            <div className="text-2xl font-semibold">
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

// IndicatorCard Component
const IndicatorCard: React.FC<IndicatorCardProps> = ({ indicator, onClick }) => {
  const progress = UnitSystem.calculateProgress(
    indicator.current,
    indicator.baseline,
    indicator.target,
    indicator.indicatorType
  );
  
  const getStatusDisplay = () => {
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

  return (
    <Card 
      className="mb-4 cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-gray-500 text-sm">{indicator.id}</span>
            <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full text-sm">
              {indicator.subdomain}
            </span>
          </div>
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium gap-1 ${
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
            <span className={`w-2 h-2 rounded-full ${
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
            {getStatusDisplay()}
          </div>
        </div>
        
        <h3 className="text-lg font-semibold mb-4">{indicator.title}</h3>
        
        <div className="grid grid-cols-3 gap-8 mb-4">
          <div>
            <div className="flex items-center gap-2 text-blue-600">
              <span className="text-sm">Target {indicator.indicatorType === 'direct' ? '↑' : '↓'}</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-semibold">
                {formatValue(indicator.target, indicator.unit)}
              </span>
              <span className="text-sm text-gray-500">{indicator.unit}</span>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 text-gray-600">
              <span className="text-sm">Current ({indicator.currentYear})</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-semibold">
                {formatValue(indicator.current, indicator.unit)}
              </span>
              <span className="text-sm text-gray-500">{indicator.unit}</span>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 text-gray-600">
              <span className="text-sm">Progress</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-semibold">
                {progress.toFixed(1)}
              </span>
              <span className="text-sm text-gray-500">%</span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
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

        {indicator.disaggregationTypes.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {indicator.disaggregationTypes.map(type => (
              <span key={type} className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                {formatCategoryName(type)}
              </span>
            ))}
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
      formData.indicatorType
    );
    const updatedIndicator = { ...formData, status: newStatus };
    onSave(updatedIndicator);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Title</label>
          <input
            type="text"
            value={formData.title}
            onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
            className="w-full mt-1 p-2 border rounded"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Description</label>
          <textarea
            value={formData.description}
            onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
            className="w-full mt-1 p-2 border rounded"
            rows={3}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
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

  // Load data on component mount
  useEffect(() => {
    const loadIndicators = async () => {
      try {
        const { data, error } = await supabase
          .from('indicators')
          .select('*');
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          const processedData = data.map(row => ({
            ...row,
            timeSeriesData: row.time_series_data || [],
            disaggregationTypes: row.disaggregation_types || [],
          }));
          setIndicators(processedData);
          setSelectedDomain(processedData[0].domain);
        }
      } catch (error) {
        console.error('Error loading indicators:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadIndicators();
  }, []);

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

        const finalIndicators = processCSVData(data);

        // Save to Supabase
        const { error } = await supabase
          .from('indicators')
          .upsert(
            finalIndicators.map(indicator => ({
              ...indicator,
              time_series_data: indicator.timeSeriesData,
              disaggregation_types: indicator.disaggregationTypes
            })),
            { onConflict: 'id' }
          );

        if (error) throw error;

        setIndicators(finalIndicators);
        if (finalIndicators.length > 0) {
          setSelectedDomain(finalIndicators[0].domain);
        }
      } catch (error) {
        console.error('Error processing file:', error);
        alert('Error processing or saving file. Please try again.');
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
      
      const { error } = await supabase
        .from('indicators')
        .upsert({
          ...updatedIndicator,
          time_series_data: updatedIndicator.timeSeriesData,
          disaggregation_types: updatedIndicator.disaggregationTypes
        });

      if (error) throw error;

      setIndicators(prev => 
        prev.map(ind => 
          ind.id === updatedIndicator.id ? updatedIndicator : ind
        )
      );
      
      setSelectedIndicator(updatedIndicator);
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving indicator:', error);
      alert('Error saving changes. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

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

  // Main dashboard view
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">
          Social Determinants of Health Equity (SDHE) Dashboard
        </h1>
        <Button
          variant="outline"
          onClick={() => setIsAdmin(!isAdmin)}
          className={isAdmin ? 'bg-blue-50 text-blue-700' : ''}
        >
          {isAdmin ? 'Admin Mode' : 'View Mode'}
        </Button>
      </div>

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
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-gray-600">Total Indicators</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{indicators.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-gray-600">Target Achieved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {indicators.filter(i => i.status === 'Target Achieved').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-gray-600">Improving</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {indicators.filter(i => i.status === 'Improving').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-gray-600">Needs Attention</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {indicators.filter(i => i.status === 'Getting Worse').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main content area */}
      <div className="flex gap-6">
        {/* Domain navigation */}
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
  );
}