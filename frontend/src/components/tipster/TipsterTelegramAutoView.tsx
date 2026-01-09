'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  MessageCircle,
  Plus,
  Trash2,
  RefreshCw,
  Check,
  AlertCircle,
  Link2,
  Copy,
  Unlink,
  Zap,
  Shield,
  ExternalLink,
  User,
  Radio,
} from 'lucide-react';
import TelegramLoginButton from './TelegramLoginButton';

interface TelegramChannel {
  id: string;
  channelId: string;
  channelTitle: string;
  channelName?: string;
  inviteLink?: string;
  isActive: boolean;
  memberCount?: number;
  connectedAt: string;
  connectionType?: string;
}

interface AvailableChannel {
  channelId: string;
  channelTitle: string;
  channelUsername?: string;
  channelType: string;
  inviteLink?: string;
  detectedAt: string;
  isConnected: boolean;
}

interface TelegramAuthStatus {
  isConnected: boolean;
  telegramId?: string;
  telegramUsername?: string;
  connectedAt?: string;
  availableChannels: AvailableChannel[];
}

interface TipsterTelegramAutoViewProps {
  channels: TelegramChannel[];
  botUsername: string;
  onConnectChannel: (channelId: string) => Promise<{ success: boolean; channel?: any; error?: string }>;
  onDisconnectChannel: (channelId: string) => Promise<void>;
  onRefreshLink: (channelId: string) => Promise<string>;
  onTelegramAuth: (authData: any) => Promise<{ success: boolean; autoConnectedChannels?: number }>;
  onTelegramDisconnect: () => Promise<void>;
  onConnectWithCode?: (code: string) => Promise<{ success: boolean; autoConnectedChannels?: number }>;
  authStatus: TelegramAuthStatus | null;
  loading: boolean;
  onRefreshStatus: () => void;
}

