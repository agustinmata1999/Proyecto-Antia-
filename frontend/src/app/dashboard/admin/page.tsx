'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi, authApi } from '@/lib/api';

interface Tipster {
  id: string;
  userId: string;
  publicName: string;
  telegramUsername?: string;
  email?: string;
  status: string;
  modules: {
    forecasts: boolean;
    affiliate: boolean;
  };
  modulesUpdatedAt?: string;
  createdAt: string;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [tipsters, setTipsters] = useState<Tipster[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    const checkAuthAndLoadData = async () => {
      const token = localStorage.getItem('access_token');
      if (!token) {
        router.push('/login');
        return;
      }
      loadTipsters();
    };
    checkAuthAndLoadData();
  }, []);

  const loadTipsters = async () => {
    try {
      const response = await adminApi.tipsters.getAll();
      setTipsters(response.data.tipsters || []);
      setError('');
    } catch (err: any) {
      console.error('Error loading tipsters:', err);
      if (err.response?.status === 403) {
        setError('No tienes permisos de SuperAdmin');
      } else {
        setError('Error al cargar tipsters');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleToggleModule = async (tipsterId: string, module: 'forecasts' | 'affiliate', currentValue: boolean) => {
    setUpdating(tipsterId);
    try {
      const updateData = module === 'forecasts' 
        ? { moduleForecasts: !currentValue }
        : { moduleAffiliate: !currentValue };
      
      await adminApi.tipsters.updateModules(tipsterId, updateData);
      
      // Update local state
      setTipsters(prev => prev.map(t => 
        t.id === tipsterId 
          ? { ...t, modules: { ...t.modules, [module]: !currentValue } }
          : t
      ));
    } catch (err: any) {
      alert('Error al actualizar módulo: ' + (err.response?.data?.message || 'Error desconocido'));
    } finally {
      setUpdating(null);
    }
  };

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch (e) {}
    localStorage.removeItem('access_token');
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">⚠️</div>
          <p className="text-gray-600">{error}</p>
          <button 
            onClick={() => router.push('/login')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Volver al Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="fixed top-0 left-0 w-64 h-full bg-white border-r border-gray-200">
        <div className="p-6">
          <div className="text-2xl font-bold text-red-600 mb-8">Antia Admin</div>
          
          <div className="mb-6 pb-6 border-b border-gray-200">
            <div className="text-sm text-gray-500">SuperAdmin</div>
            <div className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded mt-1 inline-block">
              Panel de Administración
            </div>
          </div>

          <nav className="space-y-2">
            <button className="w-full text-left px-4 py-2 rounded-lg bg-red-50 text-red-600 font-medium">
              👥 Gestión Tipsters
            </button>
            <button className="w-full text-left px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-50">
              💰 Comisiones
            </button>
            <button className="w-full text-left px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-50">
              📊 Reportes
            </button>
            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-2 rounded-lg text-red-600 hover:bg-red-50"
            >
              🚪 Cerrar Sesión
            </button>
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">👥 Gestión de Tipsters</h1>
          <p className="text-gray-600 mt-1">Controla los módulos habilitados para cada tipster</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-500 mb-2">Total Tipsters</div>
            <div className="text-3xl font-bold text-gray-900">{tipsters.length}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-500 mb-2">Con Pronósticos</div>
            <div className="text-3xl font-bold text-blue-600">
              {tipsters.filter(t => t.modules.forecasts).length}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-500 mb-2">Con Afiliación</div>
            <div className="text-3xl font-bold text-purple-600">
              {tipsters.filter(t => t.modules.affiliate).length}
            </div>
          </div>
        </div>

        {/* Tipsters Table */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Lista de Tipsters</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipster
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    🎯 Pronósticos
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    🤝 Afiliación
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {tipsters.map((tipster) => (
                  <tr key={tipster.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 font-semibold">
                            {tipster.publicName?.charAt(0).toUpperCase() || '?'}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="font-medium text-gray-900">{tipster.publicName}</div>
                          {tipster.telegramUsername && (
                            <div className="text-sm text-gray-500">@{tipster.telegramUsername}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {tipster.email || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <button
                        onClick={() => handleToggleModule(tipster.id, 'forecasts', tipster.modules.forecasts)}
                        disabled={updating === tipster.id}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                          tipster.modules.forecasts ? 'bg-blue-600' : 'bg-gray-200'
                        } ${updating === tipster.id ? 'opacity-50' : ''}`}
                      >
                        <span
                          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            tipster.modules.forecasts ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <button
                        onClick={() => handleToggleModule(tipster.id, 'affiliate', tipster.modules.affiliate)}
                        disabled={updating === tipster.id}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
                          tipster.modules.affiliate ? 'bg-purple-600' : 'bg-gray-200'
                        } ${updating === tipster.id ? 'opacity-50' : ''}`}
                      >
                        <span
                          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            tipster.modules.affiliate ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        tipster.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {tipster.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {tipsters.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              No hay tipsters registrados
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="mt-6 bg-blue-50 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-2">ℹ️ Módulos</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-blue-600">🎯 Pronósticos (AntiaPay):</span>
              <p className="text-gray-600">Permite vender productos/pronósticos. Incluye comisión del 10% (7% alto volumen).</p>
            </div>
            <div>
              <span className="font-medium text-purple-600">🤝 Afiliación:</span>
              <p className="text-gray-600">Permite ganar por referidos a casas de apuestas. Sin comisión de plataforma.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
