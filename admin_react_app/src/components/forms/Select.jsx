import React from 'react';

const Select = ({
  name,
  value,
  onChange,
  options = [],
  placeholder = 'Select an option',
  label,
  error,
  required = false,
  disabled = false,
  multiple = false,
  size = 'md',
  variant = 'default',
  leftIcon,
  className = '',
  description,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
  ...props
}) => {
  const selectId = `select-${name}`;
  const errorId = `${selectId}-error`;
  const descriptionId = `${selectId}-description`;
  
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
          htmlFor={selectId}
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
        {leftIcon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-gray-400">{leftIcon}</span>
          </div>
        )}
        
        <select
          id={selectId}
          name={name}
          value={value}
          onChange={onChange}
          disabled={disabled}
          required={required}
          multiple={multiple}
          aria-label={ariaLabel}
          aria-describedby={describedBy || undefined}
          aria-invalid={error ? 'true' : 'false'}
          className={`
            w-full rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 
            focus:border-blue-500 transition-colors duration-200
            ${sizeClasses[size]}
            ${variantClasses[variant]}
            ${leftIcon ? 'pl-10' : ''}
            ${disabled ? 'bg-gray-100 cursor-not-allowed opacity-50' : ''}
            ${error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}
            ${className}
          `}
          {...props}
        >
          {placeholder && !multiple && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>
        
        {/* Custom dropdown arrow for non-multiple selects */}
        {!multiple && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
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

export default Select;