export default function TipsterTelegramAutoView({
  channels,
  botUsername,
  onConnectChannel,
  onDisconnectChannel,
  onRefreshLink,
  onTelegramAuth,
  onTelegramDisconnect,
  onConnectWithCode,
  authStatus,
  loading,
  onRefreshStatus,
}: TipsterTelegramAutoViewProps) {
  const [connecting, setConnecting] = useState(false);
  const [connectingChannelId, setConnectingChannelId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [refreshingChannel, setRefreshingChannel] = useState<string | null>(null);
  const [copiedBot, setCopiedBot] = useState(false);

  // Manejar autenticación de Telegram
  const handleTelegramAuth = useCallback(async (user: any) => {
    setConnecting(true);
    setError('');
    setSuccess('');
    
    try {
      const result = await onTelegramAuth(user);
      if (result.success) {
        setSuccess(
          result.autoConnectedChannels && result.autoConnectedChannels > 0
            ? `¡Telegram conectado! Se han vinculado ${result.autoConnectedChannels} canal(es) automáticamente.`
            : '¡Telegram conectado correctamente!'
        );
        onRefreshStatus();
      } else {
        setError('Error al conectar Telegram');
      }
    } catch (err: any) {
      setError(err.message || 'Error al conectar Telegram');
    } finally {
      setConnecting(false);
    }
  }, [onTelegramAuth, onRefreshStatus]);

  // Conectar un canal disponible
  const handleConnectAvailableChannel = async (channelId: string) => {
    setConnectingChannelId(channelId);
    setError('');
    
    try {
      const result = await onConnectChannel(channelId);
      if (result.success) {
        setSuccess('Canal conectado correctamente');
        onRefreshStatus();
      } else {
        setError(result.error || 'Error al conectar el canal');
      }
    } catch (err: any) {
      setError(err.message || 'Error al conectar el canal');
    } finally {
      setConnectingChannelId(null);
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

  // Estado para método alternativo de conexión
  const [showManualConnect, setShowManualConnect] = useState(false);
  const [manualConnectCode, setManualConnectCode] = useState('');
  const [verifyingManualCode, setVerifyingManualCode] = useState(false);

  // Manejar vinculación con código
  const handleConnectWithCode = async () => {
    if (!manualConnectCode.trim() || !onConnectWithCode) return;
    
    setVerifyingManualCode(true);
    setError('');
    setSuccess('');
    
    try {
      const result = await onConnectWithCode(manualConnectCode.trim().toUpperCase());
      if (result.success) {
        setSuccess(
          result.autoConnectedChannels && result.autoConnectedChannels > 0
            ? `¡Telegram vinculado! Se han conectado ${result.autoConnectedChannels} canal(es) automáticamente.`
            : '¡Telegram vinculado correctamente!'
        );
        setManualConnectCode('');
        setShowManualConnect(false);
        onRefreshStatus();
      } else {
        setError('Código inválido o expirado');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Error al vincular');
    } finally {
      setVerifyingManualCode(false);
    }
  };

  // Limpiar mensajes después de un tiempo
  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        setSuccess('');
        setError('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [success, error]);

  // Obtener canales disponibles que no están conectados
  const availableChannels = authStatus?.availableChannels?.filter(ch => !ch.isConnected) || [];
  const hasAvailableChannels = availableChannels.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Canales Premium</h1>
          <p className="text-gray-500 mt-1">
            Conecta tu Telegram y tus canales se vincularán automáticamente
          </p>
        </div>
      </div>

      {/* Mensajes de éxito/error */}
      {success && (
        <div className="flex items-center gap-2 p-4 bg-green-50 text-green-700 rounded-xl border border-green-200">
          <Check size={18} />
          <span>{success}</span>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 text-red-700 rounded-xl border border-red-200">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Sección de conexión de Telegram */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
            <MessageCircle className="text-white" size={28} />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 text-lg mb-1">
              {authStatus?.isConnected ? 'Telegram Conectado' : 'Conecta tu Telegram'}
            </h3>
            
            {authStatus?.isConnected ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 px-3 py-2 bg-green-100 text-green-700 rounded-lg">
                    <Check size={16} />
                    <span className="font-medium">
                      {authStatus.telegramUsername || `ID: ${authStatus.telegramId}`}
                    </span>
                  </div>
                  <button
                    onClick={onTelegramDisconnect}
                    className="flex items-center gap-1 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Unlink size={14} />
                    Desvincular
                  </button>
                </div>
                <p className="text-sm text-gray-600">
                  Cuando añadas el bot como administrador en un canal, se conectará automáticamente.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-gray-600">
                  Vincula tu cuenta de Telegram para detectar automáticamente los canales donde añadas el bot.
                </p>
                
                {/* Telegram Login Widget */}
                <div className="space-y-3">
                  <div className="flex items-center gap-4">
                    {connecting ? (
                      <div className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg">
                        <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                        <span>Conectando...</span>
                      </div>
                    ) : (
                      <TelegramLoginButton
                        botName={botUsername}
                        onAuth={handleTelegramAuth}
                        buttonSize="large"
                        cornerRadius={10}
                      />
                    )}
                  </div>
                  
                  {/* Alternativa: Conectar a través del bot directamente */}
                  <div className="mt-4 pt-4 border-t border-blue-200">
                    <button 
                      onClick={() => setShowManualConnect(!showManualConnect)}
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      {showManualConnect ? '▼ Ocultar opciones alternativas' : '▶ Ver opciones alternativas de conexión'}
                    </button>
                    
                    {showManualConnect && (
                      <div className="mt-4 space-y-4">
                        {/* Opción 1: Código de vinculación */}
                        <div className="p-4 bg-white rounded-xl border border-gray-200">
                          <h4 className="font-medium text-gray-900 mb-2">Opción 1: Código de vinculación</h4>
                          <ol className="list-decimal list-inside text-sm text-gray-600 space-y-1 mb-3">
                            <li>
                              <a 
                                href={`https://t.me/${botUsername}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline"
                              >
                                Abre @{botUsername} en Telegram
                              </a>
                            </li>
                            <li>Envía el comando <code className="bg-gray-100 px-1 rounded">/vincular</code></li>
                            <li>El bot te dará un código de 8 caracteres</li>
                            <li>Ingrésalo aquí:</li>
                          </ol>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={manualConnectCode}
                              onChange={(e) => setManualConnectCode(e.target.value.toUpperCase())}
                              placeholder="Ej: ABC12345"
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-center font-mono tracking-widest uppercase"
                              maxLength={8}
                            />
                            <button
                              onClick={handleConnectWithCode}
                              disabled={!manualConnectCode.trim() || verifyingManualCode}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                              {verifyingManualCode ? (
                                <>
                                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                  Verificando...
                                </>
                              ) : (
                                'Vincular'
                              )}
                            </button>
                          </div>
                        </div>
                        
                        {/* Opción 2: Link directo (si el widget no funciona) */}
                        <div className="p-4 bg-gray-50 rounded-xl">
                          <h4 className="font-medium text-gray-900 mb-2">Opción 2: Link directo desde el bot</h4>
                          <p className="text-sm text-gray-600 mb-2">
                            Abre el bot en Telegram y envía <code className="bg-gray-100 px-1 rounded">/vincular</code>. El bot te enviará un link directo.
                          </p>
                          <a 
                            href={`https://t.me/${botUsername}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-[#0088cc] text-white rounded-lg hover:bg-[#0077b3] transition-colors"
                          >
                            <MessageCircle size={18} />
                            Abrir bot en Telegram
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Instrucciones de configuración */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-500" />
          Cómo funciona la conexión automática
        </h3>
        
        <div className="grid md:grid-cols-3 gap-4">
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">
              1
            </div>
            <div>
              <p className="font-medium text-gray-900">Conecta tu Telegram</p>
              <p className="text-sm text-gray-500">Haz clic en el botón de arriba para vincular tu cuenta</p>
            </div>
          </div>
          
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">
              2
            </div>
            <div>
              <p className="font-medium text-gray-900">Añade el bot al canal</p>
              <p className="text-sm text-gray-500">
                Añade <button onClick={handleCopyBotUsername} className="text-blue-600 hover:underline font-mono">@{botUsername}</button> como admin
              </p>
            </div>
          </div>
          
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center font-bold">
              ✓
            </div>
            <div>
              <p className="font-medium text-gray-900">¡Listo!</p>
              <p className="text-sm text-gray-500">El canal se conecta automáticamente</p>
            </div>
          </div>
        </div>

        {/* Nota sobre permisos */}
        <div className="mt-4 p-4 bg-amber-50 rounded-xl border border-amber-200">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-800">Importante: Permisos del bot</p>
              <p className="text-sm text-amber-700 mt-1">
                El bot necesita el permiso de <strong>"Publicar mensajes"</strong> para poder dar acceso a los clientes que compren tus productos.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Canales disponibles para conectar (detectados pero no vinculados) */}
      {authStatus?.isConnected && hasAvailableChannels && (
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Radio className="w-5 h-5 text-blue-500" />
            Canales detectados ({availableChannels.length})
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            Estos canales tienen el bot como administrador. Haz clic para conectarlos.
          </p>
          
          <div className="space-y-3">
            {availableChannels.map((channel) => (
              <div
                key={channel.channelId}
                className="flex items-center justify-between p-4 bg-blue-50 rounded-xl border border-blue-100"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <MessageCircle className="text-blue-600" size={20} />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{channel.channelTitle}</p>
                    <p className="text-xs text-gray-500">
                      {channel.channelUsername ? `@${channel.channelUsername}` : 'Canal privado'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleConnectAvailableChannel(channel.channelId)}
                  disabled={connectingChannelId === channel.channelId}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {connectingChannelId === channel.channelId ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Conectando...
                    </>
                  ) : (
                    <>
                      <Plus size={16} />
                      Conectar
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Canales conectados */}
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
                  <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl">
                    <MessageCircle className="text-white" size={24} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 text-lg">{channel.channelTitle}</h4>
                    {channel.channelName && (
                      <p className="text-sm text-gray-500">{channel.channelName}</p>
                    )}
                    <p className="text-sm text-gray-500 font-mono">ID: {channel.channelId}</p>
                    {channel.memberCount && (
                      <p className="text-sm text-gray-500">{channel.memberCount} miembros</p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-gray-400">
                        Conectado el {new Date(channel.connectedAt).toLocaleDateString('es-ES')}
                      </p>
                      {channel.connectionType === 'auto' && (
                        <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full flex items-center gap-1">
                          <Zap size={10} />
                          Auto
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {channel.isActive ? (
                    <span className="flex items-center gap-1 text-xs px-3 py-1.5 bg-green-100 text-green-700 rounded-full font-medium">
                      <Check size={12} />
                      Activo
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs px-3 py-1.5 bg-red-100 text-red-700 rounded-full font-medium">
                      <AlertCircle size={12} />
                      Desconectado
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
                        <RefreshCw
                          size={14}
                          className={refreshingChannel === channel.channelId ? 'animate-spin' : ''}
                        />
                        Regenerar
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Warning si no está activo */}
              {!channel.isActive && (
                <div className="mt-4 p-4 bg-red-50 rounded-xl border border-red-200">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-red-800">Canal desconectado</p>
                      <p className="text-sm text-red-700 mt-1">
                        El bot ha sido removido de este canal. Vuelve a añadirlo como administrador para reconectarlo.
                      </p>
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

      {/* Empty state */}
      {channels.length === 0 && authStatus?.isConnected && !hasAvailableChannels && (
        <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageCircle className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">No hay canales conectados</h3>
          <p className="text-gray-500 max-w-md mx-auto">
            Añade el bot <span className="font-mono text-blue-600">@{botUsername}</span> como administrador
            en tu canal de Telegram y se conectará automáticamente aquí.
          </p>
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
