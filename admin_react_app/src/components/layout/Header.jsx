import React, { useState, useRef, useEffect } from 'react';
import { getUserInitials, formatUserRole } from '../../utils/navigation';

const Header = ({ user, onLogout, onMenuToggle, showMenuButton = true }) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef(null);

  const handleLogout = () => {
    setShowUserMenu(false);
    onLogout();
  };

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <header className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-40">
      <div className="px-4 sm:px-6 lg:px-6">
        <div className="flex justify-between items-center h-14">
          {/* Left side - Menu Button and Logo */}
          <div className="flex items-center">
            {/* Mobile menu button */}
            {/* {showMenuButton && (
              <button
                type="button"
                className="md:hidden p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200"
                onClick={onMenuToggle}
                aria-label="Open sidebar"
              >
                <svg
                  className="h-5 w-5"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </button>
            )} */}

            {/* Logo/Brand */}
            <div className="flex items-center ml-3 md:ml-0">
              <h1 className="text-lg font-semibold text-gray-800">
                Parking Admin
              </h1>
            </div>
          </div>

          {/* Right side - User Info */}
          <div className="flex items-center space-x-3">
            {/* Welcome Message - Desktop only */}
            <div className="hidden md:flex flex-col items-end mr-2">
              <span className="text-sm font-medium text-gray-700">
                {user?.username}
              </span>
              <span className="text-xs text-gray-500">
                {formatUserRole(user?.role)}
              </span>
            </div>

            {/* User Avatar and Menu */}
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                className="flex items-center space-x-2 p-1.5 rounded-lg border border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                onClick={() => setShowUserMenu(!showUserMenu)}
                aria-label="User menu"
                aria-expanded={showUserMenu}
              >
                {/* User Avatar */}
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-600 to-blue-500 flex items-center justify-center shadow-inner">
                  <span className="text-xs font-semibold text-white">
                    {getUserInitials(user?.username)}
                  </span>
                </div>
                
                {/* Dropdown Arrow */}
                <svg
                  className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${showUserMenu ? 'rotate-180' : ''}`}
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {/* User Dropdown Menu */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg py-2 z-50 border border-gray-200 transform opacity-100 scale-100 transition-all duration-200">
                  {/* User Info */}
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900">
                      {user?.username}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatUserRole(user?.role)}
                    </p>
                    <p className="text-xs text-blue-600 mt-1 truncate">
                      {user?.user_email}
                    </p>
                  </div>

                  {/* Menu Items */}
                  <div className="py-1">
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-50 focus:outline-none focus:bg-gray-50 flex items-center transition-colors duration-200"
                    >
                      <svg
                        className="h-4 w-4 mr-2 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                        />
                      </svg>
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
