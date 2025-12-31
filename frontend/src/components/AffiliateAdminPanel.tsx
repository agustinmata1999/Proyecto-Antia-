'use client';

import { useEffect, useState } from 'react';
import { affiliateApi } from '@/lib/api';
import AffiliateStatsSection from './admin/AffiliateStatsSection';

type AffiliateTab = 'houses' | 'stats' | 'import' | 'conversions' | 'payouts';

interface BettingHouse {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  status: string;
  masterAffiliateUrl: string;
  trackingParamName: string;
  commissionPerReferralCents: number;
  commissionPerReferralEur: number;
  allowedCountries: string[];
  blockedCountries: string[];
  description?: string;
  websiteUrl?: string;
}

interface ImportBatch {
  id: string;
  houseId: string;
  houseName: string;
  periodMonth: string;
  fileName: string;
  totalRows: number;
  processedRows: number;
  errorRows: number;
  status: string;
  importedAt: string;
}

interface Payout {
  id: string;
  tipsterId: string;
  tipsterName: string;
  periodMonth: string;
  totalReferrals: number;
  totalAmountCents: number;
  totalAmountEur: number;
  status: string;
  paidAt?: string;
}

const COUNTRIES = [
  { code: 'ES', name: 'España' },
  { code: 'DE', name: 'Alemania' },
  { code: 'IT', name: 'Italia' },
  { code: 'AT', name: 'Austria' },
  { code: 'PT', name: 'Portugal' },
  { code: 'GR', name: 'Grecia' },
  { code: 'BE', name: 'Bélgica' },
  { code: 'NL', name: 'Países Bajos' },
  { code: 'MX', name: 'México' },
  { code: 'CO', name: 'Colombia' },
  { code: 'AR', name: 'Argentina' },
  { code: 'CL', name: 'Chile' },
  { code: 'PE', name: 'Perú' },
  { code: 'US', name: 'Estados Unidos' },
  { code: 'UK', name: 'Reino Unido' },
  { code: 'FR', name: 'Francia' },
];

