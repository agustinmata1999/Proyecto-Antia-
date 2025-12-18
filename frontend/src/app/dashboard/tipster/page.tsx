'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { productsApi, referralsApi, payoutsApi, authApi, telegramApi, ordersApi, settlementsApi, userModulesApi, affiliateApi } from '@/lib/api';
import AffiliateSection from '@/components/AffiliateSection';
import CurrencySelector from '@/components/CurrencySelector';
import { useCurrency } from '@/contexts/CurrencyContext';

type ViewType = 'dashboard' | 'products' | 'referrals' | 'payouts' | 'profile' | 'telegram';
type PayoutsSubView = 'liquidaciones' | 'facturas' | 'pagos';

interface TelegramChannel {
  id: string;
  channelId: string;
  channelName?: string;
  channelTitle: string;
  channelType: 'public' | 'private';
  inviteLink?: string;
  memberCount?: number;
  isActive: boolean;
  connectedAt: string;
}

export default function TipsterDashboard() {
  const router = useRouter();
  const { formatPrice, symbol } = useCurrency();
  const [activeView, setActiveView] = useState<ViewType>('dashboard');
  const [payoutsSubView, setPayoutsSubView] = useState<PayoutsSubView>('liquidaciones');
  const [user, setUser] = useState<any>(null);
  const [products, setProducts] = useState([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [salesStats, setSalesStats] = useState<any>(null);
  const [recentSales, setRecentSales] = useState<any[]>([]);
  const [settlementsData, setSettlementsData] = useState<any>(null);
  
  // Módulos habilitados (controlados por SuperAdmin)
  const [enabledModules, setEnabledModules] = useState<{ forecasts: boolean; affiliate: boolean }>({
    forecasts: true,
    affiliate: false,
  });
  const [loading, setLoading] = useState(true);
  const [showProductForm, setShowProductForm] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [showProductDetail, setShowProductDetail] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priceCents: '',
    billingType: 'ONE_TIME',
    telegramChannelId: '',
    active: true,
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  
  // Telegram channels state (multi-canal)
  const [telegramChannels, setTelegramChannels] = useState<TelegramChannel[]>([]);
  const [channelsLoading, setChannelsLoading] = useState(false);
  const [showAddChannelForm, setShowAddChannelForm] = useState(false);
  const [newChannelData, setNewChannelData] = useState({
    channelId: '',
    channelTitle: '',
    channelType: 'private' as 'public' | 'private',
    inviteLink: '',
  });
  const [verifyingChannel, setVerifyingChannel] = useState(false);
  const [channelVerified, setChannelVerified] = useState<any>(null);
  const [addChannelError, setAddChannelError] = useState('');
  const [addingChannel, setAddingChannel] = useState(false);
  
  // Legacy telegram state (for backward compatibility)
  const [telegramChannel, setTelegramChannel] = useState<any>(null);
  const [telegramConnected, setTelegramConnected] = useState(false);
  const [telegramLoading, setTelegramLoading] = useState(false);
  const [telegramChannelInput, setTelegramChannelInput] = useState('');
  const [telegramError, setTelegramError] = useState('');
  const [publishingProduct, setPublishingProduct] = useState<string | null>(null);
  const [premiumChannelLink, setPremiumChannelLink] = useState('');
  const [savingPremiumChannel, setSavingPremiumChannel] = useState(false);

  useEffect(() => {
    const checkAuthAndLoadData = async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const token = localStorage.getItem('access_token');
      if (!token) {
        router.push('/login');
        return;
      }
      
      loadData();
    };
    
    checkAuthAndLoadData();
  }, []);

  const loadData = async () => {
    try {
      // Load products
      try {
        const productsRes = await productsApi.getMy();
        setProducts(productsRes.data);
      } catch (error) {
        console.error('Error loading products:', error);
      }
      
      // Load metrics (optional)
      try {
        const metricsRes = await referralsApi.getMetrics();
        setMetrics(metricsRes.data);
      } catch (error) {
        console.error('Error loading metrics:', error);
        setMetrics({ clicks: 0, registers: 0, ftds: 0, deposits: 0, totalDeposits: 0, conversionRate: 0 });
      }

      // Load Telegram channels (new multi-canal)
      try {
        const channelsRes = await telegramApi.channels.getAll();
        setTelegramChannels(channelsRes.data.channels || []);
      } catch (error) {
        console.error('Error loading Telegram channels:', error);
      }

      // Load legacy Telegram channel info (backward compatibility)
      try {
        const telegramRes = await telegramApi.getChannelInfo();
        if (telegramRes.data.connected) {
          setTelegramConnected(true);
          setTelegramChannel(telegramRes.data.channel);
        }
        if (telegramRes.data.premiumChannelLink) {
          setPremiumChannelLink(telegramRes.data.premiumChannelLink);
        }
      } catch (error) {
        console.error('Error loading Telegram info:', error);
      }

      // Load sales stats
      try {
        const statsRes = await ordersApi.getMyStats();
        setSalesStats(statsRes.data);
      } catch (error) {
        console.error('Error loading sales stats:', error);
        setSalesStats({ totalSales: 0, totalEarningsCents: 0, currency: 'EUR' });
      }

      // Load recent sales
      try {
        const salesRes = await ordersApi.getMySales();
        setRecentSales(salesRes.data.slice(0, 10));
      } catch (error) {
        console.error('Error loading recent sales:', error);
        setRecentSales([]);
      }

      // Load settlements data
      try {
        const settlementsRes = await settlementsApi.getAll();
        setSettlementsData(settlementsRes.data);
      } catch (error) {
        console.error('Error loading settlements:', error);
      }

      // Load enabled modules (controlled by SuperAdmin)
      try {
        const modulesRes = await userModulesApi.getMyModules();
        if (modulesRes.data.modules) {
          setEnabledModules(modulesRes.data.modules);
        }
      } catch (error) {
        console.error('Error loading modules:', error);
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
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

  // ==================== TELEGRAM CHANNELS FUNCTIONS ====================
  
  const handleVerifyChannel = async () => {
    if (!newChannelData.channelId.trim()) {
      setAddChannelError('Por favor, ingresa el ID del canal');
      return;
    }

    setVerifyingChannel(true);
    setAddChannelError('');
    setChannelVerified(null);

    try {
      const response = await telegramApi.channels.verify(newChannelData.channelId.trim());
      
      if (response.data.valid) {
        setChannelVerified(response.data);
        setNewChannelData(prev => ({
          ...prev,
          channelTitle: response.data.title || '',
          channelType: response.data.username ? 'public' : 'private',
        }));
      } else {
        setAddChannelError(response.data.error || 'No se pudo verificar el canal');
      }
    } catch (error: any) {
      setAddChannelError(error.response?.data?.message || 'Error al verificar el canal');
    } finally {
      setVerifyingChannel(false);
    }
  };

  const handleAddChannel = async () => {
    if (!newChannelData.channelId.trim() || !newChannelData.channelTitle.trim()) {
      setAddChannelError('Por favor, completa todos los campos requeridos');
      return;
    }

    setAddingChannel(true);
    setAddChannelError('');

    try {
      const response = await telegramApi.channels.create({
        channelId: newChannelData.channelId.trim(),
        channelName: channelVerified?.username || undefined,
        channelTitle: newChannelData.channelTitle.trim(),
        channelType: newChannelData.channelType,
        inviteLink: newChannelData.inviteLink.trim() || undefined,
      });

      if (response.data.success) {
        // Reload channels
        const channelsRes = await telegramApi.channels.getAll();
        setTelegramChannels(channelsRes.data.channels || []);
        
        // Reset form
        setShowAddChannelForm(false);
        setNewChannelData({
          channelId: '',
          channelTitle: '',
          channelType: 'private',
          inviteLink: '',
        });
        setChannelVerified(null);
        alert('✅ Canal añadido correctamente');
      }
    } catch (error: any) {
      setAddChannelError(error.response?.data?.message || 'Error al añadir el canal');
    } finally {
      setAddingChannel(false);
    }
  };

  const handleDeleteChannel = async (channelId: string) => {
    if (!confirm('¿Estás seguro de que deseas desconectar este canal?')) {
      return;
    }

    try {
      await telegramApi.channels.delete(channelId);
      setTelegramChannels(prev => prev.filter(c => c.id !== channelId));
      alert('Canal desconectado');
    } catch (error: any) {
      alert('Error al desconectar el canal: ' + (error.response?.data?.message || 'Error desconocido'));
    }
  };

  const handleGenerateInviteLink = async (channelId: string) => {
    try {
      const response = await telegramApi.channels.generateInviteLink(channelId);
      if (response.data.success) {
        // Reload channels to get updated invite link
        const channelsRes = await telegramApi.channels.getAll();
        setTelegramChannels(channelsRes.data.channels || []);
        alert('✅ Enlace de invitación generado: ' + response.data.inviteLink);
      } else {
        alert('Error: ' + (response.data.error || 'No se pudo generar el enlace'));
      }
    } catch (error: any) {
      alert('Error: ' + (error.response?.data?.message || 'Error al generar enlace'));
    }
  };

  // ==================== LEGACY TELEGRAM FUNCTIONS ====================
  
  const handleConnectTelegram = async () => {
    if (!telegramChannelInput.trim()) {
      setTelegramError('Por favor, ingresa el ID o @username del canal');
      return;
    }

    setTelegramLoading(true);
    setTelegramError('');

    try {
      const response = await telegramApi.connect(telegramChannelInput.trim());
      
      if (response.data.success) {
        setTelegramConnected(true);
        setTelegramChannel(response.data.channelInfo);
        setTelegramChannelInput('');
        alert('✅ Canal conectado exitosamente');
      } else {
        setTelegramError(response.data.message || 'Error al conectar el canal');
      }
    } catch (error: any) {
      setTelegramError(error.response?.data?.message || 'Error al conectar el canal');
    } finally {
      setTelegramLoading(false);
    }
  };

  const handleDisconnectTelegram = async () => {
    if (!confirm('¿Estás seguro de que deseas desconectar tu canal de Telegram?')) {
      return;
    }

    setTelegramLoading(true);
    try {
      await telegramApi.disconnect();
      setTelegramConnected(false);
      setTelegramChannel(null);
      alert('Canal desconectado');
    } catch (error) {
      alert('Error al desconectar el canal');
    } finally {
      setTelegramLoading(false);
    }
  };

  const handlePublishToTelegram = async (productId: string) => {
    if (!telegramConnected) {
      alert('Primero debes conectar tu canal de Telegram');
      return;
    }

    if (!confirm('¿Deseas publicar este producto en tu canal de Telegram?')) {
      return;
    }

    setPublishingProduct(productId);
    try {
      const response = await telegramApi.publishProduct(productId);
      
      if (response.data.success) {
        alert('✅ Producto publicado en Telegram exitosamente');
      } else {
        alert('❌ ' + (response.data.message || 'Error al publicar'));
      }
    } catch (error: any) {
      alert('❌ Error: ' + (error.response?.data?.message || 'Error al publicar en Telegram'));
    } finally {
      setPublishingProduct(null);
    }
  };

  // ==================== PRODUCT FUNCTIONS ====================

  const handleCreateProduct = () => {
    setSelectedProduct(null);
    setFormData({
      title: '',
      description: '',
      priceCents: '',
      billingType: 'ONE_TIME',
      telegramChannelId: '',
      active: true,
    });
    setFormError('');
    setShowProductForm(true);
  };

  const handleEditProduct = (product: any) => {
    setSelectedProduct(product);
    setFormData({
      title: product.title || '',
      description: product.description || '',
      priceCents: product.priceCents ? (product.priceCents / 100).toString() : '',
      billingType: product.billingType || 'ONE_TIME',
      telegramChannelId: product.telegramChannelId || '',
      active: product.active ?? true,
    });
    setFormError('');
    setShowProductForm(true);
  };

  const handleViewProduct = (product: any) => {
    setSelectedProduct(product);
    setShowProductDetail(true);
  };

  const handleSaveProduct = async () => {
    try {
      if (!formData.title.trim()) {
        setFormError('El título es obligatorio');
        return;
      }
      
      const price = parseFloat(formData.priceCents);
      if (isNaN(price) || price < 0) {
        setFormError('El precio debe ser un número válido mayor o igual a 0');
        return;
      }

      setSaving(true);
      setFormError('');

      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        priceCents: Math.round(price * 100),
        billingType: formData.billingType,
        telegramChannelId: formData.telegramChannelId || undefined,
        currency: 'EUR',
      };

      if (selectedProduct) {
        await productsApi.update(selectedProduct.id, payload);
        
        if (formData.active !== selectedProduct.active) {
          if (formData.active) {
            await productsApi.publish(selectedProduct.id);
          } else {
            await productsApi.pause(selectedProduct.id);
          }
        }
      } else {
        const response = await productsApi.create(payload);
        
        if (formData.active && response.data?.id) {
          await productsApi.publish(response.data.id);
        }
      }

      await loadData();
      closeModals();
      
    } catch (error: any) {
      console.error('Error saving product:', error);
      setFormError(error.response?.data?.message || 'Error al guardar el producto. Por favor, intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const closeModals = () => {
    setShowProductForm(false);
    setShowProductDetail(false);
    setSelectedProduct(null);
    setFormError('');
  };

  // Helper to get channel name for a product
  const getChannelNameForProduct = (channelId: string) => {
    const channel = telegramChannels.find(c => c.channelId === channelId);
    return channel ? channel.channelTitle : channelId;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
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
      <aside className="fixed top-0 left-0 w-64 h-full bg-white border-r border-gray-200">
        <div className="p-6">
          <div className="text-2xl font-bold text-blue-600 mb-8">Antia</div>
          
          <div className="mb-6 pb-6 border-b border-gray-200">
            <div className="text-sm text-gray-500">Fausto Perez</div>
            <div className="text-xs text-gray-400">#5203</div>
          </div>

          <nav className="space-y-2">
            <button
              onClick={() => setActiveView('dashboard')}
              className={`w-full text-left px-4 py-2 rounded-lg ${activeView === 'dashboard' ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
            >
              Dashboard
            </button>
            
            {/* Módulo: Pronósticos (AntiaPay) - Solo si está habilitado */}
            {enabledModules.forecasts && (
              <>
                <button
                  onClick={() => setActiveView('products')}
                  className={`w-full text-left px-4 py-2 rounded-lg ${activeView === 'products' ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
                >
                  🎯 Mis Productos
                </button>
                <button
                  onClick={() => setActiveView('telegram')}
                  className={`w-full text-left px-4 py-2 rounded-lg ${activeView === 'telegram' ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
                >
                  <span className="flex items-center justify-between">
                    <span>📱 Telegram</span>
                    {telegramChannels.length > 0 && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                        {telegramChannels.length}
                      </span>
                    )}
                  </span>
                </button>
              </>
            )}
            
            {/* Módulo: Afiliación - Solo si está habilitado */}
            {enabledModules.affiliate && (
              <button
                onClick={() => setActiveView('referrals')}
                className={`w-full text-left px-4 py-2 rounded-lg ${activeView === 'referrals' ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
              >
                🤝 Afiliación
              </button>
            )}
            
            <button
              onClick={() => setActiveView('payouts')}
              className={`w-full text-left px-4 py-2 rounded-lg ${activeView === 'payouts' ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
            >
              <span className="flex items-center justify-between">
                <span>💵 Liquidaciones</span>
                {(salesStats?.netEarningsCents || 0) > 0 && (
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                    {formatPrice(salesStats?.netEarningsCents || 0)}
                  </span>
                )}
              </span>
            </button>
            <button
              onClick={() => setActiveView('profile')}
              className={`w-full text-left px-4 py-2 rounded-lg ${activeView === 'profile' ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
            >
              ⚙️ Perfil
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

        {activeView === 'dashboard' && (
          <>
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">Hola Fausto, Bienvenido de nuevo!</h1>
              <p className="text-gray-600 mt-1">Aquí está un resumen de tu actividad</p>
            </div>

            {/* Stats Cards - Dinámicos según módulos habilitados */}
            <div className={`grid grid-cols-1 md:grid-cols-2 ${enabledModules.forecasts ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-6 mb-8`}>
              {/* Ingresos Brutos - Solo si Pronósticos habilitado */}
              {enabledModules.forecasts && (
                <div className="bg-white rounded-lg shadow p-6 border-2 border-blue-100">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm text-gray-500">💰 Ingresos Brutos</div>
                  </div>
                  <div className="text-3xl font-bold text-blue-600">
                    {formatPrice(salesStats?.grossEarningsCents || salesStats?.totalEarningsCents || 0)}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">Total facturado este mes</div>
                </div>
              )}

              {/* Ventas - Solo si Pronósticos habilitado */}
              {enabledModules.forecasts && (
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="text-sm text-gray-500 mb-2">💵 Ventas</div>
                  <div className="text-3xl font-bold text-gray-900">{salesStats?.totalSales || 0}</div>
                  <div className="text-xs text-gray-500 mt-1">Total de ventas</div>
                </div>
              )}

              {/* Productos - Solo si Pronósticos habilitado */}
              {enabledModules.forecasts && (
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="text-sm text-gray-500 mb-2">📦 Productos</div>
                  <div className="text-3xl font-bold text-gray-900">{products.length}</div>
                  <div className="text-xs text-gray-500 mt-1">{products.filter((p: any) => p.active).length} activos</div>
                </div>
              )}

              {/* Stats de Afiliación - Solo si Afiliación habilitado */}
              {enabledModules.affiliate && (
                <>
                  <div className="bg-white rounded-lg shadow p-6 border-2 border-purple-100">
                    <div className="text-sm text-gray-500 mb-2">🤝 Ganancias Afiliación</div>
                    <div className="text-3xl font-bold text-purple-600">{formatPrice(metrics?.totalEarnings || 0)}</div>
                    <div className="text-xs text-gray-500 mt-1">Comisiones pendientes</div>
                  </div>
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="text-sm text-gray-500 mb-2">👥 Referidos FTD</div>
                    <div className="text-3xl font-bold text-gray-900">{metrics?.ftds || 0}</div>
                    <div className="text-xs text-gray-500 mt-1">First Time Deposits</div>
                  </div>
                </>
              )}

              {/* Próxima Liquidación */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-sm text-gray-500 mb-2">📅 Próxima Liquidación</div>
                <div className="text-xl font-bold text-gray-900">
                  {(() => {
                    const today = new Date();
                    const dayOfWeek = today.getDay();
                    const daysUntilSunday = (7 - dayOfWeek) % 7 || 7;
                    const nextSunday = new Date(today);
                    nextSunday.setDate(today.getDate() + daysUntilSunday);
                    return nextSunday.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
                  })()}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  <button 
                    onClick={() => setActiveView('payouts')}
                    className="text-blue-600 hover:underline"
                  >
                    Ver liquidaciones →
                  </button>
                </div>
              </div>
            </div>

            {/* Recent Products and Sales - Solo si Pronósticos está habilitado */}
            {enabledModules.forecasts && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg shadow">
                  <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-gray-900">Mis Productos</h2>
                    <button 
                      onClick={handleCreateProduct}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm"
                    >
                      + Crear Producto
                    </button>
                  </div>
                  <div className="p-6">
                    {products.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-gray-500 mb-4">No tienes productos aún</p>
                        <button 
                          onClick={handleCreateProduct}
                          className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
                        >
                          Crear tu primer producto
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {products.slice(0, 5).map((product: any) => (
                          <div key={product.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition">
                            <div className="flex-1">
                              <h3 className="font-medium text-gray-900">{product.title}</h3>
                              <div className="flex items-center gap-3 mt-1">
                                <span className="text-sm font-medium text-green-600">
                                  {formatPrice(product.priceCents)}
                                </span>
                                <span className={`text-xs px-2 py-1 rounded ${product.active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                  {product.active ? 'Activo' : 'Pausado'}
                                </span>
                                {product.telegramChannelId && (
                                  <span className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-700">
                                    📱 {getChannelNameForProduct(product.telegramChannelId)}
                                  </span>
                                )}
                              </div>
                            </div>
                            <button 
                              onClick={() => handleViewProduct(product)}
                              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
                            >
                              Ver
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Recent Sales */}
                <div className="bg-white rounded-lg shadow">
                  <div className="p-6 border-b border-gray-200">
                    <h2 className="text-xl font-bold text-gray-900">Ventas Recientes</h2>
                  </div>
                  <div className="p-6">
                    {recentSales.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-gray-500">No hay ventas aún</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {recentSales.slice(0, 5).map((sale: any) => (
                          <div key={sale.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-lg">
                            <div>
                              <p className="font-medium text-gray-900">{sale.productTitle || 'Producto'}</p>
                              <p className="text-sm text-gray-500">{sale.emailBackup || 'Cliente'}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium text-green-600">{formatPrice(sale.amountCents || 0)}</p>
                              <p className="text-xs text-gray-500">{new Date(sale.createdAt).toLocaleDateString('es-ES')}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {/* Afiliación Summary - Solo si Afiliación está habilitado y Pronósticos deshabilitado */}
            {enabledModules.affiliate && !enabledModules.forecasts && (
              <div className="bg-white rounded-lg shadow">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-xl font-bold text-gray-900">🤝 Resumen de Afiliación</h2>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <p className="text-sm text-gray-600">Clics</p>
                      <p className="text-2xl font-bold text-purple-600">{metrics?.clicks || 0}</p>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <p className="text-sm text-gray-600">Registros</p>
                      <p className="text-2xl font-bold text-purple-600">{metrics?.registers || 0}</p>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <p className="text-sm text-gray-600">FTDs</p>
                      <p className="text-2xl font-bold text-purple-600">{metrics?.ftds || 0}</p>
                    </div>
                  </div>
                  <div className="mt-6 text-center">
                    <button
                      onClick={() => setActiveView('referrals')}
                      className="text-purple-600 hover:underline"
                    >
                      Ver detalle de afiliación →
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {activeView === 'products' && (
          <>
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">Mis Productos</h1>
              <p className="text-gray-600 mt-1">Gestiona tus pronósticos y suscripciones</p>
            </div>

            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900">Lista de Productos</h2>
                  <button 
                    onClick={handleCreateProduct}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm font-medium"
                  >
                    + Crear Producto
                  </button>
                </div>
              </div>
              
              <div className="p-6">
                {products.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500 mb-4">No tienes productos aún</p>
                    <button 
                      onClick={handleCreateProduct}
                      className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
                    >
                      Crear tu primer producto
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {products.map((product: any) => (
                      <div key={product.id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900">{product.title}</h3>
                            <p className="text-sm text-gray-500 mt-1">{product.description}</p>
                            <div className="flex items-center gap-4 mt-2">
                              <span className="text-sm font-medium text-green-600">
                                €{(product.priceCents / 100).toFixed(2)}
                              </span>
                              <span className={`text-xs px-2 py-1 rounded ${product.active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                {product.active ? 'Activo' : 'Pausado'}
                              </span>
                              <span className="text-xs text-gray-500">
                                {product.billingType === 'SUBSCRIPTION' ? 'Suscripción' : 'Pago único'}
                              </span>
                              {product.telegramChannelId && (
                                <span className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-700">
                                  📱 {getChannelNameForProduct(product.telegramChannelId)}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {telegramConnected && (
                              <button 
                                onClick={() => handlePublishToTelegram(product.id)}
                                disabled={publishingProduct === product.id}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm flex items-center gap-2 disabled:opacity-50"
                                title="Publicar en Telegram"
                              >
                                {publishingProduct === product.id ? 'Publicando...' : '📱 Publicar'}
                              </button>
                            )}
                            <button 
                              onClick={() => handleEditProduct(product)}
                              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
                            >
                              Editar
                            </button>
                            <button 
                              onClick={() => handleViewProduct(product)}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                            >
                              Ver
                            </button>
                          </div>
                        </div>
                        {/* Link de Checkout Directo - Para publicar en canales */}
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-green-600 font-medium mb-1">💳 Link de Pago Directo (para tu canal)</p>
                              <code className="text-xs text-green-800 bg-white px-2 py-1 rounded border border-green-200 block truncate">
                                {typeof window !== 'undefined' ? window.location.origin : ''}/checkout/{product.id}
                              </code>
                            </div>
                            <button
                              onClick={() => {
                                const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
                                navigator.clipboard.writeText(`${baseUrl}/checkout/${product.id}`);
                                alert('✅ Link de checkout copiado');
                              }}
                              className="flex-shrink-0 px-3 py-1.5 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                            >
                              📋 Copiar
                            </button>
                          </div>
                          <p className="text-xs text-green-700 mt-2">
                            📢 Publica este link en tu canal. El cliente paga y automáticamente recibe acceso via Telegram.
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {activeView === 'telegram' && (
          <>
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">📱 Canales de Telegram</h1>
              <p className="text-gray-600 mt-1">Gestiona los canales donde tus clientes recibirán acceso</p>
            </div>

            {/* Canales Conectados */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Mis Canales</h2>
                <button
                  onClick={() => setShowAddChannelForm(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
                >
                  + Añadir Canal
                </button>
              </div>

              {telegramChannels.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg">
                  <div className="text-4xl mb-4">📱</div>
                  <p className="text-gray-500 mb-4">No tienes canales conectados</p>
                  <p className="text-sm text-gray-400 mb-4">
                    Conecta tus canales de Telegram para asignarlos a tus productos
                  </p>
                  <button
                    onClick={() => setShowAddChannelForm(true)}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                  >
                    Añadir mi primer canal
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {telegramChannels.map((channel) => (
                    <div key={channel.id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${channel.channelType === 'public' ? 'bg-green-100' : 'bg-blue-100'}`}>
                            <span className="text-2xl">{channel.channelType === 'public' ? '🌐' : '🔒'}</span>
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">{channel.channelTitle}</h3>
                            <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                              {channel.channelName && <span>@{channel.channelName}</span>}
                              <span className={`px-2 py-0.5 rounded text-xs ${channel.channelType === 'public' ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'}`}>
                                {channel.channelType === 'public' ? 'Público' : 'Privado'}
                              </span>
                              {channel.memberCount && (
                                <span>{channel.memberCount} miembros</span>
                              )}
                            </div>
                            <p className="text-xs text-gray-400 mt-1">
                              ID: {channel.channelId} • Conectado: {new Date(channel.connectedAt).toLocaleDateString('es-ES')}
                            </p>
                            {channel.inviteLink && (
                              <div className="mt-2">
                                <span className="text-xs text-gray-500">Enlace: </span>
                                <a href={channel.inviteLink} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
                                  {channel.inviteLink}
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {channel.channelType === 'private' && (
                            <button
                              onClick={() => handleGenerateInviteLink(channel.id)}
                              className="px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-50"
                              title="Generar enlace de invitación"
                            >
                              🔗 Generar Link
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteChannel(channel.id)}
                            className="px-3 py-1.5 text-xs text-red-600 border border-red-300 rounded hover:bg-red-50"
                          >
                            Desconectar
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Instrucciones */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="font-semibold text-gray-900 mb-3">📖 Cómo funcionan los canales</h3>
              <div className="space-y-3 text-sm text-gray-700">
                <p><strong>1. Añade el bot como administrador:</strong> Añade @Antiabetbot como administrador a tu canal de Telegram con permisos para invitar usuarios.</p>
                <p><strong>2. Conecta el canal:</strong> Usa el botón "Añadir Canal" e ingresa el ID del canal (puedes obtenerlo reenviando un mensaje del canal a @userinfobot).</p>
                <p><strong>3. Asigna a productos:</strong> Al crear o editar un producto, selecciona el canal donde los clientes recibirán acceso.</p>
                <p><strong>4. Multi-canal:</strong> Puedes tener múltiples canales y asignar cada producto a un canal diferente.</p>
              </div>
            </div>
          </>
        )}

        {activeView === 'referrals' && (
          <AffiliateSection />
        )}

        {activeView === 'payouts' && (
          <>
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">💵 Liquidaciones</h1>
              <p className="text-gray-600 mt-1">Gestiona tus ingresos y pagos</p>
            </div>

            {/* Sub-navegación estilo Mollie/Stripe */}
            <div className="bg-white rounded-lg shadow mb-6">
              <div className="border-b border-gray-200">
                <nav className="flex -mb-px">
                  <button
                    onClick={() => setPayoutsSubView('liquidaciones')}
                    className={`px-6 py-4 text-sm font-medium border-b-2 ${
                      payoutsSubView === 'liquidaciones'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    📊 Liquidaciones
                  </button>
                  <button
                    onClick={() => setPayoutsSubView('facturas')}
                    className={`px-6 py-4 text-sm font-medium border-b-2 ${
                      payoutsSubView === 'facturas'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    📄 Facturas
                  </button>
                  <button
                    onClick={() => setPayoutsSubView('pagos')}
                    className={`px-6 py-4 text-sm font-medium border-b-2 ${
                      payoutsSubView === 'pagos'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    💳 Pagos Recibidos
                  </button>
                </nav>
              </div>
            </div>

            {/* Sub-vista: Liquidaciones */}
            {payoutsSubView === 'liquidaciones' && (
              <div className="space-y-6">
                {/* Resumen de Balance */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="text-sm text-gray-500 mb-2">Balance Pendiente</div>
                    <div className="text-3xl font-bold text-blue-600">
                      {formatPrice(salesStats?.netEarningsCents || 0)}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">Próxima liquidación: Domingo</div>
                  </div>
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="text-sm text-gray-500 mb-2">Total Liquidado (Histórico)</div>
                    <div className="text-3xl font-bold text-green-600">€0.00</div>
                    <div className="text-xs text-gray-400 mt-1">Desde el inicio</div>
                  </div>
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="text-sm text-gray-500 mb-2">Próxima Liquidación</div>
                    <div className="text-xl font-bold text-gray-900">
                      {(() => {
                        const today = new Date();
                        const dayOfWeek = today.getDay();
                        const daysUntilSunday = (7 - dayOfWeek) % 7 || 7;
                        const nextSunday = new Date(today);
                        nextSunday.setDate(today.getDate() + daysUntilSunday);
                        return nextSunday.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
                      })()}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">Pronósticos: cada 7 días</div>
                  </div>
                </div>

                {/* Desglose Detallado de Comisiones */}
                <div className="bg-white rounded-lg shadow">
                  <div className="p-6 border-b border-gray-200">
                    <h2 className="text-xl font-bold text-gray-900">📊 Desglose del Período Actual</h2>
                    <p className="text-sm text-gray-500 mt-1">Detalle de comisiones y neto a recibir</p>
                  </div>
                  <div className="p-6">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <tbody className="divide-y divide-gray-100">
                          <tr>
                            <td className="py-4 text-gray-600">Ingresos Brutos</td>
                            <td className="py-4 text-right font-semibold text-gray-900">
                              {formatPrice(salesStats?.grossEarningsCents || 0)}
                            </td>
                          </tr>
                          <tr className="bg-red-50">
                            <td className="py-4 text-gray-600">
                              <span className="flex items-center gap-2">
                                <span className="text-red-500">−</span>
                                Comisión Pasarela (Stripe/Redsys)
                              </span>
                            </td>
                            <td className="py-4 text-right font-semibold text-red-600">
                              -{formatPrice(salesStats?.gatewayFeesCents || 0)}
                            </td>
                          </tr>
                          <tr className="bg-orange-50">
                            <td className="py-4 text-gray-600">
                              <span className="flex items-center gap-2">
                                <span className="text-orange-500">−</span>
                                Comisión Antia (Plataforma)
                              </span>
                            </td>
                            <td className="py-4 text-right font-semibold text-orange-600">
                              -{formatPrice(salesStats?.platformFeesCents || 0)}
                            </td>
                          </tr>
                          <tr className="bg-green-50 border-t-2 border-green-200">
                            <td className="py-4 text-gray-900 font-semibold">
                              <span className="flex items-center gap-2">
                                <span className="text-green-600">=</span>
                                Neto a Recibir
                              </span>
                            </td>
                            <td className="py-4 text-right font-bold text-green-600 text-xl">
                              {formatPrice(salesStats?.netEarningsCents || 0)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Tipos de Liquidación */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Pronósticos */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <span className="text-xl">🎯</span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">Pronósticos</h3>
                        <p className="text-xs text-gray-500">Venta de productos</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Frecuencia</span>
                        <span className="font-medium">Cada 7 días</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Comisión Antia</span>
                        <span className="font-medium text-orange-600">10% (7% alto volumen)</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Pendiente</span>
                        <span className="font-bold text-blue-600">
                          {formatPrice(salesStats?.netEarningsCents || 0)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Afiliación */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                        <span className="text-xl">🤝</span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">Afiliación</h3>
                        <p className="text-xs text-gray-500">Casas de apuestas</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Frecuencia</span>
                        <span className="font-medium">1 vez al mes</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Comisión Antia</span>
                        <span className="font-medium text-green-600">Sin comisión</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Pendiente</span>
                        <span className="font-bold text-purple-600">€0.00</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Historial de Liquidaciones */}
                <div className="bg-white rounded-lg shadow">
                  <div className="p-6 border-b border-gray-200">
                    <h2 className="text-xl font-bold text-gray-900">📋 Historial de Liquidaciones</h2>
                  </div>
                  <div className="p-6">
                    <div className="text-center py-8">
                      <div className="text-4xl mb-4">📭</div>
                      <p className="text-gray-500">No hay liquidaciones procesadas aún</p>
                      <p className="text-sm text-gray-400 mt-2">
                        Tu primera liquidación se procesará el próximo domingo
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Sub-vista: Facturas */}
            {payoutsSubView === 'facturas' && (
              <div className="bg-white rounded-lg shadow">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-xl font-bold text-gray-900">📄 Facturas</h2>
                  <p className="text-sm text-gray-500 mt-1">Descarga tus facturas de liquidación</p>
                </div>
                <div className="p-6">
                  <div className="text-center py-12">
                    <div className="text-4xl mb-4">📄</div>
                    <p className="text-gray-500">No hay facturas disponibles</p>
                    <p className="text-sm text-gray-400 mt-2">
                      Las facturas se generan automáticamente con cada liquidación
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Sub-vista: Pagos Recibidos */}
            {payoutsSubView === 'pagos' && (
              <div className="bg-white rounded-lg shadow">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-xl font-bold text-gray-900">💳 Pagos Recibidos</h2>
                  <p className="text-sm text-gray-500 mt-1">Historial de transferencias a tu cuenta</p>
                </div>
                <div className="p-6">
                  <div className="text-center py-12">
                    <div className="text-4xl mb-4">💸</div>
                    <p className="text-gray-500">No hay pagos recibidos aún</p>
                    <p className="text-sm text-gray-400 mt-2">
                      Aquí verás el historial de pagos realizados a tu cuenta bancaria
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {activeView === 'profile' && (
          <>
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">Mi Perfil</h1>
              <p className="text-gray-600 mt-1">Configuración de tu cuenta</p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Información Personal</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Público</label>
                  <input 
                    type="text" 
                    defaultValue="Fausto Perez"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input 
                    type="email" 
                    defaultValue="fausto.perez@antia.com"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Usuario de Telegram</label>
                  <input 
                    type="text" 
                    placeholder="@tu_usuario"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition">
                  Guardar Cambios
                </button>
              </div>
            </div>
          </>
        )}
      </main>

      {/* Modal: Añadir Canal */}
      {showAddChannelForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowAddChannelForm(false)}>
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Añadir Canal de Telegram</h2>
                <button onClick={() => setShowAddChannelForm(false)} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              {addChannelError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{addChannelError}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ID del Canal <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={newChannelData.channelId}
                    onChange={(e) => {
                      setNewChannelData({ ...newChannelData, channelId: e.target.value });
                      setChannelVerified(null);
                    }}
                    placeholder="Ej: -1001234567890"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleVerifyChannel}
                    disabled={verifyingChannel || !newChannelData.channelId.trim()}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
                  >
                    {verifyingChannel ? 'Verificando...' : 'Verificar'}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Puedes obtener el ID reenviando un mensaje del canal a @userinfobot
                </p>
              </div>

              {channelVerified && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800 font-medium">✅ Canal verificado</p>
                  <p className="text-sm text-green-700">Nombre: {channelVerified.title}</p>
                  {channelVerified.username && <p className="text-sm text-green-700">@{channelVerified.username}</p>}
                  <p className="text-sm text-green-700">Tipo: {channelVerified.type}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre del Canal <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text" 
                  value={newChannelData.channelTitle}
                  onChange={(e) => setNewChannelData({ ...newChannelData, channelTitle: e.target.value })}
                  placeholder="Ej: Mi Canal Premium"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Canal</label>
                <select 
                  value={newChannelData.channelType}
                  onChange={(e) => setNewChannelData({ ...newChannelData, channelType: e.target.value as 'public' | 'private' })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="private">🔒 Privado</option>
                  <option value="public">🌐 Público</option>
                </select>
              </div>

              {newChannelData.channelType === 'private' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Enlace de Invitación (Opcional)
                  </label>
                  <input 
                    type="text" 
                    value={newChannelData.inviteLink}
                    onChange={(e) => setNewChannelData({ ...newChannelData, inviteLink: e.target.value })}
                    placeholder="Ej: https://t.me/+AbCdEf123456"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Puedes generarlo después desde la lista de canales
                  </p>
                </div>
              )}

              <div className="flex gap-3 justify-end pt-4">
                <button 
                  onClick={() => setShowAddChannelForm(false)}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleAddChannel}
                  disabled={addingChannel || !newChannelData.channelId.trim() || !newChannelData.channelTitle.trim()}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {addingChannel ? 'Añadiendo...' : 'Añadir Canal'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Formulario de Producto */}
      {showProductForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={closeModals}>
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">
                  {selectedProduct ? 'Editar Producto' : 'Crear Nuevo Producto'}
                </h2>
                <button onClick={closeModals} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="p-6">
              {formError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{formError}</p>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Título del Producto <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="text" 
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Ej: Pronósticos Premium Mensuales"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                  <textarea 
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe tu producto..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Precio (€) <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="number" 
                      step="0.01"
                      min="0"
                      value={formData.priceCents}
                      onChange={(e) => setFormData({ ...formData, priceCents: e.target.value })}
                      placeholder="29.99"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Facturación</label>
                    <select 
                      value={formData.billingType}
                      onChange={(e) => setFormData({ ...formData, billingType: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="ONE_TIME">Pago único</option>
                      <option value="SUBSCRIPTION">Suscripción</option>
                    </select>
                  </div>
                </div>

                {/* Selector de Canal de Telegram */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Canal de Telegram <span className="text-red-500">*</span>
                  </label>
                  {telegramChannels.length === 0 ? (
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-yellow-800 mb-2">
                        ⚠️ No tienes canales conectados
                      </p>
                      <p className="text-xs text-yellow-700 mb-3">
                        Debes conectar al menos un canal de Telegram para asignarlo a tus productos.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          closeModals();
                          setActiveView('telegram');
                        }}
                        className="text-sm text-blue-600 hover:underline font-medium"
                      >
                        Ir a conectar un canal →
                      </button>
                    </div>
                  ) : (
                    <select 
                      value={formData.telegramChannelId}
                      onChange={(e) => setFormData({ ...formData, telegramChannelId: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">-- Selecciona un canal --</option>
                      {telegramChannels.map((channel) => (
                        <option key={channel.id} value={channel.channelId}>
                          {channel.channelType === 'public' ? '🌐' : '🔒'} {channel.channelTitle}
                          {channel.channelName && ` (@${channel.channelName})`}
                        </option>
                      ))}
                    </select>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Este es el canal donde los clientes recibirán acceso después de la compra
                  </p>
                </div>

                <div className="flex items-center">
                  <input 
                    type="checkbox" 
                    id="active"
                    checked={formData.active}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="active" className="ml-2 text-sm text-gray-700">
                    Producto activo
                  </label>
                </div>
              </div>

              <div className="mt-6 flex gap-3 justify-end">
                <button 
                  onClick={closeModals}
                  disabled={saving}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSaveProduct}
                  disabled={saving}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Guardando...
                    </>
                  ) : (
                    selectedProduct ? 'Guardar Cambios' : 'Crear Producto'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Detalle de Producto */}
      {showProductDetail && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={closeModals}>
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">{selectedProduct.title}</h2>
                <button onClick={closeModals} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Descripción</h3>
                  <p className="text-gray-900">{selectedProduct.description || 'Sin descripción'}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Precio</h3>
                    <p className="text-2xl font-bold text-green-600">€{(selectedProduct.priceCents / 100).toFixed(2)}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Estado</h3>
                    <span className={`inline-block px-3 py-1 rounded text-sm font-medium ${selectedProduct.active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      {selectedProduct.active ? 'Activo' : 'Pausado'}
                    </span>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Tipo de Facturación</h3>
                  <p className="text-gray-900">
                    {selectedProduct.billingType === 'SUBSCRIPTION' ? 'Suscripción' : 'Pago único'}
                  </p>
                </div>

                {selectedProduct.telegramChannelId && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Canal de Telegram</h3>
                    <p className="text-gray-900 flex items-center gap-2">
                      📱 {getChannelNameForProduct(selectedProduct.telegramChannelId)}
                      <span className="text-xs text-gray-500">({selectedProduct.telegramChannelId})</span>
                    </p>
                  </div>
                )}

                <div className="pt-4 border-t border-gray-200">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Estadísticas</h3>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">0</div>
                      <div className="text-xs text-gray-600">Ventas</div>
                    </div>
                    <div className="bg-green-50 p-3 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">€0.00</div>
                      <div className="text-xs text-gray-600">Ingresos</div>
                    </div>
                    <div className="bg-purple-50 p-3 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">0</div>
                      <div className="text-xs text-gray-600">Suscriptores</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex gap-3 justify-end">
                <button 
                  onClick={closeModals}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  Cerrar
                </button>
                <button 
                  onClick={() => {
                    setShowProductDetail(false);
                    handleEditProduct(selectedProduct);
                  }}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Editar Producto
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
