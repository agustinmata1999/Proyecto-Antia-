'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Copy, Check, Plus, Trash2, ExternalLink, GripVertical, Eye, BarChart3, X } from 'lucide-react';

// For client-side, we need to use NEXT_PUBLIC_ prefix or hardcode
const getBaseUrl = () => {
  if (typeof window !== 'undefined') {
    // Client-side: use window.location or env var
    return process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 
           window.location.origin;
  }
  return process.env.REACT_APP_BACKEND_URL || '';
};

const BASE_URL = getBaseUrl();

const COUNTRY_INFO: Record<string, { name: string; flag: string }> = {
  ES: { name: 'España', flag: '🇪🇸' },
  MX: { name: 'México', flag: '🇲🇽' },
  AR: { name: 'Argentina', flag: '🇦🇷' },
  CO: { name: 'Colombia', flag: '🇨🇴' },
  CL: { name: 'Chile', flag: '🇨🇱' },
  PE: { name: 'Perú', flag: '🇵🇪' },
  US: { name: 'Estados Unidos', flag: '🇺🇸' },
  UK: { name: 'Reino Unido', flag: '🇬🇧' },
};

const ALL_COUNTRIES = Object.keys(COUNTRY_INFO);

interface Landing {
  id: string;
  slug: string;
  promotionId: string | null;
  promotionName: string | null;
  title: string | null;
  description: string | null;
  countriesEnabled: string[];
  isActive: boolean;
  totalClicks: number;
  totalImpressions: number;
  shareUrl: string;
  createdAt: string;
}

interface Promotion {
  id: string;
  name: string;
  description: string | null;
  slug: string;
}

interface PromotionHouse {
  bettingHouseId: string;
  affiliateUrl: string;
  house: {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
    allowedCountries: string[];
  };
}

interface BettingHouse {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  description: string | null;
  commissionPerReferralEur: number;
}

interface LandingItem {
  bettingHouseId: string;
  orderIndex: number;
  customTermsText?: string;
}

interface CountryConfig {
  country: string;
  items: LandingItem[];
}

