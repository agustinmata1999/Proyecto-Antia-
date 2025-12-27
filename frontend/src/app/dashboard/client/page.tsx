'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { clientApi, supportApi, authApi } from '@/lib/api';

type ViewType = 'dashboard' | 'purchases' | 'subscriptions' | 'payments' | 'support' | 'profile';

interface Purchase {
  id: string;
  productId: string;
  productTitle: string;
  productDescription?: string;
  tipsterName: string;
  amountCents: number;
  currency: string;
  status: string;
  rawStatus: string;
  validityDays?: number;
  expiresAt?: string;
  isExpired: boolean;
  telegramChannelId?: string;
  accessMode?: string;
  createdAt: string;
}

interface TicketMessage {
  id: string;
  senderId: string;
  senderRole: string;
  content: string;
  attachments?: string[];
  createdAt: string;
}

interface Ticket {
  id: string;
  category: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  orderId?: string;
  messages?: TicketMessage[];
  createdAt: string;
  resolvedAt?: string;
}

interface Payment {
  id: string;
  amountCents: number;
  currency: string;
  paymentProvider?: string;
  paymentMethod?: string;
  status: string;
  createdAt: string;
}

interface Subscription {
  id: string;
  productId: string;
  productTitle: string;
  tipsterName: string;
  status: string;
  billingInterval: string;
  amountCents: number;
  currency: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  telegramChannelId?: string;
  createdAt: string;
}

