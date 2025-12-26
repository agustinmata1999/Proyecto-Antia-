'use client';

import { useEffect, useState } from 'react';
import { affiliateApi } from '@/lib/api';
import { useCurrency } from '@/contexts/CurrencyContext';

interface HouseWithLink {
  house: {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
    commissionPerReferralEur: number;
  };
  link: {
    id: string;
    redirectCode: string;
    totalClicks: number;
    totalReferrals: number;
  };
}

interface AffiliateMetrics {
  clicks: number;
  referrals: {
    pending: number;
    approved: number;
    rejected: number;
    total: number;
  };
  earnings: {
    totalCents: number;
    totalEur: number;
  };
  byHouse: Array<{
    houseId: string;
    houseName: string;
    pending: number;
    approved: number;
    rejected: number;
    totalEarningsCents: number;
  }>;
}

interface Payout {
  id: string;
  periodMonth: string;
  totalReferrals: number;
  totalAmountCents: number;
  totalAmountEur: number;
  status: string;
  paidAt?: string;
  houseBreakdown: Array<{
    houseId: string;
    houseName: string;
    referrals: number;
    amountCents: number;
  }>;
}

export default function AffiliateSection() {
  const { formatPrice, symbol } = useCurrency();
  const [houses, setHouses] = useState<HouseWithLink[]>([]);
  const [metrics, setMetrics] = useState<AffiliateMetrics | null>(null);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'houses' | 'referrals' | 'metrics' | 'payouts'>('houses');
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Referrals state (new)
  interface MyReferral {
    id: string;
    houseId: string;
    houseName: string;
    userEmail?: string;
    userTelegram?: string;
    country: string;
    eventType: string;
    status: string;
    commissionCents: number;
    clickedAt: string;
    convertedAt?: string;
  }
  const [myReferrals, setMyReferrals] = useState<MyReferral[]>([]);
  const [referralsLoading, setReferralsLoading] = useState(false);
  const [referralFilters, setReferralFilters] = useState({
    houseId: '',
    status: '',
  });

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [housesRes, metricsRes, payoutsRes] = await Promise.all([
        affiliateApi.getHousesWithLinks(),
        affiliateApi.getMetrics(),
        affiliateApi.getPayouts(),
      ]);
      
      setHouses(housesRes.data || []);
      setMetrics(metricsRes.data || null);
      setPayouts(payoutsRes.data || []);
    } catch (err: any) {
      console.error('Error loading affiliate data:', err);
      setError(err.response?.data?.message || 'Error al cargar datos de afiliación');
    } finally {
      setLoading(false);
    }
  };

  const loadMyReferrals = async () => {
    setReferralsLoading(true);
    try {
      const res = await affiliateApi.getMyReferrals(referralFilters);
      setMyReferrals(res.data.referrals || res.data || []);
    } catch (err: any) {
      console.error('Error loading referrals:', err);
    } finally {
      setReferralsLoading(false);
    }
  };

  // Load referrals when tab changes
  useEffect(() => {
    if (activeTab === 'referrals') {
      loadMyReferrals();
    }
  }, [activeTab]);

  const copyToClipboard = async (code: string) => {
    const link = `${baseUrl}/r/${code}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopiedLink(code);
      setTimeout(() => setCopiedLink(null), 2000);
    } catch (err) {
      console.error('Error copying:', err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID': return 'bg-green-100 text-green-800';
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PAID': return 'Pagado';
      case 'PENDING': return 'Pendiente';
      case 'PROCESSING': return 'En proceso';
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={loadData}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">🤝 Afiliación</h1>
        <p className="text-gray-600 mt-1">
          Comparte links de casas de apuestas y gana comisiones por cada referido válido
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-500 mb-2">Clicks Totales</div>
          <div className="text-3xl font-bold text-gray-900">{metrics?.clicks || 0}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-500 mb-2">Referidos Pendientes</div>
          <div className="text-3xl font-bold text-yellow-600">{metrics?.referrals?.pending || 0}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-500 mb-2">Referidos Validados</div>
          <div className="text-3xl font-bold text-green-600">{metrics?.referrals?.approved || 0}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-500 mb-2">Ganancias Totales</div>
          <div className="text-3xl font-bold text-blue-600">{formatPrice((metrics?.earnings?.totalCents || 0))}</div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('houses')}
              className={`px-6 py-4 text-sm font-medium border-b-2 ${
                activeTab === 'houses'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              🏠 Casas de Apuestas
            </button>
            <button
              onClick={() => setActiveTab('metrics')}
              className={`px-6 py-4 text-sm font-medium border-b-2 ${
                activeTab === 'metrics'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              📊 Métricas por Casa
            </button>
            <button
              onClick={() => setActiveTab('payouts')}
              className={`px-6 py-4 text-sm font-medium border-b-2 ${
                activeTab === 'payouts'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              💵 Liquidaciones
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'houses' && (
            <>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Tus Enlaces de Afiliado</h2>
              {houses.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No hay casas de apuestas disponibles en este momento</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {houses.map(({ house, link }) => (
                    <div
                      key={house.id}
                      className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          {house.logoUrl ? (
                            <img
                              src={house.logoUrl}
                              alt={house.name}
                              className="w-12 h-12 object-contain rounded"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center text-xl font-bold text-gray-500">
                              {house.name.charAt(0)}
                            </div>
                          )}
                          <div>
                            <h3 className="font-semibold text-gray-900">{house.name}</h3>
                            <p className="text-sm text-green-600 font-medium">
                              {formatPrice(house.commissionPerReferralEur * 100)} / referido
                            </p>
                          </div>
                        </div>
                        <div className="text-right text-xs text-gray-500">
                          <div>{link.totalClicks} clicks</div>
                          <div>{link.totalReferrals} referidos</div>
                        </div>
                      </div>

                      <div className="mt-4">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            readOnly
                            value={`${baseUrl}/r/${link.redirectCode}`}
                            className="flex-1 text-sm bg-gray-50 border rounded px-3 py-2 text-gray-600"
                          />
                          <button
                            onClick={() => copyToClipboard(link.redirectCode)}
                            className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                              copiedLink === link.redirectCode
                                ? 'bg-green-600 text-white'
                                : 'bg-blue-600 text-white hover:bg-blue-700'
                            }`}
                          >
                            {copiedLink === link.redirectCode ? '✓ Copiado' : 'Copiar'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === 'metrics' && (
            <>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Métricas Detalladas</h2>
              {!metrics?.byHouse?.length ? (
                <div className="text-center py-8 text-gray-500">
                  <p>Aún no hay datos de conversiones</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Casa</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Pendientes</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Validados</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Rechazados</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ganancias</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {metrics.byHouse.map((item) => (
                        <tr key={item.houseId}>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.houseName}</td>
                          <td className="px-4 py-3 text-center text-sm text-yellow-600">{item.pending}</td>
                          <td className="px-4 py-3 text-center text-sm text-green-600">{item.approved}</td>
                          <td className="px-4 py-3 text-center text-sm text-red-600">{item.rejected}</td>
                          <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                            {formatPrice(item.totalEarningsCents)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {activeTab === 'payouts' && (
            <>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Liquidaciones Mensuales</h2>
              <p className="text-sm text-gray-500 mb-4">
                Las liquidaciones de afiliación se pagan mensualmente y NO incluyen comisión de plataforma.
              </p>
              {payouts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No hay liquidaciones pendientes</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {payouts.map((payout) => (
                    <div key={payout.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <span className="text-lg font-bold text-gray-900">
                            {payout.periodMonth}
                          </span>
                          <span className={`ml-3 px-2 py-1 text-xs font-medium rounded ${getStatusColor(payout.status)}`}>
                            {getStatusLabel(payout.status)}
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-green-600">
                            {formatPrice(payout.totalAmountCents)}
                          </div>
                          <div className="text-sm text-gray-500">
                            {payout.totalReferrals} referidos
                          </div>
                        </div>
                      </div>

                      {/* Breakdown by house */}
                      {payout.houseBreakdown?.length > 0 && (
                        <div className="border-t pt-3">
                          <div className="text-sm text-gray-500 mb-2">Desglose por casa:</div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {payout.houseBreakdown.map((item, idx) => (
                              <div key={idx} className="bg-gray-50 rounded px-3 py-2 text-sm">
                                <div className="font-medium text-gray-700">{item.houseName}</div>
                                <div className="text-gray-500">
                                  {item.referrals} ref. · {formatPrice(item.amountCents)}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {payout.paidAt && (
                        <div className="border-t mt-3 pt-3 text-sm text-gray-500">
                          Pagado el: {new Date(payout.paidAt).toLocaleDateString('es-ES')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Info Note */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex gap-3">
          <span className="text-blue-600 text-xl">ℹ️</span>
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">¿Cómo funciona la afiliación?</p>
            <ol className="list-decimal list-inside space-y-1 text-blue-700">
              <li>Copia tu link de referido de cualquier casa de apuestas</li>
              <li>Comparte el link con tu audiencia</li>
              <li>Cuando alguien se registre y haga un depósito usando tu link, ganarás la comisión indicada</li>
              <li>Las ganancias se liquidan mensualmente</li>
            </ol>
          </div>
        </div>
      </div>
    </>
  );
}
