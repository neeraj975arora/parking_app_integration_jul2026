import React from 'react';

const Button = ({
  children,
  type = 'button',
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  onClick,
  className = '',
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
  'aria-expanded': ariaExpanded,
  'aria-controls': ariaControls,
  ...props
}) => {
  const baseClasses = `
    inline-flex items-center justify-center font-medium rounded-md
    transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2
    disabled:opacity-50 disabled:cursor-not-allowed
  `;

  const variants = {
    primary: `
      bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 border border-transparent
      disabled:bg-blue-300
    `,
    secondary: `
      bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500 border border-transparent
      disabled:bg-gray-300
    `,
    outline: `
      border border-gray-300 bg-white text-white hover:bg-gray-50 
      focus:ring-blue-500 disabled:bg-gray-50
    `,
    ghost: `
      bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-blue-500 border border-transparent
    `,
    danger: `
      bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 border border-transparent
      disabled:bg-red-300
    `,
    success: `
      bg-green-600 text-white hover:bg-green-700 focus:ring-green-500 border border-transparent
      disabled:bg-green-300
    `,
    warning: `
      bg-yellow-600 text-white hover:bg-yellow-700 focus:ring-yellow-500 border border-transparent
      disabled:bg-yellow-300
    `,
  };

  const sizes = {
    xs: 'px-2 py-1 text-xs',
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
    xl: 'px-8 py-4 text-xl',
  };

  const classes = `
    ${baseClasses}
    ${variants[variant]}
    ${sizes[size]}
    ${fullWidth ? 'w-full' : ''}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={classes}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      aria-expanded={ariaExpanded}
      aria-controls={ariaControls}
      aria-busy={loading}
      {...props}
    >
      {loading ? (
        <>
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <span className="sr-only">Loading...</span>
        </>
      ) : (
        <>
          {leftIcon && (
            <span className={`${children ? 'mr-2' : ''} flex-shrink-0`}>
              {leftIcon}
            </span>
          )}
          {children}
          {rightIcon && (
            <span className={`${children ? 'ml-2' : ''} flex-shrink-0`}>
              {rightIcon}
            </span>
          )}
        </>
      )}
    </button>
  );
};

export default Button;