'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ordersApi, authApi } from '@/lib/api';

export default function ClientDashboard() {
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const ordersRes = await ordersApi.getMy();
      setOrders(ordersRes.data);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await authApi.logout();
      router.push('/');
    } catch (error) {
      console.error('Error logging out:', error);
    }
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="fixed top-0 left-0 w-64 h-full bg-white border-r border-gray-200">
        <div className="p-6">
          <div className="text-2xl font-bold text-blue-600 mb-8">Antia</div>
          
          <div className="mb-6 pb-6 border-b border-gray-200">
            <div className="text-sm text-gray-500">Mi Cuenta</div>
          </div>

          <nav className="space-y-2">
            <Link href="/dashboard/client" className="block px-4 py-2 rounded-lg bg-blue-50 text-blue-600 font-medium">
              Dashboard
            </Link>
            <Link href="/dashboard/client/orders" className="block px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-50">
              Mis Compras
            </Link>
            <Link href="/dashboard/client/profile" className="block px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-50">
              Perfil
            </Link>
            <Link href="/dashboard/client/support" className="block px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-50">
              Soporte
            </Link>
            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-2 rounded-lg text-red-600 hover:bg-red-50"
            >
              Cerrar Sesión
            </button>
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Bienvenido</h1>
          <p className="text-gray-600 mt-1">Gestiona tus compras y suscripciones</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-500 mb-2">Compras Totales</div>
            <div className="text-3xl font-bold text-gray-900">{orders.length}</div>
            <div className="text-xs text-gray-500 mt-1">Todas las compras</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-500 mb-2">Suscripciones Activas</div>
            <div className="text-3xl font-bold text-gray-900">
              {orders.filter((o: any) => o.status === 'ACCESS_GRANTED').length}
            </div>
            <div className="text-xs text-gray-500 mt-1">Con acceso</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-500 mb-2">Total Gastado</div>
            <div className="text-3xl font-bold text-gray-900">
              €{(orders.reduce((sum: number, o: any) => sum + o.amountCents, 0) / 100).toFixed(2)}
            </div>
            <div className="text-xs text-gray-500 mt-1">En total</div>
          </div>
        </div>

        {/* Orders Section */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Mis Compras</h2>
          </div>
          
          <div className="p-6">
            {orders.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 mb-4">No tienes compras aún</p>
                <Link
                  href="/"
                  className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
                >
                  Explorar Pronósticos
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((order: any) => (
                  <div key={order.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900">Orden #{order.id.substring(0, 8)}</h3>
                        <p className="text-sm text-gray-500 mt-1">
                          {new Date(order.createdAt).toLocaleDateString('es-ES')}
                        </p>
                        <div className="flex items-center gap-4 mt-2">
                          <span className="text-sm font-medium text-gray-900">
                            €{(order.amountCents / 100).toFixed(2)}
                          </span>
                          <span className={`text-xs px-2 py-1 rounded ${
                            order.status === 'ACCESS_GRANTED' ? 'bg-green-50 text-green-700' :
                            order.status === 'PAGADA' ? 'bg-blue-50 text-blue-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {order.status === 'ACCESS_GRANTED' ? 'Activo' :
                             order.status === 'PAGADA' ? 'Pagado' :
                             order.status}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
                          Ver Detalles
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
