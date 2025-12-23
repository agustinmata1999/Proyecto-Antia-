'use client';

import { AlertTriangle } from 'lucide-react';

interface KycBannerProps {
  onComplete: () => void;
}

export default function KycBanner({ onComplete }: KycBannerProps) {
  return (
    <div className="bg-orange-50 border-l-4 border-orange-400 p-4 mb-6 rounded-r-lg">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <AlertTriangle className="h-5 w-5 text-orange-400" />
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-orange-800">
            ¡Completa tus datos de cobro!
          </h3>
          <div className="mt-2 text-sm text-orange-700">
            <p>
              Para poder recibir tus ganancias, necesitas completar tus datos bancarios/KYC.
              Esto solo te llevará unos minutos.
            </p>
          </div>
          <div className="mt-4">
            <div className="-mx-2 -my-1.5 flex">
              <button
                onClick={onComplete}
                className="bg-orange-100 px-4 py-2 rounded-md text-sm font-medium text-orange-800 hover:bg-orange-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-orange-50 focus:ring-orange-600 transition"
              >
                Completar ahora →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
