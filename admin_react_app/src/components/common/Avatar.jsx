import React from 'react';

const Avatar = ({
  src,
  alt,
  name,
  size = 'md',
  variant = 'circular',
  fallbackBg = 'bg-gray-500',
  className = '',
  onClick,
  ...props
}) => {
  const sizeClasses = {
    xs: 'h-6 w-6 text-xs',
    sm: 'h-8 w-8 text-sm',
    md: 'h-10 w-10 text-base',
    lg: 'h-12 w-12 text-lg',
    xl: 'h-16 w-16 text-xl',
    '2xl': 'h-20 w-20 text-2xl',
  };
  
  const variantClasses = {
    circular: 'rounded-full',
    rounded: 'rounded-lg',
    square: 'rounded-none',
  };
  
  const baseClasses = `
    inline-flex items-center justify-center overflow-hidden
    ${sizeClasses[size]}
    ${variantClasses[variant]}
    ${onClick ? 'cursor-pointer hover:opacity-80 transition-opacity duration-200' : ''}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  // Generate initials from name
  const getInitials = (name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleClick = (e) => {
    if (onClick) {
      onClick(e);
    }
  };

  const handleKeyDown = (e) => {
    if (onClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onClick(e);
    }
  };

  if (src) {
    return (
      <img
        src={src}
        alt={alt || name || 'Avatar'}
        className={baseClasses}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        tabIndex={onClick ? 0 : undefined}
        role={onClick ? 'button' : undefined}
        {...props}
      />
    );
  }

  return (
    <div
      className={`${baseClasses} ${fallbackBg} text-white font-medium`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={onClick ? 0 : undefined}
      role={onClick ? 'button' : undefined}
      aria-label={alt || name || 'Avatar'}
      {...props}
    >
      {getInitials(name)}
    </div>
  );
};

export default Avatar;