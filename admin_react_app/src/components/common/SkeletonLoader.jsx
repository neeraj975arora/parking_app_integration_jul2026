import React from 'react';

const SkeletonLoader = ({
  type = 'text',
  rows = 1,
  height = 'auto',
  width = '100%',
  className = '',
  animated = true
}) => {
  const baseClasses = `bg-gray-200 rounded ${animated ? 'animate-pulse' : ''}`;
  
  const renderSkeleton = () => {
    switch (type) {
      case 'card':
        return (
          <div className={`${baseClasses} p-6 ${className}`} style={{ height, width }}>
            <div className="space-y-4">
              <div className="h-4 bg-gray-300 rounded w-3/4"></div>
              <div className="h-8 bg-gray-300 rounded w-1/2"></div>
              <div className="space-y-2">
                <div className="h-3 bg-gray-300 rounded"></div>
                <div className="h-3 bg-gray-300 rounded w-5/6"></div>
              </div>
            </div>
          </div>
        );
      
      case 'table':
        return (
          <div className={`${className}`} style={{ width }}>
            {/* Table Header */}
            <div className="grid grid-cols-4 gap-4 mb-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className={`h-4 ${baseClasses}`}></div>
              ))}
            </div>
            {/* Table Rows */}
            {[...Array(rows)].map((_, rowIndex) => (
              <div key={rowIndex} className="grid grid-cols-4 gap-4 mb-3">
                {[...Array(4)].map((_, colIndex) => (
                  <div key={colIndex} className={`h-6 ${baseClasses}`}></div>
                ))}
              </div>
            ))}
          </div>
        );
      
      case 'avatar':
        return (
          <div 
            className={`${baseClasses} rounded-full ${className}`}
            style={{ 
              height: height || '40px', 
              width: width || '40px' 
            }}
          ></div>
        );
      
      case 'button':
        return (
          <div 
            className={`${baseClasses} ${className}`}
            style={{ 
              height: height || '40px', 
              width: width || '120px' 
            }}
          ></div>
        );
      
      case 'kpi-card':
        return (
          <div className={`${baseClasses} p-6 ${className}`} style={{ height, width }}>
            <div className="space-y-3">
              <div className="h-4 bg-gray-300 rounded w-2/3"></div>
              <div className="h-8 bg-gray-300 rounded w-1/2"></div>
              <div className="h-3 bg-gray-300 rounded w-1/3"></div>
            </div>
          </div>
        );
      
      case 'chart':
        return (
          <div className={`${baseClasses} p-6 ${className}`} style={{ height: height || '300px', width }}>
            <div className="space-y-4">
              <div className="h-4 bg-gray-300 rounded w-1/3"></div>
              <div className="flex items-end space-x-2 h-48">
                {[...Array(8)].map((_, i) => (
                  <div 
                    key={i} 
                    className="bg-gray-300 rounded-t flex-1"
                    style={{ height: `${Math.random() * 80 + 20}%` }}
                  ></div>
                ))}
              </div>
            </div>
          </div>
        );
      
      case 'text':
      default:
        return (
          <div className={className} style={{ width }}>
            {[...Array(rows)].map((_, i) => (
              <div 
                key={i}
                className={`${baseClasses} mb-2`}
                style={{ 
                  height: height || '16px',
                  width: i === rows - 1 ? '75%' : '100%'
                }}
              ></div>
            ))}
          </div>
        );
    }
  };

  return renderSkeleton();
};

// Predefined skeleton components for common use cases
export const CardSkeleton = (props) => (
  <SkeletonLoader type="card" {...props} />
);

export const TableSkeleton = (props) => (
  <SkeletonLoader type="table" rows={5} {...props} />
);

export const KPICardSkeleton = (props) => (
  <SkeletonLoader type="kpi-card" {...props} />
);

export const ChartSkeleton = (props) => (
  <SkeletonLoader type="chart" {...props} />
);

export const TextSkeleton = (props) => (
  <SkeletonLoader type="text" rows={3} {...props} />
);

export default SkeletonLoader;