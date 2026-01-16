'use client';

import { useEffect, useState, useRef } from 'react';
import { affiliateApi } from '@/lib/api';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Search, Plus, Check, X, ChevronDown, Trash2, Upload, Image as ImageIcon, Users, Link as LinkIcon, Copy, TrendingUp, Bell } from 'lucide-react';

interface AffiliateSectionProps {
  userName?: string;
  userHandle?: string;
  userAvatar?: string;
}

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
  campaignName: string | null;
  campaignId: string | null;
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

const getBaseUrl = () => '';

export default function AffiliateSection({ userName = 'Usuario', userHandle = '@usuario', userAvatar }: AffiliateSectionProps) {
  const { formatPrice } = useCurrency();
  const [houses, setHouses] = useState<HouseWithLink[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [referralsData, setReferralsData] = useState<ReferralsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingReferrals, setLoadingReferrals] = useState(false);
  const [activeTab, setActiveTab] = useState<'campaigns' | 'houses' | 'affiliates'>('campaigns');
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  const [filters, setFilters] = useState({
    country: '',
    house: '',
    search: '',
  });

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

  const totalGenerated = referralsData?.stats.totalEarningsEur || 0;
  const totalAffiliates = referralsData?.stats.total || 0;
  const totalClicks = campaigns.reduce((sum, c) => sum + c.totalClicks, 0);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (activeTab === 'affiliates' && !referralsData) {
      loadReferrals();
    }
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const housesRes = await affiliateApi.getHousesWithLinks();
      setHouses(housesRes.data || []);
      
      const token = localStorage.getItem('access_token');
      const landingsRes = await fetch(`${getBaseUrl()}/api/tipster/landings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (landingsRes.ok) {
        const landingsData = await landingsRes.json();
        
        const campaignsWithHouses = landingsData.map((l: any) => {
          const bettingHouseIds = new Set<string>();
          if (l.countryConfigs) {
            Object.values(l.countryConfigs).forEach((items: any) => {
              if (Array.isArray(items)) {
                items.forEach((item: any) => {
                  if (item.bettingHouseId) bettingHouseIds.add(item.bettingHouseId);
                });
              }
            });
          }
          
          const campaignHouses = Array.from(bettingHouseIds).map(houseId => {
            const found = housesRes.data?.find((h: HouseWithLink) => h.house.id === houseId);
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

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Error copying:', err);
    }
  };

  const loadHousesForCountry = async (country: string, isEdit: boolean = false) => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${getBaseUrl()}/api/tipster/landings/houses/${country}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (isEdit) {
          setEditAvailableHouses(prev => ({ ...prev, [country]: data }));
        } else {
          setNewCampaignAvailableHouses(prev => ({ ...prev, [country]: data }));
        }
      }
    } catch (err) {
      console.error('Error loading houses for country:', err);
    }
  };

  const handleNewCampaignCountryToggle = async (country: string) => {
    const current = newCampaign.countriesEnabled;
    if (current.includes(country)) {
      setNewCampaign(prev => ({
        ...prev,
        countriesEnabled: prev.countriesEnabled.filter(c => c !== country),
        countryConfigs: prev.countryConfigs.filter(c => c.country !== country),
      }));
    } else {
      setNewCampaign(prev => ({
        ...prev,
        countriesEnabled: [...prev.countriesEnabled, country],
        countryConfigs: [...prev.countryConfigs, { country, items: [] }],
      }));
      if (!newCampaignAvailableHouses[country]) {
        await loadHousesForCountry(country, false);
      }
    }
  };

  const handleNewCampaignHouseToggle = (country: string, houseId: string) => {
    setNewCampaign(prev => {
      const existingConfig = prev.countryConfigs.find(c => c.country === country);
      if (!existingConfig) return prev;
      const hasHouse = existingConfig.items.some(i => i.bettingHouseId === houseId);
      let newItems;
      if (hasHouse) {
        newItems = existingConfig.items.filter(i => i.bettingHouseId !== houseId);
      } else {
        newItems = [...existingConfig.items, { bettingHouseId: houseId, orderIndex: existingConfig.items.length }];
      }
      return {
        ...prev,
        countryConfigs: prev.countryConfigs.map(c => 
          c.country === country ? { ...c, items: newItems } : c
        ),
      };
    });
  };

  const handleNewCampaignImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setNewCampaignUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${getBaseUrl()}/api/upload/campaign`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        setNewCampaign(prev => ({ ...prev, imageUrl: data.imageUrl }));
      }
    } catch (err) {
      console.error('Error uploading image:', err);
    } finally {
      setNewCampaignUploading(false);
    }
  };

  const handleEditCountryToggle = async (country: string) => {
    const current = editForm.countriesEnabled;
    if (current.includes(country)) {
      setEditForm(prev => ({
        ...prev,
        countriesEnabled: prev.countriesEnabled.filter(c => c !== country),
        countryConfigs: prev.countryConfigs.filter(c => c.country !== country),
      }));
    } else {
      setEditForm(prev => ({
        ...prev,
        countriesEnabled: [...prev.countriesEnabled, country],
        countryConfigs: [...prev.countryConfigs, { country, items: [] }],
      }));
      if (!editAvailableHouses[country]) {
        await loadHousesForCountry(country, true);
      }
    }
  };

  const handleEditHouseToggle = (country: string, houseId: string) => {
    setEditForm(prev => {
      const existingConfig = prev.countryConfigs.find(c => c.country === country);
      if (!existingConfig) return prev;
      const hasHouse = existingConfig.items.some(i => i.bettingHouseId === houseId);
      let newItems;
      if (hasHouse) {
        newItems = existingConfig.items.filter(i => i.bettingHouseId !== houseId);
      } else {
        newItems = [...existingConfig.items, { bettingHouseId: houseId, orderIndex: existingConfig.items.length }];
      }
      return {
        ...prev,
        countryConfigs: prev.countryConfigs.map(c => 
          c.country === country ? { ...c, items: newItems } : c
        ),
      };
    });
  };

  const handleEditImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setEditUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${getBaseUrl()}/api/upload/campaign`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        setEditForm(prev => ({ ...prev, imageUrl: data.imageUrl }));
      }
    } catch (err) {
      console.error('Error uploading image:', err);
    } finally {
      setEditUploading(false);
    }
  };

  const openEditModal = async (campaign: Campaign) => {
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
    for (const country of campaign.countriesEnabled || []) {
      await loadHousesForCountry(country, true);
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
        throw new Error(err.message || 'Error al crear');
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
    } catch (err: any) {
      setNewCampaignError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const filteredCampaigns = campaigns.filter(c => {
    if (filters.search && !c.title.toLowerCase().includes(filters.search.toLowerCase())) return false;
    if (filters.country && !c.countriesEnabled.includes(filters.country)) return false;
    return true;
  });

  const filteredHouses = houses.filter(h => {
    if (filters.search && !h.house.name.toLowerCase().includes(filters.search.toLowerCase())) return false;
    if (filters.country && !h.house.allowedCountries?.includes(filters.country)) return false;
    return true;
  });

  const filteredReferrals = referralsData?.referrals.filter(r => {
    if (filters.search && !r.userName.toLowerCase().includes(filters.search.toLowerCase())) return false;
    if (filters.country && r.country !== filters.country) return false;
    return true;
  }) || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="bg-[#f5f7fa] min-h-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[22px] font-semibold text-gray-900">Hola {userName}</h1>
            <p className="text-[14px] text-gray-400 mt-0.5">Me alegro de verte de nuevo</p>
          </div>
          <div className="flex items-center gap-5">
            <button className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <Bell className="w-5 h-5 text-gray-400" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
            <div className="flex items-center gap-3 pl-5 border-l border-gray-200">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                {userAvatar ? (
                  <img src={userAvatar} alt={userName} className="w-full h-full rounded-full object-cover" />
                ) : (
                  <span className="text-white text-sm font-medium">{userName.charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div>
                <p className="text-[14px] font-medium text-gray-900">{userName}</p>
                <p className="text-[12px] text-gray-400">{userHandle}</p>
              </div>
              <ChevronDown className="w-4 h-4 text-gray-400 ml-1" />
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="px-8 py-6">
        <div className="grid grid-cols-3 gap-5">
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <p className="text-[13px] text-gray-400 font-medium">Total generado</p>
            <div className="flex items-baseline gap-3 mt-2">
              <span className="text-[28px] font-bold text-gray-900">{formatPrice(totalGenerated)}</span>
              <span className="text-green-500 text-[12px] font-medium flex items-center">
                <TrendingUp className="w-3 h-3 mr-0.5" />
                + 6.9%
              </span>
            </div>
            <p className="text-[12px] text-gray-300 mt-1">{formatPrice(totalGenerated)} generado</p>
          </div>
          
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <p className="text-[13px] text-gray-400 font-medium">Afiliados</p>
            <div className="flex items-baseline gap-3 mt-2">
              <span className="text-[28px] font-bold text-gray-900">{totalAffiliates}</span>
              <span className="text-green-500 text-[12px] font-medium flex items-center">
                <TrendingUp className="w-3 h-3 mr-0.5" />
                + 6.9%
              </span>
            </div>
            <p className="text-[12px] text-gray-300 mt-1">{totalAffiliates} Afiliados</p>
          </div>
          
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <p className="text-[13px] text-gray-400 font-medium">Clicks totales</p>
            <div className="flex items-baseline gap-3 mt-2">
              <span className="text-[28px] font-bold text-gray-900">{totalClicks}</span>
              <span className="text-green-500 text-[12px] font-medium flex items-center">
                <TrendingUp className="w-3 h-3 mr-0.5" />
                + 6.9%
              </span>
            </div>
            <p className="text-[12px] text-gray-300 mt-1">{totalClicks} Clicks</p>
          </div>
        </div>
      </div>

      {/* Main Content Card */}
      <div className="px-8 pb-8">
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {/* Filters Row */}
          <div className="px-6 py-4 flex items-center gap-4">
            <div className="relative">
              <select
                value={filters.country}
                onChange={(e) => setFilters(prev => ({ ...prev, country: e.target.value }))}
                className="appearance-none bg-white border border-gray-200 rounded-lg px-4 py-2.5 pr-10 text-[14px] text-gray-600 focus:outline-none focus:border-blue-500 min-w-[140px]"
              >
                <option value="">Pais</option>
                {Object.entries(COUNTRY_INFO).map(([code, info]) => (
                  <option key={code} value={code}>{info.flag} {info.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>

            <div className="relative flex-1 max-w-[200px]">
              <select
                value={filters.house}
                onChange={(e) => setFilters(prev => ({ ...prev, house: e.target.value }))}
                className="appearance-none w-full bg-white border border-gray-200 rounded-lg px-4 py-2.5 pr-10 text-[14px] text-gray-600 focus:outline-none focus:border-blue-500"
              >
                <option value="">Casa de afiliación</option>
                {houses.map(h => (
                  <option key={h.house.id} value={h.house.id}>{h.house.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>

            <button
              onClick={() => setShowCreateModal(true)}
              className="ml-auto bg-blue-500 hover:bg-blue-600 text-white px-5 py-2.5 rounded-lg text-[14px] font-medium flex items-center gap-2 transition-colors"
            >
              Crear Campaña <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Search Bar */}
          <div className="px-6 pb-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar"
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="w-full pl-11 pr-4 py-2.5 bg-[#f5f7fa] border-0 rounded-lg text-[14px] text-gray-600 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Tabs */}
          <div className="flex px-6 border-b border-gray-100">
            <button
              onClick={() => setActiveTab('campaigns')}
              className={`px-1 py-4 text-[14px] font-medium border-b-2 -mb-px transition-colors mr-8 ${
                activeTab === 'campaigns'
                  ? 'text-blue-600 border-blue-500'
                  : 'text-gray-400 border-transparent hover:text-gray-600'
              }`}
            >
              Campañas activas
            </button>
            <button
              onClick={() => setActiveTab('houses')}
              className={`px-1 py-4 text-[14px] font-medium border-b-2 -mb-px transition-colors mr-8 ${
                activeTab === 'houses'
                  ? 'text-blue-600 border-blue-500'
                  : 'text-gray-400 border-transparent hover:text-gray-600'
              }`}
            >
              Casas de apuestas
            </button>
            <button
              onClick={() => setActiveTab('affiliates')}
              className={`px-1 py-4 text-[14px] font-medium border-b-2 -mb-px transition-colors ${
                activeTab === 'affiliates'
                  ? 'text-blue-600 border-blue-500'
                  : 'text-gray-400 border-transparent hover:text-gray-600'
              }`}
            >
              Afiliados
            </button>
          </div>

          {/* Tab Content */}
          <div className="px-6 py-5">
            {/* Campaigns Tab */}
            {activeTab === 'campaigns' && (
              <div>
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="text-left py-3 text-[13px] font-semibold text-gray-500 uppercase tracking-wide">Nombre</th>
                      <th className="text-left py-3 text-[13px] font-semibold text-gray-500 uppercase tracking-wide w-[100px]">País</th>
                      <th className="text-left py-3 text-[13px] font-semibold text-gray-500 uppercase tracking-wide w-[100px]">Afiliados</th>
                      <th className="text-left py-3 text-[13px] font-semibold text-gray-500 uppercase tracking-wide w-[100px]">Total</th>
                      <th className="text-left py-3 text-[13px] font-semibold text-blue-500 uppercase tracking-wide w-[120px]">URL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCampaigns.length > 0 ? (
                      filteredCampaigns.map((campaign) => (
                        <tr 
                          key={campaign.id} 
                          className="border-t border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors"
                          onClick={() => openEditModal(campaign)}
                        >
                          <td className="py-4">
                            <div className="flex items-center gap-4">
                              <div className="w-[72px] h-[72px] bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0">
                                {campaign.imageUrl ? (
                                  <img src={campaign.imageUrl} alt={campaign.title} className="w-full h-full object-cover" />
                                ) : campaign.bettingHouses && campaign.bettingHouses.length > 0 ? (
                                  <div className="flex flex-wrap gap-1 p-2">
                                    {campaign.bettingHouses.slice(0, 2).map((house: any) => (
                                      <div key={house.id} className="w-6 h-6 bg-white rounded flex items-center justify-center">
                                        {house.logoUrl ? (
                                          <img src={house.logoUrl} alt={house.name} className="w-5 h-5 object-contain" />
                                        ) : (
                                          <span className="text-[8px] text-gray-600">{house.name.slice(0, 2)}</span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-white text-sm font-semibold">{campaign.title.slice(0, 3)}</span>
                                )}
                              </div>
                              <div>
                                <p className="text-[15px] font-semibold text-gray-900">{campaign.title}</p>
                                <p className="text-[12px] text-gray-400 mt-0.5">ID{campaign.id.slice(-4)}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-4">
                            <div className="flex flex-col gap-0.5">
                              {campaign.countriesEnabled.slice(0, 4).map(code => (
                                <span key={code} className="text-[18px] leading-tight">{COUNTRY_INFO[code]?.flag || '🏳️'}</span>
                              ))}
                            </div>
                          </td>
                          <td className="py-4">
                            <span className="text-[15px] font-semibold text-gray-900">{campaign.totalImpressions || 0}</span>
                          </td>
                          <td className="py-4">
                            <span className="text-[15px] font-semibold text-gray-900">{formatPrice(campaign.totalClicks * 10)}</span>
                          </td>
                          <td className="py-4" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => copyToClipboard(`${baseUrl}/go/${campaign.slug}`, campaign.id)}
                              className="inline-flex items-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-600 px-4 py-2 rounded-lg text-[13px] font-medium transition-colors"
                            >
                              <LinkIcon className="w-4 h-4" />
                              {copiedId === campaign.id ? 'Copiado!' : 'Copiar'}
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-16 text-center">
                          <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                          <p className="text-gray-500">No hay campañas activas</p>
                          <button
                            onClick={() => setShowCreateModal(true)}
                            className="mt-4 text-blue-500 hover:text-blue-600 font-medium text-[14px]"
                          >
                            Crear primera campaña
                          </button>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Houses Tab */}
            {activeTab === 'houses' && (
              <div>
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="text-left py-3 text-[13px] font-semibold text-gray-500 uppercase tracking-wide">Casa de apuestas</th>
                      <th className="text-left py-3 text-[13px] font-semibold text-gray-500 uppercase tracking-wide w-[100px]">Paises</th>
                      <th className="text-left py-3 text-[13px] font-semibold text-gray-500 uppercase tracking-wide w-[120px]">Nombre</th>
                      <th className="text-left py-3 text-[13px] font-semibold text-gray-500 uppercase tracking-wide w-[150px]">Tipo de comisión</th>
                      <th className="text-left py-3 text-[13px] font-semibold text-gray-500 uppercase tracking-wide w-[150px]">Categoría</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHouses.length > 0 ? (
                      filteredHouses.map((item) => (
                        <tr key={item.house.id} className="border-t border-gray-50">
                          <td className="py-4">
                            <div className="w-[100px] h-[50px] bg-[#1a2332] rounded-lg flex items-center justify-center overflow-hidden">
                              {item.house.logoUrl ? (
                                <img src={item.house.logoUrl} alt={item.house.name} className="max-w-[90%] max-h-[90%] object-contain" />
                              ) : (
                                <span className="text-white font-bold text-[14px]">{item.house.name}</span>
                              )}
                            </div>
                          </td>
                          <td className="py-4">
                            <div className="flex flex-col gap-0.5">
                              {item.house.allowedCountries?.slice(0, 4).map(code => (
                                <span key={code} className="text-[18px] leading-tight">{COUNTRY_INFO[code]?.flag || '🏳️'}</span>
                              ))}
                            </div>
                          </td>
                          <td className="py-4">
                            <span className="text-[14px] text-gray-900">{item.house.name}</span>
                          </td>
                          <td className="py-4">
                            <span className="text-[14px] text-gray-900">CPA {formatPrice(item.house.commissionPerReferralEur)}</span>
                          </td>
                          <td className="py-4">
                            <span className="text-[14px] text-gray-500">{item.house.category || 'Casa de apuestas'}</span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-16 text-center text-gray-500">
                          No hay casas de apuestas disponibles
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Affiliates Tab */}
            {activeTab === 'affiliates' && (
              <div>
                {loadingReferrals ? (
                  <div className="text-center py-16">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr>
                        <th className="text-left py-3 text-[13px] font-semibold text-gray-500 uppercase tracking-wide">Nombre</th>
                        <th className="text-left py-3 text-[13px] font-semibold text-gray-500 uppercase tracking-wide w-[180px]">Fecha</th>
                        <th className="text-left py-3 text-[13px] font-semibold text-gray-500 uppercase tracking-wide w-[150px]">Pais</th>
                        <th className="text-right py-3 text-[13px] font-semibold text-gray-500 uppercase tracking-wide w-[100px]">CPA</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredReferrals.length > 0 ? (
                        filteredReferrals.map((referral) => (
                          <tr key={referral.id} className="border-t border-gray-50">
                            <td className="py-4">
                              <div className="flex items-center gap-4">
                                <div className="w-[50px] h-[40px] bg-[#1a2332] rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                                  {referral.houseLogoUrl ? (
                                    <img src={referral.houseLogoUrl} alt={referral.houseName} className="max-w-[90%] max-h-[90%] object-contain" />
                                  ) : (
                                    <span className="text-white font-bold text-[11px]">{referral.houseName.slice(0, 3)}</span>
                                  )}
                                </div>
                                <div>
                                  <p className="text-[14px] font-medium text-gray-900">{referral.userName}</p>
                                  <p className="text-[12px] text-gray-400">{referral.campaignName || referral.houseName}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-4">
                              <span className="text-[14px] text-gray-900">
                                {referral.convertedAt ? new Date(referral.convertedAt).toLocaleDateString('es-ES', {
                                  day: 'numeric',
                                  month: 'long',
                                  year: 'numeric'
                                }) : '-'}
                              </span>
                            </td>
                            <td className="py-4">
                              <div className="flex items-center gap-2">
                                <span className="text-[20px]">{COUNTRY_INFO[referral.country]?.flag || '🌍'}</span>
                                <span className="text-[14px] text-gray-900">{COUNTRY_INFO[referral.country]?.name || referral.country}</span>
                              </div>
                            </td>
                            <td className="py-4 text-right">
                              <span className={`text-[15px] font-semibold ${referral.status === 'APPROVED' ? 'text-gray-900' : 'text-gray-400'}`}>
                                {Math.round(referral.commissionEur)}€
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="py-16 text-center">
                            <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                            <p className="text-gray-500">No tienes afiliados registrados</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Campaign Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-[18px] font-semibold text-gray-900">Nueva Campaña</h2>
                <button onClick={() => setShowCreateModal(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-5">
              {newCampaignError && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-[13px]">{newCampaignError}</div>
              )}
              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-2">Nombre de la campaña</label>
                <input
                  type="text"
                  value={newCampaign.title}
                  onChange={(e) => setNewCampaign(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Mi campaña"
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-2">Descripción (opcional)</label>
                <textarea
                  value={newCampaign.description}
                  onChange={(e) => setNewCampaign(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Descripción de la campaña"
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-2">Imagen de portada</label>
                <input ref={newCampaignFileInputRef} type="file" accept="image/*" onChange={handleNewCampaignImageUpload} className="hidden" />
                {newCampaign.imageUrl ? (
                  <div className="relative w-32 h-24 rounded-lg overflow-hidden">
                    <img src={newCampaign.imageUrl} alt="Cover" className="w-full h-full object-cover" />
                    <button onClick={() => setNewCampaign(prev => ({ ...prev, imageUrl: '' }))} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => newCampaignFileInputRef.current?.click()}
                    disabled={newCampaignUploading}
                    className="flex items-center gap-2 px-4 py-3 border-2 border-dashed border-gray-200 rounded-lg text-gray-500 hover:border-blue-500 hover:text-blue-500 transition-colors text-[13px]"
                  >
                    {newCampaignUploading ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div> : <><ImageIcon className="w-5 h-5" /><span>Subir imagen</span></>}
                  </button>
                )}
              </div>
              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-2">Seleccionar países</label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(COUNTRY_INFO).map(([code, info]) => (
                    <button
                      key={code}
                      onClick={() => handleNewCampaignCountryToggle(code)}
                      className={`px-3 py-1.5 rounded-full text-[13px] flex items-center gap-1.5 transition-colors ${
                        newCampaign.countriesEnabled.includes(code) ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {info.flag} {info.name}
                    </button>
                  ))}
                </div>
              </div>
              {newCampaign.countriesEnabled.map(country => {
                const availableHouses = newCampaignAvailableHouses[country] || [];
                const selectedHouseIds = newCampaign.countryConfigs.find(c => c.country === country)?.items.map(i => i.bettingHouseId) || [];
                return (
                  <div key={country} className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3 text-[14px]">{COUNTRY_INFO[country]?.flag} {COUNTRY_INFO[country]?.name}</h4>
                    {availableHouses.length > 0 ? (
                      <div className="space-y-2">
                        {availableHouses.map(house => (
                          <label key={house.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                            <input type="checkbox" checked={selectedHouseIds.includes(house.id)} onChange={() => handleNewCampaignHouseToggle(country, house.id)} className="w-4 h-4 text-blue-500 rounded" />
                            <div className="w-10 h-8 bg-[#1a2332] rounded flex items-center justify-center">
                              {house.logoUrl ? <img src={house.logoUrl} alt={house.name} className="max-w-[90%] max-h-[90%] object-contain" /> : <span className="text-white text-[10px]">{house.name.slice(0, 2)}</span>}
                            </div>
                            <span className="text-[13px] text-gray-900">{house.name}</span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[13px] text-gray-500 italic">Cargando...</p>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="p-6 border-t border-gray-100 flex gap-3">
              <button onClick={() => setShowCreateModal(false)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 text-[14px] font-medium">Cancelar</button>
              <button onClick={handleCreateCampaign} disabled={saving} className="flex-1 px-4 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 text-[14px] font-medium">{saving ? 'Creando...' : 'Crear Campaña'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Campaign Modal */}
      {showEditModal && editingCampaign && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-[18px] font-semibold text-gray-900">Editar Campaña</h2>
                <button onClick={() => setShowEditModal(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-5">
              {editError && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-[13px]">{editError}</div>}
              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-2">Nombre de la campaña</label>
                <input type="text" value={editForm.title} onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-2">Descripción</label>
                <textarea value={editForm.description} onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500" rows={3} />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-2">Imagen de portada</label>
                <input ref={editFileInputRef} type="file" accept="image/*" onChange={handleEditImageUpload} className="hidden" />
                {editForm.imageUrl ? (
                  <div className="relative w-32 h-24 rounded-lg overflow-hidden">
                    <img src={editForm.imageUrl} alt="Cover" className="w-full h-full object-cover" />
                    <button onClick={() => setEditForm(prev => ({ ...prev, imageUrl: '' }))} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"><X className="w-3 h-3" /></button>
                    <button onClick={() => editFileInputRef.current?.click()} className="absolute bottom-1 right-1 bg-blue-500 text-white rounded-full p-1"><Upload className="w-3 h-3" /></button>
                  </div>
                ) : (
                  <button onClick={() => editFileInputRef.current?.click()} disabled={editUploading} className="flex items-center gap-2 px-4 py-3 border-2 border-dashed border-gray-200 rounded-lg text-gray-500 hover:border-blue-500 hover:text-blue-500 transition-colors text-[13px]">
                    {editUploading ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div> : <><ImageIcon className="w-5 h-5" /><span>Subir imagen</span></>}
                  </button>
                )}
              </div>
              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-2">Seleccionar países</label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(COUNTRY_INFO).map(([code, info]) => (
                    <button key={code} onClick={() => handleEditCountryToggle(code)} className={`px-3 py-1.5 rounded-full text-[13px] flex items-center gap-1.5 transition-colors ${editForm.countriesEnabled.includes(code) ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                      {info.flag} {info.name}
                    </button>
                  ))}
                </div>
              </div>
              {editForm.countriesEnabled.map(country => {
                const availableHouses = editAvailableHouses[country] || [];
                const selectedHouseIds = editForm.countryConfigs.find(c => c.country === country)?.items.map(i => i.bettingHouseId) || [];
                return (
                  <div key={country} className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3 text-[14px]">{COUNTRY_INFO[country]?.flag} {COUNTRY_INFO[country]?.name}</h4>
                    {availableHouses.length > 0 ? (
                      <div className="space-y-2">
                        {availableHouses.map(house => (
                          <label key={house.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                            <input type="checkbox" checked={selectedHouseIds.includes(house.id)} onChange={() => handleEditHouseToggle(country, house.id)} className="w-4 h-4 text-blue-500 rounded" />
                            <div className="w-10 h-8 bg-[#1a2332] rounded flex items-center justify-center">
                              {house.logoUrl ? <img src={house.logoUrl} alt={house.name} className="max-w-[90%] max-h-[90%] object-contain" /> : <span className="text-white text-[10px]">{house.name.slice(0, 2)}</span>}
                            </div>
                            <span className="text-[13px] text-gray-900">{house.name}</span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[13px] text-gray-500 italic">Cargando...</p>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="p-6 border-t border-gray-100 flex gap-3">
              <button onClick={() => setShowEditModal(false)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 text-[14px] font-medium">Cancelar</button>
              <button onClick={handleSaveEdit} disabled={saving} className="flex-1 px-4 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 text-[14px] font-medium">{saving ? 'Guardando...' : 'Guardar Cambios'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
