'use client';

import { useEffect, useState } from 'react';
import { affiliateApi } from '@/lib/api';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Search, Plus, Check, X, ChevronDown } from 'lucide-react';

interface HouseWithLink {
  house: {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
    commissionPerReferralEur: number;
    allowedCountries?: string[];
    category?: string;
  };
  link: {
    id: string;
    redirectCode: string;
    totalClicks: number;
    totalReferrals: number;
  };
}

interface Campaign {
  id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  channel: string;
  isActive: boolean;
  slug: string;
  totalClicks: number;
  totalImpressions: number;
  countriesEnabled: string[];
  createdAt: string;
  // Betting houses in this campaign
  bettingHouses?: Array<{
    id: string;
    name: string;
    logoUrl?: string;
  }>;
}

const COUNTRY_INFO: Record<string, { name: string; flag: string }> = {
  ES: { name: 'España', flag: '🇪🇸' },
  MX: { name: 'México', flag: '🇲🇽' },
  AR: { name: 'Argentina', flag: '🇦🇷' },
  CO: { name: 'Colombia', flag: '🇨🇴' },
  CL: { name: 'Chile', flag: '🇨🇱' },
  PE: { name: 'Perú', flag: '🇵🇪' },
  US: { name: 'Estados Unidos', flag: '🇺🇸' },
  UK: { name: 'Reino Unido', flag: '🇬🇧' },
  PT: { name: 'Portugal', flag: '🇵🇹' },
  DE: { name: 'Alemania', flag: '🇩🇪' },
};

const CATEGORIES = ['Casinos', 'Deportes', 'Poker', 'Bingo'];
const COMMISSION_TYPES = ['CPA', 'RevShare', 'Híbrido'];

// For client-side, use relative URL
const getBaseUrl = () => '';

