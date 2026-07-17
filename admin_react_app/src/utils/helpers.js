// Format currency values
export const formatCurrency = (amount, currency = '₹') => {
  if (amount === null || amount === undefined) return `${currency}0`;
  return `${currency}${Number(amount).toLocaleString('en-IN')}`;
};

// Format percentage values
export const formatPercentage = (value) => {
  if (value === null || value === undefined) return '0%';
  return `${Number(value).toFixed(1)}%`;
};

// Format time duration
export const formatDuration = (hours) => {
  if (!hours) return '0h 0m';
  
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);
  
  return `${wholeHours}h ${minutes}m`;
};

// Format trend value with sign
export const formatTrend = (value) => {
  if (value === null || value === undefined || value === 0) return '0%';
  const sign = value > 0 ? '+' : '';
  return `${sign}${Number(value).toFixed(1)}%`;
};

// Check if token is expired (basic check)
export const isTokenExpired = (token) => {
  if (!token) return true;
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Date.now() / 1000;
    return payload.exp < currentTime;
  } catch (error) {
    console.error('Error checking token expiration:', error);
    return true;
  }
};

// Generate unique ID
export const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// Debounce function for search inputs
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Format date for display
export const formatDate = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

// Format time for display
export const formatTime = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Calculate trend direction and color
export const getTrendInfo = (value) => {
  if (value > 0) {
    return { direction: 'up', color: 'green' };
  } else if (value < 0) {
    return { direction: 'down', color: 'red' };
  }
  return { direction: 'neutral', color: 'gray' };
};

// Auto-detect role based on email (for login without role selection)
export const determineRoleFromEmail = (email) => {
  if (!email) return null;
  
  // Check against known demo credentials
  if (email === 'superadmin@parking.com') {
    return 'super_admin';
  } else if (email === 'john@example.com') {
    return 'admin';
  }
  
  // Fallback logic for other emails
  if (email.toLowerCase().includes('superadmin')) {
    return 'super_admin';
  } else {
    // Default to admin for admin dashboard users
    return 'admin';
  }
};

// Calculate admin management KPIs
export const calculateAdminKPIs = (adminData, totalLots = 0) => {
  if (!adminData || !Array.isArray(adminData)) {
    return {
      totalAdmins: 0,
      superAdmins: 0,
      regularAdmins: 0,
      totalLots: totalLots,
    };
  }

  const totalAdmins = adminData.length;
  const superAdmins = adminData.filter(admin => admin.role === 'super_admin').length;
  const regularAdmins = adminData.filter(admin => admin.role === 'admin').length;

  return {
    totalAdmins,
    superAdmins,
    regularAdmins,
    totalLots,
  };
};

// Format admin status for display
export const formatAdminStatus = (admin) => {
  // You can add logic here to determine if admin is active/inactive
  // For now, assume all admins are active
  return 'ACTIVE';
};

// Format assigned lots for display
export const formatAssignedLots = (assignedLots) => {
  if (!assignedLots || assignedLots.length === 0) {
    return 'No lots assigned';
  }
  
  if (Array.isArray(assignedLots)) {
    // Handle new format: array of objects with parkinglot_id
    if (typeof assignedLots[0] === 'object' && assignedLots[0].parkinglot_id) {
      return assignedLots.map(lot => `P${lot.parkinglot_id}`).join(', ');
    }
    // Handle old format: array of lot IDs
    return assignedLots.map(lot => `P${lot}`).join(', ');
  }
  
  return assignedLots.toString();
};

// Calculate payment collection KPIs
export const calculatePaymentKPIs = (paymentData) => {
  if (!paymentData || !Array.isArray(paymentData)) {
    return {
      totalPayments: 0,
      completedPayments: 0,
      pendingPayments: 0,
      failedPayments: 0,
    };
  }

  const totalPayments = paymentData.length;
  const completedPayments = paymentData.filter(p => p.status === 'COMPLETED').length;
  const pendingPayments = paymentData.filter(p => p.status === 'PENDING').length;
  const failedPayments = paymentData.filter(p => p.status === 'FAILED').length;

  return {
    totalPayments,
    completedPayments,
    pendingPayments,
    failedPayments,
  };
};

