'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { telegramApi } from '@/lib/api';
import { MessageCircle, Check, ExternalLink, Shield, PartyPopper } from 'lucide-react';

function ConnectTelegramContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Obtener parámetros de URL
  const emailFromUrl = searchParams.get('email') || '';
  const codeFromUrl = searchParams.get('code') || '';
  
  const [email, setEmail] = useState(emailFromUrl);
  const [password, setPassword] = useState('');
  const [telegramCode, setTelegramCode] = useState(codeFromUrl);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [botUsername, setBotUsername] = useState('Antiabetbot');
  const [codeFromBot, setCodeFromBot] = useState(!!codeFromUrl);

  // Cargar info del bot
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
    
    // Si viene con código desde el bot, mostrarlo precargado
    if (codeFromUrl) {
      setCodeFromBot(true);
    }
  }, [codeFromUrl]);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError('Por favor, ingresa tu email y contraseña');
      return;
    }
    
    if (!telegramCode.trim()) {
      setError('Por favor, ingresa el código de vinculación');
      return;
    }

    setConnecting(true);
    setError('');

    try {
      const res = await telegramApi.auth.connectPreLogin(email, password, telegramCode.trim().toUpperCase());
      
      if (res.data.success) {
        setSuccess(true);
        // Redirigir al login después de 2 segundos
        setTimeout(() => {
          router.push('/login?telegram_connected=true');
        }, 2000);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al conectar Telegram. Verifica tus credenciales y el código.');
    } finally {
      setConnecting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <PartyPopper className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">¡Telegram Conectado!</h2>
          <p className="text-gray-600 mb-6">
            Tu cuenta de Telegram ha sido vinculada correctamente. Ahora puedes acceder a la plataforma.
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
            <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
            Redirigiendo al login...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent inline-block">
            Antia
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Banner de aprobación */}
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-6 text-white">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-xl">
                <Check className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-xl font-bold">¡Solicitud Aprobada!</h1>
                <p className="text-green-100 mt-1">Solo un paso más para acceder</p>
              </div>
            </div>
          </div>

          <div className="p-8">
            {/* Mensaje explicativo */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-blue-800">
                    Para acceder a la plataforma, necesitas conectar tu cuenta de Telegram.
                    Esto nos permite vincular automáticamente tus canales cuando crees productos.
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleConnect} className="space-y-5">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {/* Credenciales */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Correo electrónico
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  disabled={!!emailFromUrl}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full px-4 py-3 border border-gray-300 rounded-lg ${emailFromUrl ? 'bg-gray-50 text-gray-600' : 'focus:ring-2 focus:ring-blue-500 focus:border-transparent'}`}
                  placeholder="tu@email.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contraseña
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Tu contraseña"
                />
              </div>

              {/* Instrucciones de Telegram */}
              <div className="border border-gray-200 rounded-xl p-5 bg-gradient-to-br from-blue-50/50 to-white">
                <div className="flex items-start gap-4">
                  <div className="p-2.5 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl">
                    <MessageCircle className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-3">Conectar Telegram</h3>
                    
                    <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600 mb-4">
                      <li>
                        <a 
                          href={`https://t.me/${botUsername}?start=vincular`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline inline-flex items-center gap-1"
                        >
                          Abre el bot en Telegram <ExternalLink size={12} />
                        </a>
                      </li>
                      <li>Presiona <strong>"START"</strong> en el bot</li>
                      <li>Copia el código de 8 caracteres que recibirás</li>
                      <li>Pégalo en el campo de abajo</li>
                    </ol>
                    
                    <input
                      type="text"
                      value={telegramCode}
                      onChange={(e) => setTelegramCode(e.target.value.toUpperCase())}
                      placeholder="XXXXXXXX"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg text-center font-mono tracking-widest uppercase text-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      maxLength={8}
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={connecting || !telegramCode.trim() || !password}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3.5 rounded-xl hover:from-blue-700 hover:to-blue-800 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {connecting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Conectando...
                  </>
                ) : (
                  <>
                    <MessageCircle size={18} />
                    Conectar y Acceder
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <Link href="/login" className="text-sm text-gray-500 hover:text-gray-700">
                ← Volver al login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ConnectTelegramPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ConnectTelegramContent />
    </Suspense>
  );
}
