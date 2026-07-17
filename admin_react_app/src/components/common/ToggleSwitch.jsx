import React from 'react';

const ToggleSwitch = ({ 
  id, 
  checked = false, 
  onChange, 
  disabled = false, 
  label,
  description,
  className = '' 
}) => {
  const handleToggle = () => {
    if (!disabled && onChange) {
      onChange(!checked);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      handleToggle();
    }
  };

  return (
    <div className={`flex items-center justify-between ${className}`}>
      <div className="flex-1">
        {label && (
          <label 
            htmlFor={id} 
            className="block text-sm font-medium text-gray-900 mb-1"
          >
            {label}
          </label>
        )}
        {description && (
          <p className="text-sm text-gray-600">
            {description}
          </p>
        )}
      </div>
      
      <div className="ml-4">
        <button
          type="button"
          id={id}
          role="switch"
          aria-checked={checked}
          aria-labelledby={label ? `${id}-label` : undefined}
          disabled={disabled}
          onClick={handleToggle}
          onKeyDown={handleKeyPress}
          className={`
            relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
            ${checked 
              ? 'bg-green-500' 
              : 'bg-gray-300'
            }
            ${disabled 
              ? 'opacity-50 cursor-not-allowed' 
              : 'cursor-pointer'
            }
          `}
        >
          <span
            className={`
              inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ease-in-out
              ${checked ? 'translate-x-6' : 'translate-x-1'}
            `}
          />
        </button>
      </div>
    </div>
  );
};

export default ToggleSwitch;