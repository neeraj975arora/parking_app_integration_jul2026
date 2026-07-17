import React from 'react';

const StatusBadge = ({ 
  status, 
  size = 'md', 
  variant = 'default',
  showIcon = false,
  pulse = false,
  className = '',
  ...props 
}) => {
  const getStatusConfig = (status) => {
    const configs = {
      // Payment statuses
      COMPLETED: {
        bg: 'bg-green-100',
        text: 'text-green-800',
        border: 'border-green-200',
        label: 'COMPLETED',
        icon: '✓'
      },
      PENDING: {
        bg: 'bg-orange-100',
        text: 'text-orange-800',
        border: 'border-orange-200',
        label: 'PENDING',
        icon: '⏳'
      },
      FAILED: {
        bg: 'bg-red-100',
        text: 'text-red-800',
        border: 'border-red-200',
        label: 'FAILED',
        icon: '✗'
      },
      PROCESSING: {
        bg: 'bg-blue-100',
        text: 'text-blue-800',
        border: 'border-blue-200',
        label: 'PROCESSING',
        icon: '⟳'
      },
      CANCELLED: {
        bg: 'bg-gray-100',
        text: 'text-gray-800',
        border: 'border-gray-200',
        label: 'CANCELLED',
        icon: '⊘'
      },
      
      // Session statuses
      ACTIVE: {
        bg: 'bg-blue-100',
        text: 'text-blue-800',
        border: 'border-blue-200',
        label: 'ACTIVE',
        icon: '●'
      },
      INACTIVE: {
        bg: 'bg-gray-100',
        text: 'text-gray-800',
        border: 'border-gray-200',
        label: 'INACTIVE',
        icon: '○'
      },
      EXPIRED: {
        bg: 'bg-red-100',
        text: 'text-red-800',
        border: 'border-red-200',
        label: 'EXPIRED',
        icon: '⚠'
      },
      
      // Admin statuses
      SUPER_ADMIN: {
        bg: 'bg-purple-100',
        text: 'text-purple-800',
        border: 'border-purple-200',
        label: 'SUPER ADMIN',
        icon: '★'
      },
      ADMIN: {
        bg: 'bg-blue-100',
        text: 'text-blue-800',
        border: 'border-blue-200',
        label: 'ADMIN',
        icon: '◆'
      },
      USER: {
        bg: 'bg-gray-100',
        text: 'text-gray-800',
        border: 'border-gray-200',
        label: 'USER',
        icon: '●'
      },
      
      // General statuses
      SUCCESS: {
        bg: 'bg-green-100',
        text: 'text-green-800',
        border: 'border-green-200',
        label: 'SUCCESS',
        icon: '✓'
      },
      WARNING: {
        bg: 'bg-yellow-100',
        text: 'text-yellow-800',
        border: 'border-yellow-200',
        label: 'WARNING',
        icon: '⚠'
      },
      ERROR: {
        bg: 'bg-red-100',
        text: 'text-red-800',
        border: 'border-red-200',
        label: 'ERROR',
        icon: '✗'
      },
      INFO: {
        bg: 'bg-cyan-100',
        text: 'text-cyan-800',
        border: 'border-cyan-200',
        label: 'INFO',
        icon: 'ℹ'
      }
    };

    return configs[status] || {
      bg: 'bg-gray-100',
      text: 'text-gray-800',
      border: 'border-gray-200',
      label: status || 'UNKNOWN',
      icon: '?'
    };
  };

  const getSizeClasses = (size) => {
    const sizes = {
      xs: 'px-1.5 py-0.5 text-xs',
      sm: 'px-2 py-1 text-xs',
      md: 'px-2.5 py-0.5 text-sm',
      lg: 'px-3 py-1 text-sm',
      xl: 'px-4 py-1 text-base'
    };
    
    return sizes[size] || sizes.md;
  };

  const getVariantClasses = (variant) => {
    const variants = {
      default: 'rounded-full',
      rounded: 'rounded-md',
      square: 'rounded-none',
      pill: 'rounded-full px-3'
    };
    
    return variants[variant] || variants.default;
  };

  const config = getStatusConfig(status);
  const sizeClasses = getSizeClasses(size);
  const variantClasses = getVariantClasses(variant);

  return (
    <span
      className={`
        inline-flex items-center font-medium border
        ${config.bg} ${config.text} ${config.border} ${sizeClasses} ${variantClasses}
        ${pulse ? 'animate-pulse' : ''}
        ${className}
      `}
      {...props}
    >
      {showIcon && config.icon && (
        <span className="mr-1" aria-hidden="true">
          {config.icon}
        </span>
      )}
      {config.label}
    </span>
  );
};

export default StatusBadge;