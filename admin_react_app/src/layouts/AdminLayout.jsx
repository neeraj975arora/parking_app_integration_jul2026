import React, { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Header from '../components/layout/Header';
import Sidebar from '../components/layout/Sidebar';

const AdminLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleMenuToggle = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleSidebarCollapseChange = (collapsed) => {
    setIsSidebarCollapsed(collapsed);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Skip Navigation */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-blue-600 text-white px-4 py-2 rounded-md z-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        Skip to main content
      </a>

      {/* Header */}
      <Header
        user={user}
        onLogout={handleLogout}
        onMenuToggle={handleMenuToggle}
        showMenuButton={true}
      />

      {/* Layout Container */}
      <div className="flex h-screen pt-16"> {/* pt-16 to account for fixed header */}
        {/* Sidebar Component */}
        <Sidebar 
          isOpen={sidebarOpen} 
          onClose={() => setSidebarOpen(false)}
          onCollapseChange={handleSidebarCollapseChange}
        />

        {/* Main content */}
        <div className={`flex flex-col flex-1 overflow-hidden transition-all duration-300 ease-in-out ${
          isSidebarCollapsed ? 'md:ml-0' : 'md:ml-52'
        }`}>
          <main 
            id="main-content"
            className="flex-1 relative overflow-y-auto focus:outline-none"
            role="main"
            aria-label="Main content"
          >
            <div className="py-2">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
                <Outlet />
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;