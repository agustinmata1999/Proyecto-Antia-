'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi, authApi, currencyApi, affiliateApi } from '@/lib/api';
import AffiliateAdminPanel from '@/components/AffiliateAdminPanel';
import CurrencySelector from '@/components/CurrencySelector';
import { useCurrency } from '@/contexts/CurrencyContext';

type AdminView = 'tipsters' | 'applications' | 'commissions' | 'reports' | 'affiliate';
type ReportType = 'summary' | 'sales' | 'platform' | 'settlements' | 'tipsters';

interface Tipster {
  id: string;
  oduserId: string;
  publicName: string;
  telegramUsername?: string;
  promotionChannel?: string;
  email?: string;
  phone?: string;
  status: string;
  applicationStatus?: string;
  modules: {
    forecasts: boolean;
    affiliate: boolean;
  };
  kycCompleted: boolean;
  kycCompletedAt?: string;
  kycData?: {
    legalName?: string;
    documentType?: string;
    documentNumber?: string;
    country?: string;
    bankAccountType?: string;
    bankAccountDetails?: any;
  };
  totalSales?: number;
  totalEarningsCents?: number;
  createdAt?: string;
}

interface CommissionConfig {
  tipsterId: string;
  tipsterName: string;
  config: {
    platformFeePercent: number;
    customFeePercent: number | null;
    useCustomFee: boolean;
    autoTierEnabled: boolean;
    notes?: string;
  };
  monthlyVolumeCents: number;
  monthlyVolumeEur: string;
  currentTier: string;
  effectivePercent: number;
}

interface ExchangeRate {
  baseCurrency: string;
  targetCurrency: string;
  rate: number;
  source: string;
  isManualOverride: boolean;
}