// Get status badge color for payment status
export const getPaymentStatusColor = (status) => {
  switch (status) {
    case 'COMPLETED':
      return 'bg-green-100 text-green-800';
    case 'PENDING':
      return 'bg-orange-100 text-orange-800';
    case 'FAILED':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};
// Get action button for payment status
export const getPaymentAction = (status) => {
  switch (status) {
    case 'COMPLETED':
      return { type: 'view', label: 'View', variant: 'outline', color: 'blue' };
    case 'PENDING':
      return { type: 'collect', label: 'Collect', variant: 'primary', color: 'green' };
    case 'FAILED':
      return { type: 'retry', label: 'Retry', variant: 'primary', color: 'green' };
    default:
      return { type: 'view', label: 'View', variant: 'outline', color: 'gray' };
  }
};

// Calculate daily closure KPIs
export const calculateClosureKPIs = (closureData) => {
  if (!closureData) {
    return {
      outstandingAmount: 0,
      todayCollection: 0,
      totalDue: 0,
      amountPaid: 0,
      newOutstanding: 0
    };
  }

  const outstandingAmount = closureData.outstanding_amount || 0;
  const todayCollection = closureData.today_collection || 0;
  const totalDue = outstandingAmount + todayCollection;
  const amountPaid = closureData.payment_made || 0;
  const newOutstanding = Math.max(0, totalDue - amountPaid);

  return {
    outstandingAmount,
    todayCollection,
    totalDue,
    amountPaid,
    newOutstanding
  };
};

// Format closure status for display
export const formatClosureStatus = (status) => {
  switch (status) {
    case 'completed':
      return {
        label: 'Closure Completed',
        className: 'bg-green-100 text-green-800'
      };
    case 'pending':
    default:
      return {
        label: 'Pending Closure',
        className: 'bg-yellow-100 text-yellow-800'
      };
  }
};

// Validate payment amount input
export const validatePaymentAmount = (amount) => {
  const numAmount = parseFloat(amount);
  
  if (isNaN(numAmount)) {
    return { isValid: false, error: 'Please enter a valid payment amount' };
  }
  
  if (numAmount < 0) {
    return { isValid: false, error: 'Payment amount cannot be negative' };
  }
  
  if (numAmount > 1000000) {
    return { isValid: false, error: 'Payment amount seems too large. Please verify.' };
  }
  
  return { isValid: true, value: numAmount };
};

// Validate email format
export const validateEmail = (email) => {
  if (!email) {
    return { isValid: false, error: 'Email is required' };
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'Please enter a valid email address' };
  }
  
  return { isValid: true, value: email };
};

// Validate password strength
export const validatePassword = (password) => {
  if (!password) {
    return { isValid: false, error: 'Password is required' };
  }
  
  if (password.length < 6) {
    return { isValid: false, error: 'Password must be at least 6 characters long' };
  }
  
  return { isValid: true, value: password };
};

// Save settings to localStorage
export const saveSettingsToStorage = (settings) => {
  try {
    const settingsWithTimestamp = {
      ...settings,
      lastUpdated: new Date().toISOString()
    };
    localStorage.setItem('parkingAdminSettings', JSON.stringify(settingsWithTimestamp));
    return true;
  } catch (error) {
    console.error('Failed to save settings:', error);
    return false;
  }
};

// Load settings from localStorage
export const loadSettingsFromStorage = () => {
  try {
    const savedSettings = localStorage.getItem('parkingAdminSettings');
    if (savedSettings) {
      return JSON.parse(savedSettings);
    }
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
  
  // Return default settings if none found or error occurred
  return {
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
  };
};