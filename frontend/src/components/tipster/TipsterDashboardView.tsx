'use client';

import { TrendingUp, ShoppingCart, Package, DollarSign } from 'lucide-react';

interface TipsterDashboardViewProps {
  metrics: {
    totalRevenue: number;
    totalSales: number;
    activeProducts: number;
    pendingSettlement: number;
  };
  recentSales: Array<{
    id: string;
    productName: string;
    amount: number;
    date: string;
    status: string;
  }>;
  formatPrice: (cents: number) => string;
  onViewProducts: () => void;
}

export default function TipsterDashboardView({
  metrics,
  recentSales,
  formatPrice,
  onViewProducts,
}: TipsterDashboardViewProps) {
  const stats = [
    {
      label: 'Ingresos Netos',
      value: formatPrice(metrics.totalRevenue),
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      label: 'Ventas Totales',
      value: metrics.totalSales.toString(),
      icon: ShoppingCart,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      label: 'Productos Activos',
      value: metrics.activeProducts.toString(),
      icon: Package,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      label: 'Pendiente de Cobro',
      value: formatPrice(metrics.pendingSettlement),
      icon: DollarSign,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={stat.color} size={24} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Sales */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Ventas Recientes</h2>
            <button
              onClick={onViewProducts}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Ver todas
            </button>
          </div>
        </div>
        <div className="divide-y divide-gray-100">
          {recentSales.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No hay ventas recientes
            </div>
          ) : (
            recentSales.slice(0, 5).map((sale) => (
              <div key={sale.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{sale.productName}</p>
                  <p className="text-sm text-gray-500">{new Date(sale.date).toLocaleDateString('es-ES')}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-green-600">{formatPrice(sale.amount)}</p>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    sale.status === 'PAGADA' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {sale.status === 'PAGADA' ? 'Completada' : 'Pendiente'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
