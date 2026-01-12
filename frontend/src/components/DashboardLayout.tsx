'use client';

import { useState, useEffect, ReactNode } from 'react';

interface NavItem {
  id: string;
  label: string;
  icon: ReactNode;
  badge?: string | number;
  badgeColor?: string;
  onClick?: () => void;
}

interface DashboardLayoutProps {
  children: ReactNode;
  navItems: NavItem[];
  activeView: string;
  onNavChange: (view: string) => void;
  userInfo: {
    name: string;
    subtitle?: string;
    avatar?: ReactNode;
  };
  onLogout: () => void;
  headerActions?: ReactNode;
  brandName?: string;
  brandColor?: 'blue' | 'red'; // blue for tipster/client, red for admin
  badgeText?: string; // e.g., "SuperAdmin"
}

export default function DashboardLayout({
  children,
  navItems,
  activeView,
  onNavChange,
  userInfo,
  onLogout,
  headerActions,
  brandName = 'Antia',
  brandColor = 'blue',
  badgeText,
}: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile screen
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close sidebar on navigation in mobile
  const handleNavClick = (itemId: string, customOnClick?: () => void) => {
    if (customOnClick) {
      customOnClick();
    } else {
      onNavChange(itemId);
    }
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  // Close sidebar when clicking outside on mobile
  const handleOverlayClick = () => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  const brandTextColor = brandColor === 'red' ? 'text-red-600' : 'text-blue-600';
  const activeBgColor = brandColor === 'red' ? 'bg-red-50' : 'bg-blue-50';
  const activeTextColor = brandColor === 'red' ? 'text-red-600' : 'text-blue-600';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-100 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              aria-label="Abrir menú"
              data-testid="mobile-menu-button"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <span className={`text-xl font-bold ${brandTextColor}`}>{brandName}</span>
          </div>
          {headerActions && (
            <div className="flex items-center gap-2">
              {headerActions}
            </div>
          )}
        </div>
      </header>

      {/* Overlay for mobile sidebar */}
      {sidebarOpen && isMobile && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={handleOverlayClick}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full bg-white border-r border-gray-100 z-50
          transition-transform duration-300 ease-in-out
          w-64
          ${isMobile ? (sidebarOpen ? 'translate-x-0' : '-translate-x-full') : 'translate-x-0'}
        `}
        data-testid="sidebar"
      >
        <div className="p-6 h-full flex flex-col">
          {/* Logo and close button */}
          <div className="flex items-center justify-between mb-2">
            <div className={`text-2xl font-bold ${brandTextColor}`}>{brandName}</div>
            {isMobile && (
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-2 -mr-2 text-gray-600 hover:bg-gray-100 rounded-lg lg:hidden"
                aria-label="Cerrar menú"
                data-testid="close-sidebar-button"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Badge (e.g., SuperAdmin) */}
          {badgeText && (
            <div className={`text-xs ${brandColor === 'red' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'} px-2 py-1 rounded inline-block mb-6 w-fit`}>
              {badgeText}
            </div>
          )}

          {/* User Info */}
          <div className={`${badgeText ? '' : 'mt-6'} mb-6 pb-6 border-b border-gray-100`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 ${brandColor === 'red' ? 'bg-red-100' : 'bg-blue-100'} rounded-full flex items-center justify-center flex-shrink-0`}>
                {userInfo.avatar || (
                  <svg className={`w-5 h-5 ${brandColor === 'red' ? 'text-red-600' : 'text-blue-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-gray-900 truncate">{userInfo.name}</div>
                {userInfo.subtitle && (
                  <div className="text-xs text-gray-400 truncate">{userInfo.subtitle}</div>
                )}
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="space-y-1 flex-1 overflow-y-auto">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id, item.onClick)}
                data-testid={`nav-${item.id}`}
                className={`
                  w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors
                  ${activeView === item.id 
                    ? `${activeBgColor} ${activeTextColor} font-medium` 
                    : 'text-gray-600 hover:bg-gray-50'
                  }
                `}
              >
                <span className="flex items-center gap-3">
                  {item.icon}
                  <span className="truncate">{item.label}</span>
                </span>
                {item.badge !== undefined && item.badge !== null && (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${item.badgeColor || 'bg-green-100 text-green-700'}`}>
                    {item.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>

          {/* Logout button */}
          <div className="pt-4 mt-4 border-t border-gray-100">
            <button
              onClick={() => { onLogout(); setSidebarOpen(false); }}
              data-testid="logout-button"
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Cerrar Sesión
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="pt-16 lg:pt-0 lg:ml-64 p-4 sm:p-6 lg:p-8">
        {/* Desktop Header Actions */}
        {headerActions && (
          <div className="hidden lg:flex fixed top-4 right-8 z-30 items-center gap-3">
            {headerActions}
          </div>
        )}

        {/* Page Content */}
        {children}
      </main>
    </div>
  );
}
