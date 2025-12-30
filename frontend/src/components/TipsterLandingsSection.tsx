'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Copy, Check, Plus, Trash2, ExternalLink, Edit, GripVertical, Eye, BarChart3, X } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.REACT_APP_BACKEND_URL;

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
  title: string | null;
  description: string | null;
  countriesEnabled: string[];
  isActive: boolean;
  totalClicks: number;
  totalImpressions: number;
  shareUrl: string;
  createdAt: string;
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

  // Create/Edit form state
  const [formData, setFormData] = useState({
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
  }, []);

  const loadLandings = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/tipster/landings`, {
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

  const loadHousesForCountry = async (country: string) => {
    if (availableHouses[country]) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/tipster/landings/houses/${country}`, {
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

  const handleCountryToggle = (country: string) => {
    const current = formData.countriesEnabled;
    let newCountries: string[];

    if (current.includes(country)) {
      newCountries = current.filter(c => c !== country);
      // Remove config for this country
      setFormData(prev => ({
        ...prev,
        countriesEnabled: newCountries,
        countryConfigs: prev.countryConfigs.filter(c => c.country !== country),
      }));
    } else {
      newCountries = [...current, country];
      // Load houses and add empty config
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
    if (formData.countriesEnabled.length === 0) {
      setFormError('Selecciona al menos un país');
      return;
    }

    // Validate at least one house per country
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
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/tipster/landings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
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
      const token = localStorage.getItem('token');
      await fetch(`${API_URL}/api/tipster/landings/${landingId}`, {
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
      const token = localStorage.getItem('token');
      await fetch(`${API_URL}/api/tipster/landings/${landing.id}`, {
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

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/tipster/landings/${landing.id}/metrics`, {
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
      title: '',
      description: '',
      countriesEnabled: ['ES'],
      countryConfigs: [],
    });
    setFormError('');
  };

  const openCreateDialog = () => {
    resetForm();
    loadHousesForCountry('ES');
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
        <Card>
          <CardContent className="p-8 text-center">
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
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {landings.map(landing => (
            <Card key={landing.id} className={!landing.isActive ? 'opacity-60' : ''}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      {landing.title || 'Landing sin título'}
                    </CardTitle>
                    <p className="text-sm text-gray-500 mt-1">
                      {landing.countriesEnabled.map(c => COUNTRY_INFO[c]?.flag || c).join(' ')}
                    </p>
                  </div>
                  <Badge variant={landing.isActive ? 'default' : 'secondary'}>
                    {landing.isActive ? 'Activa' : 'Inactiva'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
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
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(landing.slug)}
                  >
                    {copiedLink === landing.slug ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
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
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Landing Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Crear Nueva Landing</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Título */}
            <div>
              <Label htmlFor="title">Título (opcional)</Label>
              <Input
                id="title"
                placeholder="Ej: Reto Navidad, Mis casas favoritas..."
                value={formData.title}
                onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>

            {/* Descripción */}
            <div>
              <Label htmlFor="description">Descripción (opcional)</Label>
              <Textarea
                id="description"
                placeholder="Una breve descripción de tu landing..."
                value={formData.description}
                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>

            {/* Países */}
            <div>
              <Label>Países Objetivo</Label>
              <p className="text-sm text-gray-500 mb-2">
                Selecciona los países para los que quieres crear esta landing
              </p>
              <div className="flex flex-wrap gap-2">
                {ALL_COUNTRIES.map(country => (
                  <Button
                    key={country}
                    size="sm"
                    variant={formData.countriesEnabled.includes(country) ? 'default' : 'outline'}
                    onClick={() => handleCountryToggle(country)}
                  >
                    {COUNTRY_INFO[country].flag} {COUNTRY_INFO[country].name}
                  </Button>
                ))}
              </div>
            </div>

            {/* Casas por país */}
            {formData.countriesEnabled.map(country => (
              <div key={country} className="border rounded-lg p-4">
                <h4 className="font-medium mb-3">
                  {COUNTRY_INFO[country]?.flag} {COUNTRY_INFO[country]?.name || country}
                </h4>
                
                {/* Selected houses */}
                <div className="space-y-2 mb-4">
                  {formData.countryConfigs
                    .find(c => c.country === country)
                    ?.items.map((item, index) => {
                      const house = availableHouses[country]?.find(h => h.id === item.bettingHouseId);
                      if (!house) return null;
                      
                      return (
                        <div
                          key={item.bettingHouseId}
                          className="flex items-center gap-2 p-2 bg-gray-50 rounded"
                        >
                          <GripVertical className="w-4 h-4 text-gray-400" />
                          <span className="font-medium">{index + 1}.</span>
                          {house.logoUrl && (
                            <img
                              src={house.logoUrl}
                              alt={house.name}
                              className="w-8 h-8 object-contain"
                            />
                          )}
                          <span className="flex-1">{house.name}</span>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={index === 0}
                              onClick={() => handleMoveItem(country, item.bettingHouseId, 'up')}
                            >
                              ↑
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={index === (formData.countryConfigs.find(c => c.country === country)?.items.length || 0) - 1}
                              onClick={() => handleMoveItem(country, item.bettingHouseId, 'down')}
                            >
                              ↓
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleRemoveHouseFromCountry(country, item.bettingHouseId)}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                </div>

                {/* Add house */}
                <Select
                  onValueChange={value => handleAddHouseToCountry(country, value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Añadir casa de apuestas..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableHouses[country]
                      ?.filter(h => !formData.countryConfigs
                        .find(c => c.country === country)
                        ?.items.find(i => i.bettingHouseId === h.id)
                      )
                      .map(house => (
                        <SelectItem key={house.id} value={house.id}>
                          {house.name} ({house.commissionPerReferralEur}€/ref)
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>

                {!availableHouses[country]?.length && (
                  <p className="text-sm text-gray-500 mt-2">
                    No hay casas disponibles para este país
                  </p>
                )}
              </div>
            ))}

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
        </DialogContent>
      </Dialog>

      {/* Metrics Dialog */}
      <Dialog open={showMetricsDialog} onOpenChange={setShowMetricsDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Métricas: {selectedLanding?.title || 'Landing'}
            </DialogTitle>
          </DialogHeader>
          
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
        </DialogContent>
      </Dialog>
    </div>
  );
}
