'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { CheckCircle, Loader2, ExternalLink, AlertCircle, MessageCircle } from 'lucide-react';
import Link from 'next/link';

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const orderId = searchParams.get('order_id');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [orderData, setOrderData] = useState<any>(null);
  const [redirecting, setRedirecting] = useState(false);
  const [countdown, setCountdown] = useState(5);

  const getBotUsername = () => 'Antiabetbot';

  // URL de redirección al bot con el orderId
  const getTelegramBotUrl = () => {
    if (orderId) {
      return `https://t.me/${getBotUsername()}?start=order_${orderId}`;
    }
    return `https://t.me/${getBotUsername()}`;
  };

  // Check if product has Telegram channel
  const hasTelegramChannel = () => {
    return orderData?.product?.telegramChannelId ? true : false;
  };

  useEffect(() => {
    if (orderId) {
      completePayment();
    } else {
      setError('Sesión de pago no válida');
      setLoading(false);
    }
  }, [orderId, sessionId]);

  // Countdown y redirección automática - SOLO si tiene canal de Telegram
  useEffect(() => {
    if (!loading && !error && orderData && hasTelegramChannel()) {
      setRedirecting(true);
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            // Redirigir al bot de Telegram
            window.location.href = getTelegramBotUrl();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [loading, error, orderData]);

  const completePayment = async () => {
    try {
      const res = await api.post('/checkout/complete-payment', {
        orderId,
        sessionId,
      });
      setOrderData(res.data);
      setLoading(false);
    } catch (err: any) {
      console.error('Error completing payment:', err);
      try {
        const orderRes = await api.get(`/checkout/order/${orderId}`);
        setOrderData(orderRes.data);
      } catch (orderErr) {
        setError('Error al procesar el pago');
      }
      setLoading(false);
    }
  };

  const formatPrice = (cents: number, currency: string) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: currency,
    }).format(cents / 100);
  };

  const handleManualRedirect = () => {
    window.location.href = getTelegramBotUrl();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-2xl shadow-lg text-center max-w-md w-full mx-4">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Procesando pago...</h2>
          <p className="text-gray-500">Por favor espera mientras confirmamos tu pago</p>
        </div>
      </div>
    );
  }

  if (error && !orderData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-2xl shadow-lg text-center max-w-md w-full mx-4">
          <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Verificación pendiente</h2>
          <p className="text-gray-500 mb-6">{error}</p>
          <Link
            href="/"
            className="inline-block bg-black text-white px-6 py-3 rounded-xl font-medium hover:bg-gray-800 transition-colors"
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  const order = orderData?.order;
  const product = orderData?.product;
  const tipster = orderData?.tipster;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-md mx-auto">
        {/* Success Card */}
        <div className="bg-white rounded-2xl p-8 shadow-lg text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            ¡Pago Confirmado!
          </h1>
          <p className="text-gray-500 mb-6">
            Tu compra ha sido procesada exitosamente.
          </p>

          {/* Order Details */}
          {product && (
            <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left">
              <h3 className="font-semibold text-gray-900 mb-3">Detalles de la compra</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Producto</span>
                  <span className="font-medium">{product.title}</span>
                </div>
                {tipster && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tipster</span>
                    <span className="font-medium">{tipster.publicName}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Total pagado</span>
                  <span className="font-bold text-green-600">
                    {formatPrice(order?.amountCents || product.priceCents, order?.currency || product.currency)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Estado</span>
                  <span className="font-medium text-green-600">✓ Pagado</span>
                </div>
              </div>
            </div>
          )}

          {/* Telegram Redirect - SOLO si tiene canal de Telegram */}
          {hasTelegramChannel() ? (
            <>
              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6 mb-6">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <MessageCircle className="w-6 h-6 text-blue-600" />
                  <h3 className="font-bold text-blue-900 text-lg">Acceso a tu canal</h3>
                </div>
                
                {redirecting && countdown > 0 && (
                  <div className="mb-4">
                    <p className="text-sm text-blue-800 mb-2">
                      Serás redirigido a Telegram en...
                    </p>
                    <div className="text-4xl font-bold text-blue-600">{countdown}</div>
                  </div>
                )}

                <p className="text-sm text-blue-800 mb-4">
                  Haz clic en el botón para ir a Telegram y recibir tu acceso al canal premium.
                </p>

                <button
                  onClick={handleManualRedirect}
                  className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 text-lg"
                >
                  <MessageCircle className="w-6 h-6" />
                  Ir a Telegram Ahora
                </button>

                <p className="text-xs text-blue-600 mt-3">
                  Se abrirá la app de Telegram automáticamente
                </p>
              </div>

              {/* Instructions - SOLO si tiene canal */}
              <div className="bg-green-50 rounded-xl p-4 mb-6 text-left">
                <h3 className="font-semibold text-green-900 mb-2">📋 Qué pasará ahora</h3>
                <ul className="text-sm text-green-800 space-y-2">
                  <li>1️⃣ Serás redirigido al bot de Antia en Telegram</li>
                  <li>2️⃣ El bot verificará tu pago automáticamente</li>
                  <li>3️⃣ Recibirás el enlace para unirte al canal</li>
                  <li>4️⃣ ¡Listo! Empieza a recibir los pronósticos</li>
                </ul>
              </div>

              {/* Alternative link */}
              <div className="text-center">
                <p className="text-sm text-gray-500 mb-2">¿No se abre automáticamente?</p>
                <a
                  href={getTelegramBotUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline text-sm flex items-center justify-center gap-1"
                >
                  <ExternalLink className="w-4 h-4" />
                  Abrir en nueva pestaña
                </a>
              </div>
            </>
          ) : (
            /* Sin canal de Telegram - Solo mensaje de éxito */
            <div className="bg-green-50 rounded-xl p-6 mb-6">
              <h3 className="font-semibold text-green-900 mb-2">✅ Compra completada</h3>
              <p className="text-sm text-green-800">
                Tu pago ha sido procesado correctamente. Recibirás un email de confirmación con los detalles de tu compra.
              </p>
            </div>
          )}

          {/* Volver al inicio - para productos sin canal */}
          {!hasTelegramChannel() && (
            <Link
              href="/"
              className="inline-block bg-black text-white px-6 py-3 rounded-xl font-medium hover:bg-gray-800 transition-colors w-full text-center"
            >
              Volver al inicio
            </Link>
          )}
        </div>

        {/* Support */}
        <div className="text-center mt-6">
          <p className="text-sm text-gray-500">
            ¿Tienes problemas?{' '}
            <a href="https://t.me/AntiaSupport" target="_blank" className="text-blue-600 hover:underline">
              Contacta con @AntiaSupport
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-2xl shadow-lg text-center max-w-md w-full mx-4">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Cargando...</h2>
        </div>
      </div>
    }>
      <CheckoutSuccessContent />
    </Suspense>
  );
}
