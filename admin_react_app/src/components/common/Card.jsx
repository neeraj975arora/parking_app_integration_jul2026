import React from 'react';

const Card = ({
  children,
  variant = 'elevated',
  size = 'md',
  padding = 'md',
  header,
  footer,
  className = '',
  onClick,
  hoverable = false,
  ...props
}) => {
  const baseClasses = 'bg-white rounded-lg transition-all duration-200';
  
  const variantClasses = {
    elevated: 'shadow-md hover:shadow-lg border border-gray-100',
    outline: 'border border-gray-200 shadow-sm hover:shadow-md',
    filled: 'bg-gray-50 border border-gray-200',
    unstyled: '',
  };
  
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    full: 'w-full',
  };
  
  const paddingClasses = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
    xl: 'p-8',
  };
  
  const classes = `
    ${baseClasses}
    ${variantClasses[variant]}
    ${sizeClasses[size]}
    ${hoverable ? 'hover:shadow-lg cursor-pointer' : ''}
    ${onClick ? 'cursor-pointer' : ''}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  const contentClasses = paddingClasses[padding];

  return (
    <div
      className={classes}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(e);
        }
      } : undefined}
      {...props}
    >
      {header && (
        <div className="border-b border-gray-200 px-4 py-3 sm:px-6">
          {typeof header === 'string' ? (
            <h3 className="text-lg font-medium text-gray-900">{header}</h3>
          ) : (
            header
          )}
        </div>
      )}
      
      <div className={contentClasses}>
        {children}
      </div>
      
      {footer && (
        <div className="border-t border-gray-200 px-4 py-3 sm:px-6 bg-gray-50 rounded-b-lg">
          {footer}
        </div>
      )}
    </div>
  );
};

export default Card;