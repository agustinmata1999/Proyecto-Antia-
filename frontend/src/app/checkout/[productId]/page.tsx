'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { CreditCard, Lock, User, Mail, Phone, ChevronRight, Loader2 } from 'lucide-react';
import CurrencySelector from '@/components/CurrencySelector';
import { useCurrency } from '@/contexts/CurrencyContext';

interface Product {
  id: string;
  title: string;
  description: string;
  priceCents: number;
  currency: string;
  billingType: string;
  validityDays: number;
  tipster: {
    id: string;
    publicName: string;
    avatarUrl: string | null;
  } | null;
}

type CheckoutMode = 'guest' | 'register';

interface GatewayInfo {
  gateway: 'stripe' | 'redsys';
  geo: {
    country: string;
    countryName: string;
    isSpain: boolean;
  };
  availableMethods: string[];
}

export default function CheckoutPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { formatPrice, currency, symbol } = useCurrency();
  const productId = params.productId as string;
  const telegramUserId = searchParams.get('telegram_user_id') || '';
  const telegramUsername = searchParams.get('telegram_username') || '';

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [checkoutMode, setCheckoutMode] = useState<CheckoutMode>('guest');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptAge, setAcceptAge] = useState(false);
  const [acceptMarketing, setAcceptMarketing] = useState(false);

  // For register mode
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Gateway detection
  const [gatewayInfo, setGatewayInfo] = useState<GatewayInfo | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('card');

  useEffect(() => {
    loadProduct();
    detectGateway();
  }, [productId]);

  const detectGateway = async () => {
    try {
      const res = await api.get('/checkout/detect-gateway');
      setGatewayInfo(res.data);
      // Set default payment method based on available options
      if (res.data.availableMethods?.length > 0) {
        setSelectedPaymentMethod(res.data.availableMethods[0]);
      }
    } catch (err) {
      console.error('Error detecting gateway:', err);
      // Default to Stripe if detection fails
      setGatewayInfo({
        gateway: 'stripe',
        geo: { country: 'XX', countryName: 'Unknown', isSpain: false },
        availableMethods: ['card'],
      });
    }
  };

  const loadProduct = async () => {
    try {
      const res = await api.get(`/checkout/product/${productId}`);
      setProduct(res.data);
    } catch (err) {
      setError('Producto no encontrado o no disponible');
    } finally {
      setLoading(false);
    }
  };

  // Use the formatPrice from context instead of local function
  // The context already handles currency conversion

  const handleSubmit = async () => {
    setError('');

    // Validation
    if (!email) {
      setError('El correo electrónico es obligatorio');
      return;
    }

    if (!acceptTerms || !acceptAge) {
      setError('Debes aceptar los términos y confirmar que eres mayor de edad');
      return;
    }

    if (checkoutMode === 'register') {
      if (!password || !confirmPassword) {
        setError('La contraseña es obligatoria para registrarse');
        return;
      }
      if (password !== confirmPassword) {
        setError('Las contraseñas no coinciden');
        return;
      }
      if (password.length < 8) {
        setError('La contraseña debe tener al menos 8 caracteres');
        return;
      }
    }

    setSubmitting(true);

    try {
      // Create checkout session
      const res = await api.post('/checkout/session', {
        productId,
        originUrl: window.location.origin,
        isGuest: checkoutMode === 'guest',
        email,
        phone: phone || undefined,
        telegramUserId: telegramUserId || undefined,
        telegramUsername: telegramUsername || undefined,
      });

      // Redirect to Stripe
      if (res.data.url) {
        window.location.href = res.data.url;
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al procesar el pago');
      setSubmitting(false);
    }
  };

  // Simulate payment for testing
  const handleSimulatePayment = async () => {
    setError('');

    if (!email) {
      setError('El correo electrónico es obligatorio');
      return;
    }

    if (!acceptTerms || !acceptAge) {
      setError('Debes aceptar los términos y confirmar que eres mayor de edad');
      return;
    }

    setSubmitting(true);

    try {
      const res = await api.post('/checkout/test-purchase', {
        productId,
        email,
        phone: phone || undefined,
        telegramUserId: telegramUserId || undefined,
        telegramUsername: telegramUsername || undefined,
      });

      if (res.data.success) {
        // Redirect to success page
        window.location.href = `/checkout/success?order_id=${res.data.orderId}`;
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al simular el pago');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error && !product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <a href="/" className="text-blue-600 hover:underline">Volver al inicio</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-md mx-auto">
        {/* Gateway Info Banner */}
        {gatewayInfo && (
          <div className={`mb-4 p-3 rounded-xl text-center text-sm ${
            gatewayInfo.geo.isSpain 
              ? 'bg-yellow-50 border border-yellow-200 text-yellow-800' 
              : 'bg-blue-50 border border-blue-200 text-blue-800'
          }`}>
            {gatewayInfo.geo.isSpain ? (
              <>🇪🇸 Pago desde España - Disponible: Tarjeta {gatewayInfo.availableMethods.includes('bizum') && '+ Bizum'}</>
            ) : (
              <>🌍 Pago desde {gatewayInfo.geo.countryName} - Tarjeta de crédito/débito</>
            )}
          </div>
        )}

        {/* Header */}
        <div className="bg-white rounded-t-2xl p-6 border-b">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-gray-900">Antia</h1>
            <CurrencySelector variant="pill" />
          </div>
          <div className="text-center mt-4">
            <p className="text-4xl font-bold text-gray-900">
              {product && formatPrice(product.priceCents)}
            </p>
            <p className="text-gray-500 mt-1">{product?.title}</p>
          </div>
        </div>

        {/* Main Form */}
        <div className="bg-white rounded-b-2xl p-6 shadow-lg">
          {/* Checkout Mode Selection */}
          <div className="space-y-3 mb-6">
            <label className="flex items-center p-4 border rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
              <input
                type="radio"
                name="checkoutMode"
                value="guest"
                checked={checkoutMode === 'guest'}
                onChange={() => setCheckoutMode('guest')}
                className="w-4 h-4 text-blue-600"
              />
              <div className="ml-3">
                <p className="font-medium text-gray-900">Pagar como invitado</p>
                <p className="text-sm text-gray-500">Solo necesitas tu email para acceder</p>
              </div>
            </label>

            <label className="flex items-center p-4 border rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
              <input
                type="radio"
                name="checkoutMode"
                value="register"
                checked={checkoutMode === 'register'}
                onChange={() => setCheckoutMode('register')}
                className="w-4 h-4 text-blue-600"
              />
              <div className="ml-3">
                <p className="font-medium text-gray-900">Registrarme para futuras compras</p>
                <p className="text-sm text-gray-500">Crea una cuenta para gestionar tus suscripciones</p>
              </div>
            </label>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Correo electrónico *
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  className="w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Teléfono (opcional)
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+34 600 000 000"
                  className="w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Payment Method Selection (for Spain - Redsys) */}
            {gatewayInfo?.geo.isSpain && gatewayInfo.availableMethods.length > 1 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Método de pago
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className={`flex items-center justify-center p-4 border-2 rounded-xl cursor-pointer transition-all ${
                    selectedPaymentMethod === 'card' 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="card"
                      checked={selectedPaymentMethod === 'card'}
                      onChange={() => setSelectedPaymentMethod('card')}
                      className="sr-only"
                    />
                    <div className="text-center">
                      <CreditCard className="w-6 h-6 mx-auto mb-1" />
                      <span className="text-sm font-medium">Tarjeta</span>
                    </div>
                  </label>
                  <label className={`flex items-center justify-center p-4 border-2 rounded-xl cursor-pointer transition-all ${
                    selectedPaymentMethod === 'bizum' 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="bizum"
                      checked={selectedPaymentMethod === 'bizum'}
                      onChange={() => setSelectedPaymentMethod('bizum')}
                      className="sr-only"
                    />
                    <div className="text-center">
                      <span className="text-2xl">📱</span>
                      <span className="text-sm font-medium block">Bizum</span>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* Registration Fields */}
            {checkoutMode === 'register' && (
              <>
                <div className="bg-blue-50 p-4 rounded-xl mb-4">
                  <p className="text-sm text-blue-800">
                    <strong>Nota:</strong> Al registrarte, podrás gestionar tus suscripciones y ver tu historial de compras.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contraseña *
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirmar contraseña *
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repite la contraseña"
                    className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </>
            )}
          </div>

          {/* Checkboxes */}
          <div className="space-y-3 mt-6">
            <label className="flex items-start cursor-pointer">
              <input
                type="checkbox"
                checked={acceptAge}
                onChange={(e) => setAcceptAge(e.target.checked)}
                className="w-4 h-4 mt-1 text-blue-600 rounded"
              />
              <span className="ml-2 text-sm text-gray-600">
                Confirmo que soy mayor de 18 años *
              </span>
            </label>

            <label className="flex items-start cursor-pointer">
              <input
                type="checkbox"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                className="w-4 h-4 mt-1 text-blue-600 rounded"
              />
              <span className="ml-2 text-sm text-gray-600">
                Acepto los{' '}
                <a href="/terms" className="text-blue-600 hover:underline">Términos de Uso</a>{' '}
                y la{' '}
                <a href="/privacy" className="text-blue-600 hover:underline">Política de Privacidad</a> *
              </span>
            </label>

            <label className="flex items-start cursor-pointer">
              <input
                type="checkbox"
                checked={acceptMarketing}
                onChange={(e) => setAcceptMarketing(e.target.checked)}
                className="w-4 h-4 mt-1 text-blue-600 rounded"
              />
              <span className="ml-2 text-sm text-gray-600">
                Acepto recibir comunicaciones sobre novedades y promociones
              </span>
            </label>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Submit Buttons */}
          <div className="space-y-3 mt-6">
            {/* Real Payment Button */}
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full bg-black text-white py-4 rounded-xl font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <CreditCard className="w-5 h-5" />
                  Proceder al pago con Stripe
                </>
              )}
            </button>

            {/* Simulate Payment Button (for testing) */}
            <button
              onClick={handleSimulatePayment}
              disabled={submitting}
              className="w-full bg-green-600 text-white py-4 rounded-xl font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  ✅ Simular Pago (Testing)
                </>
              )}
            </button>

            <p className="text-xs text-center text-gray-500">
              El botón verde es solo para pruebas. En producción solo estará el pago real.
            </p>
          </div>

          {/* Security Badge */}
          <div className="flex items-center justify-center gap-2 mt-4 text-gray-500">
            <Lock className="w-4 h-4" />
            <span className="text-sm">Pago seguro</span>
          </div>
        </div>

        {/* Product Summary */}
        {product && (
          <div className="mt-6 bg-white rounded-2xl p-6 shadow-lg">
            <h3 className="font-semibold text-gray-900 mb-4">Resumen de compra</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{product.title}</span>
                <span className="font-medium">{formatPrice(product.priceCents)}</span>
              </div>
              {product.validityDays && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Validez</span>
                  <span className="font-medium">{product.validityDays} días</span>
                </div>
              )}
              {product.tipster && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tipster</span>
                  <span className="font-medium">{product.tipster.publicName}</span>
                </div>
              )}
              <div className="border-t pt-3 flex justify-between">
                <span className="font-semibold text-gray-900">Total</span>
                <span className="font-bold text-lg">{formatPrice(product.priceCents)}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