export default function AffiliateSection() {
  const { formatPrice } = useCurrency();
  const [houses, setHouses] = useState<HouseWithLink[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'campaigns' | 'houses'>('campaigns');
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [filters, setFilters] = useState({
    country: '',
    category: '',
    house: '',
    commission: '',
    search: '',
  });

  // Selection modal
  const [showSelectModal, setShowSelectModal] = useState(false);
  const [selectedHouses, setSelectedHouses] = useState<string[]>([]);
  const [modalSearch, setModalSearch] = useState('');

  // Create campaign modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCampaign, setNewCampaign] = useState({
    title: '',
    description: '',
    channel: 'Telegram',
    selectedHouseIds: [] as string[],
    countriesEnabled: ['ES'],
  });
  const [saving, setSaving] = useState(false);

  // Edit campaign modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    countriesEnabled: [] as string[],
  });

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Load houses
      const housesRes = await affiliateApi.getHousesWithLinks();
      setHouses(housesRes.data || []);
      
      // Load campaigns (landings) with their betting houses
      const token = localStorage.getItem('access_token');
      const landingsRes = await fetch(`${getBaseUrl()}/api/tipster/landings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (landingsRes.ok) {
        const landingsData = await landingsRes.json();
        
        // Map landings to campaigns with betting house info
        const campaignsWithHouses = landingsData.map((l: any) => {
          // Extract betting houses from countryConfigs if available
          const bettingHouseIds = new Set<string>();
          if (l.countryConfigs) {
            l.countryConfigs.forEach((config: any) => {
              config.items?.forEach((item: any) => {
                if (item.bettingHouseId) {
                  bettingHouseIds.add(item.bettingHouseId);
                }
              });
            });
          }
          
          // Find the actual house info from our loaded houses
          const campaignHouses = Array.from(bettingHouseIds).map(houseId => {
            const found = housesRes.data?.find((h: any) => h.house.id === houseId);
            if (found) {
              return {
                id: found.house.id,
                name: found.house.name,
                logoUrl: found.house.logoUrl,
              };
            }
            return null;
          }).filter(Boolean);

          return {
            id: l.id,
            title: l.title || 'Campaña sin título',
            description: l.description,
            imageUrl: l.imageUrl,
            channel: 'Telegram',
            isActive: l.isActive,
            slug: l.slug,
            totalClicks: l.totalClicks,
            totalImpressions: l.totalImpressions,
            countriesEnabled: l.countriesEnabled || [],
            createdAt: l.createdAt,
            bettingHouses: campaignHouses,
          };
        });
        
        setCampaigns(campaignsWithHouses);
      }
    } catch (err: any) {
      console.error('Error loading data:', err);
      setError(err.response?.data?.message || 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleCampaign = async (campaign: Campaign) => {
    try {
      const token = localStorage.getItem('access_token');
      await fetch(`${getBaseUrl()}/api/tipster/landings/${campaign.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isActive: !campaign.isActive }),
      });
      await loadData();
    } catch (err) {
      console.error('Error toggling campaign:', err);
    }
  };

  const handleDeleteCampaign = async (campaignId: string) => {
    if (!confirm('¿Estás seguro de eliminar esta campaña?')) return;
    try {
      const token = localStorage.getItem('access_token');
      await fetch(`${getBaseUrl()}/api/tipster/landings/${campaignId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      await loadData();
    } catch (err) {
      console.error('Error deleting campaign:', err);
    }
  };

  const handleRequestHouse = (houseId: string) => {
    setSelectedHouses(prev => 
      prev.includes(houseId) 
        ? prev.filter(id => id !== houseId)
        : [...prev, houseId]
    );
  };

  const handleCreateCampaign = async () => {
    if (!newCampaign.title.trim()) {
      alert('El nombre de la campaña es obligatorio');
      return;
    }
    if (newCampaign.selectedHouseIds.length === 0) {
      alert('Selecciona al menos una casa de apuestas');
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('access_token');
      
      // Create country configs from selected houses
      const countryConfigs = newCampaign.countriesEnabled.map(country => ({
        country,
        items: newCampaign.selectedHouseIds.map((houseId, index) => ({
          bettingHouseId: houseId,
          orderIndex: index,
        })),
      }));

      const res = await fetch(`${getBaseUrl()}/api/tipster/landings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: newCampaign.title,
          description: newCampaign.description || undefined,
          countriesEnabled: newCampaign.countriesEnabled,
          countryConfigs,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Error al crear campaña');
      }

      await loadData();
      setShowCreateModal(false);
      setNewCampaign({
        title: '',
        description: '',
        channel: 'Telegram',
        selectedHouseIds: [],
        countriesEnabled: ['ES'],
      });
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const openSelectModal = () => {
    setSelectedHouses([]);
    setModalSearch('');
    setShowSelectModal(true);
  };

  const confirmSelection = () => {
    setNewCampaign(prev => ({
      ...prev,
      selectedHouseIds: selectedHouses,
    }));
    setShowSelectModal(false);
    setShowCreateModal(true);
  };

  // Filter houses
  const filteredHouses = houses.filter(({ house }) => {
    if (filters.search && !house.name.toLowerCase().includes(filters.search.toLowerCase())) return false;
    if (filters.category && house.category !== filters.category) return false;
    return true;
  });

  // Filter modal houses
  const filteredModalHouses = houses.filter(({ house }) => {
    if (modalSearch && !house.name.toLowerCase().includes(modalSearch.toLowerCase())) return false;
    return true;
  });

  // Filter campaigns
  const filteredCampaigns = campaigns.filter(campaign => {
    if (filters.search && !campaign.title.toLowerCase().includes(filters.search.toLowerCase())) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Afiliacion</h1>
        <button
          onClick={openSelectModal}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium transition-colors"
        >
          Crear Campaña <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Filters Row */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {/* País Filter */}
        <div className="relative">
          <select
            value={filters.country}
            onChange={(e) => setFilters(prev => ({ ...prev, country: e.target.value }))}
            className="appearance-none bg-white border border-gray-200 rounded-lg px-4 py-2.5 pr-10 text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[120px]"
          >
            <option value="">País</option>
            {Object.entries(COUNTRY_INFO).map(([code, info]) => (
              <option key={code} value={code}>{info.flag} {info.name}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>

        {/* Categoría Filter */}
        <div className="relative">
          <select
            value={filters.category}
            onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
            className="appearance-none bg-white border border-gray-200 rounded-lg px-4 py-2.5 pr-10 text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[130px]"
          >
            <option value="">Categoría</option>
            {CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>

        {/* Casa de afiliación Filter */}
        <div className="relative">
          <select
            value={filters.house}
            onChange={(e) => setFilters(prev => ({ ...prev, house: e.target.value }))}
            className="appearance-none bg-white border border-gray-200 rounded-lg px-4 py-2.5 pr-10 text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[170px]"
          >
            <option value="">Casa de afiliacion</option>
            {houses.map(({ house }) => (
              <option key={house.id} value={house.id}>{house.name}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>

        {/* Comisión Filter */}
        <div className="relative">
          <select
            value={filters.commission}
            onChange={(e) => setFilters(prev => ({ ...prev, commission: e.target.value }))}
            className="appearance-none bg-white border border-gray-200 rounded-lg px-4 py-2.5 pr-10 text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[130px]"
          >
            <option value="">Comision</option>
            {COMMISSION_TYPES.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative mb-6">
        <input
          type="text"
          placeholder="Buscar"
          value={filters.search}
          onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
          className="w-full bg-white border border-gray-200 rounded-lg px-4 py-3 pr-10 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-8">
          <button
            onClick={() => setActiveTab('campaigns')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'campaigns'
                ? 'border-blue-500 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Campañas Activas
          </button>
          <button
            onClick={() => setActiveTab('houses')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'houses'
                ? 'border-blue-500 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Casas de apuestas
          </button>
        </nav>
      </div>

      {/* Content */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        {activeTab === 'campaigns' && (
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Campañas Activas</h2>
            
            {filteredCampaigns.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p className="mb-4">No tienes campañas activas</p>
                <button
                  onClick={openSelectModal}
                  className="text-blue-500 hover:text-blue-600 font-medium"
                >
                  Crear tu primera campaña
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredCampaigns.map(campaign => (
                  <div
                    key={campaign.id}
                    className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl"
                  >
                    {/* Campaign Image - Shows countries and betting houses */}
                    <div className="w-36 h-28 bg-gradient-to-br from-blue-800 via-blue-900 to-indigo-900 rounded-lg flex flex-col items-center justify-center overflow-hidden flex-shrink-0 p-3 relative">
                      {/* Background pattern */}
                      <div className="absolute inset-0 opacity-10">
                        <div className="absolute top-0 left-0 w-full h-full" style={{
                          backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
                          backgroundSize: '10px 10px'
                        }} />
                      </div>
                      
                      {campaign.bettingHouses && campaign.bettingHouses.length > 0 ? (
                        <>
                          {/* Country flags row */}
                          <div className="flex gap-1 mb-2 relative z-10">
                            {campaign.countriesEnabled.slice(0, 4).map(c => (
                              <span key={c} className="text-lg drop-shadow-md">
                                {COUNTRY_INFO[c]?.flag || '🏳️'}
                              </span>
                            ))}
                          </div>
                          
                          {/* Betting house logos */}
                          <div className="flex flex-wrap gap-1 justify-center items-center relative z-10">
                            {campaign.bettingHouses.slice(0, 3).map((house: any) => (
                              <div key={house.id} className="w-10 h-7 bg-white rounded shadow-sm flex items-center justify-center">
                                {house.logoUrl ? (
                                  <img
                                    src={house.logoUrl}
                                    alt={house.name}
                                    className="max-w-[90%] max-h-[90%] object-contain"
                                  />
                                ) : (
                                  <span className="text-[7px] text-gray-700 font-bold truncate px-0.5">
                                    {house.name}
                                  </span>
                                )}
                              </div>
                            ))}
                            {campaign.bettingHouses.length > 3 && (
                              <span className="text-white text-xs font-medium">+{campaign.bettingHouses.length - 3}</span>
                            )}
                          </div>
                        </>
                      ) : (
                        <>
                          {/* Large country flags when no betting houses */}
                          <div className="flex flex-wrap gap-2 justify-center items-center relative z-10">
                            {campaign.countriesEnabled.slice(0, 4).map(c => (
                              <span key={c} className="text-3xl drop-shadow-lg">
                                {COUNTRY_INFO[c]?.flag || '🏳️'}
                              </span>
                            ))}
                          </div>
                          {campaign.countriesEnabled.length > 4 && (
                            <span className="text-white text-xs mt-1 opacity-80 relative z-10">
                              +{campaign.countriesEnabled.length - 4} más
                            </span>
                          )}
                        </>
                      )}
                    </div>

                    {/* Campaign Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {campaign.title}
                      </h3>
                      <p className="text-sm text-gray-500">
                        Canal: <span className="text-blue-500">{campaign.channel}</span>
                      </p>
                      <p className="text-sm text-gray-500">
                        Estado: <span className={campaign.isActive ? 'text-green-500' : 'text-gray-400'}>
                          {campaign.isActive ? 'Activo' : 'Inactivo'}
                        </span>
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      <button
                        onClick={() => window.open(`/go/${campaign.slug}`, '_blank')}
                        className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm font-medium transition-colors"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleToggleCampaign(campaign)}
                        className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm font-medium transition-colors"
                      >
                        {campaign.isActive ? 'Desactivar' : 'Activar'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'houses' && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-4 px-6 text-sm font-medium text-gray-500">Campaña</th>
                  <th className="text-left py-4 px-4 text-sm font-medium text-gray-500">Paises</th>
                  <th className="text-left py-4 px-4 text-sm font-medium text-gray-500">Casa de afiliacion</th>
                  <th className="text-left py-4 px-4 text-sm font-medium text-gray-500">Tipo de comision</th>
                  <th className="text-left py-4 px-4 text-sm font-medium text-gray-500">Categoría</th>
                  <th className="py-4 px-6"></th>
                </tr>
              </thead>
              <tbody>
                {filteredHouses.map(({ house, link }) => (
                  <tr key={house.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="py-4 px-6">
                      <div className="w-24 h-14 bg-[#1a1f2e] rounded-lg flex items-center justify-center overflow-hidden">
                        {house.logoUrl ? (
                          <img
                            src={house.logoUrl}
                            alt={house.name}
                            className="max-w-[80%] max-h-[80%] object-contain"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <span className="text-white font-bold text-sm">{house.name}</span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex flex-col gap-0.5">
                        {(house.allowedCountries || ['ES', 'MX', 'AR']).slice(0, 3).map(country => (
                          <span key={country} className="text-base">
                            {COUNTRY_INFO[country]?.flag || '🏳️'}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="font-medium text-gray-900">{house.name}</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-gray-700">CPA {formatPrice(house.commissionPerReferralEur * 100)}</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-gray-700">{house.category || 'Casinos'}</span>
                    </td>
                    <td className="py-4 px-6">
                      <button
                        onClick={() => handleRequestHouse(house.id)}
                        className="flex items-center gap-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm font-medium transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        Solicitar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredHouses.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                No hay casas de apuestas disponibles
              </div>
            )}
          </div>
        )}
      </div>

      {/* Select Campaign Modal */}
      {showSelectModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[80vh] flex flex-col shadow-xl">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Seleccionar campaña</h2>
                <button
                  onClick={() => setShowSelectModal(false)}
                  className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              
              {/* Search in modal */}
              <div className="relative mt-4">
                <input
                  type="text"
                  placeholder="Buscar"
                  value={modalSearch}
                  onChange={(e) => setModalSearch(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2.5 pr-10 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              </div>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-4">
                {filteredModalHouses.map(({ house }) => (
                  <label
                    key={house.id}
                    className="flex items-center gap-4 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedHouses.includes(house.id)}
                      onChange={() => handleRequestHouse(house.id)}
                      className="w-5 h-5 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                    />
                    
                    <div className="w-24 h-14 bg-[#1a1f2e] rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                      {house.logoUrl ? (
                        <img
                          src={house.logoUrl}
                          alt={house.name}
                          className="max-w-[80%] max-h-[80%] object-contain"
                        />
                      ) : (
                        <span className="text-white font-bold text-sm">{house.name}</span>
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <p className="text-sm text-gray-600">{house.category || 'Casinos'}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex gap-0.5">
                        {(house.allowedCountries || ['ES', 'MX', 'AR']).slice(0, 3).map(country => (
                          <span key={country} className="text-sm">
                            {COUNTRY_INFO[country]?.flag || '🏳️'}
                          </span>
                        ))}
                      </div>
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                        +20 países
                      </span>
                    </div>

                    <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
                      CPA {formatPrice(house.commissionPerReferralEur * 100)}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => setShowSelectModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmSelection}
                disabled={selectedHouses.length === 0}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Continuar ({selectedHouses.length})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Campaign Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-xl">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Nueva Campaña</h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Campaign Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre de la campaña
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Campaña Barcelona vs Real Madrid"
                    value={newCampaign.title}
                    onChange={(e) => setNewCampaign(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Channel */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Canal
                  </label>
                  <select
                    value={newCampaign.channel}
                    onChange={(e) => setNewCampaign(prev => ({ ...prev, channel: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Telegram">Telegram</option>
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="Web">Web</option>
                  </select>
                </div>

                {/* Countries */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Países objetivo
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(COUNTRY_INFO).slice(0, 6).map(([code, info]) => (
                      <button
                        key={code}
                        type="button"
                        onClick={() => {
                          setNewCampaign(prev => ({
                            ...prev,
                            countriesEnabled: prev.countriesEnabled.includes(code)
                              ? prev.countriesEnabled.filter(c => c !== code)
                              : [...prev.countriesEnabled, code]
                          }));
                        }}
                        className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                          newCampaign.countriesEnabled.includes(code)
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {info.flag} {info.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Selected Houses */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Casas seleccionadas ({selectedHouses.length})
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {selectedHouses.map(id => {
                      const house = houses.find(h => h.house.id === id)?.house;
                      return house ? (
                        <span
                          key={id}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                        >
                          {house.name}
                          <button
                            onClick={() => setSelectedHouses(prev => prev.filter(hid => hid !== id))}
                            className="hover:bg-blue-200 rounded-full p-0.5"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreateCampaign}
                  disabled={saving || !newCampaign.title.trim()}
                  className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {saving ? 'Creando...' : 'Crear Campaña'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
