'use client';

import { useState, useEffect } from 'react';
import { adminApi } from '@/lib/api';

interface TipsterOption {
  id: string;
  publicName: string;
  telegramUsername?: string;
  channelCount: number;
}

interface MonitorableChannel {
  id: string;
  channelId: string;
  channelTitle: string;
  channelUsername?: string;
  channelType: string;
  addedByUsername?: string;
  detectedAt: string;
  tipsterId?: string;
  tipsterName?: string;
  isMonitoring: boolean;
  monitoringStartedAt?: string;
  messageCount: number;
}

interface ChannelMessage {
  id: string;
  messageId: number;
  senderName: string;
  senderUsername?: string;
  messageType: string;
  content: string;
  timestamp: string;
  isReply: boolean;
  isForward: boolean;
}

interface MessagesResponse {
  channelId: string;
  channelTitle: string;
  tipsterName?: string;
  isMonitoring: boolean;
  messages: ChannelMessage[];
  total: number;
  hasMore: boolean;
}

interface MonitoringStats {
  activeMonitoring: number;
  totalMessages: number;
  topChannels: { channelTitle: string; messageCount: number }[];
}

export default function ChannelMonitorPanel() {
  const [tipsters, setTipsters] = useState<TipsterOption[]>([]);
  const [channels, setChannels] = useState<MonitorableChannel[]>([]);
  const [selectedTipster, setSelectedTipster] = useState<string>('');
  const [selectedChannel, setSelectedChannel] = useState<MonitorableChannel | null>(null);
  const [messages, setMessages] = useState<MessagesResponse | null>(null);
  const [stats, setStats] = useState<MonitoringStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [togglingChannel, setTogglingChannel] = useState<string | null>(null);
  
  // Date filters
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    loadChannels();
  }, [selectedTipster]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [tipstersRes, statsRes, channelsRes] = await Promise.all([
        adminApi.channelMonitor.getTipsters(),
        adminApi.channelMonitor.getStats(),
        adminApi.channelMonitor.getChannels(),
      ]);
      setTipsters(tipstersRes.data);
      setStats(statsRes.data);
      setChannels(channelsRes.data);
    } catch (error) {
      console.error('Error loading initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadChannels = async () => {
    try {
      const res = await adminApi.channelMonitor.getChannels(selectedTipster || undefined);
      setChannels(res.data);
    } catch (error) {
      console.error('Error loading channels:', error);
    }
  };

  const handleToggleMonitoring = async (channel: MonitorableChannel) => {
    try {
      setTogglingChannel(channel.channelId);
      await adminApi.channelMonitor.toggleMonitoring(channel.channelId, !channel.isMonitoring);
      // Reload channels
      await loadChannels();
      // Reload stats
      const statsRes = await adminApi.channelMonitor.getStats();
      setStats(statsRes.data);
    } catch (error) {
      console.error('Error toggling monitoring:', error);
      alert('Error al cambiar el estado del monitoreo');
    } finally {
      setTogglingChannel(null);
    }
  };

  const handleViewMessages = async (channel: MonitorableChannel) => {
    setSelectedChannel(channel);
    await loadMessages(channel.channelId);
  };

  const loadMessages = async (channelId: string) => {
    try {
      setLoadingMessages(true);
      const res = await adminApi.channelMonitor.getMessages(channelId, {
        startDate: dateFrom,
        endDate: dateTo + 'T23:59:59',
        limit: 200,
      });
      setMessages(res.data);
    } catch (error) {
      console.error('Error loading messages:', error);
      setMessages(null);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleDateFilterChange = () => {
    if (selectedChannel) {
      loadMessages(selectedChannel.channelId);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getMessageTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      text: '💬',
      photo: '📷',
      video: '🎬',
      document: '📄',
      audio: '🎵',
      voice: '🎤',
      sticker: '😀',
      animation: '🎞️',
      video_note: '🎥',
      location: '📍',
      contact: '👤',
      poll: '📊',
    };
    return icons[type] || '📝';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">📡 Monitor de Canales</h1>
        <p className="text-gray-600 mt-1">Monitorea las conversaciones de los canales privados de los tipsters</p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-500 mb-2">📡 Canales Monitoreando</div>
            <div className="text-3xl font-bold text-blue-600">{stats.activeMonitoring}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-500 mb-2">💬 Mensajes Capturados</div>
            <div className="text-3xl font-bold text-green-600">{stats.totalMessages.toLocaleString()}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-500 mb-2">📊 Total Canales Disponibles</div>
            <div className="text-3xl font-bold text-gray-900">{channels.length}</div>
          </div>
        </div>
      )}

      {/* Messages View (when a channel is selected) */}
      {selectedChannel && (
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  💬 {selectedChannel.channelTitle}
                </h2>
                {selectedChannel.tipsterName && (
                  <p className="text-sm text-gray-500">Tipster: {selectedChannel.tipsterName}</p>
                )}
              </div>
              <button
                onClick={() => {
                  setSelectedChannel(null);
                  setMessages(null);
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                ← Volver
              </button>
            </div>

            {/* Date filters */}
            <div className="flex items-center gap-4 mt-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Desde</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="border border-gray-300 rounded px-3 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Hasta</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="border border-gray-300 rounded px-3 py-1.5 text-sm"
                />
              </div>
              <button
                onClick={handleDateFilterChange}
                className="mt-5 px-4 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
              >
                Buscar
              </button>
            </div>
          </div>

          {/* Messages list */}
          <div className="p-6 max-h-[600px] overflow-y-auto">
            {loadingMessages ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : messages && messages.messages.length > 0 ? (
              <div className="space-y-3">
                {messages.messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-3 rounded-lg ${
                      msg.isForward ? 'bg-yellow-50 border-l-4 border-yellow-400' : 'bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{getMessageTypeIcon(msg.messageType)}</span>
                        <span className="font-medium text-gray-900">
                          {msg.senderName}
                          {msg.senderUsername && (
                            <span className="text-gray-500 font-normal ml-1">@{msg.senderUsername}</span>
                          )}
                        </span>
                        {msg.isReply && (
                          <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded">Respuesta</span>
                        )}
                        {msg.isForward && (
                          <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">Reenviado</span>
                        )}
                      </div>
                      <span className="text-xs text-gray-400">{formatDate(msg.timestamp)}</span>
                    </div>
                    <div className="mt-1 text-gray-700 whitespace-pre-wrap">{msg.content}</div>
                  </div>
                ))}
                {messages.hasMore && (
                  <div className="text-center py-4">
                    <button
                      onClick={() => {/* TODO: Load more */}}
                      className="text-blue-600 hover:text-blue-700 text-sm"
                    >
                      Cargar más mensajes...
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-5xl mb-4">📭</div>
                <p className="text-gray-500">No hay mensajes en el período seleccionado</p>
                {!messages?.isMonitoring && (
                  <p className="text-yellow-600 text-sm mt-2">
                    ⚠️ El monitoreo no está activo. Actívalo para comenzar a capturar mensajes.
                  </p>
                )}
              </div>
            )}
          </div>

          {messages && (
            <div className="p-4 border-t bg-gray-50 text-sm text-gray-500">
              Total: {messages.total.toLocaleString()} mensajes en el período seleccionado
            </div>
          )}
        </div>
      )}

      {/* Channels List (when no channel is selected) */}
      {!selectedChannel && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <h2 className="text-xl font-semibold text-gray-900">📋 Canales Disponibles</h2>
              
              {/* Tipster filter */}
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-500">Filtrar por Tipster:</label>
                <select
                  value={selectedTipster}
                  onChange={(e) => setSelectedTipster(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm min-w-[200px]"
                >
                  <option value="">Todos los tipsters</option>
                  {tipsters.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.publicName} ({t.channelCount} canales)
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {channels.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-5xl mb-4">📡</div>
              <p className="text-gray-500">No hay canales detectados</p>
              <p className="text-sm text-gray-400 mt-2">
                Los canales aparecerán aquí cuando el bot sea añadido como administrador
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full" data-testid="channels-table">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Canal</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipster</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mensajes</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {channels.map((channel) => (
                    <tr key={channel.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{channel.channelTitle}</div>
                        {channel.channelUsername && (
                          <div className="text-sm text-gray-500">@{channel.channelUsername}</div>
                        )}
                        <div className="text-xs text-gray-400">ID: {channel.channelId}</div>
                      </td>
                      <td className="px-6 py-4">
                        {channel.tipsterName ? (
                          <span className="text-gray-900">{channel.tipsterName}</span>
                        ) : (
                          <span className="text-gray-400 italic">Sin asignar</span>
                        )}
                        {channel.addedByUsername && (
                          <div className="text-xs text-gray-400">Añadido por: @{channel.addedByUsername}</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          channel.channelType === 'channel' 
                            ? 'bg-purple-100 text-purple-700' 
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {channel.channelType === 'channel' ? '📢 Canal' : '👥 Grupo'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-gray-900 font-medium">{channel.messageCount.toLocaleString()}</span>
                      </td>
                      <td className="px-6 py-4">
                        {channel.isMonitoring ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            ✅ Monitoreando
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                            ⏸️ Inactivo
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleToggleMonitoring(channel)}
                            disabled={togglingChannel === channel.channelId}
                            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                              channel.isMonitoring
                                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                : 'bg-green-100 text-green-700 hover:bg-green-200'
                            } disabled:opacity-50`}
                            data-testid={`toggle-monitoring-${channel.channelId}`}
                          >
                            {togglingChannel === channel.channelId ? (
                              '...'
                            ) : channel.isMonitoring ? (
                              '⏹️ Detener'
                            ) : (
                              '▶️ Activar'
                            )}
                          </button>
                          {channel.messageCount > 0 && (
                            <button
                              onClick={() => handleViewMessages(channel)}
                              className="px-3 py-1.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
                              data-testid={`view-messages-${channel.channelId}`}
                            >
                              👁️ Ver
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Info box */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-2">ℹ️ Cómo funciona el monitoreo</h3>
        <ul className="text-sm text-blue-800 space-y-2">
          <li>• <strong>Activar monitoreo:</strong> Haz clic en "Activar" para comenzar a capturar mensajes del canal.</li>
          <li>• <strong>Solo texto:</strong> Se captura el texto de los mensajes. Para fotos/videos solo se registra que fueron enviados.</li>
          <li>• <strong>En tiempo real:</strong> Los mensajes se guardan a medida que llegan. No se pueden recuperar mensajes anteriores.</li>
          <li>• <strong>Privacidad:</strong> Esta información es confidencial y solo visible para administradores.</li>
        </ul>
      </div>
    </div>
  );
}
