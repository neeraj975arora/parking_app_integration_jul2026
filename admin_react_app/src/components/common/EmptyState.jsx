import React from 'react';
import Button from './Button';

const EmptyState = ({
  icon,
  title = 'No data available',
  description,
  action,
  actionText = 'Try again',
  onAction,
  variant = 'default',
  size = 'md',
  className = '',
  ...props
}) => {
  const sizeClasses = {
    sm: {
      container: 'py-8',
      icon: 'w-8 h-8',
      title: 'text-base',
      description: 'text-sm',
    },
    md: {
      container: 'py-12',
      icon: 'w-12 h-12',
      title: 'text-lg',
      description: 'text-base',
    },
    lg: {
      container: 'py-16',
      icon: 'w-16 h-16',
      title: 'text-xl',
      description: 'text-lg',
    },
  };

  const variantClasses = {
    default: {
      icon: 'text-gray-400',
      title: 'text-gray-900',
      description: 'text-gray-500',
    },
    error: {
      icon: 'text-red-400',
      title: 'text-gray-900',
      description: 'text-gray-500',
    },
    search: {
      icon: 'text-blue-400',
      title: 'text-gray-900',
      description: 'text-gray-500',
    },
  };

  const defaultIcons = {
    default: (
      <svg className={`${sizeClasses[size].icon} ${variantClasses[variant].icon} mx-auto mb-4`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    error: (
      <svg className={`${sizeClasses[size].icon} ${variantClasses[variant].icon} mx-auto mb-4`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
    ),
    search: (
      <svg className={`${sizeClasses[size].icon} ${variantClasses[variant].icon} mx-auto mb-4`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
  };

  return (
    <div className={`text-center ${sizeClasses[size].container} ${className}`} {...props}>
      {/* Icon */}
      {icon || defaultIcons[variant]}
      
      {/* Title */}
      <h3 className={`font-medium ${sizeClasses[size].title} ${variantClasses[variant].title} mb-2`}>
        {title}
      </h3>
      
      {/* Description */}
      {description && (
        <p className={`${sizeClasses[size].description} ${variantClasses[variant].description} mb-6 max-w-sm mx-auto`}>
          {description}
        </p>
      )}
      
      {/* Action */}
      {(action || (actionText && onAction)) && (
        <div className="mt-6">
          {action || (
            <Button
              variant="primary"
              onClick={onAction}
            >
              {actionText}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

// Predefined empty state components for common scenarios
export const NoDataEmptyState = ({ onRefresh, ...props }) => (
  <EmptyState
    variant="default"
    title="No data available"
    description="There's no data to display at the moment. Try refreshing the page or check back later."
    actionText="Refresh"
    onAction={onRefresh}
    {...props}
  />
);

export const SearchEmptyState = ({ searchTerm, onClear, ...props }) => (
  <EmptyState
    variant="search"
    title="No results found"
    description={searchTerm ? `No results found for "${searchTerm}". Try adjusting your search terms.` : "No results found. Try adjusting your search terms."}
    actionText="Clear search"
    onAction={onClear}
    {...props}
  />
);

export const ErrorEmptyState = ({ onRetry, ...props }) => (
  <EmptyState
    variant="error"
    title="Something went wrong"
    description="We encountered an error while loading the data. Please try again."
    actionText="Try again"
    onAction={onRetry}
    {...props}
  />
);

export const FilterEmptyState = ({ onClearFilters, ...props }) => (
  <EmptyState
    variant="search"
    title="No matching results"
    description="No data matches your current filters. Try adjusting or clearing your filters."
    actionText="Clear filters"
    onAction={onClearFilters}
    {...props}
  />
);

export default EmptyState;