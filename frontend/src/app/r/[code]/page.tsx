'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';

interface LinkInfo {
  valid: boolean;
  error?: string;
  house?: {
    name: string;
    slug: string;
    logoUrl: string | null;
    websiteUrl: string | null;
  };
  tipster?: {
    name: string;
  };
  countryCode?: string;
  isAllowed: boolean;
  blockReason?: string;
  isDemo?: boolean;
}

export default function AffiliateLandingPage() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;
  
  const [loading, setLoading] = useState(true);
  const [linkInfo, setLinkInfo] = useState<LinkInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [registering, setRegistering] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    telegram: '',
    name: ''
  });
  const [registered, setRegistered] = useState(false);

  useEffect(() => {
    loadLinkInfo();
  }, [code]);

  const loadLinkInfo = async () => {
    try {
      const response = await api.get(`/r/${code}/info`);
      setLinkInfo(response.data);
      
      // Si no es demo y está permitido, redirigir automáticamente
      if (response.data.valid && response.data.isAllowed && !response.data.isDemo) {
        // Redirigir al endpoint que hace el tracking y redirect
        window.location.href = `${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')}/api/r/${code}`;
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar información del enlace');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegistering(true);
    
    try {
      // Registrar la conversión de demo
      await api.post(`/r/${code}/demo-conversion`, {
        email: formData.email,
        telegram: formData.telegram,
        name: formData.name
      });
      setRegistered(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al registrar');
    } finally {
      setRegistering(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-white mt-4">Cargando...</p>
        </div>
      </div>
    );
  }

  if (error || !linkInfo?.valid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-red-900 to-gray-900 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-white mb-2">Enlace no válido</h1>
          <p className="text-gray-300">{error || linkInfo?.error || 'Este enlace no existe o ha expirado'}</p>
        </div>
      </div>
    );
  }

  if (!linkInfo.isAllowed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-orange-900 to-gray-900 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-white mb-2">No disponible en tu país</h1>
          <p className="text-gray-300 mb-4">{linkInfo.blockReason}</p>
          <p className="text-gray-400 text-sm">País detectado: {linkInfo.countryCode || 'Desconocido'}</p>
        </div>
      </div>
    );
  }

  // Página de demo para registro simulado
  if (linkInfo.isDemo) {
    if (registered) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-green-900 via-emerald-800 to-green-900 flex items-center justify-center p-4">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 max-w-md w-full text-center">
            <div className="text-6xl mb-4">✅</div>
            <h1 className="text-2xl font-bold text-white mb-2">¡Registro Exitoso!</h1>
            <p className="text-gray-300 mb-4">
              Tu registro en <strong>{linkInfo.house?.name}</strong> ha sido procesado.
            </p>
            <div className="bg-white/10 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-400">Referido por tipster:</p>
              <p className="text-white font-semibold">{linkInfo.tipster?.name || 'Tipster'}</p>
            </div>
            <p className="text-green-400 text-sm">
              ✨ La conversión ha sido registrada en el sistema de afiliación
            </p>
            <div className="mt-6 p-4 bg-yellow-500/20 rounded-lg">
              <p className="text-yellow-300 text-sm">
                📊 Ahora puedes ver esta conversión en:
                <br/>• Panel Admin → Afiliación → Referidos
                <br/>• Panel Tipster → Afiliación → Mis Referidos
              </p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 max-w-lg w-full">
          {/* Header con logo */}
          <div className="text-center mb-8">
            {linkInfo.house?.logoUrl ? (
              <img 
                src={linkInfo.house.logoUrl} 
                alt={linkInfo.house.name}
                className="h-16 mx-auto mb-4 object-contain"
              />
            ) : (
              <div className="w-16 h-16 bg-blue-600 rounded-xl mx-auto mb-4 flex items-center justify-center">
                <span className="text-3xl">🎰</span>
              </div>
            )}
            <h1 className="text-3xl font-bold text-white">{linkInfo.house?.name}</h1>
            <p className="text-gray-400 mt-2">Página de Registro (Demo)</p>
          </div>

          {/* Badge de demo */}
          <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-3 mb-6">
            <p className="text-yellow-300 text-sm text-center">
              ⚠️ Esta es una página de demostración para probar el sistema de afiliación
            </p>
          </div>

          {/* Info del tipster */}
          <div className="bg-white/5 rounded-lg p-4 mb-6">
            <p className="text-gray-400 text-sm">Referido por:</p>
            <p className="text-white font-semibold text-lg">{linkInfo.tipster?.name || 'Tipster'}</p>
          </div>

          {/* Formulario de registro */}
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-gray-300 text-sm mb-2">Email *</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                placeholder="tu@email.com"
              />
            </div>
            
            <div>
              <label className="block text-gray-300 text-sm mb-2">Usuario de Telegram</label>
              <input
                type="text"
                value={formData.telegram}
                onChange={(e) => setFormData({ ...formData, telegram: e.target.value })}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                placeholder="@tuusuario"
              />
            </div>
            
            <div>
              <label className="block text-gray-300 text-sm mb-2">Nombre completo</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                placeholder="Juan Pérez"
              />
            </div>

            <button
              type="submit"
              disabled={registering}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-4 rounded-lg transition-all duration-200 disabled:opacity-50 mt-6"
            >
              {registering ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Registrando...
                </span>
              ) : (
                '🚀 Registrarme Ahora'
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-white/10">
            <p className="text-gray-500 text-xs text-center">
              País detectado: {linkInfo.countryCode || 'N/A'} • 
              Sistema de Afiliación ANTIA
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Si llegamos aquí, redirigir al endpoint real
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
        <p className="text-white mt-4">Redirigiendo a {linkInfo.house?.name}...</p>
      </div>
    </div>
  );
}
