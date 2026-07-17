import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { USER_ROLES } from '../utils/constants';
import LoadingSpinner from '../components/common/LoadingSpinner';
import AccessDenied from '../components/common/AccessDenied';

const RoleBasedRoute = ({ children, roles = [] }) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking authentication
  if (isLoading) {
    return <LoadingSpinner fullScreen text="Checking permissions..." />;
  }

  // If not authenticated, redirect to login
  if (!isAuthenticated || !user) {
    return (
      <Navigate 
        to="/login" 
        state={{ from: location.pathname }} 
        replace 
      />
    );
  }

  // Super admin has access to everything
  if (user.role === USER_ROLES.SUPER_ADMIN) {
    return children;
  }

  // Check if user has required role
  const hasRequiredRole = roles.includes(user.role);
  
  if (!hasRequiredRole) {
    return <AccessDenied />;
  }

  // If user has required role, render the component
  return children;
};

export default RoleBasedRoute;