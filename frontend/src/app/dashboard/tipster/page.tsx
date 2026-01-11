'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { productsApi, referralsApi, payoutsApi, authApi, telegramApi, ordersApi, settlementsApi, userModulesApi, affiliateApi, usersApi, tipsterApi } from '@/lib/api';
import AffiliateSection from '@/components/AffiliateSection';
import CurrencySelector from '@/components/CurrencySelector';
import { useCurrency } from '@/contexts/CurrencyContext';
import KycBanner from '@/components/KycBanner';
import KycForm from '@/components/KycForm';
import { NotificationsBell } from '@/components/NotificationsBell';
import TipsterTelegramAutoView from '@/components/tipster/TipsterTelegramAutoView';

type ViewType = 'dashboard' | 'products' | 'referrals' | 'payouts' | 'profile' | 'kyc' | 'support';
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

// Wrapper component to handle Suspense for useSearchParams
function TipsterDashboardContent() {
  const searchParams = useSearchParams();
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
  
  // KYC Status
  const [kycStatus, setKycStatus] = useState<{
    kycCompleted: boolean;
    needsKyc: boolean;
    applicationStatus: string;
    kycData?: any;
  }>({
    kycCompleted: false,
    needsKyc: false,
    applicationStatus: 'PENDING',
  });
  
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
    subscriptionInterval: 'MONTHLY', // MONTHLY, QUARTERLY, ANNUAL
    telegramChannelId: '',
    active: true,
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  
  // Telegram channels state (multi-canal)
  const [telegramChannels, setTelegramChannels] = useState<TelegramChannel[]>([]);
  const [channelsLoading, setChannelsLoading] = useState(false);
  const [showAddChannelForm, setShowAddChannelForm] = useState(false);
  // Estado del formulario de conexión
  const [channelInput, setChannelInput] = useState(''); // Puede ser nombre o ID
  const [inputMode, setInputMode] = useState<'title' | 'name' | 'id'>('title'); // Modo de entrada: title=nombre, name=link, id=channel_id
  const [channelLinkInput, setChannelLinkInput] = useState(''); // Link de invitación opcional
  const [connectingChannel, setConnectingChannel] = useState(false);
  const [addChannelError, setAddChannelError] = useState('');
  
  // Estado de autenticación de Telegram (nuevo sistema automático)
  const [telegramAuthStatus, setTelegramAuthStatus] = useState<{
    isConnected: boolean;
    telegramId?: string;
    telegramUsername?: string;
    connectedAt?: string;
    availableChannels: Array<{
      channelId: string;
      channelTitle: string;
      channelUsername?: string;
      channelType: string;
      inviteLink?: string;
      detectedAt: string;
      isConnected: boolean;
    }>;
  } | null>(null);
  
  // Legacy - mantener para compatibilidad pero no usar
  const [channelNameInput, setChannelNameInput] = useState('');
  const [newChannelData, setNewChannelData] = useState({
    channelId: '',
    channelTitle: '',
    channelType: 'private' as 'public' | 'private',
    inviteLink: '',
  });
  const [verifyingChannel, setVerifyingChannel] = useState(false);
  const [channelVerified, setChannelVerified] = useState<any>(null);
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
  
  // Publication channel state (for sharing products)
  const [publicationChannel, setPublicationChannel] = useState<{ 
    configured: boolean; 
    pending: boolean;
    channelId: string | null; 
    channelTitle: string | null;
    channelUsername: string | null;
  }>({
    configured: false,
    pending: false,
    channelId: null,
    channelTitle: null,
    channelUsername: null,
  });
  const [linkingMethod, setLinkingMethod] = useState<'auto' | 'manual' | null>(null);
  const [publicationChannelInput, setPublicationChannelInput] = useState('');
  const [publicationChannelTitle, setPublicationChannelTitle] = useState('');
  const [savingPublicationChannel, setSavingPublicationChannel] = useState(false);
  const [publicationChannelError, setPublicationChannelError] = useState('');
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  
  // Support tickets state
  const [supportTickets, setSupportTickets] = useState<any[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [showNewTicketForm, setShowNewTicketForm] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [newTicketData, setNewTicketData] = useState({ subject: '', message: '' });
  const [replyMessage, setReplyMessage] = useState('');
  const [ticketSubmitting, setTicketSubmitting] = useState(false);
  const [ticketAttachments, setTicketAttachments] = useState<File[]>([]);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  
  // Modal de confirmación para compartir en Telegram
  const [showShareConfirmModal, setShowShareConfirmModal] = useState(false);
  const [productToShare, setProductToShare] = useState<{ id: string; title: string } | null>(null);
  
  // Wizard de bienvenida para Telegram
  const [showTelegramWizard, setShowTelegramWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [dontShowWizardAgain, setDontShowWizardAgain] = useState(false);

  // Auto-vinculación de Telegram via link
  const [autoLinkStatus, setAutoLinkStatus] = useState<'idle' | 'linking' | 'success' | 'error'>('idle');
  const [autoLinkMessage, setAutoLinkMessage] = useState('');

  // Telegram auto-link ya no es necesario en el dashboard
  // La vinculación se hace durante el registro o antes del primer login

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
      // Load user profile first
      try {
        const userRes = await usersApi.getMe();
        setUser(userRes.data);
        console.log('Loaded user profile:', userRes.data);
      } catch (error) {
        console.error('Error loading user profile:', error);
      }

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

      // Load Telegram auth status (new auto-connect system)
      try {
        const authStatusRes = await telegramApi.auth.getStatus();
        setTelegramAuthStatus(authStatusRes.data);
      } catch (error) {
        console.error('Error loading Telegram auth status:', error);
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

      // Load publication channel info
      try {
        const pubChannelRes = await telegramApi.publicationChannel.get();
        console.log('Loaded publication channel:', pubChannelRes.data);
        setPublicationChannel(pubChannelRes.data);
      } catch (error) {
        console.error('Error loading publication channel:', error);
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

      // Load KYC status
      try {
        const kycRes = await tipsterApi.getKycStatus();
        setKycStatus(kycRes.data);
        console.log('Loaded KYC status:', kycRes.data);
      } catch (error) {
        console.error('Error loading KYC status:', error);
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleKycComplete = async () => {
    // Reload KYC status after completing
    try {
      const kycRes = await tipsterApi.getKycStatus();
      setKycStatus(kycRes.data);
      setActiveView('dashboard');
    } catch (error) {
      console.error('Error reloading KYC status:', error);
    }
  };

  // ==================== SUPPORT TICKETS FUNCTIONS ====================
  
  const loadTickets = async () => {
    setTicketsLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001/api'}/tickets/my`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
      });
      const data = await response.json();
      setSupportTickets(data.tickets || []);
    } catch (error) {
      console.error('Error loading tickets:', error);
    } finally {
      setTicketsLoading(false);
    }
  };

  const handleCreateTicket = async () => {
    if (!newTicketData.subject.trim() || !newTicketData.message.trim()) return;
    
    setTicketSubmitting(true);
    try {
      // Upload attachments if any
      let attachmentUrls: string[] = [];
      if (ticketAttachments.length > 0) {
        const formData = new FormData();
        ticketAttachments.forEach((file) => {
          formData.append('files', file);
        });
        
        try {
          const uploadResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001/api'}/upload/tickets`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
            },
            body: formData,
          });
          if (uploadResponse.ok) {
            const uploadData = await uploadResponse.json();
            attachmentUrls = uploadData.urls || [];
          }
        } catch (uploadError) {
          console.error('Error uploading attachments:', uploadError);
        }
      }
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001/api'}/tickets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: JSON.stringify({
          ...newTicketData,
          attachments: attachmentUrls,
        }),
      });
      if (response.ok) {
        setNewTicketData({ subject: '', message: '' });
        setTicketAttachments([]);
        setShowNewTicketForm(false);
        await loadTickets();
        alert('✅ Ticket creado exitosamente');
      }
    } catch (error) {
      console.error('Error creating ticket:', error);
      alert('Error al crear el ticket');
    } finally {
      setTicketSubmitting(false);
    }
  };

  const handleReplyTicket = async () => {
    if (!selectedTicket || !replyMessage.trim()) return;
    
    setTicketSubmitting(true);
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001/api'}/tickets/${selectedTicket.id}/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: JSON.stringify({ message: replyMessage }),
      });
      setReplyMessage('');
      await loadTickets();
      // Refresh selected ticket
      const updated = supportTickets.find(t => t.id === selectedTicket.id);
      if (updated) setSelectedTicket(updated);
    } catch (error) {
      console.error('Error replying to ticket:', error);
    } finally {
      setTicketSubmitting(false);
    }
  };

  // Load tickets when switching to support view
  useEffect(() => {
    if (activeView === 'support') {
      loadTickets();
    }
  }, [activeView]);

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
  
  // Conectar canal por nombre
  const handleConnectChannel = async () => {
    if (!channelInput.trim()) {
      setAddChannelError('Por favor, ingresa el nombre de tu canal');
      return;
    }

    setConnectingChannel(true);
    setAddChannelError('');

    try {
      // Conectar por link de invitación
      const response = await telegramApi.channels.connectByInviteLink(channelInput.trim());
      
      if (response.data.success) {
        // Reload channels
        const channelsRes = await telegramApi.channels.getAll();
        setTelegramChannels(channelsRes.data.channels || []);
        
        // Reset form
        setShowAddChannelForm(false);
        setChannelInput('');
        setInputMode('name');
        alert('✅ Canal conectado correctamente');
      } else {
        setAddChannelError(response.data.message || 'No se pudo conectar el canal.');
      }
    } catch (error: any) {
      setAddChannelError(error.response?.data?.message || 'Error al conectar el canal');
    } finally {
      setConnectingChannel(false);
    }
  };

  // Conectar canal por ID directamente
  const handleConnectChannelById = async () => {
    if (!channelInput.trim()) {
      setAddChannelError('Por favor, ingresa el ID del canal');
      return;
    }

    setConnectingChannel(true);
    setAddChannelError('');

    try {
      // Conectar por ID
      const response = await telegramApi.channels.connectById(channelInput.trim());
      
      if (response.data.success) {
        // Reload channels
        const channelsRes = await telegramApi.channels.getAll();
        setTelegramChannels(channelsRes.data.channels || []);
        
        // Reset form
        setShowAddChannelForm(false);
        setChannelInput('');
        setInputMode('title');
        alert('✅ Canal conectado correctamente');
      } else {
        setAddChannelError(response.data.message || 'No se pudo conectar el canal. Verifica que el bot sea administrador.');
      }
    } catch (error: any) {
      setAddChannelError(error.response?.data?.message || 'Error al conectar el canal. Verifica el ID.');
    } finally {
      setConnectingChannel(false);
    }
  };

  // Conectar canal por nombre (y opcionalmente link para diferenciar)
  const handleConnectChannelByNameAndLink = async () => {
    if (!channelInput.trim()) {
      setAddChannelError('Por favor, ingresa el nombre del canal');
      return;
    }

    setConnectingChannel(true);
    setAddChannelError('');

    try {
      // Conectar por nombre del canal (y link opcional)
      const response = await telegramApi.channels.connectByName(channelInput.trim(), channelLinkInput.trim() || undefined);
      
      if (response.data.success) {
        // Reload channels
        const channelsRes = await telegramApi.channels.getAll();
        setTelegramChannels(channelsRes.data.channels || []);
        
        // Reset form
        setShowAddChannelForm(false);
        setChannelInput('');
        setChannelLinkInput('');
        alert('✅ Canal conectado correctamente');
      } else {
        setAddChannelError(response.data.message || 'No se encontró el canal. Verifica que el bot sea administrador y el nombre sea correcto.');
      }
    } catch (error: any) {
      setAddChannelError(error.response?.data?.message || 'Error al conectar el canal. Verifica el nombre.');
    } finally {
      setConnectingChannel(false);
    }
  };

  // Conectar canal por nombre
  const handleConnectChannelByName = async () => {
    if (!channelInput.trim()) {
      setAddChannelError('Por favor, ingresa el nombre del canal');
      return;
    }

    setConnectingChannel(true);
    setAddChannelError('');

    try {
      // Conectar por nombre del canal
      const response = await telegramApi.channels.connectByName(channelInput.trim());
      
      if (response.data.success) {
        // Reload channels
        const channelsRes = await telegramApi.channels.getAll();
        setTelegramChannels(channelsRes.data.channels || []);
        
        // Reset form
        setShowAddChannelForm(false);
        setChannelInput('');
        setInputMode('title');
        alert('✅ Canal conectado correctamente');
      } else {
        setAddChannelError(response.data.message || 'No se encontró el canal. Verifica que el bot sea administrador y el nombre sea correcto.');
      }
    } catch (error: any) {
      setAddChannelError(error.response?.data?.message || 'Error al conectar el canal. Verifica el nombre.');
    } finally {
      setConnectingChannel(false);
    }
  };

  // LEGACY: mantener funciones antiguas por si se usan en otro lugar
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

  // ==================== TELEGRAM AUTH (AUTO-CONNECT) FUNCTIONS ====================
  
  const handleTelegramAuth = async (authData: any) => {
    try {
      const response = await telegramApi.auth.connect(authData);
      if (response.data.success) {
        // Recargar estado de autenticación
        const authStatusRes = await telegramApi.auth.getStatus();
        setTelegramAuthStatus(authStatusRes.data);
        
        // Recargar canales
        const channelsRes = await telegramApi.channels.getAll();
        setTelegramChannels(channelsRes.data.channels || []);
        
        return { 
          success: true, 
          autoConnectedChannels: response.data.autoConnectedChannels 
        };
      }
      return { success: false };
    } catch (error: any) {
      console.error('Error connecting Telegram:', error);
      return { success: false };
    }
  };

  const handleTelegramDisconnect = async () => {
    if (!confirm('¿Deseas desvincular tu cuenta de Telegram?')) return;
    
    try {
      await telegramApi.auth.disconnect();
      setTelegramAuthStatus({
        isConnected: false,
        availableChannels: [],
      });
    } catch (error) {
      console.error('Error disconnecting Telegram:', error);
      alert('Error al desvincular Telegram');
    }
  };

  const handleAutoConnectChannel = async (channelId: string) => {
    try {
      const response = await telegramApi.auth.autoConnectChannel(channelId);
      if (response.data.success) {
        // Recargar canales
        const channelsRes = await telegramApi.channels.getAll();
        setTelegramChannels(channelsRes.data.channels || []);
        
        // Recargar estado de autenticación
        const authStatusRes = await telegramApi.auth.getStatus();
        setTelegramAuthStatus(authStatusRes.data);
        
        return { success: true, channel: response.data.channel };
      }
      return { success: false, error: response.data.message };
    } catch (error: any) {
      console.error('Error auto-connecting channel:', error);
      return { success: false, error: error.response?.data?.message || 'Error al conectar el canal' };
    }
  };

  const refreshTelegramAuthStatus = async () => {
    try {
      const authStatusRes = await telegramApi.auth.getStatus();
      setTelegramAuthStatus(authStatusRes.data);
      
      const channelsRes = await telegramApi.channels.getAll();
      setTelegramChannels(channelsRes.data.channels || []);
    } catch (error) {
      console.error('Error refreshing Telegram status:', error);
    }
  };

  const handleConnectWithCode = async (code: string) => {
    try {
      const response = await telegramApi.auth.connectWithCode(code);
      if (response.data.success) {
        // Recargar estado de autenticación
        const authStatusRes = await telegramApi.auth.getStatus();
        setTelegramAuthStatus(authStatusRes.data);
        
        // Recargar canales
        const channelsRes = await telegramApi.channels.getAll();
        setTelegramChannels(channelsRes.data.channels || []);
        
        return { 
          success: true, 
          autoConnectedChannels: response.data.autoConnectedChannels 
        };
      }
      return { success: false };
    } catch (error: any) {
      console.error('Error connecting with code:', error);
      throw error;
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

  const handlePublishToTelegram = (productId: string, productTitle: string) => {
    console.log('handlePublishToTelegram called', { productId, productTitle, publicationChannel });
    
    if (!publicationChannel.configured) {
      alert('Primero debes configurar tu Canal de Publicación en la sección de Telegram');
      setActiveView('telegram');
      return;
    }

    // Mostrar modal de confirmación
    setProductToShare({ id: productId, title: productTitle });
    setShowShareConfirmModal(true);
  };

  const confirmPublishToTelegram = async () => {
    if (!productToShare) return;

    setShowShareConfirmModal(false);
    setPublishingProduct(productToShare.id);
    
    try {
      const response = await telegramApi.publishProduct(productToShare.id);
      console.log('Publish response:', response.data);
      
      if (response.data.success) {
        alert('✅ ¡Publicado! Tu producto ya está en tu canal de Telegram');
      } else {
        alert('❌ ' + (response.data.message || 'Error al publicar'));
      }
    } catch (error: any) {
      console.error('Publish error:', error);
      alert('❌ Error: ' + (error.response?.data?.message || 'Error al publicar en Telegram'));
    } finally {
      setPublishingProduct(null);
      setProductToShare(null);
    }
  };

  const cancelPublishToTelegram = () => {
    setShowShareConfirmModal(false);
    setProductToShare(null);
  };

  // ==================== PUBLICATION CHANNEL FUNCTIONS ====================

  // Polling para detectar conexión automática
  const startPollingForConnection = () => {
    const interval = setInterval(async () => {
      try {
        const res = await telegramApi.publicationChannel.get();
        if (res.data.configured) {
          setPublicationChannel(res.data);
          setLinkingMethod(null);
          clearInterval(interval);
          setPollingInterval(null);
        }
      } catch (error) {
        console.error('Error polling publication channel:', error);
      }
    }, 3000); // Check every 3 seconds
    setPollingInterval(interval);
  };

  // Limpiar polling cuando el componente se desmonta
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  const handleStartAutoLinking = async () => {
    setSavingPublicationChannel(true);
    setPublicationChannelError('');

    try {
      const response = await telegramApi.publicationChannel.startLinking();

      if (response.data.success) {
        setPublicationChannel(prev => ({ ...prev, pending: true }));
        setLinkingMethod('auto');
        startPollingForConnection();
      } else {
        setPublicationChannelError(response.data.message || 'Error al iniciar vinculación');
      }
    } catch (error: any) {
      setPublicationChannelError(error.response?.data?.message || 'Error al iniciar vinculación');
    } finally {
      setSavingPublicationChannel(false);
    }
  };

  const handleCancelLinking = async () => {
    try {
      await telegramApi.publicationChannel.cancelLinking();
      setPublicationChannel(prev => ({ ...prev, pending: false }));
      setLinkingMethod(null);
      if (pollingInterval) {
        clearInterval(pollingInterval);
        setPollingInterval(null);
      }
    } catch (error: any) {
      console.error('Error canceling linking:', error);
    }
  };

  const handleSetPublicationChannel = async () => {
    if (!publicationChannelInput.trim()) {
      setPublicationChannelError('Por favor, ingresa el ID o @username del canal');
      return;
    }

    setSavingPublicationChannel(true);
    setPublicationChannelError('');

    try {
      const response = await telegramApi.publicationChannel.set(
        publicationChannelInput.trim(),
        publicationChannelTitle.trim() || undefined
      );

      if (response.data.success) {
        setPublicationChannel({
          configured: true,
          pending: false,
          channelId: response.data.channelId,
          channelTitle: response.data.channelTitle,
          channelUsername: response.data.channelUsername,
        });
        setLinkingMethod(null);
        setPublicationChannelInput('');
        setPublicationChannelTitle('');
      } else {
        setPublicationChannelError(response.data.message || 'Error al configurar el canal');
      }
    } catch (error: any) {
      setPublicationChannelError(error.response?.data?.message || 'Error al configurar el canal');
    } finally {
      setSavingPublicationChannel(false);
    }
  };

  const handleRemovePublicationChannel = async () => {
    if (!confirm('¿Estás seguro de que deseas desvincular el canal de publicación?')) {
      return;
    }

    try {
      await telegramApi.publicationChannel.remove();
      setPublicationChannel({
        configured: false,
        pending: false,
        channelId: null,
        channelTitle: null,
        channelUsername: null,
      });
    } catch (error: any) {
      alert('Error al eliminar el canal: ' + (error.response?.data?.message || 'Error desconocido'));
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
      subscriptionInterval: 'MONTHLY',
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
      subscriptionInterval: product.billingPeriod || 'MONTHLY',
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
        billingPeriod: formData.billingType === 'SUBSCRIPTION' ? formData.subscriptionInterval : undefined,
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
      <aside className="fixed top-0 left-0 w-64 h-full bg-white border-r border-gray-100">
        <div className="p-6">
          <div className="text-2xl font-bold text-gray-900 mb-8">Antia</div>
          
          <div className="mb-6 pb-6 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900">{user?.tipsterProfile?.publicName || user?.email || 'Cargando...'}</div>
                <div className="text-xs text-gray-400">#{user?.tipsterProfile?.id?.slice(-4) || '----'}</div>
              </div>
            </div>
          </div>

          <nav className="space-y-1">
            <button
              onClick={() => setActiveView('dashboard')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm ${activeView === 'dashboard' ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Inicio
            </button>
            
            {/* Módulo: Pronósticos (AntiaPay) - Solo si está habilitado */}
            {enabledModules.forecasts && (
              <>
                <button
                  onClick={() => setActiveView('products')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm ${activeView === 'products' ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  Crear producto
                </button>
              </>
            )}
            
            {/* Módulo: Afiliación - Solo si está habilitado */}
            {enabledModules.affiliate && (
              <button
                onClick={() => setActiveView('referrals')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm ${activeView === 'referrals' ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Campañas
              </button>
            )}
            
            <button
              onClick={() => setActiveView('payouts')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm ${activeView === 'payouts' ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <span className="flex items-center gap-3">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Liquidaciones
              </span>
              {(salesStats?.netEarningsCents || 0) > 0 && (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                  {formatPrice(salesStats?.netEarningsCents || 0)}
                </span>
              )}
            </button>
            
            {/* KYC / Datos de Cobro - Visible solo si necesita completar */}
            {kycStatus.needsKyc && (
              <button
                onClick={() => setActiveView('kyc')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm ${activeView === 'kyc' ? 'bg-orange-50 text-orange-600 font-medium' : 'text-orange-500 hover:bg-orange-50'}`}
              >
                <span className="flex items-center gap-3">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  Datos de Cobro
                </span>
                <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                  Pendiente
                </span>
              </button>
            )}
            
            <button
              onClick={() => setActiveView('profile')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm ${activeView === 'profile' ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Perfil
            </button>
            <button
              onClick={() => setActiveView('support')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm ${activeView === 'support' ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Soporte
            </button>
            
            <div className="pt-4 mt-4 border-t border-gray-100">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Cerrar Sesión
              </button>
            </div>
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 p-8">
        {/* Currency Selector & Notifications - Fixed top right */}
        <div className="fixed top-4 right-8 z-50 flex items-center gap-3">
          <NotificationsBell />
          <CurrencySelector variant="pill" />
        </div>

        {/* KYC Banner - Mostrar si necesita completar datos */}
        {kycStatus.needsKyc && activeView !== 'kyc' && (
          <KycBanner onComplete={() => setActiveView('kyc')} />
        )}

        {/* KYC Form View */}
        {activeView === 'kyc' && (
          <KycForm 
            onComplete={handleKycComplete} 
            onCancel={() => setActiveView('dashboard')}
            initialData={kycStatus.kycData}
          />
        )}

        {activeView === 'dashboard' && (
          <>
            <div className="mb-8">
              <h1 className="text-2xl font-semibold text-gray-900">Hola {user?.tipsterProfile?.publicName?.split(' ')[0] || 'Tipster'}</h1>
              <p className="text-gray-500 mt-1">Bienvenido de nuevo!</p>
            </div>

            {/* Stats Cards - Estilo nuevo con iconos */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
              {/* Afiliados */}
              {enabledModules.affiliate && (
                <div className="bg-white rounded-xl p-5 border border-gray-100">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Afiliados</p>
                      <p className="text-2xl font-semibold text-gray-900">{metrics?.ftds || 0}</p>
                    </div>
                    <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center text-xs">
                    <span className="text-green-500 flex items-center">
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                      </svg>
                      12%
                    </span>
                    <span className="text-gray-400 ml-2">vs mes anterior</span>
                  </div>
                </div>
              )}

              {/* Clicks Únicos */}
              <div className="bg-white rounded-xl p-5 border border-gray-100">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Clicks Únicos</p>
                    <p className="text-2xl font-semibold text-gray-900">{metrics?.uniqueClicks || salesStats?.uniqueVisitors || 0}</p>
                  </div>
                  <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                    </svg>
                  </div>
                </div>
                <div className="mt-3 flex items-center text-xs">
                  <span className="text-green-500 flex items-center">
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                    </svg>
                    8%
                  </span>
                  <span className="text-gray-400 ml-2">vs mes anterior</span>
                </div>
              </div>

              {/* Clicks Totales */}
              <div className="bg-white rounded-xl p-5 border border-gray-100">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Clicks Totales</p>
                    <p className="text-2xl font-semibold text-gray-900">{metrics?.clicks || salesStats?.totalVisits || 0}</p>
                  </div>
                  <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                </div>
                <div className="mt-3 flex items-center text-xs">
                  <span className="text-red-500 flex items-center">
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                    3%
                  </span>
                  <span className="text-gray-400 ml-2">vs mes anterior</span>
                </div>
              </div>

              {/* Campañas activas */}
              {enabledModules.affiliate && (
                <div className="bg-white rounded-xl p-5 border border-gray-100">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Campañas activas</p>
                      <p className="text-2xl font-semibold text-gray-900">{metrics?.campaigns || products.filter((p: any) => p.active).length || 0}</p>
                    </div>
                    <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center text-xs">
                    <span className="text-green-500 flex items-center">
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                      </svg>
                      5%
                    </span>
                    <span className="text-gray-400 ml-2">vs mes anterior</span>
                  </div>
                </div>
              )}
            </div>

            {/* Secciones adicionales con el nuevo estilo */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-8">
              {/* Campañas mas populares */}
              {enabledModules.affiliate && (
                <div className="bg-white rounded-xl p-5 border border-gray-100">
                  <h3 className="font-medium text-gray-900 mb-4">Campañas mas populares</h3>
                  <div className="space-y-4">
                    {products.slice(0, 3).map((product: any, idx: number) => (
                      <div key={product.id}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600">{product.title}</span>
                          <span className="text-gray-400">{Math.round(85 - idx * 15)}%</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div 
                            className="bg-blue-500 h-2 rounded-full" 
                            style={{ width: `${85 - idx * 15}%` }}
                          />
                        </div>
                      </div>
                    ))}
                    {products.length === 0 && (
                      <p className="text-sm text-gray-400 text-center py-4">Sin campañas</p>
                    )}
                  </div>
                </div>
              )}

              {/* AntiaPay - Solo si Pronósticos habilitado */}
              {enabledModules.forecasts && (
                <div className="bg-white rounded-xl p-5 border border-gray-100">
                  <h3 className="font-medium text-gray-900 mb-4">AntiaPay</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">Ingresos Brutos</span>
                      <span className="font-semibold text-gray-900">{formatPrice(salesStats?.grossEarningsCents || 0)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">Ventas</span>
                      <span className="font-semibold text-gray-900">{salesStats?.totalSales || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">Productos</span>
                      <span className="font-semibold text-gray-900">{products.length}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Afiliados - Solo si Afiliación habilitado */}
              {enabledModules.affiliate && (
                <div className="bg-white rounded-xl p-5 border border-gray-100">
                  <h3 className="font-medium text-gray-900 mb-4">Afiliados</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">Ganancias</span>
                      <span className="font-semibold text-gray-900">{formatPrice(metrics?.totalEarnings || 0)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">Referidos FTD</span>
                      <span className="font-semibold text-gray-900">{metrics?.ftds || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">Próxima liquidación</span>
                      <span className="font-semibold text-gray-900">
                        {(() => {
                          const today = new Date();
                          const dayOfWeek = today.getDay();
                          const daysUntilSunday = (7 - dayOfWeek) % 7 || 7;
                          const nextSunday = new Date(today);
                          nextSunday.setDate(today.getDate() + daysUntilSunday);
                          return nextSunday.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
                        })()}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Recent Products and Sales - Solo si Pronósticos está habilitado */}
            {enabledModules.forecasts && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="bg-white rounded-xl border border-gray-100">
                  <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="font-medium text-gray-900">Mis Productos</h2>
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
                            <button 
                              onClick={() => {
                                const checkoutUrl = `${window.location.origin}/checkout/${product.id}`;
                                const suggestedText = `🔥 ${product.title}\n\n${product.description || ''}\n\n💰 Precio: €${(product.priceCents / 100).toFixed(2)}\n\n👉 Comprar aquí: ${checkoutUrl}`;
                                navigator.clipboard.writeText(suggestedText);
                                alert('✅ Texto copiado al portapapeles!\n\nPégalo en tu canal de Telegram, Instagram, o donde quieras.');
                              }}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm flex items-center gap-2 hover:bg-green-700"
                              title="Copiar link de checkout con texto sugerido"
                            >
                              📋 Copiar Link
                            </button>
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

        {activeView === 'referrals' && (
          <AffiliateSection />
        )}

        {activeView === 'payouts' && (
          <div className="min-h-screen bg-gray-50">
            {/* Header AntiaPay */}
            <div className="bg-white border-b border-gray-200 px-6 py-4">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span className="font-medium text-gray-900">AntiaPay</span>
                <span>/</span>
                <span>Liquidaciones</span>
              </div>
            </div>

            {/* Main Content */}
            <div className="p-6">
              {/* Tabs */}
              <div className="bg-white rounded-lg shadow-sm mb-6">
                <div className="border-b border-gray-100">
                  <nav className="flex">
                    <button
                      onClick={() => setPayoutsSubView('liquidaciones')}
                      className={`px-6 py-4 text-sm font-medium border-b-2 transition ${
                        payoutsSubView === 'liquidaciones'
                          ? 'border-blue-500 text-blue-600 bg-blue-50/50'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      Liquidaciones
                    </button>
                    <button
                      onClick={() => setPayoutsSubView('facturas')}
                      className={`px-6 py-4 text-sm font-medium border-b-2 transition ${
                        payoutsSubView === 'facturas'
                          ? 'border-blue-500 text-blue-600 bg-blue-50/50'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      Facturas
                    </button>
                    <button
                      onClick={() => setPayoutsSubView('pagos')}
                      className={`px-6 py-4 text-sm font-medium border-b-2 transition ${
                        payoutsSubView === 'pagos'
                          ? 'border-blue-500 text-blue-600 bg-blue-50/50'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      Informe de saldo
                    </button>
                  </nav>
                </div>
              </div>

              {/* Sub-vista: Liquidaciones */}
              {payoutsSubView === 'liquidaciones' && (
                <div className="space-y-6">
                  {/* Filters */}
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">Cartera</span>
                      <select className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                        <option>Todas</option>
                        <option>Pronósticos</option>
                        <option>Afiliación</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">Año</span>
                      <select className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                        <option>2025</option>
                        <option>2024</option>
                      </select>
                    </div>
                  </div>

                  {/* Table */}
                  <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Liquidaciones</th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                          <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ingresos</th>
                          <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Deducidos</th>
                          <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Gastos</th>
                          <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                          <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {/* Sample data - will be replaced with real data */}
                        {settlementsData?.settlements?.length > 0 ? (
                          settlementsData.settlements.map((settlement: any, index: number) => (
                            <tr key={settlement.id || index} className="hover:bg-gray-50">
                              <td className="px-6 py-4 text-sm text-gray-900">
                                {settlement.reference || `LIQ-${String(index + 1).padStart(4, '0')}`}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-500">
                                {settlement.date ? new Date(settlement.date).toLocaleDateString('es-ES') : '-'}
                              </td>
                              <td className="px-6 py-4">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  settlement.status === 'PAID' ? 'bg-green-100 text-green-700' :
                                  settlement.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                                  settlement.status === 'PROCESSING' ? 'bg-blue-100 text-blue-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {settlement.status === 'PAID' ? 'Pagado' :
                                   settlement.status === 'PENDING' ? 'Pendiente' :
                                   settlement.status === 'PROCESSING' ? 'En proceso' :
                                   settlement.status || 'Abandonado'}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-sm text-right text-gray-900">
                                {formatPrice(settlement.grossAmount || 0)}
                              </td>
                              <td className="px-6 py-4 text-sm text-right text-red-600">
                                -{formatPrice(settlement.deductions || 0)}
                              </td>
                              <td className="px-6 py-4 text-sm text-right text-orange-600">
                                -{formatPrice(settlement.expenses || 0)}
                              </td>
                              <td className="px-6 py-4 text-sm text-right font-semibold text-gray-900">
                                {formatPrice(settlement.netAmount || 0)}
                              </td>
                              <td className="px-6 py-4 text-right">
                                <button className="text-gray-400 hover:text-red-600 transition">
                                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd"/>
                                  </svg>
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={8} className="px-6 py-12 text-center">
                              <div className="flex flex-col items-center">
                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                </div>
                                <p className="text-gray-500 font-medium">No hay liquidaciones procesadas aún</p>
                                <p className="text-sm text-gray-400 mt-1">Tu primera liquidación se procesará automáticamente</p>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white rounded-lg shadow-sm p-5">
                      <div className="text-sm text-gray-500 mb-1">Balance Pendiente</div>
                      <div className="text-2xl font-bold text-blue-600">
                        {formatPrice(salesStats?.netEarningsCents || 0)}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        Próxima liquidación: {(() => {
                          const today = new Date();
                          const dayOfWeek = today.getDay();
                          const daysUntilSunday = (7 - dayOfWeek) % 7 || 7;
                          const nextSunday = new Date(today);
                          nextSunday.setDate(today.getDate() + daysUntilSunday);
                          return nextSunday.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
                        })()}
                      </div>
                    </div>
                    <div className="bg-white rounded-lg shadow-sm p-5">
                      <div className="text-sm text-gray-500 mb-1">Total Liquidado</div>
                      <div className="text-2xl font-bold text-green-600">€0.00</div>
                      <div className="text-xs text-gray-400 mt-1">Histórico total</div>
                    </div>
                    <div className="bg-white rounded-lg shadow-sm p-5">
                      <div className="text-sm text-gray-500 mb-1">Comisiones Antia</div>
                      <div className="text-2xl font-bold text-orange-600">
                        {formatPrice(salesStats?.platformFeesCents || 0)}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">10% de las ventas</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Sub-vista: Facturas */}
              {payoutsSubView === 'facturas' && (
                <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Factura</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Concepto</th>
                        <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Importe</th>
                        <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center">
                          <div className="flex flex-col items-center">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </div>
                            <p className="text-gray-500 font-medium">No hay facturas disponibles</p>
                            <p className="text-sm text-gray-400 mt-1">Las facturas se generan con cada liquidación</p>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {/* Sub-vista: Informe de Saldo */}
              {payoutsSubView === 'pagos' && (
                <div className="space-y-6">
                  {/* Balance Overview */}
                  <div className="bg-white rounded-lg shadow-sm p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Resumen de Saldo</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <div className="text-sm text-blue-600">Ingresos Brutos</div>
                        <div className="text-xl font-bold text-blue-700">{formatPrice(salesStats?.grossEarningsCents || 0)}</div>
                      </div>
                      <div className="p-4 bg-red-50 rounded-lg">
                        <div className="text-sm text-red-600">Comisión Pasarela</div>
                        <div className="text-xl font-bold text-red-700">-{formatPrice(salesStats?.gatewayFeesCents || 0)}</div>
                      </div>
                      <div className="p-4 bg-orange-50 rounded-lg">
                        <div className="text-sm text-orange-600">Comisión Antia</div>
                        <div className="text-xl font-bold text-orange-700">-{formatPrice(salesStats?.platformFeesCents || 0)}</div>
                      </div>
                      <div className="p-4 bg-green-50 rounded-lg">
                        <div className="text-sm text-green-600">Neto a Recibir</div>
                        <div className="text-xl font-bold text-green-700">{formatPrice(salesStats?.netEarningsCents || 0)}</div>
                      </div>
                    </div>
                  </div>

                  {/* Payment History */}
                  <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100">
                      <h3 className="font-semibold text-gray-900">Historial de Transferencias</h3>
                    </div>
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Referencia</th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Método</th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                          <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase">Importe</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center">
                            <div className="flex flex-col items-center">
                              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                </svg>
                              </div>
                              <p className="text-gray-500 font-medium">No hay transferencias registradas</p>
                              <p className="text-sm text-gray-400 mt-1">Las transferencias aparecerán aquí cuando se procesen</p>
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeView === 'profile' && (
          <>
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">Mi Perfil</h1>
              <p className="text-gray-600 mt-1">Configuración de tu cuenta</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Información Personal */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Información Personal</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Público</label>
                    <input 
                      type="text" 
                      value={user?.tipsterProfile?.publicName || ''}
                      readOnly
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input 
                      type="email" 
                      value={user?.email || ''}
                      readOnly
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                    <input 
                      type="text" 
                      value={user?.phone || 'No configurado'}
                      readOnly
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Usuario de Telegram</label>
                    <input 
                      type="text" 
                      value={user?.tipsterProfile?.telegramUsername || 'No configurado'}
                      readOnly
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Estado de la cuenta</label>
                    <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${user?.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      {user?.status === 'ACTIVE' ? '✓ Activa' : user?.status}
                    </span>
                  </div>
                  <div className="pt-4 border-t">
                    <p className="text-sm text-gray-500">Para modificar tu información de perfil, contacta con el administrador.</p>
                  </div>
                </div>
              </div>

              {/* Datos de Cobro */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900">🏦 Datos de Cobro</h2>
                  {kycStatus.kycCompleted ? (
                    <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                      ✓ Completo
                    </span>
                  ) : (
                    <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-medium">
                      Pendiente
                    </span>
                  )}
                </div>
                
                {kycStatus.kycCompleted && kycStatus.kycData ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nombre/Razón Social</label>
                      <input 
                        type="text" 
                        value={kycStatus.kycData.legalName || '-'}
                        readOnly
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Documento</label>
                        <input 
                          type="text" 
                          value={kycStatus.kycData.documentType || '-'}
                          readOnly
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Número</label>
                        <input 
                          type="text" 
                          value={kycStatus.kycData.documentNumber || '-'}
                          readOnly
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">País</label>
                      <input 
                        type="text" 
                        value={kycStatus.kycData.country || '-'}
                        readOnly
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Método de Cobro</label>
                      <input 
                        type="text" 
                        value={kycStatus.kycData.bankAccountType || '-'}
                        readOnly
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                      />
                    </div>
                    <div className="pt-4 border-t">
                      <button
                        onClick={() => setActiveView('kyc')}
                        className="w-full px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 font-medium transition"
                      >
                        ✏️ Modificar Datos de Cobro
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-3xl">📋</span>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Datos no configurados</h3>
                    <p className="text-gray-500 text-sm mb-4">
                      Completa tus datos de cobro para poder recibir tus ganancias
                    </p>
                    <button
                      onClick={() => setActiveView('kyc')}
                      className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium transition"
                    >
                      Completar Ahora
                    </button>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Vista de Soporte */}
        {activeView === 'support' && (
          <>
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">❓ Soporte</h1>
              <p className="text-gray-600 mt-1">Centro de ayuda y tickets de soporte</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Crear nuevo ticket */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">📝 Nuevo Ticket</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Asunto *</label>
                      <input 
                        type="text"
                        value={newTicketData.subject}
                        onChange={(e) => setNewTicketData({ ...newTicketData, subject: e.target.value })}
                        placeholder="Describe brevemente tu problema"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Mensaje *</label>
                      <textarea 
                        value={newTicketData.message}
                        onChange={(e) => setNewTicketData({ ...newTicketData, message: e.target.value })}
                        placeholder="Explica tu problema con detalle..."
                        rows={5}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      />
                    </div>
                    
                    {/* Upload de archivos */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Adjuntar archivos (opcional)</label>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-400 transition cursor-pointer"
                        onClick={() => document.getElementById('ticket-file-input')?.click()}
                      >
                        <input
                          id="ticket-file-input"
                          type="file"
                          multiple
                          accept="image/*,.pdf,.doc,.docx"
                          className="hidden"
                          onChange={(e) => {
                            const files = Array.from(e.target.files || []);
                            setTicketAttachments(prev => [...prev, ...files].slice(0, 5));
                          }}
                        />
                        <div className="text-gray-500">
                          <span className="text-2xl">📎</span>
                          <p className="text-sm mt-1">Haz clic para adjuntar capturas o documentos</p>
                          <p className="text-xs text-gray-400">Máx. 5 archivos (imágenes, PDF, DOC)</p>
                        </div>
                      </div>
                      
                      {ticketAttachments.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {ticketAttachments.map((file, idx) => (
                            <div key={idx} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                              <div className="flex items-center gap-2 text-sm">
                                <span>{file.type.startsWith('image/') ? '🖼️' : '📄'}</span>
                                <span className="truncate max-w-[150px]">{file.name}</span>
                                <span className="text-gray-400 text-xs">({(file.size / 1024).toFixed(1)} KB)</span>
                              </div>
                              <button
                                onClick={() => setTicketAttachments(prev => prev.filter((_, i) => i !== idx))}
                                className="text-red-500 hover:text-red-700 text-sm"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <button
                      onClick={handleCreateTicket}
                      disabled={!newTicketData.subject.trim() || !newTicketData.message.trim() || ticketSubmitting}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {ticketSubmitting ? 'Enviando...' : 'Enviar Ticket'}
                    </button>
                  </div>
                </div>

                {/* FAQ rápido */}
                <div className="bg-white rounded-lg shadow p-6 mt-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">❓ Preguntas Frecuentes</h3>
                  <div className="space-y-3">
                    <details className="group">
                      <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-blue-600">
                        ¿Cómo conecto mi canal de Telegram?
                      </summary>
                      <p className="mt-2 text-sm text-gray-600 pl-4">
                        Ve a la sección Telegram, añade @Antiabetbot como admin de tu canal y luego conecta el canal desde el panel.
                      </p>
                    </details>
                    <details className="group">
                      <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-blue-600">
                        ¿Cuándo recibo mis pagos?
                      </summary>
                      <p className="mt-2 text-sm text-gray-600 pl-4">
                        Las liquidaciones se procesan el día 28 de cada mes. Asegúrate de tener tus datos de cobro completos.
                      </p>
                    </details>
                    <details className="group">
                      <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-blue-600">
                        ¿Cómo creo un producto sin canal?
                      </summary>
                      <p className="mt-2 text-sm text-gray-600 pl-4">
                        Al crear un producto, selecciona "Sin canal" en la opción de canal. Los clientes recibirán confirmación por email.
                      </p>
                    </details>
                  </div>
                </div>
              </div>

              {/* Lista de tickets */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-lg shadow">
                  <div className="p-6 border-b border-gray-200">
                    <h2 className="text-xl font-bold text-gray-900">📋 Mis Tickets</h2>
                  </div>
                  
                  {ticketsLoading ? (
                    <div className="p-8 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="mt-2 text-gray-500">Cargando tickets...</p>
                    </div>
                  ) : supportTickets.length === 0 ? (
                    <div className="p-8 text-center">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-3xl">📭</span>
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No tienes tickets</h3>
                      <p className="text-gray-500 text-sm">Cuando crees un ticket, aparecerá aquí</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200">
                      {supportTickets.map((ticket) => (
                        <div 
                          key={ticket.id} 
                          className={`p-4 hover:bg-gray-50 cursor-pointer transition ${selectedTicket?.id === ticket.id ? 'bg-blue-50' : ''}`}
                          onClick={() => setSelectedTicket(ticket)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium text-gray-900">{ticket.subject}</h4>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                  ticket.status === 'OPEN' ? 'bg-yellow-100 text-yellow-800' :
                                  ticket.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                                  ticket.status === 'RESOLVED' ? 'bg-green-100 text-green-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {ticket.status === 'OPEN' ? 'Abierto' :
                                   ticket.status === 'IN_PROGRESS' ? 'En proceso' :
                                   ticket.status === 'RESOLVED' ? 'Resuelto' : ticket.status}
                                </span>
                              </div>
                              <p className="text-sm text-gray-500 mt-1 line-clamp-2">{ticket.messages?.[0]?.message || ticket.message}</p>
                              <p className="text-xs text-gray-400 mt-2">
                                Creado: {new Date(ticket.createdAt).toLocaleDateString('es-ES', { 
                                  day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' 
                                })}
                              </p>
                            </div>
                            <div className="ml-4">
                              {ticket.responses?.length > 0 && (
                                <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                                  {ticket.responses.length + 1} mensajes
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Detalle del ticket seleccionado */}
                {selectedTicket && (
                  <div className="bg-white rounded-lg shadow mt-6">
                    <div className="p-6 border-b border-gray-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">{selectedTicket.subject}</h3>
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${
                            selectedTicket.status === 'OPEN' ? 'bg-yellow-100 text-yellow-800' :
                            selectedTicket.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                            selectedTicket.status === 'RESOLVED' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {selectedTicket.status === 'OPEN' ? 'Abierto' :
                             selectedTicket.status === 'IN_PROGRESS' ? 'En proceso' :
                             selectedTicket.status === 'RESOLVED' ? 'Resuelto' : selectedTicket.status}
                          </span>
                        </div>
                        <button 
                          onClick={() => setSelectedTicket(null)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                    
                    <div className="p-6 max-h-80 overflow-y-auto space-y-4">
                      {/* Mensaje original del ticket */}
                      <div className="p-4 rounded-lg bg-gray-50 mr-8">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-medium text-gray-700">👤 Tú</span>
                          <span className="text-xs text-gray-400">
                            {new Date(selectedTicket.createdAt).toLocaleString('es-ES')}
                          </span>
                        </div>
                        <p className="text-gray-700 text-sm">{selectedTicket.message}</p>
                      </div>
                      
                      {/* Respuestas */}
                      {selectedTicket.responses?.map((msg: any, idx: number) => (
                        <div 
                          key={idx} 
                          className={`p-4 rounded-lg ${msg.isAdmin ? 'bg-blue-50 ml-8' : 'bg-gray-50 mr-8'}`}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`text-sm font-medium ${msg.isAdmin ? 'text-blue-600' : 'text-gray-700'}`}>
                              {msg.isAdmin ? '👤 Soporte Antia' : '👤 Tú'}
                            </span>
                            <span className="text-xs text-gray-400">
                              {new Date(msg.createdAt).toLocaleString('es-ES')}
                            </span>
                          </div>
                          <p className="text-gray-700 text-sm">{msg.message}</p>
                        </div>
                      ))}
                    </div>

                    {selectedTicket.status !== 'RESOLVED' && (
                      <div className="p-6 border-t border-gray-200">
                        <div className="flex gap-2">
                          <input 
                            type="text"
                            value={replyMessage}
                            onChange={(e) => setReplyMessage(e.target.value)}
                            placeholder="Escribe tu respuesta..."
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            onKeyPress={(e) => e.key === 'Enter' && handleReplyTicket()}
                          />
                          <button
                            onClick={handleReplyTicket}
                            disabled={!replyMessage.trim()}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition disabled:opacity-50"
                          >
                            Enviar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </main>

      {/* Modal: Confirmar Compartir en Telegram */}
      {showShareConfirmModal && productToShare && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={cancelPublishToTelegram}>
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-6 text-white">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center">
                  <span className="text-3xl">📱</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold">Compartir en Telegram</h3>
                  <p className="text-green-100 text-sm">Publicación automática</p>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="p-6">
              <p className="text-gray-700 mb-4">
                ¿Estás seguro que quieres compartir este producto en tu canal de Telegram?
              </p>
              
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <p className="text-sm text-gray-500 mb-1">Producto:</p>
                <p className="font-semibold text-gray-900">{productToShare.title}</p>
              </div>

              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <div className="flex items-start gap-3">
                  <span className="text-xl">ℹ️</span>
                  <div>
                    <p className="text-sm text-blue-800">
                      <strong>Se publicará automáticamente</strong> en tu canal:
                    </p>
                    <p className="text-sm text-blue-600 font-medium mt-1">
                      {publicationChannel.channelTitle} {publicationChannel.channelUsername && `(${publicationChannel.channelUsername})`}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3">
              <button
                onClick={cancelPublishToTelegram}
                className="px-5 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-100 text-gray-700 font-medium transition"
              >
                Cancelar
              </button>
              <button
                onClick={confirmPublishToTelegram}
                className="px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition flex items-center gap-2"
              >
                <span>📤</span> Sí, Publicar Ahora
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Añadir Canal */}
      {showAddChannelForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowAddChannelForm(false)}>
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Conectar Canal de Telegram</h2>
                <button onClick={() => { setShowAddChannelForm(false); setAddChannelError(''); setChannelInput(''); setChannelLinkInput(''); }} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              {/* Instrucciones */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-800 mb-2">📋 Requisito previo:</h4>
                <p className="text-sm text-blue-700">
                  Añade el bot <strong>@Antiabetbot</strong> como <strong>administrador</strong> de tu canal y envía un mensaje en el canal.
                </p>
              </div>

              {addChannelError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600 whitespace-pre-line">{addChannelError}</p>
                </div>
              )}

              {/* Nombre del canal (obligatorio) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre del canal <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text" 
                  value={channelInput}
                  onChange={(e) => setChannelInput(e.target.value)}
                  placeholder="Ej: Pronosticos Futbol"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Escribe el nombre exacto de tu canal (como aparece en Telegram)
                </p>
              </div>

              {/* Link de invitación (obligatorio) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Link de invitación <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text" 
                  value={channelLinkInput}
                  onChange={(e) => setChannelLinkInput(e.target.value)}
                  placeholder="https://t.me/+abc123xyz"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Pega el link de invitación de tu canal (sirve para diferenciar canales con el mismo nombre)
                </p>
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <button 
                  onClick={() => { setShowAddChannelForm(false); setAddChannelError(''); setChannelInput(''); setChannelLinkInput(''); }}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleConnectChannelByNameAndLink}
                  disabled={connectingChannel || !channelInput.trim() || !channelLinkInput.trim()}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {connectingChannel ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Conectando...
                    </>
                  ) : (
                    'Conectar Canal'
                  )}
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

                  {/* Frecuencia de Suscripción - Solo si es SUBSCRIPTION */}
                  {formData.billingType === 'SUBSCRIPTION' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Frecuencia de Cobro</label>
                      <select 
                        value={formData.subscriptionInterval}
                        onChange={(e) => setFormData({ ...formData, subscriptionInterval: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="MONTHLY">Mensual</option>
                        <option value="QUARTERLY">Trimestral (cada 3 meses)</option>
                        <option value="ANNUAL">Anual</option>
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        Si el cliente no renueva, perderá acceso automáticamente al canal
                      </p>
                    </div>
                  )}
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
                      <option value="">🚫 Sin canal (solo confirmación de pago)</option>
                      {telegramChannels.map((channel) => (
                        <option key={channel.id} value={channel.channelId}>
                          {channel.channelType === 'public' ? '🌐' : '🔒'} {channel.channelTitle}
                          {channel.channelName && ` (@${channel.channelName})`}
                        </option>
                      ))}
                    </select>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.telegramChannelId 
                      ? 'Los clientes recibirán acceso a este canal después de pagar' 
                      : 'Sin canal: Los clientes solo recibirán confirmación de pago'}
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


// Export with Suspense wrapper
export default function TipsterDashboard() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <TipsterDashboardContent />
    </Suspense>
  );
}