export default function TipsterLandingsSection() {
  const [landings, setLandings] = useState<Landing[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showMetricsDialog, setShowMetricsDialog] = useState(false);
  const [selectedLanding, setSelectedLanding] = useState<Landing | null>(null);
  const [metrics, setMetrics] = useState<any>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  // Promotions state
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [promotionHouses, setPromotionHouses] = useState<PromotionHouse[]>([]);

  // Create/Edit form state
  const [formData, setFormData] = useState({
    promotionId: '' as string,
    title: '',
    description: '',
    countriesEnabled: ['ES'] as string[],
    countryConfigs: [] as CountryConfig[],
  });
  const [availableHouses, setAvailableHouses] = useState<Record<string, BettingHouse[]>>({});
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  useEffect(() => {
    loadLandings();
    loadPromotions();
  }, []);

  const loadLandings = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${getBaseUrl()}/api/tipster/landings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setLandings(data);
      }
    } catch (err) {
      console.error('Error loading landings:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadPromotions = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${getBaseUrl()}/api/promotions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPromotions(data);
      }
    } catch (err) {
      console.error('Error loading promotions:', err);
    }
  };

  const loadPromotionHouses = async (promotionId: string) => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${getBaseUrl()}/api/promotions/${promotionId}/houses`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPromotionHouses(data);
        // Reset country configs when promotion changes
        setFormData(prev => ({
          ...prev,
          countryConfigs: [],
        }));
      }
    } catch (err) {
      console.error('Error loading promotion houses:', err);
    }
  };

  const loadHousesForCountry = async (country: string) => {
    // Si hay promoción seleccionada, usar las casas de la promoción
    if (formData.promotionId) {
      return; // Ya tenemos las casas de la promoción
    }

    if (availableHouses[country]) return;

    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${getBaseUrl()}/api/tipster/landings/houses/${country}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const houses = await res.json();
        setAvailableHouses(prev => ({ ...prev, [country]: houses }));
      }
    } catch (err) {
      console.error('Error loading houses:', err);
    }
  };

  const handlePromotionChange = (promotionId: string) => {
    setFormData(prev => ({
      ...prev,
      promotionId,
      countryConfigs: [],
    }));
    setPromotionHouses([]);
    if (promotionId) {
      loadPromotionHouses(promotionId);
    }
  };

  const handleCountryToggle = (country: string) => {
    const current = formData.countriesEnabled;
    let newCountries: string[];

    if (current.includes(country)) {
      newCountries = current.filter(c => c !== country);
      setFormData(prev => ({
        ...prev,
        countriesEnabled: newCountries,
        countryConfigs: prev.countryConfigs.filter(c => c.country !== country),
      }));
    } else {
      newCountries = [...current, country];
      loadHousesForCountry(country);
      setFormData(prev => ({
        ...prev,
        countriesEnabled: newCountries,
        countryConfigs: [...prev.countryConfigs, { country, items: [] }],
      }));
    }
  };

  const handleAddHouseToCountry = (country: string, houseId: string) => {
    setFormData(prev => {
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

  const handleRemoveHouseFromCountry = (country: string, houseId: string) => {
    setFormData(prev => {
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

  const handleMoveItem = (country: string, houseId: string, direction: 'up' | 'down') => {
    setFormData(prev => {
      const configs = [...prev.countryConfigs];
      const configIndex = configs.findIndex(c => c.country === country);
      
      if (configIndex !== -1) {
        const items = [...configs[configIndex].items];
        const itemIndex = items.findIndex(i => i.bettingHouseId === houseId);
        
        if (itemIndex !== -1) {
          const newIndex = direction === 'up' ? itemIndex - 1 : itemIndex + 1;
          if (newIndex >= 0 && newIndex < items.length) {
            [items[itemIndex], items[newIndex]] = [items[newIndex], items[itemIndex]];
            items.forEach((item, i) => item.orderIndex = i);
            configs[configIndex].items = items;
          }
        }
      }
      
      return { ...prev, countryConfigs: configs };
    });
  };

  const handleCreateLanding = async () => {
    if (!formData.promotionId) {
      setFormError('Selecciona una campaña');
      return;
    }

    if (formData.countriesEnabled.length === 0) {
      setFormError('Selecciona al menos un país');
      return;
    }

    for (const country of formData.countriesEnabled) {
      const config = formData.countryConfigs.find(c => c.country === country);
      if (!config || config.items.length === 0) {
        setFormError(`Añade al menos una casa de apuestas para ${COUNTRY_INFO[country]?.name || country}`);
        return;
      }
    }

    setSaving(true);
    setFormError('');

    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${getBaseUrl()}/api/tipster/landings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          promotionId: formData.promotionId,
          title: formData.title || undefined,
          description: formData.description || undefined,
          countriesEnabled: formData.countriesEnabled,
          countryConfigs: formData.countryConfigs,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Error al crear landing');
      }

      await loadLandings();
      setShowCreateDialog(false);
      resetForm();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLanding = async (landingId: string) => {
    if (!confirm('¿Estás seguro de eliminar esta landing?')) return;

    try {
      const token = localStorage.getItem('access_token');
      await fetch(`${getBaseUrl()}/api/tipster/landings/${landingId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      await loadLandings();
    } catch (err) {
      console.error('Error deleting landing:', err);
    }
  };

  const handleToggleActive = async (landing: Landing) => {
    try {
      const token = localStorage.getItem('access_token');
      await fetch(`${getBaseUrl()}/api/tipster/landings/${landing.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isActive: !landing.isActive }),
      });
      await loadLandings();
    } catch (err) {
      console.error('Error toggling landing:', err);
    }
  };

  const handleViewMetrics = async (landing: Landing) => {
    setSelectedLanding(landing);
    setShowMetricsDialog(true);
    setMetrics(null);

    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${getBaseUrl()}/api/tipster/landings/${landing.id}/metrics`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMetrics(data);
      }
    } catch (err) {
      console.error('Error loading metrics:', err);
    }
  };

  const copyToClipboard = async (slug: string) => {
    const link = `${baseUrl}/go/${slug}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopiedLink(slug);
      setTimeout(() => setCopiedLink(null), 2000);
    } catch (err) {
      console.error('Error copying:', err);
    }
  };

  const resetForm = () => {
    setFormData({
      promotionId: '',
      title: '',
      description: '',
      countriesEnabled: ['ES'],
      countryConfigs: [],
    });
    setPromotionHouses([]);
    setFormError('');
  };

  const openCreateDialog = () => {
    resetForm();
    setShowCreateDialog(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Mis Landings</h2>
          <p className="text-gray-600">
            Crea páginas de afiliación personalizadas con tus casas de apuestas favoritas
          </p>
        </div>
        <Button onClick={openCreateDialog} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Crear Landing
        </Button>
      </div>

      {/* Landings List */}
      {landings.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="text-gray-400 mb-4">
            <ExternalLink className="w-12 h-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No tienes landings creadas
          </h3>
          <p className="text-gray-500 mb-4">
            Crea tu primera landing para compartir tus enlaces de afiliado
          </p>
          <Button onClick={openCreateDialog}>
            Crear mi primera Landing
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {landings.map(landing => (
            <div 
              key={landing.id} 
              className={`bg-white rounded-lg shadow p-4 ${!landing.isActive ? 'opacity-60' : ''}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {landing.title || 'Landing sin título'}
                  </h3>
                  {landing.promotionName && (
                    <p className="text-sm text-blue-600 font-medium">
                      🎁 {landing.promotionName}
                    </p>
                  )}
                  <p className="text-sm text-gray-500">
                    {landing.countriesEnabled.map(c => COUNTRY_INFO[c]?.flag || c).join(' ')}
                  </p>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  landing.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                }`}>
                  {landing.isActive ? 'Activa' : 'Inactiva'}
                </span>
              </div>

              {/* Stats */}
              <div className="flex gap-4 mb-4 text-sm">
                <div className="flex items-center gap-1 text-gray-600">
                  <Eye className="w-4 h-4" />
                  <span>{landing.totalImpressions} vistas</span>
                </div>
                <div className="flex items-center gap-1 text-gray-600">
                  <BarChart3 className="w-4 h-4" />
                  <span>{landing.totalClicks} clicks</span>
                </div>
              </div>

              {/* Link */}
              <div className="flex items-center gap-2 mb-4 p-2 bg-gray-100 rounded text-sm">
                <code className="flex-1 truncate text-gray-700">
                  {baseUrl}/go/{landing.slug}
                </code>
                <button
                  onClick={() => copyToClipboard(landing.slug)}
                  className="p-1 hover:bg-gray-200 rounded"
                >
                  {copiedLink === landing.slug ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleViewMetrics(landing)}
                >
                  <BarChart3 className="w-4 h-4 mr-1" />
                  Métricas
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(`/go/${landing.slug}`, '_blank')}
                >
                  <ExternalLink className="w-4 h-4 mr-1" />
                  Ver
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleToggleActive(landing)}
                >
                  {landing.isActive ? 'Desactivar' : 'Activar'}
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleDeleteLanding(landing.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Landing Dialog */}
      {showCreateDialog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">Crear Nueva Landing</h2>
                <button onClick={() => setShowCreateDialog(false)} className="p-1 hover:bg-gray-100 rounded">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-6">
                {/* Selección de Campaña */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Campaña <span className="text-red-500">*</span>
                  </label>
                  <p className="text-sm text-gray-500 mb-2">
                    Selecciona la campaña que quieres promocionar
                  </p>
                  <select
                    value={formData.promotionId}
                    onChange={e => handlePromotionChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Selecciona una campaña...</option>
                    {promotions.map(promo => (
                      <option key={promo.id} value={promo.id}>
                        🎁 {promo.name}
                      </option>
                    ))}
                  </select>
                  {promotions.length === 0 && (
                    <p className="text-sm text-yellow-600 mt-1">
                      No hay retos disponibles. Contacta al administrador.
                    </p>
                  )}
                </div>

                {/* Título */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Título (opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Mi Reto Navidad..."
                    value={formData.title}
                    onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Descripción */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descripción (opcional)
                  </label>
                  <textarea
                    placeholder="Una breve descripción de tu landing..."
                    value={formData.description}
                    onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={2}
                  />
                </div>

                {/* Países */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Países Objetivo
                  </label>
                  <p className="text-sm text-gray-500 mb-2">
                    Selecciona los países para los que quieres crear esta landing
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {ALL_COUNTRIES.map(country => (
                      <button
                        key={country}
                        onClick={() => handleCountryToggle(country)}
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          formData.countriesEnabled.includes(country)
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {COUNTRY_INFO[country].flag} {COUNTRY_INFO[country].name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Casas por país - usando las casas de la promoción */}
                {formData.promotionId && formData.countriesEnabled.map(country => {
                  // Filtrar casas de la promoción que están disponibles en este país
                  const housesForCountry = promotionHouses.filter(ph => 
                    ph.house.allowedCountries.includes(country)
                  );
                  
                  return (
                    <div key={country} className="border rounded-lg p-4">
                      <h4 className="font-medium mb-3">
                        {COUNTRY_INFO[country]?.flag} {COUNTRY_INFO[country]?.name || country}
                      </h4>
                      
                      {/* Selected houses */}
                      <div className="space-y-2 mb-4">
                        {formData.countryConfigs
                          .find(c => c.country === country)
                          ?.items.map((item, index) => {
                            const promoHouse = promotionHouses.find(ph => ph.bettingHouseId === item.bettingHouseId);
                            if (!promoHouse) return null;
                            
                            return (
                              <div
                                key={item.bettingHouseId}
                                className="flex items-center gap-2 p-2 bg-gray-50 rounded"
                              >
                                <GripVertical className="w-4 h-4 text-gray-400" />
                                <span className="font-medium">{index + 1}.</span>
                                {promoHouse.house.logoUrl && (
                                  <img
                                    src={promoHouse.house.logoUrl}
                                    alt={promoHouse.house.name}
                                    className="w-8 h-8 object-contain"
                                  />
                                )}
                                <span className="flex-1">{promoHouse.house.name}</span>
                                <div className="flex gap-1">
                                  <button
                                    disabled={index === 0}
                                    onClick={() => handleMoveItem(country, item.bettingHouseId, 'up')}
                                    className="px-2 py-1 text-sm bg-gray-200 rounded disabled:opacity-50"
                                  >
                                    ↑
                                  </button>
                                  <button
                                    disabled={index === (formData.countryConfigs.find(c => c.country === country)?.items.length || 0) - 1}
                                    onClick={() => handleMoveItem(country, item.bettingHouseId, 'down')}
                                    className="px-2 py-1 text-sm bg-gray-200 rounded disabled:opacity-50"
                                  >
                                    ↓
                                  </button>
                                  <button
                                    onClick={() => handleRemoveHouseFromCountry(country, item.bettingHouseId)}
                                    className="px-2 py-1 text-sm bg-red-100 text-red-600 rounded hover:bg-red-200"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                      </div>

                      {/* Add house from promotion */}
                      <select
                        onChange={e => {
                          if (e.target.value) {
                            handleAddHouseToCountry(country, e.target.value);
                            e.target.value = '';
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="">Añadir casa de apuestas...</option>
                        {housesForCountry
                          .filter(ph => !formData.countryConfigs
                            .find(c => c.country === country)
                            ?.items.find(i => i.bettingHouseId === ph.bettingHouseId)
                          )
                          .map(ph => (
                            <option key={ph.bettingHouseId} value={ph.bettingHouseId}>
                              {ph.house.name}
                            </option>
                          ))}
                      </select>

                      {housesForCountry.length === 0 && (
                        <p className="text-sm text-yellow-600 mt-2">
                          No hay casas disponibles para {COUNTRY_INFO[country]?.name} en este reto.
                        </p>
                      )}
                    </div>
                  );
                })}

                {/* Mensaje si no hay promoción seleccionada */}
                {!formData.promotionId && formData.countriesEnabled.length > 0 && (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-yellow-700 text-sm">
                      Selecciona un reto/promoción para ver las casas de apuestas disponibles.
                    </p>
                  </div>
                )}

                {/* Error */}
                {formError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
                    {formError}
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleCreateLanding} disabled={saving}>
                    {saving ? 'Creando...' : 'Crear Landing'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Metrics Dialog */}
      {showMetricsDialog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-lg w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">
                  Métricas: {selectedLanding?.title || 'Landing'}
                </h2>
                <button onClick={() => setShowMetricsDialog(false)} className="p-1 hover:bg-gray-100 rounded">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {metrics ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 rounded text-center">
                      <div className="text-2xl font-bold">{metrics.landing?.totalImpressions || 0}</div>
                      <div className="text-sm text-gray-500">Vistas</div>
                    </div>
                    <div className="p-4 bg-gray-50 rounded text-center">
                      <div className="text-2xl font-bold">{metrics.landing?.totalClicks || 0}</div>
                      <div className="text-sm text-gray-500">Clicks</div>
                    </div>
                  </div>

                  {metrics.clicksByCountry?.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Clicks por País</h4>
                      <div className="space-y-1">
                        {metrics.clicksByCountry.map((c: any) => (
                          <div key={c.country} className="flex justify-between text-sm">
                            <span>
                              {COUNTRY_INFO[c.country]?.flag} {COUNTRY_INFO[c.country]?.name || c.country}
                            </span>
                            <span className="font-medium">{c.clicks}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {metrics.clicksByHouse?.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Clicks por Casa</h4>
                      <div className="space-y-1">
                        {metrics.clicksByHouse.map((h: any) => (
                          <div key={h.houseId} className="flex justify-between text-sm">
                            <span>{h.houseName}</span>
                            <span className="font-medium">{h.clicks}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
