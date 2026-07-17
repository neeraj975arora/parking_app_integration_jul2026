import { USER_ROLES } from './constants';

// Navigation sections with grouped items
export const navigationSections = [
  {
    section: 'MAIN',
    items: [
      {
        id: 'dashboard',
        label: 'Dashboard',
        path: '/dashboard',
        icon: 'ChartBarIcon',
        roles: [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN],
      },
    ],
  },
  {
    section: 'ADMINISTRATION',
    items: [
      {
        id: 'admin-management',
        label: 'Admin Management',
        path: '/admin-management',
        icon: 'UsersIcon',
        roles: [USER_ROLES.SUPER_ADMIN], // Super Admin only
      },
    ],
  },
  {
    section: 'OPERATIONS',
    items: [
      {
        id: 'live-sessions',
        label: 'Live Sessions',
        path: '/live-sessions',
        icon: 'ClockIcon',
        roles: [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN],
      },
      {
        id: 'payment-collection',
        label: 'Payment Collection',
        path: '/payment-collection',
        icon: 'CreditCardIcon',
        roles: [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN],
      },
      {
        id: 'daily-closure',
        label: 'Daily Closure',
        path: '/daily-closure',
        icon: 'CalculatorIcon',
        roles: [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN],
      },
    ],
  },
  {
    section: 'ACCOUNT',
    items: [
      {
        id: 'settings',
        label: 'Settings',
        path: '/settings',
        icon: 'CogIcon',
        roles: [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN],
      },
    ],
  },
];

// Filter navigation items based on user role
export const getVisibleNavItems = (navigationSections, userRole) => {
  if (!userRole) return [];

  return navigationSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        // Super admin has access to everything
        if (userRole === USER_ROLES.SUPER_ADMIN) return true;
        // Check if user role is in the allowed roles
        return item.roles.includes(userRole);
      }),
    }))
    .filter((section) => section.items.length > 0); // Remove empty sections
};

// Check if a route is currently active
export const isActiveRoute = (itemPath, currentPath) => {
  if (!currentPath || !itemPath) return false;
  
  // Exact match for most routes
  if (currentPath === itemPath) return true;
  
  // Handle nested routes (e.g., /dashboard/analytics should highlight dashboard)
  if (currentPath.startsWith(itemPath) && itemPath !== '/') {
    return true;
  }
  
  return false;
};

// Get user initials for avatar
export const getUserInitials = (username) => {
  if (!username) return 'U';
  
  const names = username.split(' ');
  if (names.length >= 2) {
    return `${names[0][0]}${names[1][0]}`.toUpperCase();
  }
  return username.substring(0, 2).toUpperCase();
};

// Format user role for display
export const formatUserRole = (role) => {
  switch (role) {
    case USER_ROLES.SUPER_ADMIN:
      return 'Super Admin';
    case USER_ROLES.ADMIN:
      return 'Admin';
    default:
      return 'User';
  }
};