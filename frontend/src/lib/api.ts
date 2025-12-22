import axios from 'axios';

// Use relative URL for same-origin requests, fallback to env variable for development
const getApiUrl = () => {
  if (typeof window !== 'undefined') {
    // Client-side: use relative URL to go through the same origin
    return '/api';
  }
  // Server-side: use the full URL
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001/api';
};

const API_URL = getApiUrl();

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar el token a las peticiones
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor para manejar errores de autenticación
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Solo redirigir y limpiar token si NO estamos en páginas públicas
      const publicPaths = ['/login', '/register', '/'];
      const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
      
      if (!publicPaths.includes(currentPath)) {
        // Token inválido o expirado en páginas protegidas
        localStorage.removeItem('access_token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth
export const authApi = {
  registerTipster: (data: any) => api.post('/auth/tipster/register', data),
  registerClient: (data: any) => api.post('/auth/client/register', data),
  login: (data: any) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  sendOtp: (email: string) => api.post('/auth/otp/send', { email }),
  verifyOtp: (code: string) => api.post('/auth/otp/verify', { code }),
};

// Users
export const usersApi = {
  getMe: () => api.get('/users/me'),
  updateMe: (data: any) => api.patch('/users/me', data),
};

// Tipster (KYC / Profile)
export const tipsterApi = {
  getProfile: () => api.get('/tipster/profile'),
  getKycStatus: () => api.get('/tipster/kyc-status'),
  updateKyc: (data: any) => api.put('/tipster/kyc', data),
};

// Products
export const productsApi = {
  create: (data: any) => api.post('/products', data),
  getMy: () => api.get('/products/my'),
  getOne: (id: string) => api.get(`/products/${id}`),
  update: (id: string, data: any) => api.patch(`/products/${id}`, data),
  publish: (id: string) => api.post(`/products/${id}/publish`),
  pause: (id: string) => api.post(`/products/${id}/pause`),
  getCheckoutLink: (id: string) => api.get(`/products/${id}/checkout-link`),
};

// Referrals
export const referralsApi = {
  getLinks: () => api.get('/referrals/links'),
  getMetrics: (range?: string) => api.get('/referrals/metrics', { params: { range } }),
  getCommissions: () => api.get('/referrals/commissions'),
};

// Payouts
export const payoutsApi = {
  getMy: () => api.get('/payouts/my'),
};

// Houses
export const housesApi = {
  getAll: () => api.get('/houses'),
};

export const telegramApi = {
  getChannelInfo: () => api.get('/telegram/channel-info'),
  connect: (channelIdentifier: string) => api.post('/telegram/connect', { channelIdentifier }),
  disconnect: () => api.delete('/telegram/disconnect'),
  publishProduct: (productId: string, channelId?: string) => 
    api.post(`/products/${productId}/publish-telegram`, channelId ? { channelId } : {}),
  setPremiumChannel: (premiumChannelLink: string | null) => api.post('/telegram/premium-channel', { premiumChannelLink }),
  
  // Canal de publicación (para compartir productos)
  publicationChannel: {
    get: () => api.get('/telegram/publication-channel'),
    set: (channelId: string, channelTitle?: string) => 
      api.post('/telegram/publication-channel', { channelId, channelTitle }),
    remove: () => api.delete('/telegram/publication-channel'),
    startLinking: () => api.post('/telegram/publication-channel/start-linking'),
    cancelLinking: () => api.post('/telegram/publication-channel/cancel-linking'),
  },
  
  // Canales múltiples (premium para clientes)
  channels: {
    getAll: () => api.get('/telegram/channels'),
    getOne: (id: string) => api.get(`/telegram/channels/${id}`),
    create: (data: {
      channelId: string;
      channelName?: string;
      channelTitle: string;
      channelType: 'public' | 'private';
      inviteLink?: string;
    }) => api.post('/telegram/channels', data),
    verify: (channelId: string) => api.post('/telegram/channels/verify', { channelId }),
    update: (id: string, data: { channelTitle?: string; inviteLink?: string; isActive?: boolean }) => 
      api.patch(`/telegram/channels/${id}`, data),
    delete: (id: string) => api.delete(`/telegram/channels/${id}`),
    refresh: (id: string) => api.post(`/telegram/channels/${id}/refresh`),
    generateInviteLink: (id: string) => api.post(`/telegram/channels/${id}/invite-link`),
  },
};

// Checkout
export const checkoutApi = {
  getProduct: (productId: string) => api.get(`/checkout/product/${productId}`),
  createSession: (data: {
    productId: string;
    originUrl: string;
    isGuest: boolean;
    email?: string;
    phone?: string;
    telegramUserId?: string;
    telegramUsername?: string;
  }) => api.post('/checkout/session', data),
  getStatus: (sessionId: string) => api.get(`/checkout/status/${sessionId}`),
  verify: (sessionId: string, orderId: string) => 
    api.get('/checkout/verify', { params: { session_id: sessionId, order_id: orderId } }),
};

// Orders / Sales (Tipster)
export const ordersApi = {
  getMy: () => api.get('/orders/my'), // For clients
  getMySales: () => api.get('/orders/sales'), // For tipsters
  getMyStats: () => api.get('/orders/stats'), // For tipsters
};

// Settlements / Liquidaciones (Tipster)
export const settlementsApi = {
  getAll: () => api.get('/settlements'),
  getPending: () => api.get('/settlements/pending'),
  getHistory: () => api.get('/settlements/history'),
  getTotalPaid: () => api.get('/settlements/total-paid'),
};

// User Modules (Tipster)
export const userModulesApi = {
  getMyModules: () => api.get('/users/me/modules'),
};

// Client API (for end users)
export const clientApi = {
  // Profile
  getProfile: () => api.get('/client/profile'),
  updateProfile: (data: { countryIso?: string; telegramUserId?: string; locale?: string; timezone?: string }) =>
    api.put('/client/profile', data),
  
  // Purchases
  getPurchases: () => api.get('/client/purchases'),
  getPurchaseDetails: (id: string) => api.get(`/client/purchases/${id}`),
  
  // Payments/Invoices
  getPaymentHistory: () => api.get('/client/payments'),
};

// Support API
export const supportApi = {
  // Client endpoints
  createTicket: (data: { category: string; subject: string; description: string; orderId?: string }) =>
    api.post('/support/tickets', data),
  getMyTickets: () => api.get('/support/tickets/my'),
  getTicketDetails: (id: string) => api.get(`/support/tickets/my/${id}`),
  
  // Admin endpoints
  admin: {
    getAllTickets: (status?: string) => api.get('/support/admin/tickets', { params: { status } }),
    updateTicket: (id: string, data: { status?: string; priority?: string; adminNotes?: string }) =>
      api.put(`/support/admin/tickets/${id}`, data),
  },
};

// Admin API
export const adminApi = {
  // Tipsters management
  tipsters: {
    getAll: () => api.get('/admin/tipsters'),
    getOne: (id: string) => api.get(`/admin/tipsters/${id}`),
    updateModules: (id: string, modules: { moduleForecasts?: boolean; moduleAffiliate?: boolean }) =>
      api.patch(`/admin/tipsters/${id}/modules`, modules),
  },
  
  // Tipster Applications (solicitudes de registro)
  applications: {
    getAll: (status?: string) => api.get('/admin/applications', { params: { status } }),
    getStats: () => api.get('/admin/applications/stats'),
    getOne: (id: string) => api.get(`/admin/applications/${id}`),
    review: (id: string, data: { action: 'APPROVE' | 'REJECT'; rejectionReason?: string }) =>
      api.post(`/admin/applications/${id}/review`, data),
  },
  
  // Commissions management
  commissions: {
    getAll: () => api.get('/admin/commissions'),
    getOne: (tipsterId: string) => api.get(`/admin/commissions/${tipsterId}`),
    getHistory: (tipsterId: string) => api.get(`/admin/commissions/${tipsterId}/history`),
    update: (tipsterId: string, data: {
      customFeePercent?: number;
      useCustomFee?: boolean;
      autoTierEnabled?: boolean;
      notes?: string;
    }) => api.patch(`/admin/commissions/${tipsterId}`, data),
  },
  
  // Reports
  reports: {
    getSummary: (currency?: string) => api.get('/admin/reports/summary', { params: { currency } }),
    getSales: (params: { startDate?: string; endDate?: string; tipsterId?: string; currency?: string }) =>
      api.get('/admin/reports/sales', { params }),
    getPlatform: (params: { startDate?: string; endDate?: string; currency?: string }) =>
      api.get('/admin/reports/platform', { params }),
    getSettlements: (params: { startDate?: string; endDate?: string; tipsterId?: string; status?: string; currency?: string }) =>
      api.get('/admin/reports/settlements', { params }),
    getTipsters: (params: { startDate?: string; endDate?: string; currency?: string }) =>
      api.get('/admin/reports/tipsters', { params }),
    exportCSV: (type: string, params: any) => api.get(`/admin/reports/export/${type}`, { 
      params,
      responseType: 'blob',
    }),
  },
};

// Currency API (public)
export const currencyApi = {
  getRates: () => api.get('/currency/rates'),
  getRate: (base: string, target: string) => api.get(`/currency/rate/${base}/${target}`),
  convert: (amount: number, from: string, to: string) => 
    api.get('/currency/convert', { params: { amount, from, to } }),
  
  // Admin functions
  admin: {
    setRate: (baseCurrency: string, targetCurrency: string, rate: number) =>
      api.post('/currency/admin/rate', { baseCurrency, targetCurrency, rate }),
    removeOverride: (base: string, target: string) =>
      api.delete(`/currency/admin/rate/${base}/${target}`),
    getHistory: (base: string, target: string, limit?: number) =>
      api.get(`/currency/admin/history/${base}/${target}`, { params: { limit } }),
  },
};

// Affiliate API (Tipster)
export const affiliateApi = {
  // Tipster endpoints
  getHousesWithLinks: (countryCode?: string) => 
    api.get('/affiliate/houses', { params: { countryCode } }),
  getHouseWithLink: (houseId: string) => api.get(`/affiliate/houses/${houseId}`),
  getMyLinks: () => api.get('/affiliate/my-links'),
  generateLink: (houseId: string) => api.post(`/affiliate/houses/${houseId}/link`),
  getCampaigns: () => api.get('/affiliate/campaigns'),
  getCampaign: (id: string) => api.get(`/affiliate/campaigns/${id}`),
  getMetrics: () => api.get('/affiliate/metrics'),
  getPayouts: () => api.get('/affiliate/payouts'),
  getPayoutDetails: (id: string) => api.get(`/affiliate/payouts/${id}`),

  // Admin endpoints
  admin: {
    // Houses
    getHouses: (includeInactive = false) => 
      api.get('/admin/affiliate/houses', { params: { includeInactive } }),
    getHouse: (id: string) => api.get(`/admin/affiliate/houses/${id}`),
    createHouse: (data: {
      name: string;
      slug: string;
      logoUrl?: string;
      masterAffiliateUrl: string;
      trackingParamName?: string;
      commissionPerReferralCents: number;
      allowedCountries?: string[];
      blockedCountries?: string[];
      description?: string;
      websiteUrl?: string;
    }) => api.post('/admin/affiliate/houses', data),
    updateHouse: (id: string, data: any) => api.patch(`/admin/affiliate/houses/${id}`, data),

    // Campaigns
    getCampaigns: (includeInactive = false) => 
      api.get('/admin/affiliate/campaigns', { params: { includeInactive } }),
    getCampaign: (id: string) => api.get(`/admin/affiliate/campaigns/${id}`),
    createCampaign: (data: {
      name: string;
      slug: string;
      description?: string;
      houseIds: string[];
      targetCountries?: string[];
    }) => api.post('/admin/affiliate/campaigns', data),
    updateCampaign: (id: string, data: any) => api.patch(`/admin/affiliate/campaigns/${id}`, data),

    // CSV Import
    importCsv: (formData: FormData) => api.post('/admin/affiliate/import-csv', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
    getImportBatches: (houseId?: string) => 
      api.get('/admin/affiliate/import-batches', { params: { houseId } }),

    // Conversions
    getConversions: (params?: { houseId?: string; tipsterId?: string; status?: string; periodMonth?: string }) =>
      api.get('/admin/affiliate/conversions', { params }),
    updateConversionStatus: (id: string, status: string, rejectionReason?: string) =>
      api.patch(`/admin/affiliate/conversions/${id}/status`, { status, rejectionReason }),

    // Payouts
    getPayouts: (params?: { tipsterId?: string; status?: string; periodMonth?: string }) =>
      api.get('/admin/affiliate/payouts', { params }),
    generatePayouts: (periodMonth: string) => 
      api.post('/admin/affiliate/payouts/generate', { periodMonth }),
    markPayoutPaid: (id: string, data: { paymentMethod: string; paymentReference?: string; notes?: string }) =>
      api.patch(`/admin/affiliate/payouts/${id}/pay`, data),
  },
};
