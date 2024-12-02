'use client';

import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Target, Users, Heart, Building2, LineChart, ChevronRight } from 'lucide-react';

interface SDHHomepageProps {
  onNavigateToDashboard: () => void;
}

const SDHHomepage: React.FC<SDHHomepageProps> = ({ onNavigateToDashboard }) => {
  const domains = [
    {
      title: 'Economic Security & Equality',
      icon: <Building2 className="w-8 h-8 text-blue-600" />,
      metrics: '14 indicators',
      description: 'Track economic stability, employment, income inequality, and poverty metrics'
    },
    {
      title: 'Physical Environment',
      icon: <Target className="w-8 h-8 text-green-600" />,
      metrics: '8 indicators',
      description: 'Monitor air quality, road safety, and environmental conditions'
    },
    {
      title: 'Health Behavior',
      icon: <Heart className="w-8 h-8 text-red-600" />,
      metrics: '6 indicators',
      description: 'Measure tobacco use, alcohol consumption, and nutrition'
    }
  ];

  const features = [
    {
      title: 'Data Visualization',
      description: 'Interactive charts and maps for better understanding',
      icon: <LineChart className="w-6 h-6 text-purple-600" />
    },
    {
      title: 'District-Level Data',
      description: 'Detailed metrics for all 50 Bangkok districts',
      icon: <Users className="w-6 h-6 text-orange-600" />
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Hero Section */}
      <div className="bg-blue-900 text-white">
        <div className="container mx-auto px-6 py-20">
          <h1 className="text-4xl font-bold mb-4">
            Social Determinants of Health Equity
          </h1>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl">
            Track and analyze key indicators affecting health equity across Bangkok through our comprehensive dashboard
          </p>
          <Button 
            size="lg"
            onClick={onNavigateToDashboard}
            className="bg-white text-blue-900 hover:bg-blue-50"
          >
            View Dashboard
            <ChevronRight className="ml-2 w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Key Domains Section */}
      <div className="container mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold mb-12 text-center text-gray-800">
          Key Domains of Health Equity
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          {domains.map((domain, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="mb-4">{domain.icon}</div>
                <h3 className="text-xl font-semibold mb-2">{domain.title}</h3>
                <div className="text-sm text-blue-600 mb-3">{domain.metrics}</div>
                <p className="text-gray-600">{domain.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-gray-50 py-16">
        <div className="container mx-auto px-6">
          <h2 className="text-2xl font-bold mb-12 text-center text-gray-800">
            Dashboard Features
          </h2>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {features.map((feature, index) => (
              <div key={index} className="flex items-start space-x-4">
                <div className="p-3 bg-white rounded-lg shadow-sm">
                  {feature.icon}
                </div>
                <div>
                  <h3 className="font-semibold mb-1">{feature.title}</h3>
                  <p className="text-gray-600">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Call to Action */}
      <div className="container mx-auto px-6 py-16 text-center">
        <h2 className="text-3xl font-bold mb-6 text-gray-800">
          Ready to Explore the Data?
        </h2>
        <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
          Access comprehensive data and insights about social determinants of health equity in Bangkok
        </p>
        <Button 
          size="lg"
          onClick={onNavigateToDashboard}
          className="bg-blue-900 text-white hover:bg-blue-800"
        >
          Launch Dashboard
          <ChevronRight className="ml-2 w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default SDHHomepage;