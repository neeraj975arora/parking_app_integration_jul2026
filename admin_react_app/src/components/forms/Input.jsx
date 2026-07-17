import React from 'react';

const Input = ({
  type = 'text',
  name,
  value,
  onChange,
  placeholder,
  label,
  error,
  required = false,
  disabled = false,
  size = 'md',
  variant = 'default',
  leftElement,
  rightElement,
  className = '',
  description,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
  ...props
}) => {
  const inputId = `input-${name}`;
  const errorId = `${inputId}-error`;
  const descriptionId = `${inputId}-description`;
  
  // Build aria-describedby attribute
  let describedBy = ariaDescribedBy || '';
  if (description) {
    describedBy = describedBy ? `${describedBy} ${descriptionId}` : descriptionId;
  }
  if (error) {
    describedBy = describedBy ? `${describedBy} ${errorId}` : errorId;
  }

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-3 py-2 text-base',
    lg: 'px-4 py-3 text-lg',
  };
  
  const variantClasses = {
    default: 'border-gray-300 bg-white',
    filled: 'border-gray-300 bg-gray-50',
    flushed: 'border-0 border-b-2 border-gray-300 bg-transparent rounded-none px-0',
    unstyled: 'border-0 bg-transparent',
  };

  return (
    <div className="w-full">
      {label && (
        <label 
          htmlFor={inputId}
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          {label}
          {required && <span className="text-red-500 ml-1" aria-label="required">*</span>}
        </label>
      )}
      
      {description && (
        <p id={descriptionId} className="text-sm text-gray-600 mb-2">
          {description}
        </p>
      )}
      
      <div className="relative">
        {leftElement && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-gray-400">{leftElement}</span>
          </div>
        )}
        
        <input
          id={inputId}
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          aria-label={ariaLabel}
          aria-describedby={describedBy || undefined}
          aria-invalid={error ? 'true' : 'false'}
          className={`
            w-full rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 
            focus:border-blue-500 transition-colors duration-200
            ${sizeClasses[size]}
            ${variantClasses[variant]}
            ${leftElement ? 'pl-10' : ''}
            ${rightElement ? 'pr-10' : ''}
            ${disabled ? 'bg-gray-100 cursor-not-allowed opacity-50' : value ? 'bg-yellow-50' : ''}
            ${error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}
            ${className}
          `}
          {...props}
        />
        
        {rightElement && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <span className="text-gray-400">{rightElement}</span>
          </div>
        )}
      </div>
      
      {error && (
        <p id={errorId} className="mt-1 text-sm text-red-600" role="alert" aria-live="polite">
          {error}
        </p>
      )}
    </div>
  );
};

export default Input;