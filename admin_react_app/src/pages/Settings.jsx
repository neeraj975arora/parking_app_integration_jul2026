import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import Breadcrumb from '../components/common/Breadcrumb';
import ToggleSwitch from '../components/common/ToggleSwitch';
import Button from '../components/common/Button';
import Input from '../components/forms/Input';
import { 
  validateEmail, 
  validatePassword, 
  saveSettingsToStorage, 
  loadSettingsFromStorage 
} from '../utils/helpers';

const Settings = () => {
  const { user } = useAuth();
  
  // Settings state
  const [settings, setSettings] = useState({
    notifications: {
      emailNotifications: false,
      pushAlerts: false
    },
    account: {
      adminEmail: 'admin@parkingapp.com',
      password: ''
    },
    system: {
      autoBackup: true,
      maintenanceMode: false
    },
    lastUpdated: null
  });

  // Form state
  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errors, setErrors] = useState({});

  // Load settings on component mount
  useEffect(() => {
    const savedSettings = loadSettingsFromStorage();
    setSettings(savedSettings);
  }, []);

  // Handle toggle switch changes
  const handleToggleChange = (section, field, value) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
    setErrors(prev => ({ ...prev, [field]: null }));
  };

  // Handle input field changes
  const handleInputChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      account: {
        ...prev.account,
        [field]: value
      }
    }));
    setErrors(prev => ({ ...prev, [field]: null }));
  };

  // Validate form data
  const validateForm = () => {
    const newErrors = {};

    // Validate email
    const emailValidation = validateEmail(settings.account.adminEmail);
    if (!emailValidation.isValid) {
      newErrors.adminEmail = emailValidation.error;
    }

    // Validate password if provided
    if (settings.account.password) {
      const passwordValidation = validatePassword(settings.account.password);
      if (!passwordValidation.isValid) {
        newErrors.password = passwordValidation.error;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle save settings
  const handleSaveSettings = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setSaveSuccess(false);

    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Save to localStorage
      const success = saveSettingsToStorage(settings);
      
      if (success) {
        setSaveSuccess(true);
        // Clear password field after successful save
        setSettings(prev => ({
          ...prev,
          account: {
            ...prev.account,
            password: ''
          }
        }));
        
        // Hide success message after 3 seconds
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setLoading(false);
    }
  };

  // Breadcrumb items
  const breadcrumbItems = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Settings', href: '/settings', current: true }
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header Section */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Settings</h1>
            <Breadcrumb items={breadcrumbItems} />
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-gray-700">Admin User</span>
            <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-medium">AU</span>
            </div>
          </div>
        </div>

        {/* Settings Cards */}
        <div className="space-y-6">
          {/* Top Row - 2 Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Notification Settings Card */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center mb-6">
                <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Notification Settings</h3>
              </div>

              <div className="space-y-4">
                <ToggleSwitch
                  id="emailNotifications"
                  label="Email Notifications"
                  description="Receive alerts via email"
                  checked={settings.notifications.emailNotifications}
                  onChange={(value) => handleToggleChange('notifications', 'emailNotifications', value)}
                />
                
                <ToggleSwitch
                  id="pushAlerts"
                  label="Push Alerts"
                  description="Browser push notifications"
                  checked={settings.notifications.pushAlerts}
                  onChange={(value) => handleToggleChange('notifications', 'pushAlerts', value)}
                />
              </div>
            </div>

            {/* Account Settings Card */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center mb-6">
                <div className="w-8 h-8 bg-pink-500 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Account Settings</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Admin Email
                  </label>
                  <p className="text-sm text-gray-600 mb-2">Primary admin email address</p>
                  <Input
                    type="email"
                    value={settings.account.adminEmail}
                    onChange={(e) => handleInputChange('adminEmail', e.target.value)}
                    placeholder="Enter admin email"
                    error={errors.adminEmail}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Change Password
                  </label>
                  <p className="text-sm text-gray-600 mb-2">Update account password</p>
                  <Input
                    type="password"
                    value={settings.account.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    placeholder="Enter new password"
                    error={errors.password}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Row - 1 Spanning Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center mb-6">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">System Settings</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ToggleSwitch
                id="autoBackup"
                label="Auto Backup"
                description="Automatic daily data backup"
                checked={settings.system.autoBackup}
                onChange={(value) => handleToggleChange('system', 'autoBackup', value)}
              />
              
              <ToggleSwitch
                id="maintenanceMode"
                label="Maintenance Mode"
                description="Enable system maintenance"
                checked={settings.system.maintenanceMode}
                onChange={(value) => handleToggleChange('system', 'maintenanceMode', value)}
              />
            </div>
          </div>
        </div>

        {/* Action Section */}
        <div className="mt-8 text-center">
          <Button
            variant="primary"
            size="lg"
            onClick={handleSaveSettings}
            loading={loading}
            className="bg-teal-600 hover:bg-teal-700 text-white px-8 py-3 text-lg font-semibold"
          >
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path d="M7.707 7.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 9.586V6a1 1 0 10-2 0v3.586L7.707 7.293zM5 16a1 1 0 011-1h8a1 1 0 011 1v1a1 1 0 01-1 1H6a1 1 0 01-1-1v-1z" />
            </svg>
            {loading ? 'Saving...' : 'Save All Settings'}
          </Button>
          
          {/* Status Messages */}
          <div className="mt-4 min-h-[24px]">
            {saveSuccess && (
              <p className="text-sm text-green-600">
                Settings saved successfully! Last updated: Just now
              </p>
            )}
            {settings.lastUpdated && !saveSuccess && (
              <p className="text-sm text-gray-500">
                Last updated: {new Date(settings.lastUpdated).toLocaleString('en-IN')}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;