'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Edit, ChevronDown, ChevronUp, ExternalLink, X, Save } from 'lucide-react';

const getBaseUrl = () => {
  if (typeof window !== 'undefined') {
    return process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || window.location.origin;
  }
  return '';
};

interface BettingHouse {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  status: string;
}

interface PromotionHouseLink {
  id: string;
  bettingHouseId: string;
  affiliateUrl: string;
  trackingParamName?: string;
  isActive: boolean;
  house?: BettingHouse;
}

interface Promotion {
  id: string;
  name: string;
  slug: string;
  description?: string;
  status: string;
  startDate?: string;
  endDate?: string;
  houseLinks?: PromotionHouseLink[];
  housesCount?: number;
  createdAt: string;
}

export default function PromotionsAdminSection() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [houses, setHouses] = useState<BettingHouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);
  const [expandedPromotion, setExpandedPromotion] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    status: 'ACTIVE',
  });
  
  // House link form state
  const [showAddHouseModal, setShowAddHouseModal] = useState(false);
  const [selectedPromotionId, setSelectedPromotionId] = useState<string | null>(null);
  const [houseLinkForm, setHouseLinkForm] = useState({
    bettingHouseId: '',
    affiliateUrl: '',
    trackingParamName: 'subid',
  });
  
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('access_token');
      const headers = { Authorization: `Bearer ${token}` };
      
      // Load promotions
      const promoRes = await fetch(`${getBaseUrl()}/api/admin/promotions`, { headers });
      if (!promoRes.ok) throw new Error('Error al cargar promociones');
      const promoData = await promoRes.json();
      setPromotions(promoData || []);
      
      // Load houses
      const housesRes = await fetch(`${getBaseUrl()}/api/affiliate/admin/houses?includeInactive=true`, { headers });
      if (housesRes.ok) {
        const housesData = await housesRes.json();
        setHouses(housesData || []);
      }
    } catch (err: any) {
      setError(err.message || 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingPromotion(null);
    setFormData({
      name: '',
      slug: '',
      description: '',
      status: 'ACTIVE',
    });
    setShowCreateModal(true);
  };

  const openEditModal = (promo: Promotion) => {
    setEditingPromotion(promo);
    setFormData({
      name: promo.name,
      slug: promo.slug,
      description: promo.description || '',
      status: promo.status,
    });
    setShowCreateModal(true);
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleNameChange = (name: string) => {
    setFormData(prev => ({
      ...prev,
      name,
      slug: editingPromotion ? prev.slug : generateSlug(name),
    }));
  };

  const savePromotion = async () => {
    if (!formData.name || !formData.slug) {
      setError('Nombre y slug son obligatorios');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const token = localStorage.getItem('access_token');
      const headers = { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };
      
      const url = editingPromotion 
        ? `${getBaseUrl()}/api/admin/promotions/${editingPromotion.id}`
        : `${getBaseUrl()}/api/admin/promotions`;
      
      const method = editingPromotion ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(formData),
      });
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Error al guardar');
      }
      
      setShowCreateModal(false);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Error al guardar promoción');
    } finally {
      setSaving(false);
    }
  };

  const deletePromotion = async (promoId: string) => {
    if (!confirm('¿Estás seguro de eliminar esta promoción? Se eliminarán todos los enlaces asociados.')) {
      return;
    }

    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${getBaseUrl()}/api/admin/promotions/${promoId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!res.ok) throw new Error('Error al eliminar');
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Error al eliminar promoción');
    }
  };

  const togglePromotionStatus = async (promo: Promotion) => {
    try {
      const token = localStorage.getItem('access_token');
      const newStatus = promo.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      
      const res = await fetch(`${getBaseUrl()}/api/admin/promotions/${promo.id}`, {
        method: 'PUT',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });
      
      if (!res.ok) throw new Error('Error al actualizar estado');
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Error al actualizar estado');
    }
  };

  const toggleExpand = async (promoId: string) => {
    if (expandedPromotion === promoId) {
      setExpandedPromotion(null);
      return;
    }
    
    // Si ya tiene houseLinks, solo expandimos
    const promo = promotions.find(p => p.id === promoId);
    if (promo && (!promo.houseLinks || promo.houseLinks.length === 0) && (promo.housesCount || 0) > 0) {
      // Cargar los house links
      try {
        const token = localStorage.getItem('access_token');
        const res = await fetch(`${getBaseUrl()}/api/admin/promotions/${promoId}`, { 
          headers: { Authorization: `Bearer ${token}` } 
        });
        if (res.ok) {
          const data = await res.json();
          setPromotions(prev => prev.map(p => 
            p.id === promoId ? { ...p, houseLinks: data.houseLinks || [] } : p
          ));
        }
      } catch (err) {
        console.error('Error loading house links:', err);
      }
    }
    
    setExpandedPromotion(promoId);
  };

  // House Link handlers
  const openAddHouseModal = (promoId: string) => {
    setSelectedPromotionId(promoId);
    setHouseLinkForm({
      bettingHouseId: '',
      affiliateUrl: '',
      trackingParamName: 'subid',
    });
    setShowAddHouseModal(true);
  };

  const addHouseLink = async () => {
    if (!selectedPromotionId || !houseLinkForm.bettingHouseId || !houseLinkForm.affiliateUrl) {
      setError('Casa y URL de afiliado son obligatorios');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${getBaseUrl()}/api/admin/promotions/${selectedPromotionId}/houses`, {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(houseLinkForm),
      });
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Error al añadir casa');
      }
      
      setShowAddHouseModal(false);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Error al añadir enlace de casa');
    } finally {
      setSaving(false);
    }
  };

  const removeHouseLink = async (linkId: string) => {
    if (!confirm('¿Eliminar este enlace de casa?')) return;

    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${getBaseUrl()}/api/admin/promotions/houses/${linkId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!res.ok) throw new Error('Error al eliminar enlace');
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Error al eliminar enlace');
    }
  };

  const getStatusBadge = (status: string) => {
    return status === 'ACTIVE' 
      ? <span className="px-2 py-1 text-xs font-medium rounded bg-green-100 text-green-800">Activo</span>
      : <span className="px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-800">Inactivo</span>;
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
          <h2 className="text-xl font-bold text-gray-900">Retos / Promociones</h2>
          <p className="text-sm text-gray-500">
            Crea retos con enlaces específicos de afiliación por casa de apuestas
          </p>
        </div>
        <Button onClick={openCreateModal} className="bg-red-600 hover:bg-red-700">
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Reto
        </Button>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-600 text-sm">{error}</p>
          <button onClick={() => setError(null)} className="text-xs text-red-500 underline mt-1">
            Cerrar
          </button>
        </div>
      )}

      {/* Info box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h4 className="font-medium text-blue-800 mb-1">¿Cómo funciona?</h4>
        <p className="text-sm text-blue-700">
          1. Crea un <strong>Reto</strong> (ej: "Reto Navidad 2025")<br/>
          2. Añade las <strong>casas de apuestas</strong> con el <strong>link específico</strong> de esa promoción<br/>
          3. Los tipsters seleccionan el reto al crear sus landings<br/>
          4. Cuando un usuario hace clic, será redirigido al <strong>link específico del reto</strong>
        </p>
      </div>

      {/* Promotions List */}
      {promotions.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="text-gray-400 mb-4">
            <Plus className="w-12 h-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay retos creados</h3>
          <p className="text-gray-500 mb-4">Crea tu primer reto para que los tipsters puedan usarlo</p>
          <Button onClick={openCreateModal} className="bg-red-600 hover:bg-red-700">
            Crear Primer Reto
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {promotions.map((promo) => (
            <div key={promo.id} className="bg-white rounded-lg shadow overflow-hidden">
              {/* Promotion Header */}
              <div 
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                onClick={() => setExpandedPromotion(expandedPromotion === promo.id ? null : promo.id)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-lg">🎁</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{promo.name}</h3>
                    <p className="text-sm text-gray-500">
                      {promo.housesCount || promo.houseLinks?.length || 0} casas • Slug: {promo.slug}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {getStatusBadge(promo.status)}
                  <div className="flex gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); openEditModal(promo); }}
                      className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); togglePromotionStatus(promo); }}
                      className={`p-2 rounded ${promo.status === 'ACTIVE' ? 'text-yellow-600 hover:bg-yellow-50' : 'text-green-600 hover:bg-green-50'}`}
                    >
                      {promo.status === 'ACTIVE' ? '⏸️' : '▶️'}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); deletePromotion(promo.id); }}
                      className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  {expandedPromotion === promo.id ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </div>

              {/* Expanded Content - House Links */}
              {expandedPromotion === promo.id && (
                <div className="border-t border-gray-100 p-4 bg-gray-50">
                  {promo.description && (
                    <p className="text-sm text-gray-600 mb-4">{promo.description}</p>
                  )}
                  
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-gray-700">Casas de Apuestas con Link Específico</h4>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openAddHouseModal(promo.id)}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Añadir Casa
                    </Button>
                  </div>

                  {(!promo.houseLinks || promo.houseLinks.length === 0) ? (
                    <div className="text-center py-6 bg-white rounded-lg border border-dashed border-gray-300">
                      <p className="text-gray-500 text-sm mb-2">No hay casas configuradas</p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openAddHouseModal(promo.id)}
                      >
                        Añadir Primera Casa
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {promo.houseLinks.map((link) => (
                        <div key={link.id} className="bg-white rounded-lg border border-gray-200 p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {link.house?.logoUrl ? (
                                <img 
                                  src={link.house.logoUrl} 
                                  alt={link.house?.name} 
                                  className="w-8 h-8 object-contain"
                                />
                              ) : (
                                <div className="w-8 h-8 bg-gray-200 rounded flex items-center justify-center text-xs font-bold">
                                  {link.house?.name?.charAt(0) || '?'}
                                </div>
                              )}
                              <div>
                                <div className="font-medium text-gray-900">
                                  {link.house?.name || 'Casa desconocida'}
                                </div>
                                <div className="text-xs text-gray-500 truncate max-w-md">
                                  {link.affiliateUrl}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <a
                                href={link.affiliateUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 text-gray-400 hover:text-blue-600 rounded"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                              <button
                                onClick={() => removeHouseLink(link.id)}
                                className="p-2 text-gray-400 hover:text-red-600 rounded"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Promotion Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-lg w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">
                  {editingPromotion ? 'Editar Reto' : 'Nuevo Reto'}
                </h2>
                <button onClick={() => setShowCreateModal(false)} className="p-1 hover:bg-gray-100 rounded">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre del Reto *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="Ej: Reto Navidad 2025"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Slug (URL) *
                  </label>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="reto-navidad-2025"
                    disabled={!!editingPromotion}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Solo letras minúsculas, números y guiones
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descripción (opcional)
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    rows={3}
                    placeholder="Descripción del reto..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Estado
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  >
                    <option value="ACTIVE">Activo</option>
                    <option value="INACTIVE">Inactivo</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                  Cancelar
                </Button>
                <Button 
                  onClick={savePromotion} 
                  disabled={saving || !formData.name || !formData.slug}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {saving ? 'Guardando...' : (editingPromotion ? 'Guardar Cambios' : 'Crear Reto')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add House Link Modal */}
      {showAddHouseModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-lg w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">Añadir Casa al Reto</h2>
                <button onClick={() => setShowAddHouseModal(false)} className="p-1 hover:bg-gray-100 rounded">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Casa de Apuestas *
                  </label>
                  <select
                    value={houseLinkForm.bettingHouseId}
                    onChange={(e) => setHouseLinkForm({ ...houseLinkForm, bettingHouseId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  >
                    <option value="">Selecciona una casa...</option>
                    {houses.filter(h => h.status === 'ACTIVE').map((house) => (
                      <option key={house.id} value={house.id}>
                        {house.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Link de Afiliación Específico *
                  </label>
                  <input
                    type="url"
                    value={houseLinkForm.affiliateUrl}
                    onChange={(e) => setHouseLinkForm({ ...houseLinkForm, affiliateUrl: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="https://casa.com/promo-especial?aff=..."
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Este es el link específico de esta promoción/reto para esta casa
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Parámetro de Tracking (opcional)
                  </label>
                  <input
                    type="text"
                    value={houseLinkForm.trackingParamName}
                    onChange={(e) => setHouseLinkForm({ ...houseLinkForm, trackingParamName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="subid"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Parámetro donde se añadirá el ID del tipster (default: subid)
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <Button variant="outline" onClick={() => setShowAddHouseModal(false)}>
                  Cancelar
                </Button>
                <Button 
                  onClick={addHouseLink} 
                  disabled={saving || !houseLinkForm.bettingHouseId || !houseLinkForm.affiliateUrl}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {saving ? 'Añadiendo...' : 'Añadir Casa'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
