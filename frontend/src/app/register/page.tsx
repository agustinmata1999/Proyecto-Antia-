'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { authApi, telegramApi } from '@/lib/api';
import { MessageCircle, Check, X, ExternalLink, FileText, ArrowRight, Copy, CheckCircle } from 'lucide-react';

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [userType, setUserType] = useState<'client' | 'tipster'>('client');
  const [tipsterStep, setTipsterStep] = useState<'choose' | 'telegram' | 'form'>('choose');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    countryIso: 'ES',
    telegramUsername: '',
    promotionChannel: '',
    experience: '',
    consent18: false,
    consentTerms: false,
    consentPrivacy: false,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Estado para la conexión de Telegram durante el registro
  const [telegramConnected, setTelegramConnected] = useState(false);
  const [telegramUserId, setTelegramUserId] = useState<string | null>(null);
  const [telegramLinkedUsername, setTelegramLinkedUsername] = useState<string | null>(null);
  const [showManualCode, setShowManualCode] = useState(false);
  const [telegramCode, setTelegramCode] = useState('');
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [telegramError, setTelegramError] = useState('');
  const [botUsername, setBotUsername] = useState('Antiabetbot');
  const [codeCopied, setCodeCopied] = useState(false);

  // Cargar info del bot y verificar parámetros de URL
  useEffect(() => {
    const loadBotInfo = async () => {
      try {
        const res = await telegramApi.auth.getBotInfo();
        if (res.data.botUsername) {
          setBotUsername(res.data.botUsername);
        }
      } catch (err) {
        console.error('Error loading bot info:', err);
      }
    };
    loadBotInfo();

    // Verificar si viene con código de Telegram desde el bot
    const telegramCodeFromUrl = searchParams.get('telegram_code');
    const telegramUsernameFromUrl = searchParams.get('telegram_username');
    
    if (telegramCodeFromUrl) {
      // Cambiar a tipster y al paso de formulario
      setUserType('tipster');
      setTipsterStep('form');
      setTelegramCode(telegramCodeFromUrl);
      
      // Pre-llenar el username de Telegram si viene en la URL
      if (telegramUsernameFromUrl) {
        setFormData(prev => ({
          ...prev,
          telegramUsername: telegramUsernameFromUrl.startsWith('@') ? telegramUsernameFromUrl : `@${telegramUsernameFromUrl}`
        }));
      }
      
      // Verificar el código automáticamente
      verifyTelegramCodeFromUrl(telegramCodeFromUrl);
    }
  }, [searchParams]);

  // Verificar código automáticamente cuando viene de la URL
  const verifyTelegramCodeFromUrl = async (code: string) => {
    setVerifyingCode(true);
    setTelegramError('');

    try {
      const res = await telegramApi.auth.connectDuringRegister(code.toUpperCase());
      if (res.data.success) {
        setTelegramConnected(true);
        setTelegramUserId(res.data.telegramUserId);
        setTelegramLinkedUsername(res.data.telegramUsername);
        setTelegramCode('');
        
        // Pre-llenar el username si viene del bot
        if (res.data.telegramUsername) {
          setFormData(prev => ({
            ...prev,
            telegramUsername: `@${res.data.telegramUsername}`
          }));
        }
        
        // Limpiar los parámetros de la URL
        window.history.replaceState({}, '', '/register');
      }
    } catch (err: any) {
      setTelegramError(err.response?.data?.message || 'Código inválido o expirado. Genera uno nuevo.');
    } finally {
      setVerifyingCode(false);
    }
  };

  // Verificar código de Telegram manualmente
  const handleVerifyTelegramCode = async () => {
    if (!telegramCode.trim()) {
      setTelegramError('Ingresa el código de vinculación');
      return;
    }

    setVerifyingCode(true);
    setTelegramError('');

    try {
      const res = await telegramApi.auth.connectDuringRegister(telegramCode.trim().toUpperCase());
      if (res.data.success) {
        setTelegramConnected(true);
        setTelegramUserId(res.data.telegramUserId);
        setTelegramLinkedUsername(res.data.telegramUsername);
        setShowManualCode(false);
        setTelegramCode('');
        setTipsterStep('form'); // Avanzar al formulario
        
        // Pre-llenar el username si viene del bot
        if (res.data.telegramUsername) {
          setFormData(prev => ({
            ...prev,
            telegramUsername: `@${res.data.telegramUsername}`
          }));
        }
      }
    } catch (err: any) {
      setTelegramError(err.response?.data?.message || 'Código inválido o expirado');
    } finally {
      setVerifyingCode(false);
    }
  };

  // Desconectar Telegram
  const handleDisconnectTelegram = () => {
    setTelegramConnected(false);
    setTelegramUserId(null);
    setTelegramLinkedUsername(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    if (formData.password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }

    // Validaciones específicas para tipster
    if (userType === 'tipster') {
      if (!formData.telegramUsername) {
        setError('El usuario de Telegram es obligatorio');
        return;
      }
      if (!formData.promotionChannel) {
        setError('Debes indicar dónde promocionas tu contenido (canal de Telegram, Instagram, etc.)');
        return;
      }
    }

    // Solo validar consentimientos para clientes
    if (userType === 'client' && (!formData.consent18 || !formData.consentTerms || !formData.consentPrivacy)) {
      setError('Debes aceptar todos los consentimientos');
      return;
    }

    setLoading(true);

    try {
      if (userType === 'tipster') {
        await authApi.registerTipster({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          password: formData.password,
          telegramUsername: formData.telegramUsername,
          promotionChannel: formData.promotionChannel,
          experience: formData.experience,
          countryIso: formData.countryIso,
          // Incluir datos de Telegram si está conectado
          telegramUserId: telegramUserId || undefined,
          telegramLinkedUsername: telegramLinkedUsername || undefined,
        });
        
        if (telegramConnected) {
          setSuccessMessage('¡Solicitud enviada correctamente! Tu cuenta de Telegram ya está vinculada. Un administrador revisará tu solicitud y te notificará cuando sea aprobada.');
        } else {
          setSuccessMessage('¡Solicitud enviada correctamente! Un administrador revisará tu solicitud. Recuerda que necesitarás conectar tu Telegram antes de poder acceder a la plataforma.');
        }
      } else {
        await authApi.registerClient({
          email: formData.email,
          password: formData.password,
          phone: formData.phone,
          countryIso: formData.countryIso,
          consent18: formData.consent18,
          consentTerms: formData.consentTerms,
          consentPrivacy: formData.consentPrivacy,
        });
        router.push('/dashboard/client');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al registrarse');
    } finally {
      setLoading(false);
    }
  };

  // Pantalla de éxito
  if (successMessage) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">¡Solicitud Enviada!</h2>
          <p className="text-gray-600 mb-6">{successMessage}</p>
          <Link 
            href="/login" 
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-medium"
          >
            Ir a Iniciar Sesión
          </Link>
        </div>
      </div>
    );
  }

  // Renderizar pantalla de elección para tipster
  const renderTipsterChoice = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <FileText className="w-8 h-8 text-blue-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">¿Quieres solicitar acceso como Tipster?</h2>
        <p className="text-sm text-gray-600 mt-2">
          Para acceder al panel de tipsters debes pasar una pequeña validación
        </p>
      </div>

      {/* Opción 1: Conectar Telegram */}
      <button
        type="button"
        onClick={() => setTipsterStep('telegram')}
        className="w-full p-4 bg-[#0088cc] hover:bg-[#0077b3] text-white rounded-xl transition flex items-center justify-center gap-3 font-medium"
      >
        <MessageCircle className="w-5 h-5" />
        Solicitar acceso usando Telegram
      </button>

      {/* Opción 2: Dejar datos */}
      <div className="text-center text-sm text-gray-500 my-2">
        ¿No tienes Telegram?
      </div>
      
      <button
        type="button"
        onClick={() => setTipsterStep('form')}
        className="w-full p-4 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white rounded-xl transition flex items-center justify-center gap-3 font-medium"
      >
        <FileText className="w-5 h-5" />
        Déjanos tus datos
      </button>

      <button
        type="button"
        onClick={() => setUserType('client')}
        className="w-full text-gray-500 hover:text-gray-700 text-sm mt-4"
      >
        ← Volver a elegir tipo de cuenta
      </button>
    </div>
  );

  // Renderizar pantalla de conexión de Telegram
  const renderTelegramConnection = () => (
    <div className="space-y-5">
      <div className="text-center mb-4">
        <div className="w-16 h-16 bg-[#0088cc]/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <MessageCircle className="w-8 h-8 text-[#0088cc]" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Conectar Telegram</h2>
        <p className="text-sm text-gray-600 mt-2">
          Elige cómo deseas vincular tu cuenta de Telegram
        </p>
      </div>

      {telegramConnected ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Check className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="font-medium text-green-800">¡Telegram conectado!</p>
              <p className="text-sm text-green-700">
                {telegramLinkedUsername ? `@${telegramLinkedUsername}` : `ID: ${telegramUserId}`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setTipsterStep('form')}
            className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition font-medium flex items-center justify-center gap-2"
          >
            Continuar con el registro <ArrowRight size={18} />
          </button>
          <button
            type="button"
            onClick={handleDisconnectTelegram}
            className="w-full text-gray-500 hover:text-gray-700 text-sm mt-3"
          >
            Cambiar cuenta de Telegram
          </button>
        </div>
      ) : (
        <>
          {/* Opción 1: Conexión automática con botón */}
          <div className="border border-gray-200 rounded-xl p-5 bg-gradient-to-br from-blue-50/50 to-white">
            <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <span className="w-6 h-6 bg-blue-600 text-white rounded-full text-sm flex items-center justify-center">1</span>
              Conexión automática (Recomendada)
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Haz clic en el botón, el bot te enviará un enlace para volver aquí automáticamente.
            </p>
            <a
              href={`https://t.me/${botUsername}?start=vincular_registro`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-[#0088cc] hover:bg-[#0077b3] text-white py-3 rounded-lg transition font-medium flex items-center justify-center gap-2"
            >
              <MessageCircle size={18} />
              Abrir Telegram
              <ExternalLink size={14} />
            </a>
          </div>

          {/* Opción 2: Conexión manual */}
          <div className="border border-gray-200 rounded-xl p-5">
            <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <span className="w-6 h-6 bg-gray-600 text-white rounded-full text-sm flex items-center justify-center">2</span>
              Conexión manual
            </h3>
            
            {!showManualCode ? (
              <button
                type="button"
                onClick={() => setShowManualCode(true)}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
              >
                ¿Tuviste problemas? Ingresa el código manualmente <ArrowRight size={14} />
              </button>
            ) : (
              <div className="space-y-3 mt-3">
                <p className="text-sm text-gray-600">
                  1. Abre el bot en Telegram<br />
                  2. Envía el comando <code className="bg-gray-100 px-1 rounded">/vincular</code><br />
                  3. Copia el código e ingrésalo abajo
                </p>

                {telegramError && (
                  <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">
                    {telegramError}
                  </div>
                )}

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={telegramCode}
                    onChange={(e) => setTelegramCode(e.target.value.toUpperCase())}
                    placeholder="XXXXXXXX"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-center font-mono tracking-widest uppercase"
                    maxLength={8}
                  />
                  <button
                    type="button"
                    onClick={handleVerifyTelegramCode}
                    disabled={!telegramCode.trim() || verifyingCode}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
                  >
                    {verifyingCode ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      'Verificar'
                    )}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowManualCode(false);
                    setTelegramCode('');
                    setTelegramError('');
                  }}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>
        </>
      )}

      <div className="flex items-center gap-3 pt-4">
        <button
          type="button"
          onClick={() => setTipsterStep('choose')}
          className="flex-1 text-gray-500 hover:text-gray-700 text-sm py-2"
        >
          ← Volver
        </button>
        <button
          type="button"
          onClick={() => setTipsterStep('form')}
          className="flex-1 text-blue-600 hover:text-blue-700 text-sm py-2"
        >
          Continuar sin Telegram →
        </button>
      </div>
    </div>
  );

  // Renderizar formulario de registro
  const renderRegistrationForm = () => (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Estado de Telegram (solo para tipsters) */}
      {userType === 'tipster' && (
        <div className={`rounded-xl p-4 ${telegramConnected ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${telegramConnected ? 'bg-green-100' : 'bg-yellow-100'}`}>
              <MessageCircle className={`w-5 h-5 ${telegramConnected ? 'text-green-600' : 'text-yellow-600'}`} />
            </div>
            <div className="flex-1">
              {telegramConnected ? (
                <>
                  <p className="font-medium text-green-800">Telegram conectado</p>
                  <p className="text-sm text-green-700">
                    {telegramLinkedUsername ? `@${telegramLinkedUsername}` : `ID: ${telegramUserId}`}
                  </p>
                </>
              ) : (
                <>
                  <p className="font-medium text-yellow-800">Telegram no conectado</p>
                  <p className="text-sm text-yellow-700">
                    Deberás conectarlo antes de acceder a la plataforma
                  </p>
                </>
              )}
            </div>
            {telegramConnected && (
              <button
                type="button"
                onClick={handleDisconnectTelegram}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>
      )}

      {userType === 'tipster' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nombre Completo *
          </label>
          <input
            type="text"
            required
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Fausto Perez"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Correo electrónico *
        </label>
        <input
          type="email"
          required
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="tu@email.com"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Teléfono *
        </label>
        <input
          type="tel"
          required
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="+34 611 111 111"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
        />
      </div>

      {userType === 'tipster' && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Usuario de Telegram *
            </label>
            <input
              type="text"
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="@miusuario"
              value={formData.telegramUsername}
              onChange={(e) => setFormData({ ...formData, telegramUsername: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Canal o URL donde promocionas *
            </label>
            <input
              type="text"
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="https://t.me/mi_canal o @mi_instagram"
              value={formData.promotionChannel}
              onChange={(e) => setFormData({ ...formData, promotionChannel: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Experiencia como Tipster
            </label>
            <textarea
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Cuéntanos sobre tu experiencia"
              rows={3}
              value={formData.experience}
              onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
            />
          </div>
        </>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Contraseña *
          </label>
          <input
            type="password"
            required
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="••••••••"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Confirmar *
          </label>
          <input
            type="password"
            required
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="••••••••"
            value={formData.confirmPassword}
            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
          />
        </div>
      </div>

      {/* Consents */}
      <div className="space-y-3 pt-4 border-t">
        <label className="flex items-start">
          <input
            type="checkbox"
            required
            className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            checked={formData.consentTerms}
            onChange={(e) => setFormData({ ...formData, consentTerms: e.target.checked, consent18: e.target.checked, consentPrivacy: e.target.checked })}
          />
          <span className="ml-2 text-sm text-gray-700">
            Acepto los <a href="#" className="text-blue-600 underline">Términos y Condiciones</a> *
          </span>
        </label>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Enviando...' : userType === 'tipster' ? 'Enviar Solicitud' : 'Crear Cuenta'}
      </button>

      {userType === 'tipster' && (
        <button
          type="button"
          onClick={() => setTipsterStep('choose')}
          className="w-full text-gray-500 hover:text-gray-700 text-sm"
        >
          ← Volver
        </button>
      )}
    </form>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <Link href="/" className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent inline-block">
            Antia
          </Link>
          <h1 className="text-2xl font-bold mt-4 text-gray-900">Crear Cuenta</h1>
          <p className="text-gray-600 mt-2">¿Cómo quieres usar Antia?</p>
        </div>

        {/* User Type Selection - Solo si estamos eligiendo tipo o es cliente */}
        {(userType === 'client' || (userType === 'tipster' && tipsterStep === 'choose')) && (
          <div className="bg-white rounded-2xl shadow-xl p-4 mb-6">
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => {
                  setUserType('client');
                  setTipsterStep('choose');
                }}
                className={`p-4 rounded-lg border-2 transition ${
                  userType === 'client'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-lg font-bold">Soy Cliente</div>
                <div className="text-sm text-gray-600 mt-1">Quiero comprar pronósticos</div>
              </button>
              <button
                type="button"
                onClick={() => {
                  setUserType('tipster');
                  setTipsterStep('choose');
                }}
                className={`p-4 rounded-lg border-2 transition ${
                  userType === 'tipster'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-lg font-bold">Panel de Afiliados</div>
                <div className="text-sm text-gray-600 mt-1">Quiero vender pronósticos</div>
              </button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-xl p-8">
          {userType === 'client' && renderRegistrationForm()}
          
          {userType === 'tipster' && tipsterStep === 'choose' && renderTipsterChoice()}
          
          {userType === 'tipster' && tipsterStep === 'telegram' && renderTelegramConnection()}
          
          {userType === 'tipster' && tipsterStep === 'form' && (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <h3 className="font-medium text-blue-900 mb-2">📋 Registro de Tipster</h3>
                <p className="text-sm text-blue-800">
                  Completa el formulario para solicitar acceso al panel de tipsters.
                </p>
              </div>
              {renderRegistrationForm()}
            </>
          )}
        </div>

        <div className="mt-6 text-center text-sm text-gray-600">
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium">
            Iniciar Sesión
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <RegisterContent />
    </Suspense>
  );
}
