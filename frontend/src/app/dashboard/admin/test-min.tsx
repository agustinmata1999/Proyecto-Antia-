'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';

type AdminView = 'test';

export default function TestAdmin() {
  const router = useRouter();
  const [activeView, setActiveView] = useState<AdminView>('test');
  const [loading, setLoading] = useState(false);

  if (loading) {
    return <div>Loading...</div>;
  }

  const navItems = [
    { id: 'test', label: 'Test', icon: null },
  ];

  return (
    <DashboardLayout
      navItems={navItems}
      activeView={activeView}
      onNavChange={(view) => setActiveView(view as AdminView)}
      userInfo={{ name: 'Admin' }}
      onLogout={() => router.push('/login')}
      brandName="Test"
      brandColor="red"
    >
      <div>Test Content</div>
    </DashboardLayout>
  );
}
