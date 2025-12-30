'use client';

import { useEffect, useState } from 'react';
import { BarChart3, TrendingUp, Users, MousePointer, Globe, Building2 } from 'lucide-react';

const getBaseUrl = () => {
  if (typeof window !== 'undefined') {
    // Use REACT_APP_BACKEND_URL for consistency
    return process.env.REACT_APP_BACKEND_URL || 
           process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 
           window.location.origin;
  }
  return '';
};

interface ClickStats {
  totalClicks: number;
  uniqueUsers: number;
  conversions: number;
  conversionRate: number;
}

interface ClickByCountry {
  country: string;
  countryName: string;
  clicks: number;
  conversions: number;
}

interface ClickByHouse {
  houseId: string;
  houseName: string;
  houseLogo: string | null;
  clicks: number;
  conversions: number;
  commissionEarned: number;
}

interface ClickByDate {
  date: string;
  clicks: number;
  conversions: number;
}

interface ClickByCampaign {
  campaignId: string;
  campaignName: string;
  clicks: number;
  conversions: number;
}

interface TipsterStats {
  tipsterId: string;
  tipsterName: string;
  tipsterSlug: string;
  totalClicks: number;
  conversions: number;
  commissionEarned: number;
}

const COUNTRY_NAMES: Record<string, string> = {
  ES: 'España',
  MX: 'México',
  AR: 'Argentina',
  CO: 'Colombia',
  CL: 'Chile',
  PE: 'Perú',
  DE: 'Alemania',
  IT: 'Italia',
  PT: 'Portugal',
  FR: 'Francia',
  UK: 'Reino Unido',
  US: 'Estados Unidos',
};

