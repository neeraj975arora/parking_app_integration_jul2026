import React, { useMemo } from 'react';
import LoadingSpinner from './LoadingSpinner';

const KPICard = React.memo(({
  title,
  value,
  subtitle,
  trend,
  loading = false,
  error = null,
  valueType = 'number',
  className = '',
}) => {
  const formatValue = (val, type) => {
    if (val === null || val === undefined) return '0';
    
    switch (type) {
      case 'currency':
        return `₹${Number(val).toLocaleString('en-IN')}`;
      case 'percentage':
        return `${Number(val).toFixed(1)}%`;
      case 'duration':
        return val; // Already formatted as "2h 45m"
      case 'number':
      default:
        return Number(val).toLocaleString('en-IN');
    }
  };

  // Memoize expensive calculations
  const formattedValue = useMemo(() => formatValue(value, valueType), [value, valueType]);
  
  const trendColor = useMemo(() => {
    if (!trend) return 'text-gray-500';
    
    if (typeof trend === 'object' && trend.color) {
      switch (trend.color) {
        case 'green':
          return 'text-green-600';
        case 'red':
          return 'text-red-600';
        default:
          return 'text-gray-500';
      }
    }
    
    // For string trends like "+12.5%"
    if (typeof trend === 'string') {
      if (trend.startsWith('+')) return 'text-green-600';
      if (trend.startsWith('-')) return 'text-red-600';
    }
    
    return 'text-gray-500';
  }, [trend]);

  const trendIcon = useMemo(() => {
    if (!trend) return null;
    
    let direction = 'neutral';
    
    if (typeof trend === 'object' && trend.direction) {
      direction = trend.direction;
    } else if (typeof trend === 'string') {
      if (trend.startsWith('+')) direction = 'up';
      if (trend.startsWith('-')) direction = 'down';
    }

    switch (direction) {
      case 'up':
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17l9.2-9.2M17 17V7H7" />
          </svg>
        );
      case 'down':
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 7l-9.2 9.2M7 7v10h10" />
          </svg>
        );
      default:
        return null;
    }
  }, [trend]);

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
        <div className="flex items-center justify-center h-24">
          <LoadingSpinner size="sm" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-red-200 p-6 ${className}`}>
        <div className="text-center">
          <div className="text-red-600 mb-2">
            <svg className="w-8 h-8 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-sm text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200 ${className}`} data-testid="kpi-card">
      {/* Title */}
      <h3 className="text-sm font-medium text-gray-500 mb-2">
        {title}
      </h3>

      {/* Value */}
      <div className="flex items-baseline justify-between">
        <p className="text-2xl font-bold text-gray-900" data-testid="kpi-value">
          {formattedValue}
        </p>
        
        {/* Trend Indicator */}
        {trend && (
          <div className={`flex items-center space-x-1 ${trendColor}`} data-testid="kpi-trend">
            {trendIcon}
            <span className="text-sm font-medium">
              {typeof trend === 'object' ? trend.value : trend}
            </span>
          </div>
        )}
      </div>

      {/* Subtitle */}
      {subtitle && (
        <p className="text-sm text-gray-600 mt-1" data-testid="kpi-subtitle">
          {subtitle}
        </p>
      )}
    </div>
  );
});

export default KPICard;