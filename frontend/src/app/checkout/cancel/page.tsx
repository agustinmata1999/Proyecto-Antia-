'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { XCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';

function CheckoutCancelContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('order_id');

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-8 px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl p-8 shadow-lg text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-10 h-10 text-red-600" />
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Pago Cancelado
          </h1>
          <p className="text-gray-500 mb-6">
            Has cancelado el proceso de pago. No se ha realizado ningún cargo.
          </p>

          <div className="space-y-3">
            {orderId && (
              <Link
                href={`/checkout/${orderId}`}
                className="block w-full bg-black text-white py-3 rounded-xl font-medium hover:bg-gray-800 transition-colors"
              >
                Intentar de nuevo
              </Link>
            )}
            <Link
              href="/"
              className="block w-full bg-gray-100 text-gray-900 py-3 rounded-xl font-medium hover:bg-gray-200 transition-colors"
            >
              Volver al inicio
            </Link>
          </div>
        </div>

        <div className="text-center mt-6">
          <p className="text-sm text-gray-500">
            Si cambiaste de opinión, puedes volver a intentarlo en cualquier momento.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutCancelPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-2xl shadow-lg text-center max-w-md w-full mx-4">
          <Loader2 className="w-12 h-12 animate-spin text-gray-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Cargando...</h2>
        </div>
      </div>
    }>
      <CheckoutCancelContent />
    </Suspense>
  );
}
