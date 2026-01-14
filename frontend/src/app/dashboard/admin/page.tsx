'use client';

import { useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi, authApi, currencyApi, affiliateApi, withdrawalsApi } from '@/lib/api';
import AffiliateAdminPanel from '@/components/AffiliateAdminPanel';
import CurrencySelector from '@/components/CurrencySelector';
import ChannelMonitorPanel from '@/components/ChannelMonitorPanel';
import { useCurrency } from '@/contexts/CurrencyContext';
import DashboardLayout from '@/components/DashboardLayout';

type AdminView = 'tipsters' | 'applications' | 'sales' | 'support' | 'commissions' | 'reports' | 'affiliate' | 'withdrawals' | 'channel-monitor';
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

  // Sales/Checkout state
  interface Sale {
    id: string;
    clientEmail: string;
    clientTelegramId?: string;
    productTitle: string;
    productId: string;
    tipsterName: string;
    tipsterId: string;
    amountCents: number;
    currency: string;
    status: string;
    paymentProvider: string;
    paymentMethod?: string;
    country?: string;
    createdAt: string;
    // Comisiones (solo admin)
    grossAmountCents: number;
    platformFeeCents: number;
    netAmountCents: number;
    platformFeePercent: number;
  }
  const [sales, setSales] = useState<Sale[]>([]);
  const [salesLoading, setSalesLoading] = useState(false);
  const [salesFilters, setSalesFilters] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    tipsterId: '',
    productId: '',
    status: '',
    paymentProvider: '',
    country: '',
  });
  const [salesStats, setSalesStats] = useState({
    totalSales: 0,
    totalGrossCents: 0,
    totalPlatformFeeCents: 0,
    totalNetCents: 0,
  });

  // Support tickets state (Admin)
  interface AdminTicket {
    id: string;
    subject: string;
    message: string;
    status: string;
    userId: string;
    userEmail: string;
    userName: string;
    userRole: string;
    responses: Array<{
      id: string;
      message: string;
      isAdmin: boolean;
      createdAt: string;
    }>;
    createdAt: string;
    updatedAt: string;
  }
  const [adminTickets, setAdminTickets] = useState<AdminTicket[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [ticketFilter, setTicketFilter] = useState('');
  const [selectedAdminTicket, setSelectedAdminTicket] = useState<AdminTicket | null>(null);
  const [adminReplyMessage, setAdminReplyMessage] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [ticketStats, setTicketStats] = useState({ open: 0, inProgress: 0, resolved: 0 });

  // Withdrawals state (Admin)
  const [adminWithdrawals, setAdminWithdrawals] = useState<any[]>([]);
  const [withdrawalsLoading, setWithdrawalsLoading] = useState(false);
  const [withdrawalStats, setWithdrawalStats] = useState({
    pending: { count: 0, totalCents: 0 },
    approved: { count: 0, totalCents: 0 },
    paid: { count: 0, totalCents: 0 },
    rejected: { count: 0, totalCents: 0 },
  });
  const [withdrawalFilter, setWithdrawalFilter] = useState('');
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<any>(null);
  const [showWithdrawalActionModal, setShowWithdrawalActionModal] = useState(false);
  const [withdrawalAction, setWithdrawalAction] = useState<'approve' | 'pay' | 'reject' | null>(null);
  const [withdrawalPaymentMethod, setWithdrawalPaymentMethod] = useState('BANK_TRANSFER');
  const [withdrawalPaymentRef, setWithdrawalPaymentRef] = useState('');
  const [withdrawalAdminNotes, setWithdrawalAdminNotes] = useState('');
  const [withdrawalRejectionReason, setWithdrawalRejectionReason] = useState('');
  const [processingWithdrawal, setProcessingWithdrawal] = useState(false);
  const [withdrawalSearch, setWithdrawalSearch] = useState('');
  const [withdrawalDateFrom, setWithdrawalDateFrom] = useState('');
  const [withdrawalDateTo, setWithdrawalDateTo] = useState('');

  useEffect(() => {
    checkAuth();
    // Load application stats for badge in sidebar
    loadApplicationStats();
    // Load ticket stats for badge
    loadTicketStats();
    // Load withdrawal stats for badge
    loadWithdrawalStats();
  }, []);

  useEffect(() => {
    if (activeView === 'tipsters') loadTipsters();
    if (activeView === 'applications') {
      loadApplications();
      loadApplicationStats();
    }
    if (activeView === 'support') loadAdminTickets();
    if (activeView === 'sales') loadSales();
    if (activeView === 'withdrawals') loadAdminWithdrawals();
    if (activeView === 'commissions') {
      loadCommissions();
      loadExchangeRates();
    }
    if (activeView === 'reports') loadReport();
  }, [activeView, reportType, reportCurrency, applicationFilter, withdrawalFilter]);

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

  const loadSales = async () => {
    setSalesLoading(true);
    try {
      const response = await adminApi.sales.getAll(salesFilters);
      setSales(response.data.sales || []);
      setSalesStats(response.data.stats || {
        totalSales: 0,
        totalGrossCents: 0,
        totalPlatformFeeCents: 0,
        totalNetCents: 0,
      });
    } catch (err) {
      console.error('Error loading sales:', err);
    } finally {
      setSalesLoading(false);
    }
  };

  const loadAdminTickets = async () => {
    setTicketsLoading(true);
    try {
      const response = await adminApi.support.getAll(ticketFilter || undefined);
      setAdminTickets(response.data.tickets || []);
    } catch (err) {
      console.error('Error loading tickets:', err);
    } finally {
      setTicketsLoading(false);
    }
  };

  const loadTicketStats = async () => {
    try {
      const response = await adminApi.support.getStats();
      setTicketStats(response.data);
    } catch (err) {
      console.error('Error loading ticket stats:', err);
    }
  };

  // ==================== WITHDRAWALS ADMIN FUNCTIONS ====================

  const loadAdminWithdrawals = async () => {
    setWithdrawalsLoading(true);
    try {
      const response = await withdrawalsApi.admin.getAll(
        withdrawalFilter ? { status: withdrawalFilter } : undefined
      );
      setAdminWithdrawals(response.data.withdrawals || []);
      setWithdrawalStats(response.data.stats || {
        pending: { count: 0, totalCents: 0 },
        approved: { count: 0, totalCents: 0 },
        paid: { count: 0, totalCents: 0 },
        rejected: { count: 0, totalCents: 0 },
      });
    } catch (err) {
      console.error('Error loading withdrawals:', err);
    } finally {
      setWithdrawalsLoading(false);
    }
  };

  const loadWithdrawalStats = async () => {
    try {
      const response = await withdrawalsApi.admin.getAll();
      setWithdrawalStats(response.data.stats || {
        pending: { count: 0, totalCents: 0 },
        approved: { count: 0, totalCents: 0 },
        paid: { count: 0, totalCents: 0 },
        rejected: { count: 0, totalCents: 0 },
      });
    } catch (err) {
      console.error('Error loading withdrawal stats:', err);
    }
  };

  const handleWithdrawalAction = async () => {
    if (!selectedWithdrawal || !withdrawalAction) return;

    setProcessingWithdrawal(true);
    try {
      let response;
      
      if (withdrawalAction === 'approve') {
        response = await withdrawalsApi.admin.approve(selectedWithdrawal.id, withdrawalAdminNotes || undefined);
      } else if (withdrawalAction === 'pay') {
        response = await withdrawalsApi.admin.pay(selectedWithdrawal.id, {
          paymentMethod: withdrawalPaymentMethod,
          paymentReference: withdrawalPaymentRef || undefined,
          adminNotes: withdrawalAdminNotes || undefined,
        });
      } else if (withdrawalAction === 'reject') {
        if (!withdrawalRejectionReason.trim()) {
          alert('Por favor, indica el motivo del rechazo');
          setProcessingWithdrawal(false);
          return;
        }
        response = await withdrawalsApi.admin.reject(selectedWithdrawal.id, withdrawalRejectionReason);
      }

      if (response?.data.success) {
        alert(`✅ ${withdrawalAction === 'approve' ? 'Solicitud aprobada' : withdrawalAction === 'pay' ? 'Marcado como pagado' : 'Solicitud rechazada'}`);
        setShowWithdrawalActionModal(false);
        resetWithdrawalForm();
        loadAdminWithdrawals();
        loadWithdrawalStats();
      }
    } catch (err: any) {
      console.error('Error processing withdrawal:', err);
      alert('Error: ' + (err.response?.data?.message || 'No se pudo procesar'));
    } finally {
      setProcessingWithdrawal(false);
    }
  };

  const resetWithdrawalForm = () => {
    setSelectedWithdrawal(null);
    setWithdrawalAction(null);
    setWithdrawalPaymentMethod('BANK_TRANSFER');
    setWithdrawalPaymentRef('');
    setWithdrawalAdminNotes('');
    setWithdrawalRejectionReason('');
  };

  const openWithdrawalAction = (withdrawal: any, action: 'approve' | 'pay' | 'reject') => {
    setSelectedWithdrawal(withdrawal);
    setWithdrawalAction(action);
    setShowWithdrawalActionModal(true);
  };

  const handleAdminReply = async () => {
    if (!selectedAdminTicket || !adminReplyMessage.trim()) return;
    
    setSendingReply(true);
    try {
      await adminApi.support.reply(selectedAdminTicket.id, adminReplyMessage.trim());
      setAdminReplyMessage('');
      // Reload ticket to get updated responses
      const response = await adminApi.support.getOne(selectedAdminTicket.id);
      setSelectedAdminTicket(response.data.ticket);
      // Reload all tickets
      loadAdminTickets();
    } catch (err) {
      console.error('Error sending reply:', err);
      alert('Error al enviar respuesta');
    } finally {
      setSendingReply(false);
    }
  };

  const handleUpdateTicketStatus = async (ticketId: string, newStatus: string) => {
    try {
      await adminApi.support.updateStatus(ticketId, newStatus);
      // Reload tickets
      loadAdminTickets();
      loadTicketStats();
      if (selectedAdminTicket?.id === ticketId) {
        setSelectedAdminTicket({ ...selectedAdminTicket, status: newStatus });
      }
    } catch (err) {
      console.error('Error updating ticket status:', err);
      alert('Error al actualizar estado');
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

  const handleViewTipsterDetail = (tipster: Tipster) => {
    setSelectedTipsterDetail(tipster);
    setShowTipsterModal(true);
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

  // Define navItems inside the component to access state for badges
  const getNavItems = () => {
    const items = [
      {
        id: 'applications',
        label: 'Solicitudes',
        icon: <span>📋</span>,
        badge: applicationStats.pending > 0 ? applicationStats.pending : undefined,
        badgeColor: 'bg-yellow-100 text-yellow-700',
      },
      { id: 'tipsters', label: 'Gestión Tipsters', icon: <span>👥</span> },
      { id: 'sales', label: 'Ventas Checkout', icon: <span>🛒</span> },
      {
        id: 'withdrawals',
        label: 'Retiros / Pagos',
        icon: <span>💸</span>,
        badge: withdrawalStats.pending.count > 0 ? withdrawalStats.pending.count : undefined,
        badgeColor: 'bg-green-100 text-green-700',
      },
      {
        id: 'support',
        label: 'Soporte',
        icon: <span>🎫</span>,
        badge: ticketStats.open > 0 ? ticketStats.open : undefined,
        badgeColor: 'bg-blue-100 text-blue-700',
      },
      { id: 'affiliate', label: 'Afiliación', icon: <span>🤝</span> },
      { id: 'channel-monitor', label: 'Monitor Canales', icon: <span>📡</span> },
      { id: 'commissions', label: 'Comisiones', icon: <span>💰</span> },
      { id: 'reports', label: 'Reportes', icon: <span>📊</span> },
    ];
    return items;
  };

  const adminNavItems = getNavItems();

  return (
    <DashboardLayout
      navItems={adminNavItems}
      activeView={activeView}
      onNavChange={(view) => setActiveView(view as AdminView)}
      userInfo={{ name: 'SuperAdmin' }}
      onLogout={handleLogout}
      brandName="Antia"
      brandColor="red"
      badgeText="SuperAdmin"
      headerActions={<CurrencySelector variant="pill" />}
    >

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
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">KYC</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Pronósticos</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Afiliación</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Acciones</th>
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
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            tipster.kycCompleted 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-orange-100 text-orange-800'
                          }`}>
                            {tipster.kycCompleted ? '✓ Completo' : 'Pendiente'}
                          </span>
                        </td>
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
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => handleViewTipsterDetail(tipster)}
                            className="px-3 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 text-sm font-medium transition"
                          >
                            Ver Info
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

        {/* SALES/CHECKOUT VIEW */}
        {activeView === 'sales' && (
          <>
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">🛒 Ventas Checkout</h1>
              <p className="text-gray-600 mt-1">Listado completo de todas las ventas de la plataforma</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-sm text-gray-500 mb-2">💰 Volumen Bruto</div>
                <div className="text-2xl font-bold text-gray-900">
                  {formatPrice(salesStats.totalGrossCents)}
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-sm text-gray-500 mb-2">📊 Comisión Antia</div>
                <div className="text-2xl font-bold text-red-600">
                  {formatPrice(salesStats.totalPlatformFeeCents)}
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-sm text-gray-500 mb-2">💵 Neto Tipsters</div>
                <div className="text-2xl font-bold text-green-600">
                  {formatPrice(salesStats.totalNetCents)}
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-sm text-gray-500 mb-2">🛒 Total Ventas</div>
                <div className="text-2xl font-bold text-blue-600">{salesStats.totalSales}</div>
              </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h3 className="font-medium text-gray-900 mb-4">🔍 Filtros</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Desde</label>
                  <input
                    type="date"
                    value={salesFilters.startDate}
                    onChange={(e) => setSalesFilters({ ...salesFilters, startDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Hasta</label>
                  <input
                    type="date"
                    value={salesFilters.endDate}
                    onChange={(e) => setSalesFilters({ ...salesFilters, endDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Tipster</label>
                  <select
                    value={salesFilters.tipsterId}
                    onChange={(e) => setSalesFilters({ ...salesFilters, tipsterId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="">Todos</option>
                    {tipsters.map(t => (
                      <option key={t.id} value={t.id}>{t.publicName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Estado</label>
                  <select
                    value={salesFilters.status}
                    onChange={(e) => setSalesFilters({ ...salesFilters, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="">Todos</option>
                    <option value="PAGADA">Pagada</option>
                    <option value="ACCESS_GRANTED">Acceso Otorgado</option>
                    <option value="PENDIENTE">Pendiente</option>
                    <option value="REFUNDED">Reembolsada</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Pasarela</label>
                  <select
                    value={salesFilters.paymentProvider}
                    onChange={(e) => setSalesFilters({ ...salesFilters, paymentProvider: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="">Todas</option>
                    <option value="stripe">Stripe</option>
                    <option value="redsys">Redsys</option>
                    <option value="test">Test</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">País</label>
                  <select
                    value={salesFilters.country}
                    onChange={(e) => setSalesFilters({ ...salesFilters, country: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="">Todos</option>
                    <option value="ES">España</option>
                    <option value="MX">México</option>
                    <option value="AR">Argentina</option>
                    <option value="CO">Colombia</option>
                    <option value="US">Estados Unidos</option>
                  </select>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={loadSales}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
                >
                  🔍 Aplicar Filtros
                </button>
                <button
                  onClick={() => {
                    setSalesFilters({
                      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                      endDate: new Date().toISOString().split('T')[0],
                      tipsterId: '',
                      productId: '',
                      status: '',
                      paymentProvider: '',
                      country: '',
                    });
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm"
                >
                  Limpiar
                </button>
              </div>
            </div>

            {/* Sales Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                {salesLoading ? (
                  <div className="p-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
                    <p className="mt-2 text-gray-500">Cargando ventas...</p>
                  </div>
                ) : sales.length === 0 ? (
                  <div className="p-8 text-center">
                    <div className="text-5xl mb-4">📭</div>
                    <h3 className="text-lg font-medium text-gray-900">No hay ventas</h3>
                    <p className="text-gray-500 text-sm mt-1">Ajusta los filtros o espera a tener ventas</p>
                  </div>
                ) : (
                  <table className="min-w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipster</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Bruto</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Comisión</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Neto</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Pasarela</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">País</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {sales.map((sale) => (
                        <tr key={sale.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {new Date(sale.createdAt).toLocaleDateString('es-ES', { 
                              day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' 
                            })}
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm text-gray-900">{sale.clientEmail || 'Anónimo'}</div>
                            {sale.clientTelegramId && (
                              <div className="text-xs text-gray-500">📱 {sale.clientTelegramId}</div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm font-medium text-gray-900 max-w-[200px] truncate">
                              {sale.productTitle}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">{sale.tipsterName}</td>
                          <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                            {formatPrice(sale.grossAmountCents)}
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-red-600">
                            -{formatPrice(sale.platformFeeCents)}
                            <span className="text-xs text-gray-400 ml-1">({sale.platformFeePercent}%)</span>
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-medium text-green-600">
                            {formatPrice(sale.netAmountCents)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              sale.paymentProvider === 'stripe' ? 'bg-purple-100 text-purple-700' :
                              sale.paymentProvider === 'redsys' ? 'bg-blue-100 text-blue-700' :
                              'bg-gray-100 text-gray-600'
                            }`}>
                              {sale.paymentProvider === 'stripe' ? '💳 Stripe' :
                               sale.paymentProvider === 'redsys' ? '🏦 Redsys' :
                               sale.paymentProvider || 'N/A'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-sm">{sale.country || '🌍'}</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              sale.status === 'PAGADA' || sale.status === 'ACCESS_GRANTED' 
                                ? 'bg-green-100 text-green-700' :
                              sale.status === 'PENDIENTE' ? 'bg-yellow-100 text-yellow-700' :
                              sale.status === 'REFUNDED' ? 'bg-red-100 text-red-700' :
                              'bg-gray-100 text-gray-600'
                            }`}>
                              {sale.status === 'ACCESS_GRANTED' ? '✅ Acceso' :
                               sale.status === 'PAGADA' ? '✅ Pagada' :
                               sale.status === 'PENDIENTE' ? '⏳ Pendiente' :
                               sale.status === 'REFUNDED' ? '↩️ Reembolso' :
                               sale.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </>
        )}

        {/* SUPPORT VIEW */}
        {activeView === 'support' && (
          <>
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">🎫 Centro de Soporte</h1>
              <p className="text-gray-600 mt-1">Gestiona los tickets de soporte de tipsters y clientes</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div 
                onClick={() => { setTicketFilter(''); loadAdminTickets(); }}
                className={`bg-white rounded-lg shadow p-6 cursor-pointer border-2 transition ${!ticketFilter ? 'border-gray-400' : 'border-transparent hover:border-gray-200'}`}
              >
                <div className="text-sm text-gray-500 mb-2">📊 Todos</div>
                <div className="text-2xl font-bold text-gray-900">
                  {ticketStats.open + ticketStats.inProgress + ticketStats.resolved}
                </div>
              </div>
              <div 
                onClick={() => { setTicketFilter('OPEN'); loadAdminTickets(); }}
                className={`bg-white rounded-lg shadow p-6 cursor-pointer border-2 transition ${ticketFilter === 'OPEN' ? 'border-yellow-500' : 'border-transparent hover:border-gray-200'}`}
              >
                <div className="text-sm text-gray-500 mb-2">⏳ Abiertos</div>
                <div className="text-2xl font-bold text-yellow-600">{ticketStats.open}</div>
              </div>
              <div 
                onClick={() => { setTicketFilter('IN_PROGRESS'); loadAdminTickets(); }}
                className={`bg-white rounded-lg shadow p-6 cursor-pointer border-2 transition ${ticketFilter === 'IN_PROGRESS' ? 'border-blue-500' : 'border-transparent hover:border-gray-200'}`}
              >
                <div className="text-sm text-gray-500 mb-2">🔄 En Proceso</div>
                <div className="text-2xl font-bold text-blue-600">{ticketStats.inProgress}</div>
              </div>
              <div 
                onClick={() => { setTicketFilter('RESOLVED'); loadAdminTickets(); }}
                className={`bg-white rounded-lg shadow p-6 cursor-pointer border-2 transition ${ticketFilter === 'RESOLVED' ? 'border-green-500' : 'border-transparent hover:border-gray-200'}`}
              >
                <div className="text-sm text-gray-500 mb-2">✅ Resueltos</div>
                <div className="text-2xl font-bold text-green-600">{ticketStats.resolved}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Tickets List */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-lg shadow">
                  <div className="p-4 border-b border-gray-200">
                    <h2 className="font-bold text-gray-900">📋 Tickets</h2>
                  </div>
                  
                  {ticketsLoading ? (
                    <div className="p-8 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
                    </div>
                  ) : adminTickets.length === 0 ? (
                    <div className="p-8 text-center">
                      <div className="text-4xl mb-2">📭</div>
                      <p className="text-gray-500 text-sm">No hay tickets</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
                      {adminTickets.map((ticket) => (
                        <div 
                          key={ticket.id}
                          onClick={() => setSelectedAdminTicket(ticket)}
                          className={`p-4 cursor-pointer hover:bg-gray-50 transition ${selectedAdminTicket?.id === ticket.id ? 'bg-red-50 border-l-4 border-red-500' : ''}`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                  ticket.userRole === 'TIPSTER' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                                }`}>
                                  {ticket.userRole === 'TIPSTER' ? '👤 Tipster' : '👥 Cliente'}
                                </span>
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                  ticket.status === 'OPEN' ? 'bg-yellow-100 text-yellow-700' :
                                  ticket.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' :
                                  'bg-green-100 text-green-700'
                                }`}>
                                  {ticket.status === 'OPEN' ? 'Abierto' : ticket.status === 'IN_PROGRESS' ? 'En proceso' : 'Resuelto'}
                                </span>
                              </div>
                              <h4 className="font-medium text-gray-900 mt-1 truncate">{ticket.subject}</h4>
                              <p className="text-xs text-gray-500 truncate">{ticket.userName || ticket.userEmail}</p>
                              <p className="text-xs text-gray-400 mt-1">
                                {new Date(ticket.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                            {ticket.responses?.length > 0 && (
                              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                {ticket.responses.length}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Ticket Detail */}
              <div className="lg:col-span-2">
                {selectedAdminTicket ? (
                  <div className="bg-white rounded-lg shadow">
                    <div className="p-6 border-b border-gray-200">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              selectedAdminTicket.userRole === 'TIPSTER' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                            }`}>
                              {selectedAdminTicket.userRole === 'TIPSTER' ? '👤 Tipster' : '👥 Cliente'}
                            </span>
                            <span className="text-sm text-gray-500">•</span>
                            <span className="text-sm text-gray-600">{selectedAdminTicket.userName || selectedAdminTicket.userEmail}</span>
                          </div>
                          <h2 className="text-xl font-bold text-gray-900">{selectedAdminTicket.subject}</h2>
                          <p className="text-xs text-gray-400 mt-1">
                            Creado: {new Date(selectedAdminTicket.createdAt).toLocaleString('es-ES')}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <select
                            value={selectedAdminTicket.status}
                            onChange={(e) => handleUpdateTicketStatus(selectedAdminTicket.id, e.target.value)}
                            className={`px-3 py-1.5 rounded-lg border text-sm font-medium ${
                              selectedAdminTicket.status === 'OPEN' ? 'border-yellow-300 bg-yellow-50 text-yellow-700' :
                              selectedAdminTicket.status === 'IN_PROGRESS' ? 'border-blue-300 bg-blue-50 text-blue-700' :
                              'border-green-300 bg-green-50 text-green-700'
                            }`}
                          >
                            <option value="OPEN">⏳ Abierto</option>
                            <option value="IN_PROGRESS">🔄 En Proceso</option>
                            <option value="RESOLVED">✅ Resuelto</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Messages */}
                    <div className="p-6 max-h-[400px] overflow-y-auto space-y-4">
                      {/* Original message */}
                      <div className="p-4 rounded-lg bg-gray-50 mr-12">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-medium text-gray-700">
                            {selectedAdminTicket.userRole === 'TIPSTER' ? '👤' : '👥'} {selectedAdminTicket.userName || 'Usuario'}
                          </span>
                          <span className="text-xs text-gray-400">
                            {new Date(selectedAdminTicket.createdAt).toLocaleString('es-ES')}
                          </span>
                        </div>
                        <p className="text-gray-700 text-sm whitespace-pre-wrap">{selectedAdminTicket.message}</p>
                      </div>

                      {/* Responses */}
                      {selectedAdminTicket.responses?.map((response, idx) => (
                        <div 
                          key={idx}
                          className={`p-4 rounded-lg ${response.isAdmin ? 'bg-red-50 ml-12' : 'bg-gray-50 mr-12'}`}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`text-sm font-medium ${response.isAdmin ? 'text-red-600' : 'text-gray-700'}`}>
                              {response.isAdmin ? '🔧 Soporte Antia' : `${selectedAdminTicket.userRole === 'TIPSTER' ? '👤' : '👥'} ${selectedAdminTicket.userName || 'Usuario'}`}
                            </span>
                            <span className="text-xs text-gray-400">
                              {new Date(response.createdAt).toLocaleString('es-ES')}
                            </span>
                          </div>
                          <p className="text-gray-700 text-sm whitespace-pre-wrap">{response.message}</p>
                        </div>
                      ))}
                    </div>

                    {/* Reply Box */}
                    {selectedAdminTicket.status !== 'RESOLVED' && (
                      <div className="p-6 border-t border-gray-200">
                        <div className="flex gap-2">
                          <textarea
                            value={adminReplyMessage}
                            onChange={(e) => setAdminReplyMessage(e.target.value)}
                            placeholder="Escribe tu respuesta..."
                            rows={3}
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                          />
                        </div>
                        <div className="flex justify-end gap-2 mt-3">
                          <button
                            onClick={() => {
                              handleAdminReply();
                              handleUpdateTicketStatus(selectedAdminTicket.id, 'IN_PROGRESS');
                            }}
                            disabled={!adminReplyMessage.trim() || sendingReply}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm disabled:opacity-50"
                          >
                            {sendingReply ? '...' : '💬 Responder'}
                          </button>
                          <button
                            onClick={() => {
                              handleAdminReply();
                              handleUpdateTicketStatus(selectedAdminTicket.id, 'RESOLVED');
                            }}
                            disabled={!adminReplyMessage.trim() || sendingReply}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium text-sm disabled:opacity-50"
                          >
                            {sendingReply ? '...' : '✅ Responder y Cerrar'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-white rounded-lg shadow p-12 text-center">
                    <div className="text-6xl mb-4">🎫</div>
                    <h3 className="text-xl font-medium text-gray-900 mb-2">Selecciona un ticket</h3>
                    <p className="text-gray-500 text-sm">Haz clic en un ticket de la lista para ver los detalles y responder</p>
                  </div>
                )}
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

        {/* Vista: Retiros / Pagos */}
        {activeView === 'withdrawals' && (
          <div className="p-6">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">💸 Solicitudes de Retiro</h1>
              <p className="text-gray-600 mt-1">Gestiona las solicitudes de pago de los tipsters</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div 
                onClick={() => setWithdrawalFilter(withdrawalFilter === 'PENDING' ? '' : 'PENDING')}
                className={`bg-white rounded-lg shadow p-6 cursor-pointer border-2 transition ${withdrawalFilter === 'PENDING' ? 'border-yellow-500' : 'border-transparent hover:border-gray-200'}`}
              >
                <div className="text-sm text-gray-500 mb-2">⏳ Pendientes</div>
                <div className="text-3xl font-bold text-yellow-600">{withdrawalStats.pending.count}</div>
                <div className="text-sm text-gray-400 mt-1">{formatCurrency(withdrawalStats.pending.totalCents)}</div>
              </div>
              <div 
                onClick={() => setWithdrawalFilter(withdrawalFilter === 'APPROVED' ? '' : 'APPROVED')}
                className={`bg-white rounded-lg shadow p-6 cursor-pointer border-2 transition ${withdrawalFilter === 'APPROVED' ? 'border-blue-500' : 'border-transparent hover:border-gray-200'}`}
              >
                <div className="text-sm text-gray-500 mb-2">✓ Aprobadas</div>
                <div className="text-3xl font-bold text-blue-600">{withdrawalStats.approved.count}</div>
                <div className="text-sm text-gray-400 mt-1">{formatCurrency(withdrawalStats.approved.totalCents)}</div>
              </div>
              <div 
                onClick={() => setWithdrawalFilter(withdrawalFilter === 'PAID' ? '' : 'PAID')}
                className={`bg-white rounded-lg shadow p-6 cursor-pointer border-2 transition ${withdrawalFilter === 'PAID' ? 'border-green-500' : 'border-transparent hover:border-gray-200'}`}
              >
                <div className="text-sm text-gray-500 mb-2">✅ Pagadas</div>
                <div className="text-3xl font-bold text-green-600">{withdrawalStats.paid.count}</div>
                <div className="text-sm text-gray-400 mt-1">{formatCurrency(withdrawalStats.paid.totalCents)}</div>
              </div>
              <div 
                onClick={() => setWithdrawalFilter(withdrawalFilter === 'REJECTED' ? '' : 'REJECTED')}
                className={`bg-white rounded-lg shadow p-6 cursor-pointer border-2 transition ${withdrawalFilter === 'REJECTED' ? 'border-red-500' : 'border-transparent hover:border-gray-200'}`}
              >
                <div className="text-sm text-gray-500 mb-2">❌ Rechazadas</div>
                <div className="text-3xl font-bold text-red-600">{withdrawalStats.rejected.count}</div>
                <div className="text-sm text-gray-400 mt-1">{formatCurrency(withdrawalStats.rejected.totalCents)}</div>
              </div>
            </div>

            {/* Filters Bar */}
            <div className="bg-white rounded-lg shadow p-4 mb-6">
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                {/* Search */}
                <div className="relative flex-1 max-w-md">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    value={withdrawalSearch}
                    onChange={(e) => setWithdrawalSearch(e.target.value)}
                    placeholder="Buscar por nombre, ID o método..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Date Range */}
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-500">Desde:</span>
                  <input
                    type="date"
                    value={withdrawalDateFrom}
                    onChange={(e) => setWithdrawalDateFrom(e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-500">Hasta:</span>
                  <input
                    type="date"
                    value={withdrawalDateTo}
                    onChange={(e) => setWithdrawalDateTo(e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Refresh */}
                <button
                  onClick={loadAdminWithdrawals}
                  className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg text-sm font-medium transition flex items-center gap-2"
                >
                  🔄 Actualizar
                </button>
              </div>
            </div>

            {/* Withdrawals List */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  {withdrawalFilter === '' && '📋 Todas las Solicitudes'}
                  {withdrawalFilter === 'PENDING' && '⏳ Solicitudes Pendientes'}
                  {withdrawalFilter === 'APPROVED' && '✓ Solicitudes Aprobadas'}
                  {withdrawalFilter === 'PAID' && '✅ Solicitudes Pagadas'}
                  {withdrawalFilter === 'REJECTED' && '❌ Solicitudes Rechazadas'}
                </h2>
                {withdrawalFilter && (
                  <button 
                    onClick={() => setWithdrawalFilter('')}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    ✕ Quitar filtro
                  </button>
                )}
              </div>

              {withdrawalsLoading ? (
                <div className="p-12 text-center">
                  <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="text-gray-500 mt-4">Cargando solicitudes...</p>
                </div>
              ) : adminWithdrawals.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="text-5xl mb-4">📭</div>
                  <p className="text-gray-500">No hay solicitudes de retiro</p>
                  <p className="text-sm text-gray-400 mt-1">Cuando un tipster solicite un retiro, aparecerá aquí</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {adminWithdrawals
                    .filter(w => {
                      if (!withdrawalSearch) return true;
                      const search = withdrawalSearch.toLowerCase();
                      return (
                        w.id?.toLowerCase().includes(search) ||
                        w.invoiceNumber?.toLowerCase().includes(search) ||
                        w.tipsterName?.toLowerCase().includes(search) ||
                        w.bankAccountType?.toLowerCase().includes(search)
                      );
                    })
                    .map((w: any) => (
                    <div key={w.id} className="p-6 hover:bg-gray-50 transition">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          {/* Header Row */}
                          <div className="flex items-center gap-3 mb-3">
                            <h3 className="font-semibold text-gray-900 text-lg">{w.tipsterName}</h3>
                            {w.status === 'PENDING' && (
                              <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-medium">⏳ Pendiente</span>
                            )}
                            {w.status === 'APPROVED' && (
                              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">✓ Aprobada</span>
                            )}
                            {w.status === 'PAID' && (
                              <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">✅ Pagada</span>
                            )}
                            {w.status === 'REJECTED' && (
                              <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">❌ Rechazada</span>
                            )}
                          </div>

                          {/* Info Grid */}
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm text-gray-600">
                            <div>
                              <span className="text-gray-400 block text-xs">Factura</span>
                              <p className="font-mono font-medium">{w.invoiceNumber}</p>
                            </div>
                            <div>
                              <span className="text-gray-400 block text-xs">Monto Solicitado</span>
                              <p className="font-bold text-green-600 text-lg">{formatCurrency(w.amountCents)}</p>
                            </div>
                            <div>
                              <span className="text-gray-400 block text-xs">Método de Pago</span>
                              <p className="font-medium">{w.bankAccountType === 'IBAN' ? '🏦 Banco' : w.bankAccountType === 'PAYPAL' ? '💳 PayPal' : '₿ Crypto'}</p>
                            </div>
                            <div>
                              <span className="text-gray-400 block text-xs">Fecha Solicitud</span>
                              <p className="font-medium">
                                {w.requestedAt ? new Date(w.requestedAt).toLocaleDateString('es-ES', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric'
                                }) : '-'}
                              </p>
                            </div>
                            <div>
                              <span className="text-gray-400 block text-xs">Email</span>
                              <p className="font-medium truncate">{w.tipsterEmail || '-'}</p>
                            </div>
                          </div>

                          {/* Bank Details */}
                          {w.bankAccountDetails && (
                            <div className="mt-3 p-3 bg-gray-50 rounded-lg text-sm">
                              <span className="text-gray-500 font-medium">Datos de pago: </span>
                              <span className="font-mono text-gray-700">
                                {w.bankAccountDetails.iban || w.bankAccountDetails.paypalEmail || w.bankAccountDetails.cryptoAddress || 'N/A'}
                              </span>
                            </div>
                          )}

                          {/* Rejection reason */}
                          {w.status === 'REJECTED' && w.rejectionReason && (
                            <div className="mt-3 p-3 bg-red-50 rounded-lg text-sm">
                              <span className="text-red-600 font-medium">Motivo de rechazo: </span>
                              <span className="text-red-700">{w.rejectionReason}</span>
                            </div>
                          )}

                          {/* Payment info */}
                          {w.status === 'PAID' && w.paymentReference && (
                            <div className="mt-3 p-3 bg-green-50 rounded-lg text-sm">
                              <span className="text-green-600 font-medium">Ref. de pago: </span>
                              <span className="text-green-700">{w.paymentReference}</span>
                              {w.paidAt && (
                                <span className="text-green-600 ml-4">
                                  Pagado el {new Date(w.paidAt).toLocaleDateString('es-ES')}
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="ml-6 flex flex-col gap-2">
                          {w.status === 'PENDING' && (
                            <>
                              <button
                                onClick={() => openWithdrawalAction(w, 'pay')}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition flex items-center gap-2"
                              >
                                ✅ Aprobar y Pagar
                              </button>
                              <button
                                onClick={() => openWithdrawalAction(w, 'reject')}
                                className="px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 transition"
                              >
                                ❌ Rechazar
                              </button>
                            </>
                          )}
                          {w.status === 'APPROVED' && (
                            <button
                              onClick={() => openWithdrawalAction(w, 'pay')}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition flex items-center gap-2"
                            >
                              💰 Marcar Pagado
                            </button>
                          )}
                          {w.invoicePdfUrl && (
                            <a
                              href={w.invoicePdfUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition text-center"
                            >
                              📄 Ver Factura
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

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

      {/* Modal de Detalle del Tipster */}
      {showTipsterModal && selectedTipsterDetail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex justify-between items-center">
              <h3 className="text-xl font-bold text-white">📋 Información del Tipster</h3>
              <button
                onClick={() => setShowTipsterModal(false)}
                className="text-white/80 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Información Básica */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-gray-500 mb-1">Nombre Público</div>
                  <div className="font-semibold text-gray-900">{selectedTipsterDetail.publicName}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500 mb-1">Estado</div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    selectedTipsterDetail.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {selectedTipsterDetail.status}
                  </span>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500 mb-1">Email</div>
                  <div className="text-gray-900">{selectedTipsterDetail.email || '-'}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500 mb-1">Teléfono</div>
                  <div className="text-gray-900">{selectedTipsterDetail.phone || '-'}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500 mb-1">Telegram</div>
                  <div className="text-gray-900">{selectedTipsterDetail.telegramUsername || '-'}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500 mb-1">Canal de Promoción</div>
                  <div className="text-gray-900 text-sm break-all">{selectedTipsterDetail.promotionChannel || '-'}</div>
                </div>
              </div>

              {/* Estadísticas */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm font-medium text-gray-700 mb-3">📊 Estadísticas</div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-gray-500">Ventas Totales</div>
                    <div className="text-xl font-bold text-blue-600">{selectedTipsterDetail.totalSales || 0}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Ganancias Totales</div>
                    <div className="text-xl font-bold text-green-600">
                      {formatPrice(selectedTipsterDetail.totalEarningsCents || 0)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Datos de Cobro / KYC */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm font-medium text-gray-700">🏦 Datos de Cobro (KYC)</div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    selectedTipsterDetail.kycCompleted 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-orange-100 text-orange-800'
                  }`}>
                    {selectedTipsterDetail.kycCompleted ? '✓ Completo' : 'Pendiente'}
                  </span>
                </div>
                
                {selectedTipsterDetail.kycCompleted && selectedTipsterDetail.kycData ? (
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-xs text-gray-500">Nombre/Razón Social</div>
                      <div className="font-medium">{selectedTipsterDetail.kycData.legalName || '-'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Documento</div>
                      <div className="font-medium">
                        {selectedTipsterDetail.kycData.documentType}: {selectedTipsterDetail.kycData.documentNumber || '-'}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">País</div>
                      <div className="font-medium">{selectedTipsterDetail.kycData.country || '-'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Método de Cobro</div>
                      <div className="font-medium">{selectedTipsterDetail.kycData.bankAccountType || '-'}</div>
                    </div>
                    {selectedTipsterDetail.kycData.bankAccountDetails && (
                      <div className="col-span-2">
                        <div className="text-xs text-gray-500">Detalles de la Cuenta</div>
                        <div className="font-medium font-mono text-xs bg-gray-100 p-2 rounded mt-1">
                          {selectedTipsterDetail.kycData.bankAccountType === 'IBAN' && (
                            <>IBAN: {selectedTipsterDetail.kycData.bankAccountDetails.iban}</>
                          )}
                          {selectedTipsterDetail.kycData.bankAccountType === 'PAYPAL' && (
                            <>PayPal: {selectedTipsterDetail.kycData.bankAccountDetails.email}</>
                          )}
                          {selectedTipsterDetail.kycData.bankAccountType === 'CRYPTO' && (
                            <>Wallet ({selectedTipsterDetail.kycData.bankAccountDetails.network}): {selectedTipsterDetail.kycData.bankAccountDetails.address}</>
                          )}
                          {selectedTipsterDetail.kycData.bankAccountType === 'OTHER' && (
                            <>{selectedTipsterDetail.kycData.bankAccountDetails.details}</>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 italic">
                    El tipster aún no ha completado sus datos de cobro
                  </div>
                )}
              </div>

              {/* Módulos */}
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="text-sm font-medium text-gray-700 mb-3">🔧 Módulos Habilitados</div>
                <div className="flex gap-4">
                  <div className={`px-3 py-1 rounded text-sm ${
                    selectedTipsterDetail.modules.forecasts 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-gray-100 text-gray-500'
                  }`}>
                    {selectedTipsterDetail.modules.forecasts ? '✓' : '✗'} Pronósticos
                  </div>
                  <div className={`px-3 py-1 rounded text-sm ${
                    selectedTipsterDetail.modules.affiliate 
                      ? 'bg-purple-100 text-purple-800' 
                      : 'bg-gray-100 text-gray-500'
                  }`}>
                    {selectedTipsterDetail.modules.affiliate ? '✓' : '✗'} Afiliación
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-6 py-4 flex justify-end border-t">
              <button
                onClick={() => setShowTipsterModal(false)}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Acciones de Retiro */}
      {showWithdrawalActionModal && selectedWithdrawal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => {
          setShowWithdrawalActionModal(false);
          resetWithdrawalForm();
        }}>
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className={`p-6 text-white ${
              withdrawalAction === 'approve' ? 'bg-blue-600' :
              withdrawalAction === 'pay' ? 'bg-green-600' :
              'bg-red-600'
            }`}>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center">
                  <span className="text-3xl">
                    {withdrawalAction === 'approve' ? '✓' : withdrawalAction === 'pay' ? '💰' : '❌'}
                  </span>
                </div>
                <div>
                  <h3 className="text-xl font-bold">
                    {withdrawalAction === 'approve' ? 'Aprobar Solicitud' :
                     withdrawalAction === 'pay' ? 'Marcar como Pagado' :
                     'Rechazar Solicitud'}
                  </h3>
                  <p className="text-white/80 text-sm">
                    {selectedWithdrawal.invoiceNumber} - {selectedWithdrawal.tipsterName}
                  </p>
                </div>
              </div>
            </div>

            {/* Info Summary */}
            <div className="p-6 bg-gray-50 border-b">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Importe</p>
                  <p className="font-bold text-xl">{formatCurrency(selectedWithdrawal.amountCents)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Método de pago</p>
                  <p className="font-medium">{selectedWithdrawal.bankAccountType || 'No especificado'}</p>
                </div>
                {selectedWithdrawal.bankAccountDetails?.iban && (
                  <div className="col-span-2">
                    <p className="text-gray-500">IBAN</p>
                    <p className="font-mono text-sm">{selectedWithdrawal.bankAccountDetails.iban}</p>
                  </div>
                )}
                {selectedWithdrawal.bankAccountDetails?.paypalEmail && (
                  <div className="col-span-2">
                    <p className="text-gray-500">PayPal</p>
                    <p className="font-mono text-sm">{selectedWithdrawal.bankAccountDetails.paypalEmail}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              {withdrawalAction === 'pay' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Método de pago usado
                    </label>
                    <select
                      value={withdrawalPaymentMethod}
                      onChange={(e) => setWithdrawalPaymentMethod(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    >
                      <option value="BANK_TRANSFER">Transferencia bancaria</option>
                      <option value="PAYPAL">PayPal</option>
                      <option value="CRYPTO">Crypto</option>
                      <option value="OTHER">Otro</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Referencia del pago (opcional)
                    </label>
                    <input
                      type="text"
                      value={withdrawalPaymentRef}
                      onChange={(e) => setWithdrawalPaymentRef(e.target.value)}
                      placeholder="Ej: REF-123456"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                </>
              )}

              {withdrawalAction === 'reject' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Motivo del rechazo <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={withdrawalRejectionReason}
                    onChange={(e) => setWithdrawalRejectionReason(e.target.value)}
                    placeholder="Explica el motivo por el cual se rechaza esta solicitud..."
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 resize-none"
                  />
                </div>
              )}

              {(withdrawalAction === 'approve' || withdrawalAction === 'pay') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notas internas (opcional)
                  </label>
                  <textarea
                    value={withdrawalAdminNotes}
                    onChange={(e) => setWithdrawalAdminNotes(e.target.value)}
                    placeholder="Añadir notas internas..."
                    rows={2}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>
              )}

              {/* Warning for reject */}
              {withdrawalAction === 'reject' && (
                <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                  <div className="flex items-start gap-3">
                    <span className="text-lg">⚠️</span>
                    <div className="text-sm text-red-800">
                      <p className="font-medium mb-1">Esta acción no se puede deshacer</p>
                      <p className="text-red-700">El tipster será notificado del rechazo y podrá ver el motivo.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowWithdrawalActionModal(false);
                  resetWithdrawalForm();
                }}
                className="px-5 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-100 text-gray-700 font-medium transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleWithdrawalAction}
                disabled={processingWithdrawal || (withdrawalAction === 'reject' && !withdrawalRejectionReason.trim())}
                className={`px-5 py-2.5 text-white rounded-lg font-medium transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                  withdrawalAction === 'approve' ? 'bg-blue-600 hover:bg-blue-700' :
                  withdrawalAction === 'pay' ? 'bg-green-600 hover:bg-green-700' :
                  'bg-red-600 hover:bg-red-700'
                }`}
              >
                {processingWithdrawal ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Procesando...
                  </>
                ) : (
                  <>
                    {withdrawalAction === 'approve' ? '✓ Aprobar' :
                     withdrawalAction === 'pay' ? '💰 Confirmar Pago' :
                     '❌ Rechazar'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