export default function ClientDashboard() {
  const router = useRouter();
  const [activeView, setActiveView] = useState<ViewType>('dashboard');
  const [loading, setLoading] = useState(true);
  
  // Data states
  const [profile, setProfile] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  
  // Form states
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [ticketForm, setTicketForm] = useState({
    category: 'access',
    subject: '',
    description: '',
    orderId: '',
  });
  const [submittingTicket, setSubmittingTicket] = useState(false);
  
  // Ticket detail view
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  
  // Profile edit
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    countryIso: '',
    telegramUserId: '',
    locale: 'es',
  });
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('access_token');
      if (!token) {
        router.push('/login');
        return;
      }
      loadData();
    };
    checkAuth();
  }, []);

  const loadData = async () => {
    try {
      // Load profile
      try {
        const profileRes = await clientApi.getProfile();
        setProfile(profileRes.data.profile);
        setUser(profileRes.data.user);
        if (profileRes.data.profile) {
          setProfileForm({
            countryIso: profileRes.data.profile.countryIso || '',
            telegramUserId: profileRes.data.profile.telegramUserId || '',
            locale: profileRes.data.profile.locale || 'es',
          });
        }
      } catch (error) {
        console.error('Error loading profile:', error);
      }

      // Load purchases
      try {
        const purchasesRes = await clientApi.getPurchases();
        setPurchases(purchasesRes.data);
      } catch (error) {
        console.error('Error loading purchases:', error);
      }

      // Load subscriptions
      try {
        const subsRes = await clientApi.getSubscriptions();
        setSubscriptions(subsRes.data || []);
      } catch (error) {
        console.error('Error loading subscriptions:', error);
      }

      // Load tickets
      try {
        const ticketsRes = await supportApi.getMyTickets();
        setTickets(ticketsRes.data);
      } catch (error) {
        console.error('Error loading tickets:', error);
      }

      // Load payments
      try {
        const paymentsRes = await clientApi.getPaymentHistory();
        setPayments(paymentsRes.data);
      } catch (error) {
        console.error('Error loading payments:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await authApi.logout();
      localStorage.removeItem('access_token');
      router.push('/');
    } catch (error) {
      console.error('Error logging out:', error);
      localStorage.removeItem('access_token');
      router.push('/');
    }
  };

  const handleSubmitTicket = async () => {
    if (!ticketForm.subject.trim() || !ticketForm.description.trim()) {
      alert('Por favor, completa todos los campos');
      return;
    }

    setSubmittingTicket(true);
    try {
      const response = await supportApi.createTicket({
        category: ticketForm.category,
        subject: ticketForm.subject.trim(),
        description: ticketForm.description.trim(),
        orderId: ticketForm.orderId || undefined,
      });

      if (response.data.success) {
        alert('✅ Ticket creado correctamente');
        setShowTicketForm(false);
        setTicketForm({ category: 'access', subject: '', description: '', orderId: '' });
        // Reload tickets
        const ticketsRes = await supportApi.getMyTickets();
        setTickets(ticketsRes.data);
      }
    } catch (error: any) {
      alert('Error al crear ticket: ' + (error.response?.data?.message || 'Error desconocido'));
    } finally {
      setSubmittingTicket(false);
    }
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      const response = await clientApi.updateProfile(profileForm);
      if (response.data.success) {
        alert('✅ Perfil actualizado');
        setEditingProfile(false);
        // Reload profile
        const profileRes = await clientApi.getProfile();
        setProfile(profileRes.data.profile);
      }
    } catch (error: any) {
      alert('Error: ' + (error.response?.data?.message || 'Error al guardar'));
    } finally {
      setSavingProfile(false);
    }
  };

  const handleCancelSubscription = async (subscriptionId: string) => {
    if (!confirm('¿Estás seguro de que quieres cancelar esta suscripción?\n\nMantendrás el acceso hasta el final del periodo actual.')) {
      return;
    }

    try {
      const response = await clientApi.cancelSubscription(subscriptionId);
      if (response.data.success) {
        alert('✅ Suscripción cancelada. Mantendrás el acceso hasta el final del periodo actual.');
        // Reload subscriptions
        const subsRes = await clientApi.getSubscriptions();
        setSubscriptions(subsRes.data || []);
      }
    } catch (error: any) {
      alert('Error: ' + (error.response?.data?.message || 'Error al cancelar'));
    }
  };

  const formatPrice = (cents: number, currency: string = 'EUR') => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: currency,
    }).format(cents / 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      ACTIVE: 'bg-green-100 text-green-700',
      EXPIRED: 'bg-red-100 text-red-700',
      PENDING: 'bg-yellow-100 text-yellow-700',
      PENDING_ACCESS: 'bg-blue-100 text-blue-700',
      REFUNDED: 'bg-gray-100 text-gray-700',
    };
    const labels: Record<string, string> = {
      ACTIVE: '✅ Activo',
      EXPIRED: '⏰ Vencido',
      PENDING: '⏳ Pendiente',
      PENDING_ACCESS: '🔄 Procesando Acceso',
      REFUNDED: '↩️ Reembolsado',
    };
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-600'}`}>
        {labels[status] || status}
      </span>
    );
  };

  const getTicketStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      OPEN: 'bg-yellow-100 text-yellow-700',
      IN_PROGRESS: 'bg-blue-100 text-blue-700',
      RESOLVED: 'bg-green-100 text-green-700',
      CLOSED: 'bg-gray-100 text-gray-700',
    };
    const labels: Record<string, string> = {
      OPEN: '🔵 Abierto',
      IN_PROGRESS: '🟡 En Progreso',
      RESOLVED: '✅ Resuelto',
      CLOSED: '⚫ Cerrado',
    };
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-600'}`}>
        {labels[status] || status}
      </span>
    );
  };

  // Stats
  const activePurchases = purchases.filter(p => p.status === 'ACTIVE').length;
  const totalSpent = purchases.reduce((sum, p) => sum + (p.amountCents || 0), 0);
  const openTickets = tickets.filter(t => t.status === 'OPEN' || t.status === 'IN_PROGRESS').length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="fixed top-0 left-0 w-64 h-full bg-white border-r border-gray-200 shadow-sm">
        <div className="p-6">
          <div className="text-2xl font-bold text-blue-600 mb-8">Antia</div>
          
          <div className="mb-6 pb-6 border-b border-gray-200">
            <div className="text-sm font-medium text-gray-900">{user?.name || user?.email || 'Mi Cuenta'}</div>
            <div className="text-xs text-gray-500 mt-1">{user?.email}</div>
          </div>

          <nav className="space-y-1">
            <button
              onClick={() => setActiveView('dashboard')}
              className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition ${
                activeView === 'dashboard' 
                  ? 'bg-blue-50 text-blue-600 font-medium' 
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span>🏠</span> Dashboard
            </button>
            <button
              onClick={() => setActiveView('purchases')}
              className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition ${
                activeView === 'purchases' 
                  ? 'bg-blue-50 text-blue-600 font-medium' 
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span>🛒</span> Mis Compras
              {activePurchases > 0 && (
                <span className="ml-auto bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs">
                  {activePurchases}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveView('subscriptions')}
              className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition ${
                activeView === 'subscriptions' 
                  ? 'bg-blue-50 text-blue-600 font-medium' 
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span>🔄</span> Mis Suscripciones
              {subscriptions.filter(s => s.status === 'active').length > 0 && (
                <span className="ml-auto bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs">
                  {subscriptions.filter(s => s.status === 'active').length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveView('payments')}
              className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition ${
                activeView === 'payments' 
                  ? 'bg-blue-50 text-blue-600 font-medium' 
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span>📄</span> Facturas y Pagos
            </button>
            <button
              onClick={() => setActiveView('support')}
              className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition ${
                activeView === 'support' 
                  ? 'bg-blue-50 text-blue-600 font-medium' 
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span>💬</span> Soporte
              {openTickets > 0 && (
                <span className="ml-auto bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded text-xs">
                  {openTickets}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveView('profile')}
              className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition ${
                activeView === 'profile' 
                  ? 'bg-blue-50 text-blue-600 font-medium' 
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span>⚙️</span> Mi Perfil
            </button>
            
            <div className="pt-4 border-t border-gray-200 mt-4">
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 flex items-center gap-3 transition"
              >
                <span>🚪</span> Cerrar Sesión
              </button>
            </div>
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 p-8">
        {/* Dashboard View */}
        {activeView === 'dashboard' && (
          <>
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">¡Hola{user?.name ? `, ${user.name}` : ''}!</h1>
              <p className="text-gray-600 mt-1">Gestiona tus compras y accesos</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-2xl">✅</span>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Accesos Activos</div>
                    <div className="text-3xl font-bold text-gray-900">{activePurchases}</div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-2xl">🛒</span>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Total Compras</div>
                    <div className="text-3xl font-bold text-gray-900">{purchases.length}</div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="text-2xl">💰</span>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Total Invertido</div>
                    <div className="text-3xl font-bold text-gray-900">{formatPrice(totalSpent)}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Active Purchases */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-xl font-bold text-gray-900">Accesos Activos</h2>
              </div>
              <div className="p-6">
                {purchases.filter(p => p.status === 'ACTIVE').length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-5xl mb-4">📭</div>
                    <p className="text-gray-500 mb-4">No tienes accesos activos</p>
                    <a href="/" className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition">
                      Explorar Pronósticos
                    </a>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {purchases.filter(p => p.status === 'ACTIVE').map((purchase) => (
                      <div key={purchase.id} className="border border-gray-200 rounded-lg p-4 hover:border-green-300 transition">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900">{purchase.productTitle}</h3>
                            <p className="text-sm text-gray-500">Por: {purchase.tipsterName}</p>
                            {purchase.expiresAt && (
                              <p className="text-xs text-gray-400 mt-1">
                                Vence: {formatDate(purchase.expiresAt)}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            {getStatusBadge(purchase.status)}
                            <a
                              href="https://t.me"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm flex items-center gap-2"
                            >
                              📱 Ir al Canal
                            </a>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Purchases View */}
        {activeView === 'purchases' && (
          <>
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">Mis Compras</h1>
              <p className="text-gray-600 mt-1">Historial de todas tus compras y accesos</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              {purchases.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="text-6xl mb-4">🛒</div>
                  <h3 className="text-xl font-medium text-gray-900 mb-2">No tienes compras aún</h3>
                  <p className="text-gray-500 mb-6">Explora los mejores pronósticos y empieza a ganar</p>
                  <a href="/" className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition">
                    Explorar Pronósticos
                  </a>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {purchases.map((purchase) => (
                    <div key={purchase.id} className="p-6 hover:bg-gray-50 transition">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-gray-900 text-lg">{purchase.productTitle}</h3>
                            {getStatusBadge(purchase.status)}
                          </div>
                          <p className="text-gray-600 text-sm mb-2">Por: {purchase.tipsterName}</p>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span>📅 Comprado: {formatDate(purchase.createdAt)}</span>
                            {purchase.validityDays && (
                              <span>⏱️ Duración: {purchase.validityDays} días</span>
                            )}
                            {purchase.expiresAt && (
                              <span className={purchase.isExpired ? 'text-red-500' : ''}>
                                {purchase.isExpired ? '❌ Venció' : '📆 Vence'}: {formatDate(purchase.expiresAt)}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-bold text-gray-900 mb-2">
                            {formatPrice(purchase.amountCents, purchase.currency)}
                          </div>
                          <div className="flex gap-2">
                            {purchase.status === 'ACTIVE' && (
                              <a
                                href="https://t.me"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm"
                              >
                                📱 Ir al Canal
                              </a>
                            )}
                            {purchase.status === 'EXPIRED' && (
                              <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm">
                                🔄 Renovar
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Subscriptions View */}
        {activeView === 'subscriptions' && (
          <>
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">Mis Suscripciones</h1>
              <p className="text-gray-600 mt-1">Gestiona tus suscripciones activas</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              {subscriptions.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="text-6xl mb-4">🔄</div>
                  <h3 className="text-xl font-medium text-gray-900 mb-2">No tienes suscripciones activas</h3>
                  <p className="text-gray-500">Las suscripciones a productos premium aparecerán aquí</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {subscriptions.map((subscription) => (
                    <div key={subscription.id} className="p-6 hover:bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <h3 className="text-lg font-semibold text-gray-900">{subscription.productTitle}</h3>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              subscription.status === 'active' 
                                ? 'bg-green-100 text-green-700' 
                                : subscription.cancelAtPeriodEnd 
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-gray-100 text-gray-600'
                            }`}>
                              {subscription.status === 'active' 
                                ? (subscription.cancelAtPeriodEnd ? '⏳ Cancelada al final del periodo' : '✅ Activa')
                                : subscription.status === 'canceled' ? '❌ Cancelada' : subscription.status}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 mt-1">Por {subscription.tipsterName}</p>
                          
                          <div className="flex items-center gap-6 mt-3 text-sm text-gray-600">
                            <div>
                              <span className="font-medium">Precio:</span>{' '}
                              {formatPrice(subscription.amountCents, subscription.currency)}/
                              {subscription.billingInterval === 'MONTHLY' ? 'mes' : 
                               subscription.billingInterval === 'QUARTERLY' ? 'trimestre' : 'año'}
                            </div>
                            <div>
                              <span className="font-medium">Próximo cobro:</span>{' '}
                              {formatDate(subscription.currentPeriodEnd)}
                            </div>
                          </div>

                          {subscription.telegramChannelId && (
                            <div className="mt-3">
                              <a 
                                href={`https://t.me/${subscription.telegramChannelId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
                              >
                                📱 Acceder al canal de Telegram
                              </a>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {subscription.status === 'active' && !subscription.cancelAtPeriodEnd && (
                            <button
                              onClick={() => handleCancelSubscription(subscription.id)}
                              className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium transition"
                            >
                              Cancelar
                            </button>
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

        {/* Payments View */}
        {activeView === 'payments' && (
          <>
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">Facturas y Pagos</h1>
              <p className="text-gray-600 mt-1">Historial de todos tus pagos realizados</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              {payments.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="text-6xl mb-4">📄</div>
                  <h3 className="text-xl font-medium text-gray-900 mb-2">No hay pagos registrados</h3>
                  <p className="text-gray-500">Aquí aparecerán tus recibos cuando realices una compra</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">ID Orden</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Método</th>
                        <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase">Importe</th>
                        <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase">Estado</th>
                        <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {payments.map((payment) => (
                        <tr key={payment.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm text-gray-900">{formatDate(payment.createdAt)}</td>
                          <td className="px-6 py-4 text-sm text-gray-500 font-mono">#{payment.id.substring(0, 8)}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {payment.paymentProvider === 'stripe' ? '💳 Stripe' : 
                             payment.paymentProvider === 'redsys' ? '🏦 Redsys' : 
                             payment.paymentMethod || 'N/A'}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900 text-right font-medium">
                            {formatPrice(payment.amountCents, payment.currency)}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                              ✅ Pagado
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button className="text-blue-600 hover:text-blue-800 text-sm">
                              📥 Recibo
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* Support View */}
        {activeView === 'support' && (
          <>
            <div className="mb-8 flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Soporte</h1>
                <p className="text-gray-600 mt-1">¿Necesitas ayuda? Estamos aquí para ti</p>
              </div>
              <button
                onClick={() => setShowTicketForm(true)}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
              >
                <span>➕</span> Nuevo Ticket
              </button>
            </div>

            {/* Quick Help Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <button
                onClick={() => {
                  setTicketForm({ ...ticketForm, category: 'access', subject: 'No tengo acceso al canal' });
                  setShowTicketForm(true);
                }}
                className="bg-white p-6 rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-md transition text-left"
              >
                <div className="text-3xl mb-3">🔐</div>
                <h3 className="font-semibold text-gray-900">Problemas de Acceso</h3>
                <p className="text-sm text-gray-500 mt-1">Pagué y no tengo acceso al canal</p>
              </button>
              <button
                onClick={() => {
                  setTicketForm({ ...ticketForm, category: 'payment', subject: 'Problema con el pago' });
                  setShowTicketForm(true);
                }}
                className="bg-white p-6 rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-md transition text-left"
              >
                <div className="text-3xl mb-3">💳</div>
                <h3 className="font-semibold text-gray-900">Problemas de Pago</h3>
                <p className="text-sm text-gray-500 mt-1">Error al procesar el pago</p>
              </button>
              <button
                onClick={() => {
                  setTicketForm({ ...ticketForm, category: 'telegram_change', subject: 'Cambio de cuenta Telegram' });
                  setShowTicketForm(true);
                }}
                className="bg-white p-6 rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-md transition text-left"
              >
                <div className="text-3xl mb-3">📱</div>
                <h3 className="font-semibold text-gray-900">Cambiar Telegram</h3>
                <p className="text-sm text-gray-500 mt-1">Cambié de cuenta o celular</p>
              </button>
            </div>

            {/* Tickets List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-xl font-bold text-gray-900">Mis Tickets</h2>
              </div>
              {tickets.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="text-6xl mb-4">💬</div>
                  <h3 className="text-xl font-medium text-gray-900 mb-2">No tienes tickets</h3>
                  <p className="text-gray-500">Si tienes algún problema, crea un ticket y te ayudaremos</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {tickets.map((ticket) => (
                    <div key={ticket.id} className="p-6 hover:bg-gray-50 transition">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-medium text-gray-900">{ticket.subject}</h3>
                            {getTicketStatusBadge(ticket.status)}
                          </div>
                          <p className="text-sm text-gray-600 line-clamp-2">{ticket.description}</p>
                          <p className="text-xs text-gray-400 mt-2">Creado: {formatDate(ticket.createdAt)}</p>
                        </div>
                        <span className="text-xs text-gray-400 font-mono">#{ticket.id.substring(0, 8)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Profile View */}
        {activeView === 'profile' && (
          <>
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">Mi Perfil</h1>
              <p className="text-gray-600 mt-1">Gestiona tu información personal</p>
            </div>

            <div className="max-w-2xl">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-3xl">👤</span>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{user?.name || 'Usuario'}</h2>
                    <p className="text-gray-500">{user?.email}</p>
                  </div>
                </div>

                {editingProfile ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">País</label>
                      <select
                        value={profileForm.countryIso}
                        onChange={(e) => setProfileForm({ ...profileForm, countryIso: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Seleccionar...</option>
                        <option value="ES">España</option>
                        <option value="MX">México</option>
                        <option value="AR">Argentina</option>
                        <option value="CO">Colombia</option>
                        <option value="CL">Chile</option>
                        <option value="PE">Perú</option>
                        <option value="US">Estados Unidos</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">ID de Telegram</label>
                      <input
                        type="text"
                        value={profileForm.telegramUserId}
                        onChange={(e) => setProfileForm({ ...profileForm, telegramUserId: e.target.value })}
                        placeholder="Tu ID de Telegram"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Idioma</label>
                      <select
                        value={profileForm.locale}
                        onChange={(e) => setProfileForm({ ...profileForm, locale: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="es">Español</option>
                        <option value="en">English</option>
                      </select>
                    </div>
                    <div className="flex gap-3 pt-4">
                      <button
                        onClick={handleSaveProfile}
                        disabled={savingProfile}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                      >
                        {savingProfile ? 'Guardando...' : 'Guardar Cambios'}
                      </button>
                      <button
                        onClick={() => setEditingProfile(false)}
                        className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center py-3 border-b border-gray-100">
                      <span className="text-gray-500">Email</span>
                      <span className="font-medium text-gray-900">{user?.email}</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-gray-100">
                      <span className="text-gray-500">País</span>
                      <span className="font-medium text-gray-900">{profile?.countryIso || 'No especificado'}</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-gray-100">
                      <span className="text-gray-500">Telegram ID</span>
                      <span className="font-medium text-gray-900">{profile?.telegramUserId || 'No vinculado'}</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-gray-100">
                      <span className="text-gray-500">Idioma</span>
                      <span className="font-medium text-gray-900">{profile?.locale === 'es' ? 'Español' : 'English'}</span>
                    </div>
                    <div className="flex justify-between items-center py-3">
                      <span className="text-gray-500">Miembro desde</span>
                      <span className="font-medium text-gray-900">{profile?.createdAt ? formatDate(profile.createdAt) : 'N/A'}</span>
                    </div>
                    <button
                      onClick={() => setEditingProfile(true)}
                      className="w-full mt-4 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
                    >
                      ✏️ Editar Perfil
                    </button>
                  </div>
                )}
              </div>

              {/* Legal Links */}
              <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="font-bold text-gray-900 mb-4">Legal</h3>
                <div className="space-y-3">
                  <a href="#" className="block text-blue-600 hover:underline">📜 Términos y Condiciones</a>
                  <a href="#" className="block text-blue-600 hover:underline">🔒 Política de Privacidad</a>
                  <a href="#" className="block text-blue-600 hover:underline">⚠️ Disclaimer +18 (Apuestas)</a>
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      {/* Modal: Crear Ticket */}
      {showTicketForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowTicketForm(false)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">Crear Ticket de Soporte</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                <select
                  value={ticketForm.category}
                  onChange={(e) => setTicketForm({ ...ticketForm, category: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="access">🔐 Problemas de Acceso</option>
                  <option value="payment">💳 Problemas de Pago</option>
                  <option value="telegram_change">📱 Cambio de Telegram</option>
                  <option value="other">❓ Otro</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Asunto</label>
                <input
                  type="text"
                  value={ticketForm.subject}
                  onChange={(e) => setTicketForm({ ...ticketForm, subject: e.target.value })}
                  placeholder="Describe brevemente tu problema"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <textarea
                  value={ticketForm.description}
                  onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })}
                  placeholder="Cuéntanos más detalles..."
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {purchases.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Compra relacionada (opcional)</label>
                  <select
                    value={ticketForm.orderId}
                    onChange={(e) => setTicketForm({ ...ticketForm, orderId: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Ninguna</option>
                    {purchases.map((p) => (
                      <option key={p.id} value={p.id}>{p.productTitle} - {formatDate(p.createdAt)}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowTicketForm(false)}
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmitTicket}
                disabled={submittingTicket}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {submittingTicket ? 'Enviando...' : 'Enviar Ticket'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
