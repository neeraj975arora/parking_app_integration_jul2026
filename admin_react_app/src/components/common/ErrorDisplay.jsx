import React from 'react';
import Button from './Button';

const ErrorDisplay = ({
  error,
  type = 'generic',
  onRetry,
  showRetry = true,
  className = '',
  size = 'default'
}) => {
  const getErrorConfig = () => {
    switch (type) {
      case 'network':
        return {
          icon: (
            <svg className="w-12 h-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M12 2.25a9.75 9.75 0 109.75 9.75A9.75 9.75 0 0012 2.25z" />
            </svg>
          ),
          title: 'Connection Error',
          defaultMessage: 'Unable to connect to the server. Please check your internet connection and try again.'
        };
      case 'validation':
        return {
          icon: (
            <svg className="w-12 h-12 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          ),
          title: 'Validation Error',
          defaultMessage: 'Please check your input and try again.'
        };
      case 'server':
        return {
          icon: (
            <svg className="w-12 h-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          title: 'Server Error',
          defaultMessage: 'A server error occurred. Please try again later or contact support if the problem persists.'
        };
      case 'access':
        return {
          icon: (
            <svg className="w-12 h-12 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          ),
          title: 'Access Denied',
          defaultMessage: 'You do not have permission to access this resource.'
        };
      default:
        return {
          icon: (
            <svg className="w-12 h-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          title: 'Error',
          defaultMessage: 'An unexpected error occurred. Please try again.'
        };
    }
  };

  const config = getErrorConfig();
  const errorMessage = typeof error === 'string' ? error : error?.message || config.defaultMessage;

  const sizeClasses = {
    small: 'p-4',
    default: 'p-6',
    large: 'p-8'
  };

  return (
    <div className={`text-center ${sizeClasses[size]} ${className}`}>
      <div className="mb-4 flex justify-center">
        {config.icon}
      </div>
      
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        {config.title}
      </h3>
      
      <p className="text-gray-600 mb-6 max-w-md mx-auto">
        {errorMessage}
      </p>

      {showRetry && onRetry && (
        <Button
          variant="primary"
          onClick={onRetry}
          className="inline-flex items-center"
        >
          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Try Again
        </Button>
      )}

      {process.env.NODE_ENV === 'development' && error?.stack && (
        <details className="mt-4 text-left">
          <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
            Show Error Details
          </summary>
          <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto">
            {error.stack}
          </pre>
        </details>
      )}
    </div>
  );
};

export default ErrorDisplay;