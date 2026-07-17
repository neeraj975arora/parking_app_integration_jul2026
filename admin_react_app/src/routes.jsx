import React, { lazy } from 'react';
import { USER_ROLES } from './utils/constants';

// Lazy load page components for code splitting
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const AdminManagement = lazy(() => import('./pages/AdminManagement'));
const LiveSessions = lazy(() => import('./pages/LiveSessions'));
const PaymentCollection = lazy(() => import('./pages/PaymentCollection'));
const DailyClosure = lazy(() => import('./pages/DailyClosure'));
const Settings = lazy(() => import('./pages/Settings'));

// // Development only - Test Runner
// const TestRunner = lazy(() => import('./components/testing/TestRunner'));

// Route configuration
export const routes = [
  // Public routes
  {
    path: '/login',
    component: Login,
    public: true,
    title: 'Login',
  },
  
  // Protected routes (require authentication)
  {
    path: '/dashboard',
    component: Dashboard,
    protected: true,
    title: 'Dashboard',
    roles: [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN],
  },
  {
    path: '/admin-management',
    component: AdminManagement,
    protected: true,
    roleBasedRoute: true,
    title: 'Admin Management',
    roles: [USER_ROLES.SUPER_ADMIN], // Super Admin only
  },
  {
    path: '/live-sessions',
    component: LiveSessions,
    protected: true,
    title: 'Live Sessions',
    roles: [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN],
  },
  {
    path: '/payment-collection',
    component: PaymentCollection,
    protected: true,
    title: 'Payment Collection',
    roles: [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN],
  },
  {
    path: '/daily-closure',
    component: DailyClosure,
    protected: true,
    title: 'Daily Closure',
    roles: [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN],
  },
  {
    path: '/settings',
    component: Settings,
    protected: true,
    title: 'Settings',
    roles: [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN],
  },
  // // Development only - Test Runner (remove in production)
  // ...(process.env.NODE_ENV === 'development' ? [{
  //   path: '/test-runner',
  //   component: TestRunner,
  //   protected: true,
  //   title: 'Test Runner',
  //   roles: [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN],
  // }] : []),
];

// Default redirects
export const redirects = {
  // Redirect root to dashboard for authenticated users
  authenticated: '/dashboard',
  // Redirect to login for unauthenticated users
  unauthenticated: '/login',
  // Redirect after successful login
  afterLogin: '/dashboard',
};