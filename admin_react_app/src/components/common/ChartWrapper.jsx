import React from 'react';
import LoadingSpinner from './LoadingSpinner';
import ErrorDisplay from './ErrorDisplay';
import Button from './Button';

const ChartWrapper = ({
  children,
  title,
  subtitle,
  loading = false,
  error = null,
  height = 400,
  responsive = true,
  showExport = false,
  onExport,
  className = '',
  headerActions,
  ...props
}) => {
  const handleExport = () => {
    if (onExport) {
      onExport();
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`} {...props}>
      {/* Header */}
      {(title || subtitle || showExport || headerActions) && (
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              {title && (
                <h3 className="text-lg font-medium text-gray-900">{title}</h3>
              )}
              {subtitle && (
                <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              {headerActions}
              {showExport && onExport && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExport}
                  leftIcon={
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  }
                >
                  Export
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Chart Content */}
      <div className="p-6">
        {loading ? (
          <div 
            className="flex items-center justify-center"
            style={{ height: `${height}px` }}
          >
            <LoadingSpinner size="lg" />
          </div>
        ) : error ? (
          <div 
            className="flex items-center justify-center"
            style={{ height: `${height}px` }}
          >
            <ErrorDisplay
              error={error}
              type="chart"
              onRetry={() => window.location.reload()}
            />
          </div>
        ) : (
          <div 
            className={responsive ? 'w-full' : ''}
            style={{ height: `${height}px` }}
          >
            {children}
          </div>
        )}
      </div>
    </div>
  );
};

// Specific chart wrapper components for different chart types
export const LineChartWrapper = ({ children, ...props }) => (
  <ChartWrapper {...props}>
    {children}
  </ChartWrapper>
);

export const BarChartWrapper = ({ children, ...props }) => (
  <ChartWrapper {...props}>
    {children}
  </ChartWrapper>
);

export const AreaChartWrapper = ({ children, ...props }) => (
  <ChartWrapper {...props}>
    {children}
  </ChartWrapper>
);

export const PieChartWrapper = ({ children, ...props }) => (
  <ChartWrapper {...props}>
    {children}
  </ChartWrapper>
);

export const DonutChartWrapper = ({ children, ...props }) => (
  <ChartWrapper {...props}>
    {children}
  </ChartWrapper>
);

export default ChartWrapper;