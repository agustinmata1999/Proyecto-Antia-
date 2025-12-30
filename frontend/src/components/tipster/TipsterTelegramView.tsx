'use client';

import { useState } from 'react';
import { MessageCircle, Plus, Trash2, RefreshCw, Check, AlertCircle, Link2 } from 'lucide-react';

interface TelegramChannel {
  id: string;
  channelId: string;
  channelTitle: string;
  inviteLink?: string;
  isActive: boolean;
  memberCount?: number;
  connectedAt: string;
}

interface TipsterTelegramViewProps {
  channels: TelegramChannel[];
  botUsername: string;
  onConnectChannel: (channelName: string) => Promise<{ success: boolean; channel?: any; error?: string }>;
  onDisconnectChannel: (channelId: string) => Promise<void>;
  onRefreshLink: (channelId: string) => Promise<string>;
  loading: boolean;
}

export default function TipsterTelegramView({
  channels,
  botUsername,
  onConnectChannel,
  onDisconnectChannel,
  onRefreshLink,
  loading,
}: TipsterTelegramViewProps) {
  const [showConnectForm, setShowConnectForm] = useState(false);
  const [channelInput, setChannelInput] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState('');
  const [refreshingChannel, setRefreshingChannel] = useState<string | null>(null);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!channelInput.trim()) return;

    setConnecting(true);
    setError('');

    try {
      const result = await onConnectChannel(channelInput.trim());
      if (result.success) {
        setChannelInput('');
        setShowConnectForm(false);
      } else {
        setError(result.error || 'Error al conectar el canal');
      }
    } catch (err: any) {
      setError(err.message || 'Error al conectar el canal');
    } finally {
      setConnecting(false);
    }
  };

  const handleRefreshLink = async (channelId: string) => {
    setRefreshingChannel(channelId);
    try {
      await onRefreshLink(channelId);
    } finally {
      setRefreshingChannel(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Canal Premium</h1>
          <p className="text-gray-500 mt-1">Conecta tu canal privado de Telegram para dar acceso a tus clientes</p>
        </div>
        {channels.length > 0 && (
          <button
            onClick={() => setShowConnectForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={20} />
            Conectar otro canal
          </button>
        )}
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="font-semibold text-blue-900 mb-3">📖 Cómo conectar tu canal premium</h3>
        <ol className="space-y-2 text-sm text-blue-800">
          <li className="flex items-start gap-2">
            <span className="font-bold">1.</span>
            <span>Crea un canal <strong>privado</strong> en Telegram (o usa uno existente)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold">2.</span>
            <span>Agrega al bot <strong>@{botUsername}</strong> como <strong>administrador</strong> del canal</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold">3.</span>
            <span>Escribe el <strong>nombre de tu canal</strong> abajo (tal como aparece en Telegram)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold">4.</span>
            <span>El sistema encontrará el canal automáticamente y lo conectará</span>
          </li>
        </ol>
      </div>

      {/* Connect Form / Empty State */}
      {channels.length === 0 || showConnectForm ? (
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">
            {channels.length === 0 ? 'Conecta tu canal premium' : 'Conectar nuevo canal'}
          </h3>
          
          <form onSubmit={handleConnect} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre del canal
              </label>
              <input
                type="text"
                value={channelInput}
                onChange={(e) => setChannelInput(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Mi Canal Premium"
              />
              <p className="text-xs text-gray-500 mt-1">
                Escribe el nombre exacto de tu canal tal como aparece en Telegram
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg">
                <AlertCircle size={18} />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <div className="flex gap-3">
              {showConnectForm && channels.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setShowConnectForm(false);
                    setError('');
                    setChannelInput('');
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
              )}
              <button
                type="submit"
                disabled={connecting || !channelInput.trim()}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {connecting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Verificando...
                  </>
                ) : (
                  <>
                    <MessageCircle size={18} />
                    Conectar canal
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {/* Connected Channels */}
      {channels.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-900">Canales conectados</h3>
          {channels.map((channel) => (
            <div key={channel.id} className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <MessageCircle className="text-blue-600" size={24} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">{channel.channelTitle}</h4>
                    <p className="text-sm text-gray-500">ID: {channel.channelId}</p>
                    {channel.memberCount && (
                      <p className="text-sm text-gray-500">{channel.memberCount} miembros</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      Conectado el {new Date(channel.connectedAt).toLocaleDateString('es-ES')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {channel.isActive ? (
                    <span className="flex items-center gap-1 text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">
                      <Check size={12} />
                      Activo
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                      Inactivo
                    </span>
                  )}
                </div>
              </div>

              {/* Invite Link */}
              {channel.inviteLink && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Link de invitaci\u00f3n</p>
                      <p className="text-sm text-blue-600 break-all">{channel.inviteLink}</p>
                    </div>
                    <button
                      onClick={() => handleRefreshLink(channel.channelId)}
                      disabled={refreshingChannel === channel.channelId}
                      className="flex items-center gap-1 px-3 py-2 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
                    >
                      <RefreshCw size={14} className={refreshingChannel === channel.channelId ? 'animate-spin' : ''} />
                      Regenerar
                    </button>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="mt-4 pt-4 border-t flex justify-end">
                <button
                  onClick={() => onDisconnectChannel(channel.channelId)}
                  className="flex items-center gap-1 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 size={14} />
                  Desconectar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
