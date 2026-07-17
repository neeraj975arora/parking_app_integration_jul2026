import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { ConfirmationModal } from '../common/Modal';
import { 
  navigationSections, 
  getVisibleNavItems, 
  isActiveRoute,
  getUserInitials,
  formatUserRole 
} from '../../utils/navigation';

// Navigation Icons (using Heroicons)
const NavigationIcons = {
  ChartBarIcon: ({ className }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  UsersIcon: ({ className }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
    </svg>
  ),
  ClockIcon: ({ className }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  CreditCardIcon: ({ className }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  ),
  CalculatorIcon: ({ className }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  ),
  CogIcon: ({ className }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  LogoutIcon: ({ className }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  ),
  MenuIcon: ({ className }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  ),
};

const Sidebar = ({ onCollapseChange }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Get visible navigation items based on user role
  const visibleNavSections = getVisibleNavItems(navigationSections, user?.role);

  // Notify parent when collapsed state changes
  useEffect(() => {
    if (onCollapseChange) {
      onCollapseChange(isCollapsed);
    }
  }, [isCollapsed, onCollapseChange]);

  const handleNavigation = (path) => {
    navigate(path);
    // Close mobile sidebar after navigation
    setIsMobileOpen(false);
  };

  const handleLogoutClick = () => {
    setShowLogoutModal(true);
  };

  const handleLogoutConfirm = () => {
    logout();
    navigate('/login');
    setShowLogoutModal(false);
  };

  const renderNavigationItem = (item) => {
    const IconComponent = NavigationIcons[item.icon];
    const isActive = isActiveRoute(item.path, location.pathname);

    return (
      <button
        key={item.id}
        onClick={() => handleNavigation(item.path)}
        className={`
          group flex items-center w-full px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200
          ${isActive
            ? 'bg-blue-50 text-blue-700 border-l-3 border-blue-600'
            : 'text-white hover:bg-gray-50 hover:text-blue-600'
          }
        `}
        title={isCollapsed ? item.label : ''}
      >
        {IconComponent && (
          <IconComponent
            className={`
              flex-shrink-0 h-5 w-5 transition-colors duration-200
              ${isActive ? 'text-blue-600' : 'text-white group-hover:text-blue-500'}
              ${isCollapsed ? 'mx-auto' : 'mr-3'}
            `}
          />
        )}
        {!isCollapsed && (
          <span className="transition-opacity duration-200">
            {item.label}
          </span>
        )}
      </button>
    );
  };

  const sidebarContent = (
    <div className="flex flex-col h-full mt-20">
      {/* Logo/Brand Area */}
       <div className={`flex items-center flex-shrink-0 px-4 py-1 border-b border-gray-100 ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={`
          group flex items-center w-full px-1 py-1.5 text-sm font-medium rounded-lg transition-all duration-200
          text-white hover:bg-gray-50 hover:text-blue-600
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        `}
        aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        title={isCollapsed ? "Parking Admin" : ""}
      >
        <div className="h-7 w-7 rounded-md flex items-center justify-center group-hover:bg-blue-700 transition-colors duration-200">
          <span className="text-white font-bold text-xs">PA</span>
        </div>
        
        {/* Brand name - only visible when expanded */}
        {!isCollapsed && (
          <span className="ml-2 text-md font-semibold text-white group-hover:text-blue-800 transition-colors duration-200">
            Parking Admin
          </span>
        )}
      </button>
    </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 space-y-4 overflow-y-auto" role="navigation" aria-label="Main navigation">
        {visibleNavSections.map((section) => (
          <div key={section.section} role="group" aria-labelledby={`nav-section-${section.section}`}>
            {/* Section Header - only show when not collapsed */}
            {!isCollapsed && (
              <h3 
                id={`nav-section-${section.section}`}
                className="px-3 text-xs font-medium text-white uppercase tracking-wider mb-1"
              >
                {section.section}
              </h3>
            )}
            
            {/* Section Items */}
            <div className="space-y-0.5" role="list">
              {section.items.map(renderNavigationItem)}
            </div>
          </div>
        ))}

        {/* Logout Section */}
        <div className="border-t border-gray-100 pt-3" role="group" aria-labelledby="nav-section-account">
          {!isCollapsed && (
            <h3 
              id="nav-section-account"
              className="px-3 text-xs font-medium text-white uppercase tracking-wider mb-1"
            >
              ACCOUNT
            </h3>
          )}
          <button
            onClick={handleLogoutClick}
            className={`group flex items-center w-full px-3 py-2.5 text-sm font-medium rounded-lg text-white hover:bg-gray-50 hover:text-red-600 transition-colors duration-200 ${isCollapsed ? 'justify-center' : ''}`}
            aria-label="Sign out of your account"
            title={isCollapsed ? "Sign Out" : ""}
          >
            <NavigationIcons.LogoutIcon className={`flex-shrink-0 h-5 w-5 text-white group-hover:text-red-500 transition-colors duration-200 ${isCollapsed ? '' : 'mr-3'}`} aria-hidden="true" />
            {!isCollapsed && "Sign Out"}
          </button>
        </div>
      </nav>

      {/* User Info - only show when not collapsed */}
      {!isCollapsed && (
        <div className="flex-shrink-0 border-t border-gray-950 p-3">
          <div className="flex items-center">
            <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center">
              <span className="text-xs font-medium text-white">
                {getUserInitials(user?.username)}
              </span>
            </div>
            <div className="ml-2 flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user?.username}
              </p>
              <p className="text-xs text-white truncate">
                {formatUserRole(user?.role)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Mobile menu button */}
      <div className="md:hidden fixed top-3 left-3 z-50">
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="inline-flex items-center justify-center p-2 rounded-md text-white hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 transition-colors duration-200"
          aria-expanded="false"
        >
          <span className="sr-only">Open main menu</span>
          <NavigationIcons.MenuIcon className="block h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      {/* Desktop Sidebar */}
      <div className={`hidden md:flex md:flex-col md:fixed md:inset-y-0 transition-all duration-300 ease-in-out ${isCollapsed ? 'md:w-16' : 'md:w-60'}`}>
        <div className="flex flex-col flex-grow  border-r border-gray-950 overflow-hidden shadow-sm">
          {sidebarContent}
        </div>
      </div>

      {/* Mobile Sidebar */}
      <div className={`fixed inset-0 z-40 md:hidden transition-opacity duration-300 ${isMobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        {/* Overlay */}
        <div
          className={`fixed inset-0 bg-gray-600 transition-opacity duration-300 ${isMobileOpen ? 'bg-opacity-75' : 'bg-opacity-0'}`}
          onClick={() => setIsMobileOpen(false)}
          aria-hidden="true"
        />
        
        {/* Sidebar Panel */}
        <div className={`relative flex-1 flex flex-col max-w-xs w-full transform transition-transform duration-300 ease-in-out ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          
          
          {/* Sidebar Content */}
          <div className="h-full pt-4 pb-3">
            {sidebarContent}
          </div>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      <ConfirmationModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleLogoutConfirm}
        title="Sign Out"
        message="Do you want to Sign Out this admin account?"
        confirmText="Yes"
        cancelText="No"
        confirmVariant="danger"
      />
    </>
  );
};

export default Sidebar;