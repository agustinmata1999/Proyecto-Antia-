'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authApi } from '@/lib/api';

export default function RegisterPage() {
  const router = useRouter();
  const [userType, setUserType] = useState<'client' | 'tipster'>('client');
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
        });
        setSuccessMessage('¡Solicitud enviada correctamente! Un administrador revisará tu solicitud y te notificará cuando sea aprobada.');
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

  if (successMessage) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
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

        {/* User Type Selection */}
        <div className="bg-white rounded-2xl shadow-xl p-4 mb-6">
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setUserType('client')}
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
              onClick={() => setUserType('tipster')}
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

        <div className="bg-white rounded-2xl shadow-xl p-8">
          {userType === 'tipster' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="font-medium text-blue-900 mb-2">📋 Registro de Afiliado</h3>
              <p className="text-sm text-blue-800">
                Completa el formulario para acceder al panel de afiliados y comenzar a generar ingresos.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                {error}
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
                  <p className="text-xs text-gray-500 mt-1">Tu usuario de Telegram para que podamos verificarte</p>
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
                  <p className="text-xs text-gray-500 mt-1">Tu canal público de Telegram, Instagram, Twitter, etc. para verificar tu actividad</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Experiencia como Tipster
                  </label>
                  <textarea
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Cuéntanos sobre tu experiencia: deportes, tiempo como tipster, resultados, etc."
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
                  Confirmar Contraseña *
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
          </form>

          <div className="mt-6 text-center text-sm text-gray-600">
            ¿Ya tienes cuenta?{' '}
            <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium">
              Iniciar Sesión
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
