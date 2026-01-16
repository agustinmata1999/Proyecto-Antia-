'use client';

import { useEffect, useState, useRef } from 'react';
import { affiliateApi } from '@/lib/api';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Search, Plus, Check, X, ChevronDown, Trash2, Upload, Image as ImageIcon, Users } from 'lucide-react';

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

interface BettingHouse {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  description: string | null;
  commissionPerReferralEur: number;
  allowedCountries: string[];
}

interface LandingItem {
  bettingHouseId: string;
  orderIndex: number;
}

interface CountryConfig {
  country: string;
  items: LandingItem[];
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
  countryConfigs?: CountryConfig[];
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

// Interface for referrals/affiliates
interface Referral {
  id: string;
  houseId: string;
  houseName: string;
  houseSlug: string;
  houseLogoUrl: string | null;
  userName: string;
  userEmail: string | null;
  userTelegram: string | null;
  country: string;
  eventType: string;
  status: string;
  commissionCents: number;
  commissionEur: number;
  clickedAt: string | null;
  convertedAt: string | null;
  createdAt: string;
}

interface ReferralsData {
  referrals: Referral[];
  stats: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    totalEarningsEur: number;
  };
}

// For client-side, use relative URL
const getBaseUrl = () => '';

export default function AffiliateSection() {
  const { formatPrice } = useCurrency();
  const [houses, setHouses] = useState<HouseWithLink[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [referralsData, setReferralsData] = useState<ReferralsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingReferrals, setLoadingReferrals] = useState(false);
  const [activeTab, setActiveTab] = useState<'campaigns' | 'houses' | 'affiliates'>('campaigns');
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
    imageUrl: '',
    countriesEnabled: [] as string[],
    countryConfigs: [] as CountryConfig[],
  });
  const [newCampaignAvailableHouses, setNewCampaignAvailableHouses] = useState<Record<string, BettingHouse[]>>({});
  const [newCampaignError, setNewCampaignError] = useState('');
  const [newCampaignUploading, setNewCampaignUploading] = useState(false);
  const newCampaignFileInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);

  // Edit campaign modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    imageUrl: '',
    countriesEnabled: [] as string[],
    countryConfigs: [] as CountryConfig[],
  });
  const [editAvailableHouses, setEditAvailableHouses] = useState<Record<string, BettingHouse[]>>({});
  const [editError, setEditError] = useState('');
  const [editUploading, setEditUploading] = useState(false);
  const editFileInputRef = useRef<HTMLInputElement>(null);

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
            countryConfigs: l.countryConfigs || [],
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

  const loadReferrals = async () => {
    setLoadingReferrals(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${getBaseUrl()}/api/affiliate/my-referrals`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setReferralsData(data);
      }
    } catch (err) {
      console.error('Error loading referrals:', err);
    } finally {
      setLoadingReferrals(false);
    }
  };

  // Load referrals when switching to affiliates tab
  useEffect(() => {
    if (activeTab === 'affiliates' && !referralsData) {
      loadReferrals();
    }
  }, [activeTab]);

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

  // Load houses for a specific country (for edit modal)
  const loadEditHousesForCountry = async (country: string) => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${getBaseUrl()}/api/tipster/landings/houses/${country}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setEditAvailableHouses(prev => ({ ...prev, [country]: data }));
      }
    } catch (err) {
      console.error('Error loading houses for country:', err);
    }
  };

  // Load houses for a specific country (for create modal)
  const loadNewCampaignHousesForCountry = async (country: string) => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${getBaseUrl()}/api/tipster/landings/houses/${country}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setNewCampaignAvailableHouses(prev => ({ ...prev, [country]: data }));
      }
    } catch (err) {
      console.error('Error loading houses for country:', err);
    }
  };

  const handleOpenEdit = async (campaign: Campaign) => {
    setEditingCampaign(campaign);
    setEditForm({
      title: campaign.title,
      description: campaign.description || '',
      imageUrl: campaign.imageUrl || '',
      countriesEnabled: campaign.countriesEnabled || [],
      countryConfigs: campaign.countryConfigs || [],
    });
    setEditAvailableHouses({});
    setEditError('');
    setShowEditModal(true);
    
    // Load houses for each enabled country
    for (const country of campaign.countriesEnabled || []) {
      await loadEditHousesForCountry(country);
    }
  };

  const handleEditCountryToggle = async (country: string) => {
    const current = editForm.countriesEnabled;
    
    if (current.includes(country)) {
      // Remove country
      setEditForm(prev => ({
        ...prev,
        countriesEnabled: prev.countriesEnabled.filter(c => c !== country),
        countryConfigs: prev.countryConfigs.filter(c => c.country !== country),
      }));
    } else {
      // Add country
      await loadEditHousesForCountry(country);
      setEditForm(prev => ({
        ...prev,
        countriesEnabled: [...prev.countriesEnabled, country],
        countryConfigs: [...prev.countryConfigs, { country, items: [] }],
      }));
    }
  };

  const handleEditAddHouseToCountry = (country: string, houseId: string) => {
    setEditForm(prev => {
      const configs = [...prev.countryConfigs];
      const configIndex = configs.findIndex(c => c.country === country);
      
      if (configIndex === -1) {
        configs.push({
          country,
          items: [{ bettingHouseId: houseId, orderIndex: 0 }],
        });
      } else {
        const items = configs[configIndex].items;
        if (!items.find(i => i.bettingHouseId === houseId)) {
          items.push({
            bettingHouseId: houseId,
            orderIndex: items.length,
          });
        }
      }
      
      return { ...prev, countryConfigs: configs };
    });
  };

  const handleEditRemoveHouseFromCountry = (country: string, houseId: string) => {
    setEditForm(prev => {
      const configs = [...prev.countryConfigs];
      const configIndex = configs.findIndex(c => c.country === country);
      
      if (configIndex !== -1) {
        configs[configIndex].items = configs[configIndex].items
          .filter(i => i.bettingHouseId !== houseId)
          .map((item, index) => ({ ...item, orderIndex: index }));
      }
      
      return { ...prev, countryConfigs: configs };
    });
  };

  // New Campaign - Country toggle
  const handleNewCampaignCountryToggle = async (country: string) => {
    const current = newCampaign.countriesEnabled;
    
    if (current.includes(country)) {
      // Remove country
      setNewCampaign(prev => ({
        ...prev,
        countriesEnabled: prev.countriesEnabled.filter(c => c !== country),
        countryConfigs: prev.countryConfigs.filter(c => c.country !== country),
      }));
    } else {
      // Add country
      await loadNewCampaignHousesForCountry(country);
      setNewCampaign(prev => ({
        ...prev,
        countriesEnabled: [...prev.countriesEnabled, country],
        countryConfigs: [...prev.countryConfigs, { country, items: [] }],
      }));
    }
  };

  // New Campaign - Add house to country
  const handleNewCampaignAddHouseToCountry = (country: string, houseId: string) => {
    setNewCampaign(prev => {
      const configs = [...prev.countryConfigs];
      const configIndex = configs.findIndex(c => c.country === country);
      
      if (configIndex === -1) {
        configs.push({
          country,
          items: [{ bettingHouseId: houseId, orderIndex: 0 }],
        });
      } else {
        const items = configs[configIndex].items;
        if (!items.find(i => i.bettingHouseId === houseId)) {
          items.push({
            bettingHouseId: houseId,
            orderIndex: items.length,
          });
        }
      }
      
      return { ...prev, countryConfigs: configs };
    });
  };

  // New Campaign - Remove house from country
  const handleNewCampaignRemoveHouseFromCountry = (country: string, houseId: string) => {
    setNewCampaign(prev => {
      const configs = [...prev.countryConfigs];
      const configIndex = configs.findIndex(c => c.country === country);
      
      if (configIndex !== -1) {
        configs[configIndex].items = configs[configIndex].items
          .filter(i => i.bettingHouseId !== houseId)
          .map((item, index) => ({ ...item, orderIndex: index }));
      }
      
      return { ...prev, countryConfigs: configs };
    });
  };

  // Upload campaign image for new campaign
  const handleNewCampaignImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setNewCampaignUploading(true);
    setNewCampaignError('');

    try {
      const token = localStorage.getItem('access_token');
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`${getBaseUrl()}/api/upload/campaign`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Error al subir imagen');
      }

      const data = await res.json();
      setNewCampaign(prev => ({ ...prev, imageUrl: data.imageUrl }));
    } catch (err: any) {
      setNewCampaignError(err.message);
    } finally {
      setNewCampaignUploading(false);
    }
  };

  // Upload campaign image for edit
  const handleEditImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setEditUploading(true);
    setEditError('');

    try {
      const token = localStorage.getItem('access_token');
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`${getBaseUrl()}/api/upload/campaign`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Error al subir imagen');
      }

      const data = await res.json();
      setEditForm(prev => ({ ...prev, imageUrl: data.imageUrl }));
    } catch (err: any) {
      setEditError(err.message);
    } finally {
      setEditUploading(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingCampaign) return;
    setEditError('');
    
    if (!editForm.title.trim()) {
      setEditError('El nombre de la campaña es obligatorio');
      return;
    }

    if (editForm.countriesEnabled.length === 0) {
      setEditError('Selecciona al menos un país');
      return;
    }

    // Validate that each country has at least one house
    for (const country of editForm.countriesEnabled) {
      const config = editForm.countryConfigs.find(c => c.country === country);
      if (!config || config.items.length === 0) {
        setEditError(`Añade al menos una casa de apuestas para ${COUNTRY_INFO[country]?.name || country}`);
        return;
      }
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${getBaseUrl()}/api/tipster/landings/${editingCampaign.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: editForm.title,
          description: editForm.description || undefined,
          imageUrl: editForm.imageUrl || undefined,
          countriesEnabled: editForm.countriesEnabled,
          countryConfigs: editForm.countryConfigs,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Error al guardar');
      }

      await loadData();
      setShowEditModal(false);
      setEditingCampaign(null);
    } catch (err: any) {
      setEditError(err.message);
    } finally {
      setSaving(false);
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
    setNewCampaignError('');
    
    if (!newCampaign.title.trim()) {
      setNewCampaignError('El nombre de la campaña es obligatorio');
      return;
    }

    if (newCampaign.countriesEnabled.length === 0) {
      setNewCampaignError('Selecciona al menos un país');
      return;
    }

    // Validate that each country has at least one house
    for (const country of newCampaign.countriesEnabled) {
      const config = newCampaign.countryConfigs.find(c => c.country === country);
      if (!config || config.items.length === 0) {
        setNewCampaignError(`Añade al menos una casa de apuestas para ${COUNTRY_INFO[country]?.name || country}`);
        return;
      }
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('access_token');

      const res = await fetch(`${getBaseUrl()}/api/tipster/landings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: newCampaign.title,
          description: newCampaign.description || undefined,
          imageUrl: newCampaign.imageUrl || undefined,
          countriesEnabled: newCampaign.countriesEnabled,
          countryConfigs: newCampaign.countryConfigs,
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
        imageUrl: '',
        countriesEnabled: [],
        countryConfigs: [],
      });
      setNewCampaignAvailableHouses({});
      setNewCampaignError('');
    } catch (err: any) {
      setNewCampaignError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const openSelectModal = () => {
    // Reset and open create campaign modal directly
    setNewCampaign({
      title: '',
      description: '',
      channel: 'Telegram',
      imageUrl: '',
      countriesEnabled: [],
      countryConfigs: [],
    });
    setNewCampaignAvailableHouses({});
    setNewCampaignError('');
    setShowCreateModal(true);
  };

  const confirmSelection = () => {
    // This function is no longer used
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
          <button
            onClick={() => setActiveTab('affiliates')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'affiliates'
                ? 'border-blue-500 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Users className="w-4 h-4" />
            Afiliados
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
                    {/* Campaign Image - Shows custom image or countries */}
                    <div className="w-36 h-28 bg-gradient-to-br from-blue-800 via-blue-900 to-indigo-900 rounded-lg flex flex-col items-center justify-center overflow-hidden flex-shrink-0 relative">
                      {campaign.imageUrl ? (
                        // Show custom campaign image
                        <img
                          src={campaign.imageUrl}
                          alt={campaign.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        // Show countries and betting houses fallback
                        <>
                          {/* Background pattern */}
                          <div className="absolute inset-0 opacity-10">
                            <div className="absolute top-0 left-0 w-full h-full" style={{
                              backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
                              backgroundSize: '10px 10px'
                            }} />
                          </div>
                          
                          {campaign.bettingHouses && campaign.bettingHouses.length > 0 ? (
                            <div className="p-3">
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
                            </div>
                          ) : (
                            <div className="p-3">
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
                            </div>
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
                        Ver
                      </button>
                      <button
                        onClick={() => handleOpenEdit(campaign)}
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

        {/* Affiliates Tab */}
        {activeTab === 'affiliates' && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Afiliados</h2>
              <button
                onClick={loadReferrals}
                disabled={loadingReferrals}
                className="text-sm text-blue-500 hover:text-blue-600 disabled:opacity-50"
              >
                {loadingReferrals ? 'Actualizando...' : 'Actualizar'}
              </button>
            </div>

            {/* Stats Cards */}
            {referralsData && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500">Total</p>
                  <p className="text-2xl font-bold text-gray-900">{referralsData.stats.total}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-sm text-green-600">Aprobados</p>
                  <p className="text-2xl font-bold text-green-700">{referralsData.stats.approved}</p>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4">
                  <p className="text-sm text-yellow-600">Pendientes</p>
                  <p className="text-2xl font-bold text-yellow-700">{referralsData.stats.pending}</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-blue-600">Ganancias</p>
                  <p className="text-2xl font-bold text-blue-700">{formatPrice(referralsData.stats.totalEarningsEur)}</p>
                </div>
              </div>
            )}

            {loadingReferrals ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                <p className="text-gray-500 mt-4">Cargando afiliados...</p>
              </div>
            ) : referralsData && referralsData.referrals.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Casa de Apuestas</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Nombre</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Fecha</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">País</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Estado</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">CPA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {referralsData.referrals.map((referral) => (
                      <tr key={referral.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-10 bg-[#1a1f2e] rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                              {referral.houseLogoUrl ? (
                                <img
                                  src={referral.houseLogoUrl}
                                  alt={referral.houseName}
                                  className="max-w-[90%] max-h-[90%] object-contain"
                                />
                              ) : (
                                <span className="text-white font-bold text-xs">{referral.houseName.slice(0, 3)}</span>
                              )}
                            </div>
                            <span className="text-sm font-medium text-gray-900">{referral.houseName}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-sm text-gray-900">{referral.userName}</span>
                          {referral.userEmail && (
                            <p className="text-xs text-gray-500 truncate max-w-[150px]">{referral.userEmail}</p>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-sm text-gray-600">
                            {referral.convertedAt ? new Date(referral.convertedAt).toLocaleDateString('es-ES', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            }) : '-'}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-lg" title={referral.country}>
                            {COUNTRY_INFO[referral.country]?.flag || '🌍'}
                          </span>
                          <span className="ml-2 text-sm text-gray-600">{referral.country}</span>
                        </td>
                        <td className="py-4 px-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                            referral.status === 'APPROVED' 
                              ? 'bg-green-100 text-green-700' 
                              : referral.status === 'PENDING'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {referral.status === 'APPROVED' ? 'Aprobado' : referral.status === 'PENDING' ? 'Pendiente' : 'Rechazado'}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <span className={`font-semibold ${referral.status === 'APPROVED' ? 'text-green-600' : 'text-gray-400'}`}>
                            {formatPrice(referral.commissionEur)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="mb-2">No tienes afiliados registrados</p>
                <p className="text-sm">Comparte tus campañas para empezar a recibir afiliados</p>
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
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-xl">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Nueva Campaña</h2>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewCampaignError('');
                  }}
                  className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
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

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descripción (opcional)
                  </label>
                  <textarea
                    placeholder="Descripción de la campaña"
                    value={newCampaign.description}
                    onChange={(e) => setNewCampaign(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={2}
                  />
                </div>

                {/* Cover Image Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Imagen de portada (opcional)
                  </label>
                  <input
                    type="file"
                    ref={newCampaignFileInputRef}
                    onChange={handleNewCampaignImageUpload}
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    className="hidden"
                  />
                  {newCampaign.imageUrl ? (
                    <div className="relative w-36 h-28 rounded-lg overflow-hidden border border-gray-200">
                      <img
                        src={newCampaign.imageUrl}
                        alt="Portada"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setNewCampaign(prev => ({ ...prev, imageUrl: '' }))}
                        className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => newCampaignFileInputRef.current?.click()}
                        className="absolute bottom-1 right-1 p-1.5 bg-blue-500 text-white rounded-full hover:bg-blue-600"
                      >
                        <Upload className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => newCampaignFileInputRef.current?.click()}
                      disabled={newCampaignUploading}
                      className="w-36 h-28 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-500 hover:border-blue-400 hover:text-blue-500 transition-colors disabled:opacity-50"
                    >
                      {newCampaignUploading ? (
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                      ) : (
                        <>
                          <ImageIcon className="w-8 h-8 mb-1" />
                          <span className="text-xs">Subir imagen</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* Countries Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Seleccionar países
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(COUNTRY_INFO).map(([code, info]) => (
                      <button
                        key={code}
                        type="button"
                        onClick={() => handleNewCampaignCountryToggle(code)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
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

                {/* Betting houses per country */}
                {newCampaign.countriesEnabled.map(country => {
                  const housesForCountry = newCampaignAvailableHouses[country] || [];
                  const selectedHouseIds = newCampaign.countryConfigs
                    .find(c => c.country === country)?.items.map(i => i.bettingHouseId) || [];
                  
                  return (
                    <div key={country} className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <span className="text-xl">{COUNTRY_INFO[country]?.flag}</span>
                        {COUNTRY_INFO[country]?.name || country}
                      </h4>
                      
                      {/* Selected houses for this country */}
                      <div className="space-y-2 mb-4">
                        {newCampaign.countryConfigs
                          .find(c => c.country === country)
                          ?.items.map((item, index) => {
                            const house = housesForCountry.find(h => h.id === item.bettingHouseId);
                            if (!house) return null;
                            
                            return (
                              <div
                                key={item.bettingHouseId}
                                className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg"
                              >
                                <span className="font-medium text-gray-400 w-5">{index + 1}.</span>
                                {house.logoUrl && (
                                  <div className="w-10 h-8 bg-[#1a1f2e] rounded flex items-center justify-center">
                                    <img
                                      src={house.logoUrl}
                                      alt={house.name}
                                      className="max-w-[90%] max-h-[90%] object-contain"
                                    />
                                  </div>
                                )}
                                <span className="flex-1 text-sm font-medium">{house.name}</span>
                                <span className="text-sm text-green-600 font-medium">
                                  €{house.commissionPerReferralEur}/ref
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleNewCampaignRemoveHouseFromCountry(country, item.bettingHouseId)}
                                  className="p-1.5 bg-red-100 text-red-600 rounded hover:bg-red-200 transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            );
                          })}
                        
                        {selectedHouseIds.length === 0 && (
                          <p className="text-sm text-gray-400 italic">No hay casas de apuestas seleccionadas</p>
                        )}
                      </div>

                      {/* Add house dropdown */}
                      <select
                        onChange={e => {
                          if (e.target.value) {
                            handleNewCampaignAddHouseToCountry(country, e.target.value);
                            e.target.value = '';
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">+ Añadir casa de apuestas...</option>
                        {housesForCountry
                          .filter(h => !selectedHouseIds.includes(h.id))
                          .map(h => (
                            <option key={h.id} value={h.id}>
                              {h.name} (€{h.commissionPerReferralEur}/ref)
                            </option>
                          ))}
                      </select>

                      {housesForCountry.length === 0 && (
                        <p className="text-sm text-yellow-600 mt-2">
                          Cargando casas de apuestas...
                        </p>
                      )}
                    </div>
                  );
                })}

                {newCampaign.countriesEnabled.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">
                    Selecciona al menos un país para configurar las casas de apuestas
                  </p>
                )}

                {/* Error */}
                {newCampaignError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                    {newCampaignError}
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewCampaignError('');
                }}
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
      )}

      {/* Edit Campaign Modal */}
      {showEditModal && editingCampaign && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-xl">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Editar Campaña</h2>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingCampaign(null);
                  }}
                  className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                {/* Campaign Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre de la campaña
                  </label>
                  <input
                    type="text"
                    placeholder="Nombre de la campaña"
                    value={editForm.title}
                    onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descripción (opcional)
                  </label>
                  <textarea
                    placeholder="Descripción de la campaña"
                    value={editForm.description}
                    onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={2}
                  />
                </div>

                {/* Cover Image Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Imagen de portada (opcional)
                  </label>
                  <input
                    type="file"
                    ref={editFileInputRef}
                    onChange={handleEditImageUpload}
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    className="hidden"
                  />
                  {editForm.imageUrl ? (
                    <div className="relative w-36 h-28 rounded-lg overflow-hidden border border-gray-200">
                      <img
                        src={editForm.imageUrl}
                        alt="Portada"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setEditForm(prev => ({ ...prev, imageUrl: '' }))}
                        className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => editFileInputRef.current?.click()}
                        className="absolute bottom-1 right-1 p-1.5 bg-blue-500 text-white rounded-full hover:bg-blue-600"
                      >
                        <Upload className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => editFileInputRef.current?.click()}
                      disabled={editUploading}
                      className="w-36 h-28 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-500 hover:border-blue-400 hover:text-blue-500 transition-colors disabled:opacity-50"
                    >
                      {editUploading ? (
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                      ) : (
                        <>
                          <ImageIcon className="w-8 h-8 mb-1" />
                          <span className="text-xs">Subir imagen</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* Countries Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Seleccionar países
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(COUNTRY_INFO).map(([code, info]) => (
                      <button
                        key={code}
                        type="button"
                        onClick={() => handleEditCountryToggle(code)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                          editForm.countriesEnabled.includes(code)
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {info.flag} {info.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Betting houses per country */}
                {editForm.countriesEnabled.map(country => {
                  const housesForCountry = editAvailableHouses[country] || [];
                  const selectedHouseIds = editForm.countryConfigs
                    .find(c => c.country === country)?.items.map(i => i.bettingHouseId) || [];
                  
                  return (
                    <div key={country} className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <span className="text-xl">{COUNTRY_INFO[country]?.flag}</span>
                        {COUNTRY_INFO[country]?.name || country}
                      </h4>
                      
                      {/* Selected houses for this country */}
                      <div className="space-y-2 mb-4">
                        {editForm.countryConfigs
                          .find(c => c.country === country)
                          ?.items.map((item, index) => {
                            const house = housesForCountry.find(h => h.id === item.bettingHouseId);
                            if (!house) return null;
                            
                            return (
                              <div
                                key={item.bettingHouseId}
                                className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg"
                              >
                                <span className="font-medium text-gray-400 w-5">{index + 1}.</span>
                                {house.logoUrl && (
                                  <div className="w-10 h-8 bg-[#1a1f2e] rounded flex items-center justify-center">
                                    <img
                                      src={house.logoUrl}
                                      alt={house.name}
                                      className="max-w-[90%] max-h-[90%] object-contain"
                                    />
                                  </div>
                                )}
                                <span className="flex-1 text-sm font-medium">{house.name}</span>
                                <span className="text-sm text-green-600 font-medium">
                                  €{house.commissionPerReferralEur}/ref
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleEditRemoveHouseFromCountry(country, item.bettingHouseId)}
                                  className="p-1.5 bg-red-100 text-red-600 rounded hover:bg-red-200 transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            );
                          })}
                        
                        {selectedHouseIds.length === 0 && (
                          <p className="text-sm text-gray-400 italic">No hay casas de apuestas seleccionadas</p>
                        )}
                      </div>

                      {/* Add house dropdown */}
                      <select
                        onChange={e => {
                          if (e.target.value) {
                            handleEditAddHouseToCountry(country, e.target.value);
                            e.target.value = '';
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">+ Añadir casa de apuestas...</option>
                        {housesForCountry
                          .filter(h => !selectedHouseIds.includes(h.id))
                          .map(h => (
                            <option key={h.id} value={h.id}>
                              {h.name} (€{h.commissionPerReferralEur}/ref)
                            </option>
                          ))}
                      </select>

                      {housesForCountry.length === 0 && (
                        <p className="text-sm text-yellow-600 mt-2">
                          Cargando casas de apuestas...
                        </p>
                      )}
                    </div>
                  );
                })}

                {editForm.countriesEnabled.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">
                    Selecciona al menos un país para configurar las casas de apuestas
                  </p>
                )}

                {/* Link Preview */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Link de la campaña
                  </label>
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                    <code className="flex-1 text-sm text-gray-600 truncate">
                      {baseUrl}/go/{editingCampaign.slug}
                    </code>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`${baseUrl}/go/${editingCampaign.slug}`);
                      }}
                      className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                    >
                      Copiar
                    </button>
                  </div>
                </div>

                {/* Error */}
                {editError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                    {editError}
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingCampaign(null);
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={saving || !editForm.title.trim()}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