export default function AffiliateStatsSection() {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });
  
  // Stats data
  const [generalStats, setGeneralStats] = useState<ClickStats>({
    totalClicks: 0,
    uniqueUsers: 0,
    conversions: 0,
    conversionRate: 0,
  });
  const [clicksByCountry, setClicksByCountry] = useState<ClickByCountry[]>([]);
  const [clicksByHouse, setClicksByHouse] = useState<ClickByHouse[]>([]);
  const [clicksByDate, setClicksByDate] = useState<ClickByDate[]>([]);
  const [clicksByCampaign, setClicksByCampaign] = useState<ClickByCampaign[]>([]);
  const [tipsterStats, setTipsterStats] = useState<TipsterStats[]>([]);
  
  // Filters
  const [selectedTipster, setSelectedTipster] = useState<string>('');
  const [selectedCampaign, setSelectedCampaign] = useState<string>('');
  const [selectedHouse, setSelectedHouse] = useState<string>('');
  
  // List for filters
  const [tipsters, setTipsters] = useState<{id: string, name: string}[]>([]);
  const [campaigns, setCampaigns] = useState<{id: string, name: string}[]>([]);
  const [houses, setHouses] = useState<{id: string, name: string}[]>([]);

  useEffect(() => {
    loadStats();
  }, [dateRange, selectedTipster, selectedCampaign, selectedHouse]);

  const loadStats = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const headers = { Authorization: `Bearer ${token}` };
      
      // Build query params
      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      });
      if (selectedTipster) params.append('tipsterId', selectedTipster);
      if (selectedCampaign) params.append('campaignId', selectedCampaign);
      if (selectedHouse) params.append('houseId', selectedHouse);
      
      // Fetch stats
      const res = await fetch(`${getBaseUrl()}/api/affiliate/admin/stats?${params.toString()}`, { headers });
      
      if (res.ok) {
        const data = await res.json();
        setGeneralStats(data.general || { totalClicks: 0, uniqueUsers: 0, conversions: 0, conversionRate: 0 });
        setClicksByCountry(data.byCountry || []);
        setClicksByHouse(data.byHouse || []);
        setClicksByDate(data.byDate || []);
        setClicksByCampaign(data.byCampaign || []);
        setTipsterStats(data.byTipster || []);
        
        // Load filter options if not loaded
        if (tipsters.length === 0) {
          setTipsters(data.filterOptions?.tipsters || []);
          setCampaigns(data.filterOptions?.campaigns || []);
          setHouses(data.filterOptions?.houses || []);
        }
      }
    } catch (err) {
      console.error('Error loading stats:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">📊 Estadísticas de Afiliación</h2>
          <p className="text-sm text-gray-500">
            Métricas de clicks, conversiones y comisiones por tipster, campaña y casa
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Desde</label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Hasta</label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Tipster</label>
            <select
              value={selectedTipster}
              onChange={(e) => setSelectedTipster(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Todos</option>
              {tipsters.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Campaña</label>
            <select
              value={selectedCampaign}
              onChange={(e) => setSelectedCampaign(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Todas</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Casa</label>
            <select
              value={selectedHouse}
              onChange={(e) => setSelectedHouse(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Todas</option>
              {houses.map((h) => (
                <option key={h.id} value={h.id}>{h.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* General Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <MousePointer className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{generalStats.totalClicks.toLocaleString()}</div>
              <div className="text-xs text-gray-500">Clicks Totales</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{generalStats.uniqueUsers.toLocaleString()}</div>
              <div className="text-xs text-gray-500">Usuarios Únicos</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{generalStats.conversions.toLocaleString()}</div>
              <div className="text-xs text-gray-500">Conversiones</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <BarChart3 className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{generalStats.conversionRate.toFixed(1)}%</div>
              <div className="text-xs text-gray-500">Tasa Conversión</div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats by Tipster */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="p-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-gray-500" />
            Por Tipster
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipster</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Clicks</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Conversiones</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Comisión</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">% Conv.</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {tipsterStats.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    No hay datos para el período seleccionado
                  </td>
                </tr>
              ) : (
                tipsterStats.map((stat) => (
                  <tr key={stat.tipsterId}>
                    <td className="px-4 py-3 font-medium">{stat.tipsterName}</td>
                    <td className="px-4 py-3 text-right">{stat.totalClicks.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-green-600">{stat.conversions.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-blue-600 font-medium">
                      €{(stat.commissionEarned / 100).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500">
                      {stat.totalClicks > 0 ? ((stat.conversions / stat.totalClicks) * 100).toFixed(1) : 0}%
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Two columns: By Country and By House */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* By Country */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Globe className="w-5 h-5 text-gray-500" />
              Por País
            </h3>
          </div>
          <div className="p-4">
            {clicksByCountry.length === 0 ? (
              <div className="text-center py-8 text-gray-500">Sin datos</div>
            ) : (
              <div className="space-y-3">
                {clicksByCountry.slice(0, 10).map((stat) => (
                  <div key={stat.country} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getCountryFlag(stat.country)}</span>
                      <span className="text-sm">{COUNTRY_NAMES[stat.country] || stat.country}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-gray-500">{stat.clicks} clicks</span>
                      <span className="text-sm text-green-600">{stat.conversions} conv.</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* By House */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-gray-500" />
              Por Casa de Apuestas
            </h3>
          </div>
          <div className="p-4">
            {clicksByHouse.length === 0 ? (
              <div className="text-center py-8 text-gray-500">Sin datos</div>
            ) : (
              <div className="space-y-3">
                {clicksByHouse.slice(0, 10).map((stat) => (
                  <div key={stat.houseId} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {stat.houseLogo ? (
                        <img src={stat.houseLogo} alt={stat.houseName} className="w-6 h-6 object-contain" />
                      ) : (
                        <div className="w-6 h-6 bg-gray-200 rounded flex items-center justify-center text-xs font-bold">
                          {stat.houseName.charAt(0)}
                        </div>
                      )}
                      <span className="text-sm">{stat.houseName}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-gray-500">{stat.clicks} clicks</span>
                      <span className="text-sm text-green-600">{stat.conversions} conv.</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* By Campaign */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="p-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            📢 Por Campaña
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Campaña</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Clicks</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Conversiones</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">% Conv.</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {clicksByCampaign.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                    No hay datos para el período seleccionado
                  </td>
                </tr>
              ) : (
                clicksByCampaign.map((stat) => (
                  <tr key={stat.campaignId}>
                    <td className="px-4 py-3 font-medium">{stat.campaignName}</td>
                    <td className="px-4 py-3 text-right">{stat.clicks.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-green-600">{stat.conversions.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-gray-500">
                      {stat.clicks > 0 ? ((stat.conversions / stat.clicks) * 100).toFixed(1) : 0}%
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Clicks by Date Chart (Simple Bar) */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            📈 Evolución Diaria
          </h3>
        </div>
        <div className="p-4">
          {clicksByDate.length === 0 ? (
            <div className="text-center py-8 text-gray-500">Sin datos</div>
          ) : (
            <div className="space-y-2">
              {clicksByDate.slice(-14).map((stat) => {
                const maxClicks = Math.max(...clicksByDate.map(d => d.clicks), 1);
                const percentage = (stat.clicks / maxClicks) * 100;
                return (
                  <div key={stat.date} className="flex items-center gap-3">
                    <div className="w-20 text-xs text-gray-500">
                      {new Date(stat.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                    </div>
                    <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <div className="w-24 text-right text-sm">
                      <span className="text-gray-700">{stat.clicks}</span>
                      <span className="text-green-600 ml-2">+{stat.conversions}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper function to get country flag emoji
function getCountryFlag(countryCode: string): string {
  const flags: Record<string, string> = {
    ES: '🇪🇸',
    MX: '🇲🇽',
    AR: '🇦🇷',
    CO: '🇨🇴',
    CL: '🇨🇱',
    PE: '🇵🇪',
    DE: '🇩🇪',
    IT: '🇮🇹',
    PT: '🇵🇹',
    FR: '🇫🇷',
    UK: '🇬🇧',
    US: '🇺🇸',
  };
  return flags[countryCode] || '🌍';
}