export default function AdminDashboard() {
  const router = useRouter();
  const { formatPrice, symbol } = useCurrency();
  const [activeView, setActiveView] = useState<AdminView>('tipsters');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Tipsters state
  const [tipsters, setTipsters] = useState<Tipster[]>([]);
  const [updating, setUpdating] = useState<string | null>(null);
  const [selectedTipsterDetail, setSelectedTipsterDetail] = useState<Tipster | null>(null);
  const [showTipsterModal, setShowTipsterModal] = useState(false);
  
  // Commissions state
  const [commissions, setCommissions] = useState<CommissionConfig[]>([]);
  const [selectedTipster, setSelectedTipster] = useState<CommissionConfig | null>(null);
  const [showCommissionModal, setShowCommissionModal] = useState(false);
  const [commissionForm, setCommissionForm] = useState({
    customFeePercent: 10,
    useCustomFee: false,
    autoTierEnabled: true,
    notes: '',
  });
  
  // Exchange rates state
  const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>([]);
  const [showRateModal, setShowRateModal] = useState(false);
  const [rateForm, setRateForm] = useState({ baseCurrency: 'EUR', targetCurrency: 'USD', rate: 1.08 });
  
  // Reports state
  const [reportType, setReportType] = useState<ReportType>('summary');
  const [reportData, setReportData] = useState<any>(null);
  const [reportCurrency, setReportCurrency] = useState('EUR');
  const [reportFilters, setReportFilters] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });
  const [loadingReport, setLoadingReport] = useState(false);

  // Applications state (solicitudes de tipsters)
  interface Application {
    id: string;
    publicName: string;
    email?: string;
    phone?: string;
    telegramUsername?: string;
    country?: string;
    experience?: string;
    socialMedia?: string;
    website?: string;
    applicationNotes?: string;
    applicationStatus: string;
    rejectionReason?: string;
    createdAt: string;
  }
  const [applications, setApplications] = useState<Application[]>([]);
  const [applicationStats, setApplicationStats] = useState({ pending: 0, approved: 0, rejected: 0 });
  const [applicationFilter, setApplicationFilter] = useState('PENDING');
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [reviewingApplication, setReviewingApplication] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    checkAuth();
    // Load application stats for badge in sidebar
    loadApplicationStats();
  }, []);

  useEffect(() => {
    if (activeView === 'tipsters') loadTipsters();
    if (activeView === 'applications') {
      loadApplications();
      loadApplicationStats();
    }
    if (activeView === 'commissions') {
      loadCommissions();
      loadExchangeRates();
    }
    if (activeView === 'reports') loadReport();
  }, [activeView, reportType, reportCurrency, applicationFilter]);

  const checkAuth = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      router.push('/login');
      return;
    }
    setLoading(false);
  };

  const loadTipsters = async () => {
    try {
      const response = await adminApi.tipsters.getAll();
      setTipsters(response.data.tipsters || []);
      setError('');
    } catch (err: any) {
      if (err.response?.status === 403) {
        setError('No tienes permisos de SuperAdmin');
      } else {
        setError('Error al cargar tipsters');
      }
    }
  };

  const loadApplications = async () => {
    try {
      const response = await adminApi.applications.getAll(applicationFilter);
      setApplications(response.data.applications || []);
    } catch (err) {
      console.error('Error loading applications:', err);
    }
  };

  const loadApplicationStats = async () => {
    try {
      const response = await adminApi.applications.getStats();
      setApplicationStats(response.data);
    } catch (err) {
      console.error('Error loading application stats:', err);
    }
  };

  const handleReviewApplication = async (action: 'APPROVE' | 'REJECT') => {
    if (!selectedApplication) return;
    
    if (action === 'REJECT' && !rejectionReason.trim()) {
      alert('Por favor, indica el motivo del rechazo');
      return;
    }

    setReviewingApplication(true);
    try {
      const response = await adminApi.applications.review(selectedApplication.id, {
        action,
        rejectionReason: action === 'REJECT' ? rejectionReason : undefined,
      });

      if (response.data.success) {
        alert(action === 'APPROVE' 
          ? '✅ Solicitud aprobada. El tipster ya puede acceder.' 
          : '❌ Solicitud rechazada.'
        );
        setShowApplicationModal(false);
        setSelectedApplication(null);
        setRejectionReason('');
        loadApplications();
        loadApplicationStats();
      }
    } catch (err: any) {
      alert('Error: ' + (err.response?.data?.message || 'Error al procesar'));
    } finally {
      setReviewingApplication(false);
    }
  };

  const loadCommissions = async () => {
    try {
      const response = await adminApi.commissions.getAll();
      setCommissions(response.data || []);
    } catch (err) {
      console.error('Error loading commissions:', err);
    }
  };

  const loadExchangeRates = async () => {
    try {
      const response = await currencyApi.getRates();
      setExchangeRates(response.data.rates || []);
    } catch (err) {
      console.error('Error loading exchange rates:', err);
    }
  };

  const loadReport = async () => {
    setLoadingReport(true);
    try {
      let response;
      const params = { ...reportFilters, currency: reportCurrency };
      
      switch (reportType) {
        case 'summary':
          response = await adminApi.reports.getSummary(reportCurrency);
          break;
        case 'sales':
          response = await adminApi.reports.getSales(params);
          break;
        case 'platform':
          response = await adminApi.reports.getPlatform(params);
          break;
        case 'settlements':
          response = await adminApi.reports.getSettlements(params);
          break;
        case 'tipsters':
          response = await adminApi.reports.getTipsters(params);
          break;
      }
      
      setReportData(response?.data);
    } catch (err) {
      console.error('Error loading report:', err);
      setReportData(null);
    } finally {
      setLoadingReport(false);
    }
  };

  const handleToggleModule = async (tipsterId: string, module: 'forecasts' | 'affiliate', currentValue: boolean) => {
    setUpdating(tipsterId);
    try {
      const updateData = module === 'forecasts' 
        ? { moduleForecasts: !currentValue }
        : { moduleAffiliate: !currentValue };
      
      await adminApi.tipsters.updateModules(tipsterId, updateData);
      setTipsters(prev => prev.map(t => 
        t.id === tipsterId 
          ? { ...t, modules: { ...t.modules, [module]: !currentValue } }
          : t
      ));
    } catch (err: any) {
      alert('Error al actualizar módulo');
    } finally {
      setUpdating(null);
    }
  };

  const handleEditCommission = (tipster: CommissionConfig) => {
    setSelectedTipster(tipster);
    setCommissionForm({
      customFeePercent: tipster.config.customFeePercent || tipster.config.platformFeePercent,
      useCustomFee: tipster.config.useCustomFee,
      autoTierEnabled: tipster.config.autoTierEnabled,
      notes: tipster.config.notes || '',
    });
    setShowCommissionModal(true);
  };

  const handleSaveCommission = async () => {
    if (!selectedTipster) return;
    
    try {
      await adminApi.commissions.update(selectedTipster.tipsterId, commissionForm);
      setShowCommissionModal(false);
      loadCommissions();
    } catch (err) {
      alert('Error al guardar comisión');
    }
  };

  const handleSetManualRate = async () => {
    try {
      await currencyApi.admin.setRate(rateForm.baseCurrency, rateForm.targetCurrency, rateForm.rate);
      setShowRateModal(false);
      loadExchangeRates();
    } catch (err) {
      alert('Error al establecer tipo de cambio');
    }
  };

  const handleRemoveRateOverride = async (base: string, target: string) => {
    try {
      await currencyApi.admin.removeOverride(base, target);
      loadExchangeRates();
    } catch (err) {
      alert('Error al eliminar override');
    }
  };

  const handleExportCSV = async () => {
    try {
      const response = await adminApi.reports.exportCSV(reportType, { ...reportFilters });
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `antia_${reportType}_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    } catch (err) {
      alert('Error al exportar CSV');
    }
  };

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch (e) {}
    localStorage.removeItem('access_token');
    router.push('/');
  };

  const formatCurrency = (cents: number, currency: string = 'EUR') => {
    const symbol = currency === 'USD' ? '$' : '€';
    return `${symbol}${(cents / 100).toFixed(2)}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button onClick={() => router.push('/login')} className="px-4 py-2 bg-blue-600 text-white rounded">
            Volver al Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="fixed top-0 left-0 w-64 h-full bg-white border-r border-gray-200">
        <div className="p-6">
          <div className="text-2xl font-bold text-red-600 mb-2">Antia Admin</div>
          <div className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded inline-block mb-6">
            SuperAdmin
          </div>

          <nav className="space-y-2">
            <button
              onClick={() => setActiveView('applications')}
              className={`w-full text-left px-4 py-2 rounded-lg flex items-center justify-between ${activeView === 'applications' ? 'bg-red-50 text-red-600 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
            >
              <span>📋 Solicitudes</span>
              {applicationStats.pending > 0 && (
                <span className="bg-yellow-500 text-white text-xs px-2 py-0.5 rounded-full animate-pulse">
                  {applicationStats.pending}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveView('tipsters')}
              className={`w-full text-left px-4 py-2 rounded-lg ${activeView === 'tipsters' ? 'bg-red-50 text-red-600 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
            >
              👥 Gestión Tipsters
            </button>
            <button
              onClick={() => setActiveView('affiliate')}
              className={`w-full text-left px-4 py-2 rounded-lg ${activeView === 'affiliate' ? 'bg-red-50 text-red-600 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
            >
              🤝 Afiliación
            </button>
            <button
              onClick={() => setActiveView('commissions')}
              className={`w-full text-left px-4 py-2 rounded-lg ${activeView === 'commissions' ? 'bg-red-50 text-red-600 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
            >
              💰 Comisiones
            </button>
            <button
              onClick={() => setActiveView('reports')}
              className={`w-full text-left px-4 py-2 rounded-lg ${activeView === 'reports' ? 'bg-red-50 text-red-600 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
            >
              📊 Reportes
            </button>
            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-2 rounded-lg text-red-600 hover:bg-red-50"
            >
              🚪 Cerrar Sesión
            </button>
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 p-8">
        {/* Currency Selector - Fixed top right */}
        <div className="fixed top-4 right-8 z-50">
          <CurrencySelector variant="pill" />
        </div>

        {/* APPLICATIONS VIEW */}
        {activeView === 'applications' && (
          <>
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">📋 Solicitudes de Registro</h1>
              <p className="text-gray-600 mt-1">Revisa y aprueba las solicitudes de nuevos tipsters</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div 
                onClick={() => setApplicationFilter('PENDING')}
                className={`bg-white rounded-lg shadow p-6 cursor-pointer border-2 transition ${applicationFilter === 'PENDING' ? 'border-yellow-500' : 'border-transparent hover:border-gray-200'}`}
              >
                <div className="text-sm text-gray-500 mb-2">⏳ Pendientes</div>
                <div className="text-3xl font-bold text-yellow-600">{applicationStats.pending}</div>
              </div>
              <div 
                onClick={() => setApplicationFilter('APPROVED')}
                className={`bg-white rounded-lg shadow p-6 cursor-pointer border-2 transition ${applicationFilter === 'APPROVED' ? 'border-green-500' : 'border-transparent hover:border-gray-200'}`}
              >
                <div className="text-sm text-gray-500 mb-2">✅ Aprobadas</div>
                <div className="text-3xl font-bold text-green-600">{applicationStats.approved}</div>
              </div>
              <div 
                onClick={() => setApplicationFilter('REJECTED')}
                className={`bg-white rounded-lg shadow p-6 cursor-pointer border-2 transition ${applicationFilter === 'REJECTED' ? 'border-red-500' : 'border-transparent hover:border-gray-200'}`}
              >
                <div className="text-sm text-gray-500 mb-2">❌ Rechazadas</div>
                <div className="text-3xl font-bold text-red-600">{applicationStats.rejected}</div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-sm text-gray-500 mb-2">📊 Total</div>
                <div className="text-3xl font-bold text-gray-900">
                  {applicationStats.pending + applicationStats.approved + applicationStats.rejected}
                </div>
              </div>
            </div>

            {/* Applications List */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">
                  {applicationFilter === 'PENDING' && '⏳ Solicitudes Pendientes'}
                  {applicationFilter === 'APPROVED' && '✅ Solicitudes Aprobadas'}
                  {applicationFilter === 'REJECTED' && '❌ Solicitudes Rechazadas'}
                </h2>
              </div>

              {applications.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="text-5xl mb-4">📭</div>
                  <p className="text-gray-500">No hay solicitudes {applicationFilter.toLowerCase()}</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {applications.map((app) => (
                    <div key={app.id} className="p-6 hover:bg-gray-50 transition">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-gray-900 text-lg">{app.publicName}</h3>
                            {app.applicationStatus === 'PENDING' && (
                              <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-medium">⏳ Pendiente</span>
                            )}
                            {app.applicationStatus === 'APPROVED' && (
                              <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">✅ Aprobado</span>
                            )}
                            {app.applicationStatus === 'REJECTED' && (
                              <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">❌ Rechazado</span>
                            )}
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                            <div>
                              <span className="text-gray-400">📧 Email:</span>
                              <p className="font-medium">{app.email || 'N/A'}</p>
                            </div>
                            <div>
                              <span className="text-gray-400">📱 Telegram:</span>
                              <p className="font-medium">{app.telegramUsername || 'N/A'}</p>
                            </div>
                            <div>
                              <span className="text-gray-400">🌍 País:</span>
                              <p className="font-medium">{app.country || 'N/A'}</p>
                            </div>
                            <div>
                              <span className="text-gray-400">📅 Fecha:</span>
                              <p className="font-medium">{new Date(app.createdAt).toLocaleDateString('es-ES')}</p>
                            </div>
                          </div>
                          {app.experience && (
                            <p className="text-sm text-gray-500 mt-2 line-clamp-1">
                              <span className="font-medium">Experiencia:</span> {app.experience}
                            </p>
                          )}
                          {app.rejectionReason && (
                            <p className="text-sm text-red-500 mt-2">
                              <span className="font-medium">Motivo rechazo:</span> {app.rejectionReason}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={() => {
                              setSelectedApplication(app);
                              setShowApplicationModal(true);
                            }}
                            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
                          >
                            Ver Detalles
                          </button>
                          {app.applicationStatus === 'PENDING' && (
                            <>
                              <button
                                onClick={() => {
                                  setSelectedApplication(app);
                                  handleReviewApplication('APPROVE');
                                }}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                              >
                                ✅ Aprobar
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedApplication(app);
                                  setShowApplicationModal(true);
                                }}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                              >
                                ❌ Rechazar
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* TIPSTERS VIEW */}
        {activeView === 'tipsters' && (
          <>
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">👥 Gestión de Tipsters</h1>
              <p className="text-gray-600 mt-1">Controla los módulos habilitados para cada tipster</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-sm text-gray-500 mb-2">Total Tipsters</div>
                <div className="text-3xl font-bold text-gray-900">{tipsters.length}</div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-sm text-gray-500 mb-2">Con Pronósticos</div>
                <div className="text-3xl font-bold text-blue-600">
                  {tipsters.filter(t => t.modules.forecasts).length}
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-sm text-gray-500 mb-2">Con Afiliación</div>
                <div className="text-3xl font-bold text-purple-600">
                  {tipsters.filter(t => t.modules.affiliate).length}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">Lista de Tipsters</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipster</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Pronósticos</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Afiliación</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {tipsters.map((tipster) => (
                      <tr key={tipster.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-blue-600 font-semibold">
                                {tipster.publicName?.charAt(0).toUpperCase() || '?'}
                              </span>
                            </div>
                            <div className="ml-4">
                              <div className="font-medium text-gray-900">{tipster.publicName}</div>
                              {tipster.telegramUsername && (
                                <div className="text-sm text-gray-500">@{tipster.telegramUsername}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">{tipster.email || '-'}</td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => handleToggleModule(tipster.id, 'forecasts', tipster.modules.forecasts)}
                            disabled={updating === tipster.id}
                            className={`relative inline-flex h-6 w-11 rounded-full transition-colors ${
                              tipster.modules.forecasts ? 'bg-blue-600' : 'bg-gray-200'
                            } ${updating === tipster.id ? 'opacity-50' : ''}`}
                          >
                            <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                              tipster.modules.forecasts ? 'translate-x-5' : 'translate-x-0'
                            }`} />
                          </button>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => handleToggleModule(tipster.id, 'affiliate', tipster.modules.affiliate)}
                            disabled={updating === tipster.id}
                            className={`relative inline-flex h-6 w-11 rounded-full transition-colors ${
                              tipster.modules.affiliate ? 'bg-purple-600' : 'bg-gray-200'
                            } ${updating === tipster.id ? 'opacity-50' : ''}`}
                          >
                            <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                              tipster.modules.affiliate ? 'translate-x-5' : 'translate-x-0'
                            }`} />
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            tipster.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {tipster.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* COMMISSIONS VIEW */}
        {activeView === 'commissions' && (
          <>
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">💰 Gestión de Comisiones</h1>
              <p className="text-gray-600 mt-1">Configura las comisiones de plataforma y tipos de cambio</p>
            </div>

            {/* Exchange Rates Section */}
            <div className="bg-white rounded-lg shadow mb-8">
              <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">💱 Tipos de Cambio</h2>
                  <p className="text-sm text-gray-500">EUR / USD - API externa + override manual</p>
                </div>
                <button
                  onClick={() => setShowRateModal(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  + Establecer Manual
                </button>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {exchangeRates.map((rate, idx) => (
                    <div key={idx} className="border border-gray-200 rounded-lg p-4 flex justify-between items-center">
                      <div>
                        <div className="font-medium">
                          {rate.baseCurrency} → {rate.targetCurrency}
                        </div>
                        <div className="text-2xl font-bold text-blue-600">{rate.rate.toFixed(4)}</div>
                        <div className="text-xs text-gray-500">
                          Fuente: {rate.source} {rate.isManualOverride && '(Manual)'}
                        </div>
                      </div>
                      {rate.isManualOverride && (
                        <button
                          onClick={() => handleRemoveRateOverride(rate.baseCurrency, rate.targetCurrency)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Usar API
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Commissions Table */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">⚙️ Comisiones por Tipster</h2>
                <p className="text-sm text-gray-500">
                  Estándar: 10% | Alto volumen (≥€100k/mes): 7%
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipster</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Volumen Mensual</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Tier</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">% Efectivo</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Auto-Tier</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {commissions.map((comm) => (
                      <tr key={comm.tipsterId} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium text-gray-900">{comm.tipsterName}</td>
                        <td className="px-6 py-4 text-gray-700">€{comm.monthlyVolumeEur}</td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            comm.currentTier === 'HIGH_VOLUME' ? 'bg-green-100 text-green-800' :
                            comm.currentTier === 'CUSTOM' ? 'bg-purple-100 text-purple-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {comm.currentTier}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center font-bold text-blue-600">
                          {comm.effectivePercent}%
                        </td>
                        <td className="px-6 py-4 text-center">
                          {comm.config.autoTierEnabled ? '✅' : '❌'}
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleEditCommission(comm)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            Editar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* REPORTS VIEW */}
        {activeView === 'reports' && (
          <>
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">📊 Reportes</h1>
              <p className="text-gray-600 mt-1">Analítica y exportación de datos</p>
            </div>

            {/* Report Controls */}
            <div className="bg-white rounded-lg shadow p-6 mb-8">
              <div className="flex flex-wrap gap-4 items-end">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Reporte</label>
                  <select
                    value={reportType}
                    onChange={(e) => setReportType(e.target.value as ReportType)}
                    className="border border-gray-300 rounded-lg px-4 py-2"
                  >
                    <option value="summary">Resumen General</option>
                    <option value="sales">Ventas</option>
                    <option value="platform">Ingresos Plataforma</option>
                    <option value="settlements">Liquidaciones</option>
                    <option value="tipsters">Ranking Tipsters</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Moneda</label>
                  <select
                    value={reportCurrency}
                    onChange={(e) => setReportCurrency(e.target.value)}
                    className="border border-gray-300 rounded-lg px-4 py-2"
                  >
                    <option value="EUR">€ EUR</option>
                    <option value="USD">$ USD</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Desde</label>
                  <input
                    type="date"
                    value={reportFilters.startDate}
                    onChange={(e) => setReportFilters(f => ({ ...f, startDate: e.target.value }))}
                    className="border border-gray-300 rounded-lg px-4 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hasta</label>
                  <input
                    type="date"
                    value={reportFilters.endDate}
                    onChange={(e) => setReportFilters(f => ({ ...f, endDate: e.target.value }))}
                    className="border border-gray-300 rounded-lg px-4 py-2"
                  />
                </div>
                <button
                  onClick={loadReport}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Generar
                </button>
                {reportType !== 'summary' && (
                  <button
                    onClick={handleExportCSV}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    📥 Exportar CSV
                  </button>
                )}
              </div>
            </div>

            {/* Report Content */}
            {loadingReport ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : reportData ? (
              <div className="space-y-6">
                {/* Summary Report */}
                {reportType === 'summary' && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      <div className="bg-white rounded-lg shadow p-6">
                        <div className="text-sm text-gray-500 mb-2">Ventas (30 días)</div>
                        <div className="text-3xl font-bold text-gray-900">{reportData.last30Days?.totalSales || 0}</div>
                      </div>
                      <div className="bg-white rounded-lg shadow p-6">
                        <div className="text-sm text-gray-500 mb-2">Bruto (30 días)</div>
                        <div className="text-3xl font-bold text-blue-600">
                          {formatCurrency(reportData.last30Days?.totalGrossCents || 0, reportCurrency)}
                        </div>
                      </div>
                      <div className="bg-white rounded-lg shadow p-6">
                        <div className="text-sm text-gray-500 mb-2">Comisión Antia (30 días)</div>
                        <div className="text-3xl font-bold text-green-600">
                          {formatCurrency(reportData.last30Days?.platformIncomeCents || 0, reportCurrency)}
                        </div>
                      </div>
                      <div className="bg-white rounded-lg shadow p-6">
                        <div className="text-sm text-gray-500 mb-2">Liquidaciones Pendientes</div>
                        <div className="text-3xl font-bold text-orange-600">
                          {formatCurrency(reportData.settlements?.pendingCents || 0, reportCurrency)}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="font-bold text-gray-900 mb-4">Tipsters</h3>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Total registrados</span>
                            <span className="font-medium">{reportData.tipsters?.total || 0}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Con ventas</span>
                            <span className="font-medium">{reportData.tipsters?.active || 0}</span>
                          </div>
                        </div>
                      </div>
                      <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="font-bold text-gray-900 mb-4">Liquidaciones</h3>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Pendientes</span>
                            <span className="font-medium text-orange-600">{reportData.settlements?.pendingCount || 0}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Pagadas</span>
                            <span className="font-medium text-green-600">{reportData.settlements?.paidCount || 0}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Sales Report */}
                {reportType === 'sales' && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      <div className="bg-white rounded-lg shadow p-6">
                        <div className="text-sm text-gray-500 mb-2">Total Ventas</div>
                        <div className="text-3xl font-bold">{reportData.totalSales}</div>
                      </div>
                      <div className="bg-white rounded-lg shadow p-6">
                        <div className="text-sm text-gray-500 mb-2">Bruto</div>
                        <div className="text-3xl font-bold text-blue-600">
                          {formatCurrency(reportData.totalGrossCents, reportCurrency)}
                        </div>
                      </div>
                      <div className="bg-white rounded-lg shadow p-6">
                        <div className="text-sm text-gray-500 mb-2">Comisión Antia</div>
                        <div className="text-3xl font-bold text-green-600">
                          {formatCurrency(reportData.totalPlatformFeesCents, reportCurrency)}
                        </div>
                      </div>
                      <div className="bg-white rounded-lg shadow p-6">
                        <div className="text-sm text-gray-500 mb-2">Neto Tipsters</div>
                        <div className="text-3xl font-bold text-gray-900">
                          {formatCurrency(reportData.totalNetCents, reportCurrency)}
                        </div>
                      </div>
                    </div>
                    <div className="bg-white rounded-lg shadow">
                      <div className="p-6 border-b"><h3 className="font-bold">Por Tipster</h3></div>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipster</th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ventas</th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Bruto</th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Neto</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {reportData.byTipster?.map((t: any, i: number) => (
                              <tr key={i}>
                                <td className="px-6 py-4 font-medium">{t.tipsterName}</td>
                                <td className="px-6 py-4 text-right">{t.sales}</td>
                                <td className="px-6 py-4 text-right text-blue-600">
                                  {formatCurrency(t.grossCents, reportCurrency)}
                                </td>
                                <td className="px-6 py-4 text-right">
                                  {formatCurrency(t.netCents, reportCurrency)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}

                {/* Platform Report */}
                {reportType === 'platform' && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      <div className="bg-white rounded-lg shadow p-6">
                        <div className="text-sm text-gray-500 mb-2">Total Pedidos</div>
                        <div className="text-3xl font-bold">{reportData.totalOrders}</div>
                      </div>
                      <div className="bg-white rounded-lg shadow p-6">
                        <div className="text-sm text-gray-500 mb-2">Volumen Bruto</div>
                        <div className="text-3xl font-bold text-blue-600">
                          {formatCurrency(reportData.totalGrossCents, reportCurrency)}
                        </div>
                      </div>
                      <div className="bg-white rounded-lg shadow p-6">
                        <div className="text-sm text-gray-500 mb-2">Comisión Antia</div>
                        <div className="text-3xl font-bold text-green-600">
                          {formatCurrency(reportData.totalPlatformFeesCents, reportCurrency)}
                        </div>
                      </div>
                      <div className="bg-white rounded-lg shadow p-6">
                        <div className="text-sm text-gray-500 mb-2">% Promedio</div>
                        <div className="text-3xl font-bold text-purple-600">{reportData.avgPlatformFeePercent}%</div>
                      </div>
                    </div>
                    <div className="bg-white rounded-lg shadow">
                      <div className="p-6 border-b"><h3 className="font-bold">Por Mes</h3></div>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mes</th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Pedidos</th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Bruto</th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Comisión Antia</th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Fee Pasarela</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {reportData.byMonth?.map((m: any, i: number) => (
                              <tr key={i}>
                                <td className="px-6 py-4 font-medium">{m.month}</td>
                                <td className="px-6 py-4 text-right">{m.orders}</td>
                                <td className="px-6 py-4 text-right text-blue-600">
                                  {formatCurrency(m.grossCents, reportCurrency)}
                                </td>
                                <td className="px-6 py-4 text-right text-green-600">
                                  {formatCurrency(m.platformFeesCents, reportCurrency)}
                                </td>
                                <td className="px-6 py-4 text-right text-gray-500">
                                  {formatCurrency(m.gatewayFeesCents, reportCurrency)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}

                {/* Tipsters Ranking Report */}
                {reportType === 'tipsters' && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="bg-white rounded-lg shadow p-6">
                        <div className="text-sm text-gray-500 mb-2">Total Tipsters</div>
                        <div className="text-3xl font-bold">{reportData.totalTipsters}</div>
                      </div>
                      <div className="bg-white rounded-lg shadow p-6">
                        <div className="text-sm text-gray-500 mb-2">Tipsters Activos</div>
                        <div className="text-3xl font-bold text-green-600">{reportData.activeTipsters}</div>
                      </div>
                      <div className="bg-white rounded-lg shadow p-6">
                        <div className="text-sm text-gray-500 mb-2">Total Ventas</div>
                        <div className="text-3xl font-bold text-blue-600">{reportData.totalSales}</div>
                      </div>
                    </div>
                    <div className="bg-white rounded-lg shadow">
                      <div className="p-6 border-b"><h3 className="font-bold">Ranking de Tipsters</h3></div>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipster</th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ventas</th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Bruto</th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Neto</th>
                              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Productos</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {reportData.rankings?.map((t: any, i: number) => (
                              <tr key={i}>
                                <td className="px-6 py-4 font-bold text-gray-400">{i + 1}</td>
                                <td className="px-6 py-4 font-medium">{t.tipsterName}</td>
                                <td className="px-6 py-4 text-right">{t.totalSales}</td>
                                <td className="px-6 py-4 text-right text-blue-600">
                                  {formatCurrency(t.totalGrossCents, reportCurrency)}
                                </td>
                                <td className="px-6 py-4 text-right">
                                  {formatCurrency(t.totalNetCents, reportCurrency)}
                                </td>
                                <td className="px-6 py-4 text-center">{t.activeProducts}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                Selecciona un reporte y haz clic en Generar
              </div>
            )}
          </>
        )}

        {/* AFFILIATE VIEW */}
        {activeView === 'affiliate' && (
          <AffiliateAdminPanel />
        )}
      </main>

      {/* Commission Modal */}
      {showCommissionModal && selectedTipster && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6 border-b">
              <h3 className="text-xl font-bold">Editar Comisión: {selectedTipster.tipsterName}</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={commissionForm.useCustomFee}
                    onChange={(e) => setCommissionForm(f => ({ ...f, useCustomFee: e.target.checked }))}
                    className="rounded"
                  />
                  <span>Usar comisión personalizada</span>
                </label>
              </div>
              {commissionForm.useCustomFee && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">% Comisión</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={commissionForm.customFeePercent}
                    onChange={(e) => setCommissionForm(f => ({ ...f, customFeePercent: parseFloat(e.target.value) }))}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  />
                </div>
              )}
              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={commissionForm.autoTierEnabled}
                    onChange={(e) => setCommissionForm(f => ({ ...f, autoTierEnabled: e.target.checked }))}
                    className="rounded"
                  />
                  <span>Auto-tier (7% para ≥€100k/mes)</span>
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                <textarea
                  value={commissionForm.notes}
                  onChange={(e) => setCommissionForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  rows={2}
                />
              </div>
            </div>
            <div className="p-6 border-t flex justify-end space-x-4">
              <button
                onClick={() => setShowCommissionModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveCommission}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exchange Rate Modal */}
      {showRateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6 border-b">
              <h3 className="text-xl font-bold">Establecer Tipo de Cambio Manual</h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Moneda Base</label>
                  <select
                    value={rateForm.baseCurrency}
                    onChange={(e) => setRateForm(f => ({ ...f, baseCurrency: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  >
                    <option value="EUR">EUR</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Moneda Destino</label>
                  <select
                    value={rateForm.targetCurrency}
                    onChange={(e) => setRateForm(f => ({ ...f, targetCurrency: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Cambio</label>
                <input
                  type="number"
                  step="0.0001"
                  value={rateForm.rate}
                  onChange={(e) => setRateForm(f => ({ ...f, rate: parseFloat(e.target.value) }))}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                />
                <p className="text-xs text-gray-500 mt-1">
                  1 {rateForm.baseCurrency} = {rateForm.rate} {rateForm.targetCurrency}
                </p>
              </div>
            </div>
            <div className="p-6 border-t flex justify-end space-x-4">
              <button
                onClick={() => setShowRateModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancelar
              </button>
              <button
                onClick={handleSetManualRate}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Establecer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Detalle de Solicitud */}
      {showApplicationModal && selectedApplication && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => { setShowApplicationModal(false); setRejectionReason(''); }}>
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white sticky top-0">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold">Solicitud de Registro</h3>
                  <p className="text-blue-200 text-sm">{selectedApplication.email}</p>
                </div>
                <button onClick={() => { setShowApplicationModal(false); setRejectionReason(''); }} className="text-white/70 hover:text-white text-2xl">×</button>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 space-y-6">
              {/* Info del Tipster */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-500 mb-1">Nombre Público</div>
                  <div className="font-semibold text-gray-900">{selectedApplication.publicName}</div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-500 mb-1">Telegram</div>
                  <div className="font-semibold text-gray-900">{selectedApplication.telegramUsername || 'No proporcionado'}</div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-500 mb-1">Email</div>
                  <div className="font-semibold text-gray-900">{selectedApplication.email || 'N/A'}</div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-500 mb-1">Teléfono</div>
                  <div className="font-semibold text-gray-900">{selectedApplication.phone || 'No proporcionado'}</div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-500 mb-1">País</div>
                  <div className="font-semibold text-gray-900">{selectedApplication.country || 'No especificado'}</div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-500 mb-1">Fecha Solicitud</div>
                  <div className="font-semibold text-gray-900">{new Date(selectedApplication.createdAt).toLocaleString('es-ES')}</div>
                </div>
              </div>

              {/* Información adicional */}
              {selectedApplication.experience && (
                <div>
                  <div className="text-sm font-medium text-gray-500 mb-2">💼 Experiencia como Tipster</div>
                  <div className="bg-blue-50 p-4 rounded-lg text-gray-700">{selectedApplication.experience}</div>
                </div>
              )}

              {selectedApplication.socialMedia && (
                <div>
                  <div className="text-sm font-medium text-gray-500 mb-2">📱 Redes Sociales</div>
                  <div className="bg-purple-50 p-4 rounded-lg text-gray-700">{selectedApplication.socialMedia}</div>
                </div>
              )}

              {selectedApplication.website && (
                <div>
                  <div className="text-sm font-medium text-gray-500 mb-2">🌐 Sitio Web</div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <a href={selectedApplication.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      {selectedApplication.website}
                    </a>
                  </div>
                </div>
              )}

              {selectedApplication.applicationNotes && (
                <div>
                  <div className="text-sm font-medium text-gray-500 mb-2">📝 Notas del Solicitante</div>
                  <div className="bg-yellow-50 p-4 rounded-lg text-gray-700">{selectedApplication.applicationNotes}</div>
                </div>
              )}

              {/* Motivo de rechazo - solo si está pendiente */}
              {selectedApplication.applicationStatus === 'PENDING' && (
                <div>
                  <div className="text-sm font-medium text-gray-500 mb-2">❌ Motivo de Rechazo (requerido para rechazar)</div>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Indica el motivo por el cual se rechaza esta solicitud..."
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>
              )}

              {/* Motivo de rechazo mostrado si ya fue rechazado */}
              {selectedApplication.applicationStatus === 'REJECTED' && selectedApplication.rejectionReason && (
                <div>
                  <div className="text-sm font-medium text-gray-500 mb-2">❌ Motivo del Rechazo</div>
                  <div className="bg-red-50 p-4 rounded-lg text-red-700 border border-red-200">{selectedApplication.rejectionReason}</div>
                </div>
              )}
            </div>

            {/* Footer */}
            {selectedApplication.applicationStatus === 'PENDING' && (
              <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 sticky bottom-0 border-t">
                <button
                  onClick={() => { setShowApplicationModal(false); setRejectionReason(''); }}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 text-gray-700"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleReviewApplication('REJECT')}
                  disabled={reviewingApplication || !rejectionReason.trim()}
                  className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {reviewingApplication ? '...' : '❌ Rechazar'}
                </button>
                <button
                  onClick={() => handleReviewApplication('APPROVE')}
                  disabled={reviewingApplication}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {reviewingApplication ? '...' : '✅ Aprobar'}
                </button>
              </div>
            )}

            {selectedApplication.applicationStatus !== 'PENDING' && (
              <div className="bg-gray-50 px-6 py-4 flex justify-end border-t">
                <button
                  onClick={() => { setShowApplicationModal(false); setRejectionReason(''); }}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cerrar
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
