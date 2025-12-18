import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001/api';

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
  publishProduct: (productId: string) => api.post(`/products/${productId}/publish-telegram`),
  setPremiumChannel: (premiumChannelLink: string | null) => api.post('/telegram/premium-channel', { premiumChannelLink }),
  
  // Canales múltiples
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
