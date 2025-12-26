'use client';

import { Home, Package, MessageCircle, CreditCard, User, HelpCircle, Bell } from 'lucide-react';

export type ViewType = 'dashboard' | 'products' | 'telegram' | 'payouts' | 'profile' | 'support';

interface TipsterSidebarProps {
  activeView: ViewType;
  onViewChange: (view: ViewType) => void;
  enabledModules: {
    forecasts: boolean;
    affiliate: boolean;
  };
  userName?: string;
  userAvatar?: string;
}

export default function TipsterSidebar({
  activeView,
  onViewChange,
  enabledModules,
  userName,
  userAvatar,
}: TipsterSidebarProps) {
  const menuItems = [
    { id: 'dashboard' as ViewType, icon: Home, label: 'Dashboard', show: true },
    { id: 'products' as ViewType, icon: Package, label: 'Mis Productos', show: enabledModules.forecasts },
    { id: 'telegram' as ViewType, icon: MessageCircle, label: 'Canal Premium', show: enabledModules.forecasts },
    { id: 'payouts' as ViewType, icon: CreditCard, label: 'Liquidaciones', show: enabledModules.forecasts },
    { id: 'profile' as ViewType, icon: User, label: 'Perfil', show: true },
    { id: 'support' as ViewType, icon: HelpCircle, label: 'Soporte', show: true },
  ];

  return (
    <aside className="w-64 bg-white border-r border-gray-200 min-h-screen">
      {/* Logo */}
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-2xl font-bold text-blue-600">Antia</h1>
        <p className="text-sm text-gray-500 mt-1">Panel Tipster</p>
      </div>

      {/* User Info */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden">
            {userAvatar ? (
              <img src={userAvatar} alt={userName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-500">
                <User size={20} />
              </div>
            )}
          </div>
          <div>
            <p className="font-medium text-gray-900 text-sm">{userName || 'Tipster'}</p>
            <p className="text-xs text-gray-500">Tipster</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="p-4">
        <ul className="space-y-1">
          {menuItems.filter(item => item.show).map((item) => (
            <li key={item.id}>
              <button
                onClick={() => onViewChange(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                  activeView === item.id
                    ? 'bg-blue-50 text-blue-600 font-medium'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <item.icon size={20} />
                <span>{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
