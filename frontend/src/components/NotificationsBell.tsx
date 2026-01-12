'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { api } from '@/lib/api';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  metadata?: Record<string, any>;
}

// Get category label based on notification type
const getNotificationCategory = (type: string) => {
  switch (type) {
    case 'SALE':
      return 'Pagos e informes · Ventas';
    case 'SUBSCRIPTION_NEW':
      return 'Suscripciones · Nueva';
    case 'SUBSCRIPTION_CANCELLED':
      return 'Suscripciones · Cancelada';
    case 'SUBSCRIPTION_EXPIRED':
      return 'Suscripciones · Expirada';
    case 'SETTLEMENT':
      return 'Pagos e informes · Liquidación';
    case 'PAYOUT':
      return 'Pagos e informes · Pagos';
    default:
      return 'General';
  }
};

const formatTimeAgo = (date: string) => {
  const now = new Date();
  const then = new Date(date);
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);

  if (seconds < 60) return 'ahora';
  if (seconds < 3600) return `hace ${Math.floor(seconds / 60)} min`;
  if (seconds < 86400) return `hace ${Math.floor(seconds / 3600)} horas`;
  if (seconds < 604800) return `hace ${Math.floor(seconds / 86400)} días`;
  return then.toLocaleDateString('es-ES');
};

export function NotificationsBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'principales' | 'notificaciones'>('notificaciones');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchNotifications = async () => {
    try {
      const [notifResponse, countResponse] = await Promise.all([
        api.get('/notifications?limit=20'),
        api.get('/notifications/unread-count'),
      ]);
      setNotifications(notifResponse.data.notifications || []);
      setUnreadCount(countResponse.data.count || 0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await api.post(`/notifications/${id}/read`);
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      setIsLoading(true);
      await api.post('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    
    // Poll every 30 seconds
    intervalRef.current = setInterval(fetchNotifications, 30000);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Filter notifications based on active tab
  const filteredNotifications = activeTab === 'principales' 
    ? notifications.filter(n => !n.is_read).slice(0, 5)
    : notifications;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label="Notificaciones"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-xs font-medium text-white flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        {/* Header with Tabs */}
        <div className="border-b border-gray-200">
          <div className="flex items-center justify-between px-4 pt-3">
            <div className="flex gap-6">
              <button
                onClick={() => setActiveTab('principales')}
                className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'principales'
                    ? 'text-slate-900 border-slate-900'
                    : 'text-gray-500 border-transparent hover:text-gray-700'
                }`}
              >
                Principales
              </button>
              <button
                onClick={() => setActiveTab('notificaciones')}
                className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'notificaciones'
                    ? 'text-slate-900 border-slate-900'
                    : 'text-gray-500 border-transparent hover:text-gray-700'
                }`}
              >
                Notificaciones
              </button>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                disabled={isLoading}
                className="pb-3 text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Ver todo
              </button>
            )}
          </div>
        </div>
        
        {/* Notifications List */}
        <ScrollArea className="h-[350px]">
          {filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[250px] text-gray-500">
              <Bell className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm font-medium">No hay notificaciones</p>
              <p className="text-xs text-gray-400 mt-1">
                {activeTab === 'principales' ? 'No tienes notificaciones importantes' : 'Cuando tengas actividad aparecerá aquí'}
              </p>
            </div>
          ) : (
            <div>
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`px-4 py-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
                    !notification.is_read ? 'bg-blue-50/50' : ''
                  }`}
                  onClick={() => !notification.is_read && markAsRead(notification.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      {/* Category and Time */}
                      <p className="text-xs text-gray-500 mb-1">
                        {getNotificationCategory(notification.type)} · {formatTimeAgo(notification.created_at)}
                      </p>
                      
                      {/* Title */}
                      <p className={`text-sm ${!notification.is_read ? 'font-semibold' : 'font-medium'} text-gray-900 mb-0.5`}>
                        {notification.title}
                      </p>
                      
                      {/* Message - truncated */}
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {notification.message}
                      </p>
                    </div>
                    
                    {/* Bell icon on the right */}
                    <div className="flex-shrink-0 mt-1">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        !notification.is_read ? 'bg-blue-100' : 'bg-gray-100'
                      }`}>
                        <Bell className={`h-4 w-4 ${!notification.is_read ? 'text-blue-600' : 'text-gray-400'}`} />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        
        {/* Footer */}
        {notifications.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
            <button
              onClick={markAllAsRead}
              disabled={isLoading || unreadCount === 0}
              className="w-full text-center text-sm text-gray-600 hover:text-gray-900 font-medium disabled:opacity-50"
            >
              <CheckCheck className="h-4 w-4 inline mr-1.5" />
              Marcar todas como leídas
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
