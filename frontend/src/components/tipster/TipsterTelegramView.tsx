'use client';

import { useState } from 'react';
import { MessageCircle, Plus, Trash2, RefreshCw, Check, AlertCircle, Link2, Copy } from 'lucide-react';
import TelegramInstructions from './TelegramInstructions';

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
  const [copiedBot, setCopiedBot] = useState(false);

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

  const handleCopyBotUsername = async () => {
    try {
      await navigator.clipboard.writeText(`@${botUsername}`);
      setCopiedBot(true);
      setTimeout(() => setCopiedBot(false), 2000);
    } catch (err) {
      console.error('Error copying:', err);
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
        {channels.length > 0 && !showConnectForm && (
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
      <TelegramInstructions 
        botUsername={botUsername} 
        onCopyBotUsername={handleCopyBotUsername}
      />

      {/* Connect Form */}
      {(channels.length === 0 || showConnectForm) && (
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-blue-600" />
            {channels.length === 0 ? 'Conecta tu canal premium' : 'Conectar nuevo canal'}
          </h3>
          
          <form onSubmit={handleConnect} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Link de invitación del canal
              </label>
              <input
                type="text"
                value={channelInput}
                onChange={(e) => setChannelInput(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                placeholder="https://t.me/+abc123xyz"
              />
              <p className="text-sm text-gray-500 mt-2">
                Pega el link de invitación de tu canal. Lo puedes obtener desde Telegram → Info del canal → Invitar vía enlace
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-4 bg-red-50 text-red-700 rounded-xl">
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
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancelar
                </button>
              )}
              <button
                type="submit"
                disabled={connecting || !channelInput.trim()}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium"
              >
                {connecting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Verificando...
                  </>
                ) : (
                  <>
                    <MessageCircle size={20} />
                    Conectar canal
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Connected Channels */}
      {channels.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Check className="w-5 h-5 text-green-500" />
            Canales conectados ({channels.length})
          </h3>
          {channels.map((channel) => (
            <div key={channel.id} className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl">
                    <MessageCircle className="text-white" size={24} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 text-lg">{channel.channelTitle}</h4>
                    <p className="text-sm text-gray-500 font-mono">ID: {channel.channelId}</p>
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
                    <span className="flex items-center gap-1 text-xs px-3 py-1.5 bg-green-100 text-green-700 rounded-full font-medium">
                      <Check size={12} />
                      Activo
                    </span>
                  ) : (
                    <span className="text-xs px-3 py-1.5 bg-gray-100 text-gray-600 rounded-full font-medium">
                      Inactivo
                    </span>
                  )}
                </div>
              </div>

              {/* Invite Link */}
              {channel.inviteLink && (
                <div className="mt-4 p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-700 mb-1">Link de invitación</p>
                      <p className="text-sm text-blue-600 truncate font-mono">{channel.inviteLink}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => navigator.clipboard.writeText(channel.inviteLink || '')}
                        className="flex items-center gap-1 px-3 py-2 text-sm bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <Copy size={14} />
                        Copiar
                      </button>
                      <button
                        onClick={() => handleRefreshLink(channel.channelId)}
                        disabled={refreshingChannel === channel.channelId}
                        className="flex items-center gap-1 px-3 py-2 text-sm bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                      >
                        <RefreshCw size={14} className={refreshingChannel === channel.channelId ? 'animate-spin' : ''} />
                        Regenerar
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="mt-4 pt-4 border-t flex justify-end">
                <button
                  onClick={() => onDisconnectChannel(channel.channelId)}
                  className="flex items-center gap-1 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
                >
                  <Trash2 size={16} />
                  Desconectar canal
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Copied notification */}
      {copiedBot && (
        <div className="fixed bottom-4 right-4 bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg animate-fade-in">
          ✓ Nombre del bot copiado
        </div>
      )}
    </div>
  );
}
