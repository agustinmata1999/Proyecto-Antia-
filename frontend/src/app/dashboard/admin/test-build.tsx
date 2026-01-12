'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';

export default function TestAdmin() {
  const [activeView, setActiveView] = useState('test');

  const navItems = [
    { id: 'test', label: 'Test', icon: null },
  ];

  return (
    <DashboardLayout
      navItems={navItems}
      activeView={activeView}
      onNavChange={setActiveView}
      userInfo={{ name: 'Test' }}
      onLogout={() => {}}
    >
      <div>Test Content</div>
    </DashboardLayout>
  );
}
