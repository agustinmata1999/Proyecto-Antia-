'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { authApi } from '@/lib/api';
import { Check, MessageCircle } from 'lucide-react';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const telegramConnected = searchParams.get('telegram_connected') === 'true';
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showTelegramRequired, setShowTelegramRequired] = useState(false);
  const [telegramRequiredMessage, setTelegramRequiredMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setShowTelegramRequired(false);
    setLoading(true);

    try {
      const response = await authApi.login(formData);
      const { access_token, user } = response.data;
      
      // Guardar token en localStorage
      if (access_token) {
        localStorage.setItem('access_token', access_token);
      }
      
      // Pequeño delay para asegurar que localStorage se sincroniza
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Redirect based on role
      if (user.role === 'TIPSTER') {
        router.push('/dashboard/tipster');
      } else if (user.role === 'CLIENT') {
        router.push('/dashboard/client');
      } else {
        router.push('/dashboard/admin');
      }
    } catch (err: any) {
      const errorData = err.response?.data;
      
      // Verificar si es el caso especial de Telegram requerido
      if (errorData?.code === 'TELEGRAM_REQUIRED') {
        setShowTelegramRequired(true);
        setTelegramRequiredMessage(errorData.message || '¡Tu solicitud ha sido aprobada! Conecta tu Telegram para continuar.');
      } else {
        setError(errorData?.message || 'Error al iniciar sesión');
      }
      setLoading(false);
    }
  };

  const handleGoToConnectTelegram = () => {
    // Redirigir a la página de conexión de Telegram con el email
    router.push(`/connect-telegram?email=${encodeURIComponent(formData.email)}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <Link href="/" className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent inline-block">
            Antia
          </Link>
          <h1 className="text-2xl font-bold mt-4 text-gray-900">Iniciar Sesión</h1>
          <p className="text-gray-600 mt-2">Accede a tu cuenta</p>
        </div>

        {/* Banner de Telegram conectado exitosamente */}
        {telegramConnected && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Check className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="font-medium text-green-800">¡Telegram conectado!</p>
              <p className="text-sm text-green-700">Ahora puedes iniciar sesión normalmente.</p>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Pantalla de Telegram Requerido */}
          {showTelegramRequired ? (
            <div className="space-y-6">
              {/* Banner de aprobación */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-5">
                <div className="flex items-start gap-4">
                  <div className="p-2.5 bg-green-100 rounded-xl">
                    <Check className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-green-800">¡Solicitud Aprobada!</h3>
                    <p className="text-sm text-green-700 mt-1">
                      {telegramRequiredMessage}
                    </p>
                  </div>
                </div>
              </div>

              {/* Info de Telegram */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
                <div className="flex items-start gap-4">
                  <div className="p-2.5 bg-blue-100 rounded-xl">
                    <MessageCircle className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-blue-800">Conecta tu Telegram</h3>
                    <p className="text-sm text-blue-700 mt-1">
                      Para acceder a la plataforma, necesitas vincular tu cuenta de Telegram. 
                      Esto permite que tus canales se conecten automáticamente cuando crees productos.
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={handleGoToConnectTelegram}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3.5 rounded-xl hover:from-blue-700 hover:to-blue-800 transition font-medium flex items-center justify-center gap-2"
              >
                <MessageCircle size={18} />
                Conectar Telegram y Acceder
              </button>

              <button
                onClick={() => {
                  setShowTelegramRequired(false);
                  setFormData({ email: '', password: '' });
                }}
                className="w-full text-gray-500 hover:text-gray-700 text-sm"
              >
                Usar otra cuenta
              </button>
            </div>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Correo electrónico
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="tu@email.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                    Contraseña
                  </label>
                  <input
                    id="password"
                    type="password"
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                </div>

                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center">
                    <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                    <span className="ml-2 text-gray-600">Recordarme</span>
                  </label>
                  <a href="#" className="text-blue-600 hover:text-blue-700 font-medium">
                    ¿Olvidaste tu contraseña?
                  </a>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
                </button>
              </form>

              <div className="mt-6 text-center text-sm text-gray-600">
                ¿Aún no tienes cuenta?{' '}
                <Link href="/register" className="text-blue-600 hover:text-blue-700 font-medium">
                  Registrarse
                </Link>
              </div>
            </>
          )}
        </div>

        <p className="text-center text-sm text-gray-500 mt-8">
          Al continuar, aceptas nuestros{' '}
          <a href="#" className="text-gray-700 underline">Términos y Condiciones</a>
          {' '}y{' '}
          <a href="#" className="text-gray-700 underline">Política de Privacidad</a>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