export default function AffiliateAdminPanel() {
  const [activeTab, setActiveTab] = useState<AffiliateTab>('houses');
  const [loading, setLoading] = useState(true);
  
  // Data states
  const [houses, setHouses] = useState<BettingHouse[]>([]);
  const [importBatches, setImportBatches] = useState<ImportBatch[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  
  // Referrals/Conversions state
  interface Referral {
    id: string;
    tipsterId: string;
    tipsterName: string;
    houseId: string;
    houseName: string;
    userId?: string;
    userEmail?: string;
    userTelegram?: string;
    country: string;
    eventType: string;
    status: string;
    amountCents: number;
    commissionCents: number;
    clickedAt: string;
    convertedAt?: string;
    externalRefId?: string;
  }
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [referralsLoading, setReferralsLoading] = useState(false);
  const [referralFilters, setReferralFilters] = useState({
    tipsterId: '',
    houseId: '',
    status: '',
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });
  const [referralStats, setReferralStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    totalCommissionCents: 0,
  });
  const [tipstersList, setTipstersList] = useState<{id: string, name: string}[]>([]);
  
  // Modal states
  const [showHouseModal, setShowHouseModal] = useState(false);
  const [editingHouse, setEditingHouse] = useState<BettingHouse | null>(null);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [selectedPayout, setSelectedPayout] = useState<Payout | null>(null);
  
  // Form states
  const [houseForm, setHouseForm] = useState({
    name: '',
    slug: '',
    logoUrl: '',
    masterAffiliateUrl: '',
    trackingParamName: 'subid',
    commissionPerReferralCents: 5000,
    allowedCountries: [] as string[],
    blockedCountries: [] as string[],
    description: '',
    websiteUrl: '',
  });
  
  const [campaignForm, setCampaignForm] = useState({
    name: '',
    slug: '',
    description: '',
    houseIds: [] as string[],
    targetCountries: [] as string[],
  });
  
  const [importForm, setImportForm] = useState({
    houseId: '',
    periodMonth: new Date().toISOString().slice(0, 7), // YYYY-MM format
    file: null as File | null,
  });
  
  const [payoutForm, setPayoutForm] = useState({
    paymentMethod: 'BANK_TRANSFER',
    paymentReference: '',
    notes: '',
  });
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    // Stats tab handles its own loading
    if (activeTab === 'stats') {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      if (activeTab === 'houses') {
        const res = await affiliateApi.admin.getHouses(true);
        setHouses(res.data || []);
      } else if (activeTab === 'import') {
        const [housesRes, batchesRes] = await Promise.all([
          affiliateApi.admin.getHouses(true),
          affiliateApi.admin.getImportBatches(),
        ]);
        setHouses(housesRes.data || []);
        setImportBatches(batchesRes.data || []);
      } else if (activeTab === 'conversions') {
        await loadReferrals();
      } else if (activeTab === 'payouts') {
        const res = await affiliateApi.admin.getPayouts();
        setPayouts(res.data || []);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const loadReferrals = async () => {
    setReferralsLoading(true);
    try {
      const [referralsRes, housesRes, tipstersRes] = await Promise.all([
        affiliateApi.admin.getReferrals(referralFilters),
        affiliateApi.admin.getHouses(true),
        affiliateApi.admin.getTipsters(),
      ]);
      setReferrals(referralsRes.data.referrals || []);
      setReferralStats(referralsRes.data.stats || { total: 0, pending: 0, approved: 0, rejected: 0, totalCommissionCents: 0 });
      setHouses(housesRes.data || []);
      setTipstersList(tipstersRes.data || []);
    } catch (err: any) {
      console.error('Error loading referrals:', err);
    } finally {
      setReferralsLoading(false);
    }
  };

  const updateReferralStatus = async (referralId: string, newStatus: string) => {
    try {
      await affiliateApi.admin.updateReferralStatus(referralId, newStatus);
      await loadReferrals();
    } catch (err) {
      console.error('Error updating referral status:', err);
      alert('Error al actualizar estado');
    }
  };

  // HOUSE HANDLERS
  const openHouseModal = (house?: BettingHouse) => {
    if (house) {
      setEditingHouse(house);
      setHouseForm({
        name: house.name,
        slug: house.slug,
        logoUrl: house.logoUrl || '',
        masterAffiliateUrl: house.masterAffiliateUrl,
        trackingParamName: house.trackingParamName,
        commissionPerReferralCents: house.commissionPerReferralCents,
        allowedCountries: house.allowedCountries,
        blockedCountries: house.blockedCountries,
        description: house.description || '',
        websiteUrl: house.websiteUrl || '',
      });
    } else {
      setEditingHouse(null);
      setHouseForm({
        name: '',
        slug: '',
        logoUrl: '',
        masterAffiliateUrl: '',
        trackingParamName: 'subid',
        commissionPerReferralCents: 5000,
        allowedCountries: [],
        blockedCountries: [],
        description: '',
        websiteUrl: '',
      });
    }
    setShowHouseModal(true);
  };

  const saveHouse = async () => {
    setSaving(true);
    setError(null);
    try {
      if (editingHouse) {
        await affiliateApi.admin.updateHouse(editingHouse.id, houseForm);
      } else {
        await affiliateApi.admin.createHouse(houseForm);
      }
      setShowHouseModal(false);
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al guardar casa');
    } finally {
      setSaving(false);
    }
  };

  const toggleHouseStatus = async (house: BettingHouse) => {
    try {
      await affiliateApi.admin.updateHouse(house.id, {
        status: house.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
      });
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cambiar estado');
    }
  };

  // CAMPAIGN HANDLERS
  const openCampaignModal = (campaign?: Campaign) => {
    if (campaign) {
      setEditingCampaign(campaign);
      setCampaignForm({
        name: campaign.name,
        slug: campaign.slug,
        description: campaign.description || '',
        houseIds: campaign.houseIds,
        targetCountries: campaign.targetCountries,
      });
    } else {
      setEditingCampaign(null);
      setCampaignForm({
        name: '',
        slug: '',
        description: '',
        houseIds: [],
        targetCountries: [],
      });
    }
    setShowCampaignModal(true);
  };

  const saveCampaign = async () => {
    setSaving(true);
    setError(null);
    try {
      if (editingCampaign) {
        await affiliateApi.admin.updateCampaign(editingCampaign.id, campaignForm);
      } else {
        await affiliateApi.admin.createCampaign(campaignForm);
      }
      setShowCampaignModal(false);
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al guardar campaña');
    } finally {
      setSaving(false);
    }
  };

  // IMPORT HANDLERS
  const handleImportCsv = async () => {
    if (!importForm.file || !importForm.houseId) {
      setError('Selecciona una casa y un archivo CSV');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', importForm.file);
      formData.append('houseId', importForm.houseId);
      formData.append('periodMonth', importForm.periodMonth);
      
      await affiliateApi.admin.importCsv(formData);
      setShowImportModal(false);
      setImportForm({ houseId: '', periodMonth: new Date().toISOString().slice(0, 7), file: null });
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al importar CSV');
    } finally {
      setSaving(false);
    }
  };

  // PAYOUT HANDLERS
  const generatePayouts = async () => {
    const periodMonth = prompt('Ingresa el período (formato: YYYY-MM)', new Date().toISOString().slice(0, 7));
    if (!periodMonth) return;
    
    setSaving(true);
    setError(null);
    try {
      await affiliateApi.admin.generatePayouts(periodMonth);
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al generar liquidaciones');
    } finally {
      setSaving(false);
    }
  };

  const openPayoutModal = (payout: Payout) => {
    setSelectedPayout(payout);
    setPayoutForm({ paymentMethod: 'BANK_TRANSFER', paymentReference: '', notes: '' });
    setShowPayoutModal(true);
  };

  const markPayoutPaid = async () => {
    if (!selectedPayout) return;
    
    setSaving(true);
    setError(null);
    try {
      await affiliateApi.admin.markPayoutPaid(selectedPayout.id, payoutForm);
      setShowPayoutModal(false);
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al marcar como pagado');
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      ACTIVE: 'bg-green-100 text-green-800',
      INACTIVE: 'bg-gray-100 text-gray-800',
      PAID: 'bg-green-100 text-green-800',
      PENDING: 'bg-yellow-100 text-yellow-800',
      COMPLETED: 'bg-blue-100 text-blue-800',
      FAILED: 'bg-red-100 text-red-800',
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">🤝 Afiliación</h1>
        <p className="text-gray-600 mt-1">Gestiona casas de apuestas y estadísticas de campañas de tipsters</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-600">{error}</p>
          <button onClick={() => setError(null)} className="text-sm text-red-500 underline mt-1">Cerrar</button>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px overflow-x-auto">
            {[
              { id: 'houses', label: '🏠 Casas de Apuestas' },
              { id: 'stats', label: '📊 Estadísticas' },
              { id: 'conversions', label: '👥 Conversiones' },
              { id: 'import', label: '📤 Importar CSV' },
              { id: 'payouts', label: '💵 Liquidaciones' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as AffiliateTab)}
                className={`px-6 py-4 text-sm font-medium border-b-2 whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-red-600 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
                {tab.id === 'conversions' && referralStats.pending > 0 && (
                  <span className="ml-2 bg-yellow-500 text-white px-2 py-0.5 rounded-full text-xs">
                    {referralStats.pending}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* HOUSES TAB */}
          {activeTab === 'houses' && (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Casas de Apuestas</h2>
                <button
                  onClick={() => openHouseModal()}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  + Nueva Casa
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Casa</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Comisión</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Países</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Estado</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {houses.map((house) => (
                      <tr key={house.id}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {house.logoUrl ? (
                              <img src={house.logoUrl} alt={house.name} className="w-10 h-10 object-contain" />
                            ) : (
                              <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center font-bold">
                                {house.name.charAt(0)}
                              </div>
                            )}
                            <div>
                              <div className="font-medium">{house.name}</div>
                              <div className="text-sm text-gray-500">{house.slug}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-green-600 font-medium">
                          €{house.commissionPerReferralEur}/ref
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {house.allowedCountries.length > 0 
                            ? `✅ ${house.allowedCountries.join(', ')}`
                            : house.blockedCountries.length > 0 
                              ? `❌ ${house.blockedCountries.join(', ')}`
                              : 'Todos'
                          }
                        </td>
                        <td className="px-4 py-3 text-center">{getStatusBadge(house.status)}</td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => openHouseModal(house)}
                            className="text-blue-600 hover:text-blue-800 mr-2"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => toggleHouseStatus(house)}
                            className={house.status === 'ACTIVE' ? 'text-yellow-600 hover:text-yellow-800' : 'text-green-600 hover:text-green-800'}
                          >
                            {house.status === 'ACTIVE' ? 'Desactivar' : 'Activar'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* STATS TAB - Statistics for Admin */}
          {activeTab === 'stats' && (
            <AffiliateStatsSection />
          )}

          {/* CONVERSIONS/REFERRALS TAB */}
          {activeTab === 'conversions' && (
            <>
              <div className="mb-6">
                <h2 className="text-xl font-bold mb-4">👥 Listado de Referidos</h2>
                
                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-gray-900">{referralStats.total}</div>
                    <div className="text-xs text-gray-500">Total</div>
                  </div>
                  <div className="bg-yellow-50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-yellow-600">{referralStats.pending}</div>
                    <div className="text-xs text-gray-500">Pendientes</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-green-600">{referralStats.approved}</div>
                    <div className="text-xs text-gray-500">Aprobados</div>
                  </div>
                  <div className="bg-red-50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-red-600">{referralStats.rejected}</div>
                    <div className="text-xs text-gray-500">Rechazados</div>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600">€{(referralStats.totalCommissionCents / 100).toFixed(2)}</div>
                    <div className="text-xs text-gray-500">Comisiones</div>
                  </div>
                </div>

                {/* Filters */}
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Tipster</label>
                      <select
                        value={referralFilters.tipsterId}
                        onChange={(e) => setReferralFilters({ ...referralFilters, tipsterId: e.target.value })}
                        className="w-full border rounded-lg px-3 py-2 text-sm"
                      >
                        <option value="">Todos</option>
                        {tipstersList.map((t) => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Casa</label>
                      <select
                        value={referralFilters.houseId}
                        onChange={(e) => setReferralFilters({ ...referralFilters, houseId: e.target.value })}
                        className="w-full border rounded-lg px-3 py-2 text-sm"
                      >
                        <option value="">Todas</option>
                        {houses.map((h) => (
                          <option key={h.id} value={h.id}>{h.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Estado</label>
                      <select
                        value={referralFilters.status}
                        onChange={(e) => setReferralFilters({ ...referralFilters, status: e.target.value })}
                        className="w-full border rounded-lg px-3 py-2 text-sm"
                      >
                        <option value="">Todos</option>
                        <option value="PENDING">Pendiente</option>
                        <option value="APPROVED">Aprobado</option>
                        <option value="REJECTED">Rechazado</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Desde</label>
                      <input
                        type="date"
                        value={referralFilters.startDate}
                        onChange={(e) => setReferralFilters({ ...referralFilters, startDate: e.target.value })}
                        className="w-full border rounded-lg px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Hasta</label>
                      <input
                        type="date"
                        value={referralFilters.endDate}
                        onChange={(e) => setReferralFilters({ ...referralFilters, endDate: e.target.value })}
                        className="w-full border rounded-lg px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                  <div className="mt-3">
                    <button
                      onClick={loadReferrals}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                    >
                      🔍 Aplicar Filtros
                    </button>
                  </div>
                </div>
              </div>

              {/* Referrals Table */}
              <div className="overflow-x-auto">
                {referralsLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
                  </div>
                ) : referrals.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-4xl mb-2">👥</div>
                    <p className="text-gray-500">No hay referidos con los filtros seleccionados</p>
                  </div>
                ) : (
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipster</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Casa</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuario</th>
                        <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">País</th>
                        <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">Tipo</th>
                        <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">Comisión</th>
                        <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">Estado</th>
                        <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {referrals.map((ref) => (
                        <tr key={ref.id} className="hover:bg-gray-50">
                          <td className="px-3 py-3 text-sm text-gray-500">
                            {new Date(ref.clickedAt || ref.convertedAt || new Date()).toLocaleDateString('es-ES', { 
                              day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' 
                            })}
                          </td>
                          <td className="px-3 py-3 text-sm font-medium text-gray-900">{ref.tipsterName}</td>
                          <td className="px-3 py-3 text-sm text-gray-600">{ref.houseName}</td>
                          <td className="px-3 py-3">
                            <div className="text-sm text-gray-900">{ref.userEmail || 'Anónimo'}</div>
                            {ref.userTelegram && (
                              <div className="text-xs text-gray-500">📱 {ref.userTelegram}</div>
                            )}
                            {ref.externalRefId && (
                              <div className="text-xs text-gray-400">ID: {ref.externalRefId}</div>
                            )}
                          </td>
                          <td className="px-3 py-3 text-center text-sm">{ref.country || '🌍'}</td>
                          <td className="px-3 py-3 text-center">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              ref.eventType === 'DEPOSIT' ? 'bg-green-100 text-green-700' :
                              ref.eventType === 'REGISTER' ? 'bg-blue-100 text-blue-700' :
                              ref.eventType === 'QUALIFIED' ? 'bg-purple-100 text-purple-700' :
                              'bg-gray-100 text-gray-600'
                            }`}>
                              {ref.eventType === 'DEPOSIT' ? '💰 Depósito' :
                               ref.eventType === 'REGISTER' ? '📝 Registro' :
                               ref.eventType === 'QUALIFIED' ? '✅ Calificado' :
                               ref.eventType || 'Click'}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-right text-sm font-medium text-green-600">
                            €{(ref.commissionCents / 100).toFixed(2)}
                          </td>
                          <td className="px-3 py-3 text-center">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              ref.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                              ref.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                              ref.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                              'bg-gray-100 text-gray-600'
                            }`}>
                              {ref.status === 'PENDING' ? '⏳ Pendiente' :
                               ref.status === 'APPROVED' ? '✅ Aprobado' :
                               ref.status === 'REJECTED' ? '❌ Rechazado' :
                               ref.status}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-center">
                            {ref.status === 'PENDING' && (
                              <div className="flex gap-1 justify-center">
                                <button
                                  onClick={() => updateReferralStatus(ref.id, 'APPROVED')}
                                  className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs hover:bg-green-200"
                                >
                                  ✓
                                </button>
                                <button
                                  onClick={() => updateReferralStatus(ref.id, 'REJECTED')}
                                  className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200"
                                >
                                  ✗
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}

          {/* IMPORT TAB */}
          {activeTab === 'import' && (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Importar Conversiones (CSV)</h2>
                <button
                  onClick={() => setShowImportModal(true)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  + Importar CSV
                </button>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-800">
                  <strong>Formato CSV estándar:</strong> tipster_tracking_id, event_type (REGISTER/DEPOSIT/QUALIFIED), 
                  status (PENDING/APPROVED/REJECTED), occurred_at, external_ref_id (opcional), amount (opcional)
                </p>
              </div>

              <h3 className="font-medium mb-3">Historial de Importaciones</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Casa</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Período</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Archivo</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Filas</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Estado</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {importBatches.map((batch) => (
                      <tr key={batch.id}>
                        <td className="px-4 py-3 font-medium">{batch.houseName}</td>
                        <td className="px-4 py-3">{batch.periodMonth}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{batch.fileName}</td>
                        <td className="px-4 py-3 text-center">
                          {batch.processedRows}/{batch.totalRows}
                          {batch.errorRows > 0 && (
                            <span className="text-red-500 ml-1">({batch.errorRows} err)</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">{getStatusBadge(batch.status)}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {new Date(batch.importedAt).toLocaleDateString('es-ES')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* PAYOUTS TAB */}
          {activeTab === 'payouts' && (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Liquidaciones de Afiliación</h2>
                <button
                  onClick={generatePayouts}
                  disabled={saving}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {saving ? 'Generando...' : '⚡ Generar Liquidaciones'}
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipster</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Período</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Referidos</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Monto</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Estado</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {payouts.map((payout) => (
                      <tr key={payout.id}>
                        <td className="px-4 py-3 font-medium">{payout.tipsterName}</td>
                        <td className="px-4 py-3">{payout.periodMonth}</td>
                        <td className="px-4 py-3 text-center">{payout.totalReferrals}</td>
                        <td className="px-4 py-3 text-right font-medium text-green-600">
                          €{payout.totalAmountEur.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-center">{getStatusBadge(payout.status)}</td>
                        <td className="px-4 py-3 text-center">
                          {payout.status === 'PENDING' && (
                            <button
                              onClick={() => openPayoutModal(payout)}
                              className="text-green-600 hover:text-green-800 font-medium"
                            >
                              Marcar Pagado
                            </button>
                          )}
                          {payout.status === 'PAID' && (
                            <span className="text-sm text-gray-500">
                              {payout.paidAt ? new Date(payout.paidAt).toLocaleDateString('es-ES') : '-'}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      {/* HOUSE MODAL */}
      {showHouseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto py-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">
                {editingHouse ? 'Editar Casa de Apuestas' : 'Nueva Casa de Apuestas'}
              </h2>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                    <input
                      type="text"
                      value={houseForm.name}
                      onChange={(e) => setHouseForm({ ...houseForm, name: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2"
                      placeholder="Bwin"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Slug *</label>
                    <input
                      type="text"
                      value={houseForm.slug}
                      onChange={(e) => setHouseForm({ ...houseForm, slug: e.target.value.toLowerCase() })}
                      className="w-full border rounded-lg px-3 py-2"
                      placeholder="bwin"
                      disabled={!!editingHouse}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">URL del Logo</label>
                  <input
                    type="url"
                    value={houseForm.logoUrl}
                    onChange={(e) => setHouseForm({ ...houseForm, logoUrl: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="https://..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Link Maestro de Afiliación *</label>
                  <input
                    type="url"
                    value={houseForm.masterAffiliateUrl}
                    onChange={(e) => setHouseForm({ ...houseForm, masterAffiliateUrl: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="https://bwin.com/register?affiliate=antia"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Parámetro de Tracking</label>
                    <input
                      type="text"
                      value={houseForm.trackingParamName}
                      onChange={(e) => setHouseForm({ ...houseForm, trackingParamName: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2"
                      placeholder="subid"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Comisión por Referido (€) *</label>
                    <input
                      type="number"
                      value={houseForm.commissionPerReferralCents / 100}
                      onChange={(e) => setHouseForm({ ...houseForm, commissionPerReferralCents: Math.round(parseFloat(e.target.value) * 100) })}
                      className="w-full border rounded-lg px-3 py-2"
                      step="0.01"
                      min="0"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Países Permitidos</label>
                  <div className="flex flex-wrap gap-2">
                    {COUNTRIES.map((country) => (
                      <label key={country.code} className="flex items-center gap-1 text-sm">
                        <input
                          type="checkbox"
                          checked={houseForm.allowedCountries.includes(country.code)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setHouseForm({ ...houseForm, allowedCountries: [...houseForm.allowedCountries, country.code] });
                            } else {
                              setHouseForm({ ...houseForm, allowedCountries: houseForm.allowedCountries.filter(c => c !== country.code) });
                            }
                          }}
                        />
                        {country.code}
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Países Bloqueados</label>
                  <div className="flex flex-wrap gap-2">
                    {COUNTRIES.map((country) => (
                      <label key={country.code} className="flex items-center gap-1 text-sm">
                        <input
                          type="checkbox"
                          checked={houseForm.blockedCountries.includes(country.code)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setHouseForm({ ...houseForm, blockedCountries: [...houseForm.blockedCountries, country.code] });
                            } else {
                              setHouseForm({ ...houseForm, blockedCountries: houseForm.blockedCountries.filter(c => c !== country.code) });
                            }
                          }}
                        />
                        {country.code}
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                  <textarea
                    value={houseForm.description}
                    onChange={(e) => setHouseForm({ ...houseForm, description: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                    rows={2}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Website URL</label>
                  <input
                    type="url"
                    value={houseForm.websiteUrl}
                    onChange={(e) => setHouseForm({ ...houseForm, websiteUrl: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="https://www.bwin.com"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowHouseModal(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={saveHouse}
                  disabled={saving || !houseForm.name || !houseForm.slug || !houseForm.masterAffiliateUrl}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CAMPAIGN MODAL */}
      {showCampaignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">
                {editingCampaign ? 'Editar Campaña' : 'Nueva Campaña'}
              </h2>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                    <input
                      type="text"
                      value={campaignForm.name}
                      onChange={(e) => setCampaignForm({ ...campaignForm, name: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Slug *</label>
                    <input
                      type="text"
                      value={campaignForm.slug}
                      onChange={(e) => setCampaignForm({ ...campaignForm, slug: e.target.value.toLowerCase() })}
                      className="w-full border rounded-lg px-3 py-2"
                      disabled={!!editingCampaign}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                  <textarea
                    value={campaignForm.description}
                    onChange={(e) => setCampaignForm({ ...campaignForm, description: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                    rows={2}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Casas incluidas *</label>
                  <div className="max-h-40 overflow-y-auto border rounded-lg p-2">
                    {houses.map((house) => (
                      <label key={house.id} className="flex items-center gap-2 py-1">
                        <input
                          type="checkbox"
                          checked={campaignForm.houseIds.includes(house.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setCampaignForm({ ...campaignForm, houseIds: [...campaignForm.houseIds, house.id] });
                            } else {
                              setCampaignForm({ ...campaignForm, houseIds: campaignForm.houseIds.filter(id => id !== house.id) });
                            }
                          }}
                        />
                        <span>{house.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowCampaignModal(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={saveCampaign}
                  disabled={saving || !campaignForm.name || !campaignForm.slug}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* IMPORT MODAL */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">Importar CSV</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Casa de Apuestas *</label>
                  <select
                    value={importForm.houseId}
                    onChange={(e) => setImportForm({ ...importForm, houseId: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    <option value="">Selecciona una casa</option>
                    {houses.map((house) => (
                      <option key={house.id} value={house.id}>{house.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Período (YYYY-MM) *</label>
                  <input
                    type="month"
                    value={importForm.periodMonth}
                    onChange={(e) => setImportForm({ ...importForm, periodMonth: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Archivo CSV *</label>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => setImportForm({ ...importForm, file: e.target.files?.[0] || null })}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleImportCsv}
                  disabled={saving || !importForm.houseId || !importForm.file}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {saving ? 'Importando...' : 'Importar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PAYOUT MODAL */}
      {showPayoutModal && selectedPayout && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">Marcar como Pagado</h2>
              
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="text-sm text-gray-500">Tipster</div>
                <div className="font-medium">{selectedPayout.tipsterName}</div>
                <div className="text-sm text-gray-500 mt-2">Monto</div>
                <div className="text-xl font-bold text-green-600">€{selectedPayout.totalAmountEur.toFixed(2)}</div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Método de Pago</label>
                  <select
                    value={payoutForm.paymentMethod}
                    onChange={(e) => setPayoutForm({ ...payoutForm, paymentMethod: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    <option value="BANK_TRANSFER">Transferencia Bancaria</option>
                    <option value="PAYPAL">PayPal</option>
                    <option value="OTHER">Otro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Referencia de Pago</label>
                  <input
                    type="text"
                    value={payoutForm.paymentReference}
                    onChange={(e) => setPayoutForm({ ...payoutForm, paymentReference: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="Número de transferencia, ID, etc."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                  <textarea
                    value={payoutForm.notes}
                    onChange={(e) => setPayoutForm({ ...payoutForm, notes: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                    rows={2}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowPayoutModal(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={markPayoutPaid}
                  disabled={saving}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {saving ? 'Procesando...' : 'Confirmar Pago'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
