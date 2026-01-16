'use client';

import { useEffect, useState, Suspense, ReactNode, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { productsApi, referralsApi, payoutsApi, authApi, telegramApi, ordersApi, settlementsApi, userModulesApi, affiliateApi, usersApi, tipsterApi, uploadApi, withdrawalsApi } from '@/lib/api';
import AffiliateSection from '@/components/AffiliateSection';
import CurrencySelector from '@/components/CurrencySelector';
import { useCurrency } from '@/contexts/CurrencyContext';
import KycBanner from '@/components/KycBanner';
import KycForm from '@/components/KycForm';
import { NotificationsBell } from '@/components/NotificationsBell';
import TipsterTelegramAutoView from '@/components/tipster/TipsterTelegramAutoView';
import DashboardLayout from '@/components/DashboardLayout';

type ViewType = 'dashboard' | 'products' | 'referrals' | 'payouts' | 'profile' | 'kyc' | 'support';
type PayoutsSubView = 'liquidaciones' | 'facturas' | 'pagos' | 'retiros';

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

// Type for navigation items (moved outside component)
interface NavItem {
  id: string;
  label: string;
  icon: ReactNode;
  badge?: string | number;
  badgeColor?: string;
}

// Wrapper component to handle Suspense for useSearchParams
function TipsterDashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { formatPrice, symbol } = useCurrency();
  const [activeView, setActiveView] = useState<ViewType>('dashboard');
  const [payoutsSubView, setPayoutsSubView] = useState<PayoutsSubView>('retiros');
  const [productsSubView, setProductsSubView] = useState<'productos' | 'ventas'>('productos');
  const [user, setUser] = useState<any>(null);
  const [products, setProducts] = useState([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [salesStats, setSalesStats] = useState<any>(null);
  const [recentSales, setRecentSales] = useState<any[]>([]);
  const [settlementsData, setSettlementsData] = useState<any>(null);
  
  // Withdrawals / Retiros state
  const [withdrawalBalance, setWithdrawalBalance] = useState<any>(null);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [withdrawalsLoading, setWithdrawalsLoading] = useState(false);
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
  const [withdrawalAmount, setWithdrawalAmount] = useState('');
  const [withdrawalNotes, setWithdrawalNotes] = useState('');
  const [creatingWithdrawal, setCreatingWithdrawal] = useState(false);
  
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
  
  // Avatar upload state
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  
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
  const [showProductSuccess, setShowProductSuccess] = useState(false);
  const [createdProduct, setCreatedProduct] = useState<any>(null);
  
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

      // Load withdrawal balance and history
      try {
        const [balanceRes, withdrawalsRes] = await Promise.all([
          withdrawalsApi.getBalance(),
          withdrawalsApi.getMy(),
        ]);
        setWithdrawalBalance(balanceRes.data);
        setWithdrawals(withdrawalsRes.data.withdrawals || []);
      } catch (error) {
        console.error('Error loading withdrawals:', error);
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

  // ==================== WITHDRAWAL FUNCTIONS ====================

  const loadWithdrawals = async () => {
    setWithdrawalsLoading(true);
    try {
      const [balanceRes, withdrawalsRes] = await Promise.all([
        withdrawalsApi.getBalance(),
        withdrawalsApi.getMy(),
      ]);
      setWithdrawalBalance(balanceRes.data);
      setWithdrawals(withdrawalsRes.data.withdrawals || []);
    } catch (error) {
      console.error('Error loading withdrawals:', error);
    } finally {
      setWithdrawalsLoading(false);
    }
  };

  const handleCreateWithdrawal = async () => {
    const amount = parseFloat(withdrawalAmount);
    if (isNaN(amount) || amount < 5) {
      alert('El monto mínimo de retiro es €5.00');
      return;
    }

    const amountCents = Math.round(amount * 100);
    if (withdrawalBalance && amountCents > withdrawalBalance.availableBalanceCents) {
      alert(`Saldo insuficiente. Disponible: €${(withdrawalBalance.availableBalanceCents / 100).toFixed(2)}`);
      return;
    }

    setCreatingWithdrawal(true);
    try {
      const response = await withdrawalsApi.createRequest({
        amountCents,
        notes: withdrawalNotes || undefined,
      });

      if (response.data.success) {
        alert(`✅ Solicitud de retiro creada\nNúmero de factura: ${response.data.invoiceNumber}`);
        setShowWithdrawalModal(false);
        setWithdrawalAmount('');
        setWithdrawalNotes('');
        // Reload data
        await loadWithdrawals();
      }
    } catch (error: any) {
      console.error('Error creating withdrawal:', error);
      alert('❌ Error: ' + (error.response?.data?.message || 'No se pudo crear la solicitud'));
    } finally {
      setCreatingWithdrawal(false);
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
      alert('No tienes un canal de publicación configurado. Por favor, contacta a soporte.');
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

  // Handle avatar upload
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      alert('Solo se permiten imágenes (JPG, PNG, GIF, WEBP)');
      return;
    }

    // Validate file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      alert('La imagen no puede superar 2MB');
      return;
    }

    setUploadingAvatar(true);
    try {
      const response = await uploadApi.uploadAvatar(file);
      if (response.data.success) {
        // Update local user state with new avatar
        setUser((prev: any) => ({
          ...prev,
          tipsterProfile: {
            ...prev?.tipsterProfile,
            avatarUrl: response.data.avatarUrl,
          },
        }));
        alert('✅ Foto de perfil actualizada');
      }
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      alert('Error al subir la imagen: ' + (error.response?.data?.message || 'Inténtalo de nuevo'));
    } finally {
      setUploadingAvatar(false);
      // Reset file input
      if (avatarInputRef.current) {
        avatarInputRef.current.value = '';
      }
    }
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
        await loadData();
        closeModals();
      } else {
        const response = await productsApi.create(payload);
        
        if (formData.active && response.data?.id) {
          await productsApi.publish(response.data.id);
        }
        
        // Show success screen for new products
        setCreatedProduct(response.data);
        setShowProductForm(false);
        setShowProductSuccess(true);
        await loadData();
      }
      
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
    setShowProductSuccess(false);
    setSelectedProduct(null);
    setCreatedProduct(null);
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

  // Build navigation items dynamically based on enabled modules
  const buildNavItems = (): NavItem[] => {
    const items: NavItem[] = [
      {
        id: 'dashboard',
        label: 'Inicio',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        ),
      },
    ];

    if (enabledModules.forecasts) {
      items.push({
        id: 'products',
        label: 'Mis productos',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        ),
      });
    }

    if (enabledModules.affiliate) {
      items.push({
        id: 'referrals',
        label: 'Campañas',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        ),
      });
    }

    items.push({
      id: 'payouts',
      label: 'Liquidaciones',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      badge: (salesStats?.netEarningsCents || 0) > 0 ? formatPrice(salesStats?.netEarningsCents || 0) : undefined,
      badgeColor: 'bg-green-100 text-green-700',
    });

    if (kycStatus.needsKyc) {
      items.push({
        id: 'kyc',
        label: 'Datos de Cobro',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        ),
        badge: 'Pendiente',
        badgeColor: 'bg-orange-100 text-orange-700',
      });
    }

    items.push(
      {
        id: 'profile',
        label: 'Perfil',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        ),
      },
      {
        id: 'support',
        label: 'Soporte',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
      }
    );

    return items;
  };

  const tipsterNavItems = buildNavItems();

  return (
    <DashboardLayout
      navItems={tipsterNavItems}
      activeView={activeView}
      onNavChange={(view) => setActiveView(view as ViewType)}
      userInfo={{
        name: user?.tipsterProfile?.publicName || user?.email || 'Cargando...',
        subtitle: `#${user?.tipsterProfile?.id?.slice(-4) || '----'}`,
      }}
      onLogout={handleLogout}
      brandName="Antia"
      brandColor="blue"
      headerActions={
        <>
          <NotificationsBell />
          <CurrencySelector variant="pill" />
        </>
      }
    >
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
                            {/* Logo indicator */}
                            <div className="flex items-center gap-3 flex-1">
                              {product.telegramChannelId ? (
                                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                                  </svg>
                                </div>
                              ) : (
                                <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center flex-shrink-0">
                                  <span className="text-white font-bold text-sm">A</span>
                                </div>
                              )}
                              <div>
                                <h3 className="font-medium text-gray-900">{product.title}</h3>
                                <div className="flex items-center gap-3 mt-1">
                                  <span className="text-sm font-medium text-green-600">
                                    {formatPrice(product.priceCents)}
                                  </span>
                                  <span className={`text-xs px-2 py-1 rounded ${product.active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                    {product.active ? 'Activo' : 'Pausado'}
                                  </span>
                                </div>
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
          <div className="min-h-screen bg-gray-50 -mx-6 -mt-6 px-6 pt-6">
            {/* Header - Limpio y funcional */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Productos</h1>
                <p className="text-sm text-gray-500">Gestiona tus productos y ventas</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center overflow-hidden">
                  {user?.tipsterProfile?.avatarUrl ? (
                    <img src={user.tipsterProfile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white font-bold">{user?.tipsterProfile?.publicName?.charAt(0)?.toUpperCase() || 'T'}</span>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{user?.tipsterProfile?.publicName || 'Usuario'}</p>
                  <p className="text-xs text-gray-500">@{user?.email?.split('@')[0] || 'usuario'}</p>
                </div>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {/* Total ventas */}
              <div className="bg-white rounded-xl p-4 border border-gray-100">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm text-gray-500">Total ventas</p>
                    <p className="text-xs text-gray-400">{salesStats?.totalSales || 0} sold</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900">{formatPrice(salesStats?.grossEarningsCents || 0).replace('€', '')}€</p>
                    <p className="text-xs text-emerald-500">+ 6.9%</p>
                  </div>
                </div>
              </div>
              
              {/* Transacciones */}
              <div className="bg-white rounded-xl p-4 border border-gray-100">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm text-gray-500">Transacciones</p>
                    <p className="text-xs text-gray-400">{salesStats?.totalSales || 0} Ventas</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900">{salesStats?.totalSales || 0}</p>
                    <p className="text-xs text-emerald-500">+ 6.9%</p>
                  </div>
                </div>
              </div>
              
              {/* Suscripciones */}
              <div className="bg-white rounded-xl p-4 border border-gray-100">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm text-gray-500">Suscripciones</p>
                    <p className="text-xs text-gray-400">0 suscripciones</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900">{formatPrice(salesStats?.netEarningsCents || 0).replace('€', '')}€</p>
                    <p className="text-xs text-emerald-500">+ 6.9%</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content Card */}
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              {/* Tabs */}
              <div className="flex items-center justify-between px-6 pt-4 pb-0 border-b border-gray-100">
                <div className="flex items-center gap-6">
                  <button
                    onClick={() => setProductsSubView('productos')}
                    className={`pb-3 text-sm font-medium border-b-2 transition ${
                      productsSubView === 'productos'
                        ? 'border-blue-500 text-gray-900'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                    data-testid="tab-mis-productos"
                  >
                    Mis productos
                  </button>
                  <button
                    onClick={() => setProductsSubView('ventas')}
                    className={`pb-3 text-sm font-medium border-b-2 transition ${
                      productsSubView === 'ventas'
                        ? 'border-blue-500 text-gray-900'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                    data-testid="tab-ventas"
                  >
                    Ventas
                  </button>
                </div>
                {productsSubView === 'productos' && (
                  <button 
                    onClick={handleCreateProduct}
                    className="mb-3 bg-slate-800 text-white px-4 py-2 rounded-lg hover:bg-slate-700 transition text-sm font-medium flex items-center gap-2"
                    data-testid="create-product-btn"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Crear Producto
                  </button>
                )}
              </div>

              {/* Products Table - Only shown when 'productos' tab is active */}
              {productsSubView === 'productos' && (
                <>
                  {(products as any[]).length === 0 ? (
                    <div className="p-12 text-center">
                      <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No tienes productos aún</h3>
                      <p className="text-gray-500 mb-6">Crea tu primer producto para empezar a vender</p>
                      <button 
                        onClick={handleCreateProduct}
                        className="inline-flex items-center gap-2 bg-slate-800 text-white px-6 py-3 rounded-lg hover:bg-slate-700 transition font-medium"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Crear Producto
                      </button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[700px]">
                        <thead>
                          <tr className="border-b border-gray-100">
                            <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">Nombre</th>
                            <th className="px-4 py-4 text-center text-sm font-medium text-gray-700">Pago</th>
                            <th className="px-4 py-4 text-right text-sm font-medium text-gray-700">Precio</th>
                            <th className="px-4 py-4 text-right text-sm font-medium text-gray-700">Ventas</th>
                            <th className="px-4 py-4 text-right text-sm font-medium text-gray-700">Total</th>
                            <th className="px-6 py-4 text-center text-sm font-medium text-gray-700">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {(products as any[]).map((product: any) => {
                            // Calculate sales for this product
                            const productSales = recentSales.filter((s: any) => s.productId === product.id);
                            const salesCount = productSales.length;
                            const totalEarnings = productSales.reduce((sum: number, s: any) => sum + (s.amountCents || 0), 0);
                            
                            return (
                              <tr key={product.id} className="hover:bg-gray-50/50 transition group">
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-3">
                                    {/* Logo */}
                                    {product.telegramChannelId ? (
                                      <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center flex-shrink-0">
                                        <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                                          <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                                        </svg>
                                      </div>
                                    ) : (
                                      <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center flex-shrink-0">
                                        <span className="text-white font-bold text-lg">A</span>
                                      </div>
                                    )}
                                    <div>
                                      <p className="text-sm font-medium text-gray-900">{product.title}</p>
                                      <p className="text-xs text-gray-400">ID{product.id?.slice(-5) || '00000'}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-4 text-center">
                                  <span className="text-sm text-gray-600">
                                    {product.billingType === 'SUBSCRIPTION' ? 'Suscripción' : 'Unico'}
                                  </span>
                                </td>
                                <td className="px-4 py-4 text-right">
                                  <span className="text-sm text-gray-900">{formatPrice(product.priceCents)}</span>
                                </td>
                                <td className="px-4 py-4 text-right">
                                  <span className="text-sm text-gray-900">{salesCount > 0 ? formatPrice(salesCount * (product.priceCents || 0)) : '0€'}</span>
                                </td>
                                <td className="px-4 py-4 text-right">
                                  <span className="text-sm font-medium text-gray-900">{formatPrice(totalEarnings)}</span>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex items-center justify-center gap-1">
                                    <button
                                      onClick={() => handleEditProduct(product)}
                                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
                                      title="Editar"
                                      data-testid={`edit-product-${product.id}`}
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                      </svg>
                                    </button>
                                    <button
                                      onClick={() => handleViewProduct(product)}
                                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
                                      title="Ver estadísticas"
                                      data-testid={`view-product-${product.id}`}
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                      </svg>
                                    </button>
                                    <button
                                      onClick={() => {
                                        const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
                                        navigator.clipboard.writeText(`${baseUrl}/checkout/${product.id}`);
                                        alert('✅ Link copiado');
                                      }}
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition"
                                      data-testid={`copy-url-${product.id}`}
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                      </svg>
                                      Copiar
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                  
                  {/* Quick Actions for each product - shown on hover or always visible */}
                  {(products as any[]).length > 0 && (
                    <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-500">
                          {(products as any[]).length} producto{(products as any[]).length !== 1 ? 's' : ''} en total
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400">Acciones rápidas:</span>
                          {(products as any[]).slice(0, 3).map((product: any) => (
                            <div key={product.id} className="flex items-center gap-1">
                              <button
                                onClick={() => handleEditProduct(product)}
                                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-white rounded transition"
                                title={`Editar ${product.title}`}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleViewProduct(product)}
                                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-white rounded transition"
                                title={`Ver ${product.title}`}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Sección de Ventas - Only shown when 'ventas' tab is active */}
              {productsSubView === 'ventas' && (
                <>
                  {recentSales.length === 0 ? (
                    <div className="p-16 text-center">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                      </div>
                      <p className="text-gray-500 font-medium">Aún no tienes ventas</p>
                      <p className="text-sm text-gray-400 mt-1">Comparte tus productos para empezar a vender</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[800px]">
                        <thead>
                          <tr className="border-b border-gray-100">
                            <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">Nombre</th>
                            <th className="px-4 py-4 text-left text-sm font-medium text-gray-700">Fecha</th>
                            <th className="px-4 py-4 text-left text-sm font-medium text-gray-700">Usuario</th>
                            <th className="px-4 py-4 text-right text-sm font-medium text-gray-700">Precio</th>
                            <th className="px-4 py-4 text-right text-sm font-medium text-gray-700">Bruto</th>
                            <th className="px-4 py-4 text-right text-sm font-medium text-gray-700">Neto</th>
                            <th className="px-6 py-4 text-right text-sm font-medium text-gray-700">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {recentSales.map((sale: any) => {
                            const product = (products as any[]).find((p: any) => p.id === sale.productId);
                            const grossCents = sale.amountCents || 0;
                            const netCents = Math.round(grossCents * 0.9);
                            
                            const getPaymentLogo = (provider: string) => {
                              switch (provider) {
                                case 'stripe':
                                  return (
                                    <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                                      <span className="text-white text-[10px] font-bold">Stripe</span>
                                    </div>
                                  );
                                case 'redsys':
                                  return (
                                    <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center">
                                      <span className="text-white text-[10px] font-bold">Redsys</span>
                                    </div>
                                  );
                                default:
                                  return (
                                    <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center">
                                      <span className="text-white font-bold text-lg">A</span>
                                    </div>
                                  );
                              }
                            };
                            
                            return (
                              <tr key={sale.id} className="hover:bg-gray-50/50 transition">
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-3">
                                    {getPaymentLogo(sale.paymentProvider)}
                                    <div>
                                      <p className="text-sm font-medium text-gray-900">{product?.title || 'Producto'}</p>
                                      <p className="text-xs text-gray-400">ID{sale.id?.slice(-5) || '00000'}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-4">
                                  <p className="text-sm text-gray-700">
                                    {new Date(sale.paidAt || sale.createdAt).toLocaleDateString('es-ES', {
                                      day: 'numeric',
                                      month: 'long'
                                    })}
                                  </p>
                                </td>
                                <td className="px-4 py-4">
                                  <p className="text-sm text-blue-600">{sale.email || sale.telegramUsername || '-'}</p>
                                </td>
                                <td className="px-4 py-4 text-right">
                                  <p className="text-sm text-gray-700">{formatPrice(grossCents)}</p>
                                </td>
                                <td className="px-4 py-4 text-right">
                                  <p className="text-sm text-gray-700">{formatPrice(grossCents)}</p>
                                </td>
                                <td className="px-4 py-4 text-right">
                                  <p className="text-sm text-gray-700">{formatPrice(netCents)}</p>
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <p className="text-sm font-medium text-gray-900">{formatPrice(netCents)}</p>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {activeView === 'referrals' && (
          <AffiliateSection 
            userName={user?.name || user?.email?.split('@')[0] || 'Usuario'} 
            userHandle={user?.email ? `@${user.email.split('@')[0]}` : '@usuario'}
            userAvatar={user?.avatarUrl}
          />
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
                  <nav className="flex flex-wrap">
                    <button
                      onClick={() => setPayoutsSubView('retiros')}
                      className={`px-6 py-4 text-sm font-medium border-b-2 transition ${
                        payoutsSubView === 'retiros'
                          ? 'border-green-500 text-green-600 bg-green-50/50'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      💰 Solicitar Retiro
                    </button>
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

              {/* Sub-vista: Solicitar Retiro */}
              {payoutsSubView === 'retiros' && (
                <div className="space-y-6">
                  {/* Header */}
                  <div className="mb-2">
                    <h2 className="text-2xl font-bold text-gray-900">💸 Solicitar Retiro</h2>
                    <p className="text-gray-600 mt-1">Solicita el pago de tus ganancias acumuladas</p>
                  </div>

                  {/* Stats Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white rounded-lg shadow p-5 border-l-4 border-green-500">
                      <div className="text-sm text-gray-500 mb-1">💰 Saldo Disponible</div>
                      <div className="text-2xl font-bold text-green-600">{formatPrice(withdrawalBalance?.availableBalanceCents || 0)}</div>
                    </div>
                    <div className="bg-white rounded-lg shadow p-5">
                      <div className="text-sm text-gray-500 mb-1">📈 Total Ganado</div>
                      <div className="text-2xl font-bold text-gray-900">{formatPrice(withdrawalBalance?.totalEarnedCents || 0)}</div>
                    </div>
                    <div className="bg-white rounded-lg shadow p-5">
                      <div className="text-sm text-gray-500 mb-1">✅ Ya Retirado</div>
                      <div className="text-2xl font-bold text-blue-600">{formatPrice(withdrawalBalance?.totalWithdrawnCents || 0)}</div>
                    </div>
                    <div className="bg-white rounded-lg shadow p-5">
                      <div className="text-sm text-gray-500 mb-1">⏳ Pendiente</div>
                      <div className="text-2xl font-bold text-yellow-600">{formatPrice(withdrawalBalance?.pendingWithdrawalCents || 0)}</div>
                    </div>
                  </div>

                  {/* Action Card - Request Withdrawal */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">¿Listo para retirar tus ganancias?</h3>
                        <p className="text-gray-600 text-sm">
                          Puedes solicitar el retiro de tu saldo disponible. El monto mínimo es de €5.00.
                          <br />
                          <span className="text-gray-500">Ventas totales: {withdrawalBalance?.orderCount || 0} | Retiros procesados: {withdrawalBalance?.withdrawalCount || 0}</span>
                        </p>
                      </div>
                      <button
                        onClick={() => setShowWithdrawalModal(true)}
                        disabled={(withdrawalBalance?.availableBalanceCents || 0) < 500}
                        className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        💰 Solicitar Retiro
                      </button>
                    </div>
                    {(withdrawalBalance?.availableBalanceCents || 0) < 500 && (
                      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-sm text-yellow-700">
                          ⚠️ Necesitas al menos €5.00 de saldo disponible para solicitar un retiro.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Withdrawal History */}
                  <div className="bg-white rounded-lg shadow">
                    <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900">📋 Historial de Solicitudes</h3>
                      <button
                        onClick={loadWithdrawals}
                        className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                      >
                        🔄 Actualizar
                      </button>
                    </div>
                    
                    {withdrawalsLoading ? (
                      <div className="p-12 text-center">
                        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                        <p className="text-gray-500 mt-4">Cargando solicitudes...</p>
                      </div>
                    ) : withdrawals.length === 0 ? (
                      <div className="p-12 text-center">
                        <div className="text-5xl mb-4">📭</div>
                        <p className="text-gray-500 font-medium">No hay solicitudes de retiro</p>
                        <p className="text-sm text-gray-400 mt-1">Cuando solicites un retiro, aparecerá aquí</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-100">
                        {withdrawals.map((w: any) => (
                          <div key={w.id} className="p-6 hover:bg-gray-50 transition">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                {/* Header */}
                                <div className="flex items-center gap-3 mb-3">
                                  <span className="font-mono font-medium text-gray-900">{w.invoiceNumber}</span>
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
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                  <div>
                                    <span className="text-gray-400 block text-xs">Fecha Solicitud</span>
                                    <p className="font-medium text-gray-700">
                                      {w.requestedAt ? new Date(w.requestedAt).toLocaleDateString('es-ES', {
                                        day: '2-digit',
                                        month: 'short',
                                        year: 'numeric'
                                      }) : '-'}
                                    </p>
                                  </div>
                                  <div>
                                    <span className="text-gray-400 block text-xs">Importe</span>
                                    <p className="font-bold text-green-600 text-lg">{formatPrice(w.amountCents)}</p>
                                  </div>
                                  <div>
                                    <span className="text-gray-400 block text-xs">Método</span>
                                    <p className="font-medium text-gray-700">
                                      {w.bankAccountType === 'IBAN' ? '🏦 Banco' : w.bankAccountType === 'PAYPAL' ? '💳 PayPal' : '₿ Crypto'}
                                    </p>
                                  </div>
                                  {w.status === 'PAID' && w.paidAt && (
                                    <div>
                                      <span className="text-gray-400 block text-xs">Fecha de Pago</span>
                                      <p className="font-medium text-green-600">
                                        {new Date(w.paidAt).toLocaleDateString('es-ES')}
                                      </p>
                                    </div>
                                  )}
                                </div>

                                {/* Rejection reason */}
                                {w.status === 'REJECTED' && w.rejectionReason && (
                                  <div className="mt-3 p-3 bg-red-50 rounded-lg">
                                    <span className="text-red-600 text-sm font-medium">Motivo: </span>
                                    <span className="text-red-700 text-sm">{w.rejectionReason}</span>
                                  </div>
                                )}

                                {/* Payment reference */}
                                {w.status === 'PAID' && w.paymentReference && (
                                  <div className="mt-3 p-3 bg-green-50 rounded-lg">
                                    <span className="text-green-600 text-sm font-medium">Ref. de pago: </span>
                                    <span className="text-green-700 text-sm font-mono">{w.paymentReference}</span>
                                  </div>
                                )}
                              </div>

                              {/* Actions */}
                              <div className="ml-4">
                                {w.invoicePdfUrl && (
                                  <a
                                    href={w.invoicePdfUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition inline-flex items-center gap-2"
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
              {/* Foto de Perfil */}
              <div className="bg-white rounded-lg shadow p-6 lg:col-span-2">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Foto de Perfil</h2>
                <div className="flex items-center gap-6">
                  <div className="relative">
                    {user?.tipsterProfile?.avatarUrl ? (
                      <img 
                        src={user.tipsterProfile.avatarUrl} 
                        alt="Avatar" 
                        className="w-24 h-24 rounded-full object-cover border-4 border-blue-100"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center border-4 border-blue-100">
                        <span className="text-3xl font-bold text-white">
                          {user?.tipsterProfile?.publicName?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || '?'}
                        </span>
                      </div>
                    )}
                    {uploadingAvatar && (
                      <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    )}
                  </div>
                  <div>
                    <input
                      type="file"
                      ref={avatarInputRef}
                      onChange={handleAvatarUpload}
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      className="hidden"
                    />
                    <button
                      onClick={() => avatarInputRef.current?.click()}
                      disabled={uploadingAvatar}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                    >
                      {uploadingAvatar ? 'Subiendo...' : 'Cambiar foto'}
                    </button>
                    <p className="text-xs text-gray-500 mt-2">JPG, PNG, GIF o WEBP. Máximo 2MB.</p>
                  </div>
                </div>
              </div>

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

      {/* Modal: Solicitar Retiro */}
      {showWithdrawalModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowWithdrawalModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-6 text-white">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center">
                  <span className="text-3xl">💰</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold">Solicitar Retiro</h3>
                  <p className="text-green-100 text-sm">
                    Disponible: {formatPrice(withdrawalBalance?.availableBalanceCents || 0)}
                  </p>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              {/* Verificar KYC */}
              {!kycStatus.kycCompleted && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-xl">⚠️</span>
                    <div>
                      <p className="text-sm text-orange-800 font-medium">Datos bancarios pendientes</p>
                      <p className="text-sm text-orange-600 mt-1">
                        Debes completar tus datos de cobro antes de solicitar un retiro.
                      </p>
                      <button
                        onClick={() => {
                          setShowWithdrawalModal(false);
                          setActiveView('kyc');
                        }}
                        className="mt-2 text-sm text-orange-700 font-medium hover:underline"
                      >
                        Ir a Datos de Cobro →
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Monto */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Monto a retirar (€)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">€</span>
                  <input
                    type="number"
                    value={withdrawalAmount}
                    onChange={(e) => setWithdrawalAmount(e.target.value)}
                    placeholder="0.00"
                    min="5"
                    max={(withdrawalBalance?.availableBalanceCents || 0) / 100}
                    step="0.01"
                    className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-lg"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Mínimo: €5.00</p>
              </div>

              {/* Quick amounts */}
              <div className="flex gap-2">
                {[25, 50, 100].map((amount) => (
                  <button
                    key={amount}
                    onClick={() => {
                      const maxAvailable = (withdrawalBalance?.availableBalanceCents || 0) / 100;
                      setWithdrawalAmount(Math.min(amount, maxAvailable).toString());
                    }}
                    disabled={(withdrawalBalance?.availableBalanceCents || 0) < amount * 100}
                    className="flex-1 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    €{amount}
                  </button>
                ))}
                <button
                  onClick={() => setWithdrawalAmount(((withdrawalBalance?.availableBalanceCents || 0) / 100).toFixed(2))}
                  disabled={(withdrawalBalance?.availableBalanceCents || 0) < 500}
                  className="flex-1 py-2 bg-green-50 border border-green-200 rounded-lg text-sm font-medium text-green-700 hover:bg-green-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Todo
                </button>
              </div>

              {/* Notas */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notas (opcional)
                </label>
                <textarea
                  value={withdrawalNotes}
                  onChange={(e) => setWithdrawalNotes(e.target.value)}
                  placeholder="Añade cualquier información relevante..."
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none"
                />
              </div>

              {/* Info */}
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <div className="flex items-start gap-3">
                  <span className="text-lg">ℹ️</span>
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">Al solicitar el retiro:</p>
                    <ul className="list-disc list-inside space-y-1 text-blue-700">
                      <li>Se generará una factura automáticamente</li>
                      <li>El equipo de Antia revisará tu solicitud</li>
                      <li>Recibirás el pago en tu cuenta bancaria registrada</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowWithdrawalModal(false);
                  setWithdrawalAmount('');
                  setWithdrawalNotes('');
                }}
                className="px-5 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-100 text-gray-700 font-medium transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateWithdrawal}
                disabled={creatingWithdrawal || !withdrawalAmount || parseFloat(withdrawalAmount) < 5 || !kycStatus.kycCompleted}
                className="px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creatingWithdrawal ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Procesando...
                  </>
                ) : (
                  <>
                    <span>💸</span> Solicitar Retiro
                  </>
                )}
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

      {/* Modal: Formulario de Producto - Estilo AntiaPay */}
      {showProductForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={closeModals}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="p-6 pb-4">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-xl font-bold text-gray-900">
                  {selectedProduct ? 'Editar Producto' : 'Crear nuevo producto'}
                </h2>
                <button onClick={closeModals} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-sm text-gray-500">Completa los datos de tu producto</p>
            </div>
            
            <div className="px-6 pb-6">
              {formError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-sm text-red-600">{formError}</p>
                </div>
              )}

              <div className="space-y-4">
                {/* Título */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Título del Producto <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="text" 
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Ej: Pronósticos Premium Mensuales"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition text-sm"
                  />
                </div>
                
                {/* Descripción */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Descripción</label>
                  <textarea 
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe tu producto..."
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition text-sm resize-none"
                  />
                </div>

                {/* Precio y Tipo de Facturación */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Precio (€) <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="number" 
                      step="0.01"
                      min="0"
                      value={formData.priceCents}
                      onChange={(e) => setFormData({ ...formData, priceCents: e.target.value })}
                      placeholder="29.99"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition text-sm"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Pago</label>
                    <select 
                      value={formData.billingType}
                      onChange={(e) => setFormData({ ...formData, billingType: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition text-sm appearance-none cursor-pointer"
                    >
                      <option value="ONE_TIME">Pago único</option>
                      <option value="SUBSCRIPTION">Suscripción</option>
                    </select>
                  </div>
                </div>

                {/* Frecuencia de Suscripción */}
                {formData.billingType === 'SUBSCRIPTION' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Frecuencia de Cobro</label>
                    <select 
                      value={formData.subscriptionInterval}
                      onChange={(e) => setFormData({ ...formData, subscriptionInterval: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition text-sm appearance-none cursor-pointer"
                    >
                      <option value="MONTHLY">Mensual</option>
                      <option value="QUARTERLY">Trimestral (cada 3 meses)</option>
                      <option value="ANNUAL">Anual</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1.5">
                      Si el cliente no renueva, perderá acceso automáticamente al canal
                    </p>
                  </div>
                )}

                {/* Canal de Telegram */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Canal de Telegram
                  </label>
                  {telegramChannels.length === 0 ? (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                      <p className="text-sm text-amber-800 mb-2">
                        ⚠️ No tienes canales conectados
                      </p>
                      <p className="text-xs text-amber-700 mb-3">
                        Añade el bot <strong>@Antiabetbot</strong> como administrador en tu canal.
                      </p>
                      <a
                        href="https://t.me/Antiabetbot"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline font-medium"
                      >
                        Abrir @Antiabetbot →
                      </a>
                    </div>
                  ) : (
                    <select 
                      value={formData.telegramChannelId}
                      onChange={(e) => setFormData({ ...formData, telegramChannelId: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition text-sm appearance-none cursor-pointer"
                    >
                      <option value="">Sin canal (solo confirmación de pago)</option>
                      {telegramChannels.map((channel) => (
                        <option key={channel.id} value={channel.channelId}>
                          {channel.channelType === 'public' ? '🌐' : '🔒'} {channel.channelTitle}
                          {channel.channelName && ` (@${channel.channelName})`}
                        </option>
                      ))}
                    </select>
                  )}
                  <p className="text-xs text-gray-500 mt-1.5">
                    {formData.telegramChannelId 
                      ? 'Los clientes recibirán acceso después de pagar' 
                      : 'Sin canal: Solo recibirán confirmación de pago'}
                  </p>
                </div>

                {/* Producto activo */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, active: !formData.active })}
                    className={`relative w-11 h-6 rounded-full transition-colors ${formData.active ? 'bg-blue-500' : 'bg-gray-300'}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${formData.active ? 'translate-x-5' : ''}`} />
                  </button>
                  <label className="text-sm text-gray-700">
                    Producto activo
                  </label>
                </div>
              </div>

              {/* Botones */}
              <div className="mt-6 flex gap-3">
                <button 
                  onClick={closeModals}
                  disabled={saving}
                  className="flex-1 px-4 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition text-sm font-medium text-gray-700 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSaveProduct}
                  disabled={saving}
                  className="flex-1 px-4 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
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

      {/* Modal: Producto Creado Exitosamente */}
      {showProductSuccess && createdProduct && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={closeModals}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="p-8 text-center">
              {/* Success Icon */}
              <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-5">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              
              <h2 className="text-xl font-bold text-gray-900 mb-2">¡Producto creado exitosamente!</h2>
              <p className="text-gray-500 text-sm mb-6">Ya puedes compartir tu producto</p>
              
              {/* Action Buttons */}
              <div className="flex gap-3 mb-4">
                <button
                  onClick={() => {
                    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
                    navigator.clipboard.writeText(`${baseUrl}/checkout/${createdProduct.id}`);
                    alert('✅ Link copiado');
                  }}
                  className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl transition text-sm font-medium text-gray-700 flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copiar
                </button>
                <button
                  onClick={() => {
                    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
                    const checkoutUrl = `${baseUrl}/checkout/${createdProduct.id}`;
                    const text = `🔥 ${createdProduct.title}\n\n💰 Precio: €${(createdProduct.priceCents / 100).toFixed(2)}\n\n👉 Comprar: ${checkoutUrl}`;
                    navigator.clipboard.writeText(text);
                    alert('✅ Texto promocional copiado');
                  }}
                  className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl transition text-sm font-medium text-gray-700 flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  Compartir
                </button>
              </div>
              
              {/* Create New Product */}
              <button
                onClick={() => {
                  setShowProductSuccess(false);
                  setCreatedProduct(null);
                  setFormData({
                    title: '',
                    description: '',
                    priceCents: '',
                    billingType: 'ONE_TIME',
                    subscriptionInterval: 'MONTHLY',
                    telegramChannelId: '',
                    active: true,
                  });
                  setShowProductForm(true);
                }}
                className="w-full px-4 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition text-sm font-medium mb-3"
              >
                Crear nuevo producto
              </button>
              
              {/* Close Link */}
              <button
                onClick={closeModals}
                className="text-sm text-gray-500 hover:text-gray-700 transition"
              >
                Cerrar
              </button>
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

                {selectedProduct.telegramChannelId ? (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Canal de Telegram</h3>
                    <p className="text-gray-900 flex items-center gap-2">
                      📱 {getChannelNameForProduct(selectedProduct.telegramChannelId)}
                      <span className="text-xs text-gray-500">({selectedProduct.telegramChannelId})</span>
                    </p>
                  </div>
                ) : (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Canal de Telegram</h3>
                    <div className="flex items-center gap-2">
                      <span className="inline-block px-3 py-1 bg-orange-100 text-orange-700 rounded text-sm font-medium">
                        SIN CANAL
                      </span>
                      <span className="text-gray-500 text-sm">Solo pago, sin acceso a canal</span>
                    </div>
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
    </DashboardLayout>
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
