'use client';

import { useEffect, useState } from 'react';
import { BarChart3, TrendingUp, MousePointer, Globe, Building2, Calendar } from 'lucide-react';

const getBaseUrl = () => {
  if (typeof window !== 'undefined') {
    return process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || window.location.origin;
  }
  return '';
};

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

const COUNTRY_FLAGS: Record<string, string> = {
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

export default function TipsterStatsSection() {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });
  
  // Stats data
  const [generalStats, setGeneralStats] = useState({
    totalClicks: 0,
    conversions: 0,
    conversionRate: 0,
    totalEarnings: 0,
  });
  const [clicksByCountry, setClicksByCountry] = useState<ClickByCountry[]>([]);
  const [clicksByHouse, setClicksByHouse] = useState<ClickByHouse[]>([]);
  const [clicksByDate, setClicksByDate] = useState<ClickByDate[]>([]);
  const [clicksByCampaign, setClicksByCampaign] = useState<ClickByCampaign[]>([]);

  useEffect(() => {
    loadStats();
  }, [dateRange]);

  const loadStats = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      });
      
      const res = await fetch(`${getBaseUrl()}/api/affiliate/tipster/stats?${params.toString()}`, { headers });
      
      if (res.ok) {
        const data = await res.json();
        setGeneralStats(data.general || { totalClicks: 0, conversions: 0, conversionRate: 0, totalEarnings: 0 });
        setClicksByCountry(data.byCountry || []);
        setClicksByHouse(data.byHouse || []);
        setClicksByDate(data.byDate || []);
        setClicksByCampaign(data.byCampaign || []);
      }
    } catch (err) {
      console.error('Error loading stats:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Date Filters */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Desde</label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
              className="border rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Hasta</label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
              className="border rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div className="flex gap-2 mt-5">
            <button
              onClick={() => setDateRange({
                startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                endDate: new Date().toISOString().split('T')[0],
              })}
              className="px-3 py-2 text-xs bg-white border rounded-lg hover:bg-gray-50"
            >
              7 días
            </button>
            <button
              onClick={() => setDateRange({
                startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                endDate: new Date().toISOString().split('T')[0],
              })}
              className="px-3 py-2 text-xs bg-white border rounded-lg hover:bg-gray-50"
            >
              30 días
            </button>
            <button
              onClick={() => setDateRange({
                startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                endDate: new Date().toISOString().split('T')[0],
              })}
              className="px-3 py-2 text-xs bg-white border rounded-lg hover:bg-gray-50"
            >
              90 días
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-4 text-white">
          <div className="flex items-center gap-2 mb-2">
            <MousePointer className="w-5 h-5 opacity-80" />
            <span className="text-sm opacity-80">Clicks</span>
          </div>
          <div className="text-2xl font-bold">{generalStats.totalClicks.toLocaleString()}</div>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-4 text-white">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 opacity-80" />
            <span className="text-sm opacity-80">Conversiones</span>
          </div>
          <div className="text-2xl font-bold">{generalStats.conversions.toLocaleString()}</div>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-4 text-white">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-5 h-5 opacity-80" />
            <span className="text-sm opacity-80">Tasa Conv.</span>
          </div>
          <div className="text-2xl font-bold">{generalStats.conversionRate.toFixed(1)}%</div>
        </div>
        <div className="bg-gradient-to-br from-yellow-500 to-orange-500 rounded-lg p-4 text-white">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">💰</span>
            <span className="text-sm opacity-80">Ganancias</span>
          </div>
          <div className="text-2xl font-bold">€{(generalStats.totalEarnings / 100).toFixed(2)}</div>
        </div>
      </div>

      {/* Two columns */}
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
              <div className="text-center py-6 text-gray-500 text-sm">Sin datos en este período</div>
            ) : (
              <div className="space-y-3">
                {clicksByCountry.slice(0, 8).map((stat) => {
                  const maxClicks = Math.max(...clicksByCountry.map(c => c.clicks), 1);
                  const percentage = (stat.clicks / maxClicks) * 100;
                  return (
                    <div key={stat.country}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{COUNTRY_FLAGS[stat.country] || '🌍'}</span>
                          <span className="text-sm">{COUNTRY_NAMES[stat.country] || stat.country}</span>
                        </div>
                        <div className="text-sm">
                          <span className="text-gray-700 font-medium">{stat.clicks}</span>
                          {stat.conversions > 0 && (
                            <span className="text-green-600 ml-2">+{stat.conversions}</span>
                          )}
                        </div>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
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
              <div className="text-center py-6 text-gray-500 text-sm">Sin datos en este período</div>
            ) : (
              <div className="space-y-3">
                {clicksByHouse.slice(0, 8).map((stat) => {
                  const maxClicks = Math.max(...clicksByHouse.map(c => c.clicks), 1);
                  const percentage = (stat.clicks / maxClicks) * 100;
                  return (
                    <div key={stat.houseId}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          {stat.houseLogo ? (
                            <img src={stat.houseLogo} alt={stat.houseName} className="w-5 h-5 object-contain" />
                          ) : (
                            <div className="w-5 h-5 bg-gray-200 rounded flex items-center justify-center text-xs font-bold">
                              {stat.houseName.charAt(0)}
                            </div>
                          )}
                          <span className="text-sm">{stat.houseName}</span>
                        </div>
                        <div className="text-sm">
                          <span className="text-gray-700 font-medium">{stat.clicks}</span>
                          {stat.conversions > 0 && (
                            <span className="text-green-600 ml-2">+{stat.conversions}</span>
                          )}
                        </div>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-green-500 rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
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
        <div className="p-4">
          {clicksByCampaign.length === 0 ? (
            <div className="text-center py-6 text-gray-500 text-sm">Sin datos en este período</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Campaña</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Clicks</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Conversiones</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">% Conv.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {clicksByCampaign.map((stat) => (
                    <tr key={stat.campaignId}>
                      <td className="px-4 py-3 text-sm">{stat.campaignName}</td>
                      <td className="px-4 py-3 text-sm text-right">{stat.clicks}</td>
                      <td className="px-4 py-3 text-sm text-right text-green-600">{stat.conversions}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-500">
                        {stat.clicks > 0 ? ((stat.conversions / stat.clicks) * 100).toFixed(1) : 0}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Daily Evolution */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-500" />
            Evolución Diaria
          </h3>
        </div>
        <div className="p-4">
          {clicksByDate.length === 0 ? (
            <div className="text-center py-6 text-gray-500 text-sm">Sin datos en este período</div>
          ) : (
            <div className="space-y-2">
              {clicksByDate.slice(-14).map((stat) => {
                const maxClicks = Math.max(...clicksByDate.map(d => d.clicks), 1);
                const percentage = (stat.clicks / maxClicks) * 100;
                return (
                  <div key={stat.date} className="flex items-center gap-3">
                    <div className="w-16 text-xs text-gray-500">
                      {new Date(stat.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                    </div>
                    <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <div className="w-20 text-right text-xs">
                      <span className="text-gray-700 font-medium">{stat.clicks}</span>
                      {stat.conversions > 0 && (
                        <span className="text-green-600 ml-1">+{stat.conversions}</span>
                      )}
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
