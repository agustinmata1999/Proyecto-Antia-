'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Shield, AlertTriangle, CheckCircle, ArrowRight } from 'lucide-react';

// For client-side, use relative URL that goes through Next.js proxy
const getBaseUrl = () => {
  return '';
};

// Detectar país por timezone del navegador (sin servicios externos)
const detectCountryByTimezone = (): string => {
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const timezoneCountryMap: Record<string, string> = {
      // España
      'Europe/Madrid': 'ES', 'Atlantic/Canary': 'ES',
      // México
      'America/Mexico_City': 'MX', 'America/Cancun': 'MX', 'America/Monterrey': 'MX',
      'America/Tijuana': 'MX', 'America/Chihuahua': 'MX',
      // Argentina
      'America/Buenos_Aires': 'AR', 'America/Argentina/Buenos_Aires': 'AR',
      'America/Cordoba': 'AR', 'America/Argentina/Cordoba': 'AR',
      // Colombia
      'America/Bogota': 'CO',
      // Chile
      'America/Santiago': 'CL',
      // Perú
      'America/Lima': 'PE',
      // USA
      'America/New_York': 'US', 'America/Los_Angeles': 'US', 'America/Chicago': 'US',
      'America/Denver': 'US', 'America/Phoenix': 'US',
      // UK
      'Europe/London': 'UK',
      // Portugal
      'Europe/Lisbon': 'PT',
      // Alemania
      'Europe/Berlin': 'DE',
    };
    return timezoneCountryMap[timezone] || '';
  } catch {
    return '';
  }
};

// Mapeo de países a nombres
const COUNTRY_INFO: Record<string, { name: string }> = {
  ES: { name: 'España' },
  MX: { name: 'México' },
  AR: { name: 'Argentina' },
  CO: { name: 'Colombia' },
  CL: { name: 'Chile' },
  PE: { name: 'Perú' },
  US: { name: 'Estados Unidos' },
  UK: { name: 'Reino Unido' },
  PT: { name: 'Portugal' },
  DE: { name: 'Alemania' },
};

interface LandingData {
  id: string;
  slug: string;
  title: string | null;
  description: string | null;
  tipster: {
    id: string;
    publicName: string;
    avatarUrl: string | null;
  } | null;
  countriesEnabled: string[];
  selectedCountry: string;
  items: Array<{
    id: string;
    bettingHouseId: string;
    orderIndex: number;
    house: {
      id: string;
      name: string;
      slug: string;
      logoUrl: string | null;
      termsText: string;
      websiteUrl: string | null;
    };
  }>;
}

export default function PublicLandingPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params.slug as string;

  const [isAdult, setIsAdult] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [landing, setLanding] = useState<LandingData | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Verificar si ya confirmó ser mayor de edad
  useEffect(() => {
    const adultConfirmed = localStorage.getItem('antia_adult_confirmed');
    if (adultConfirmed) {
      const confirmedAt = parseInt(adultConfirmed);
      const dayInMs = 24 * 60 * 60 * 1000;
      if (Date.now() - confirmedAt < 7 * dayInMs) {
        setIsAdult(true);
      }
    }
  }, []);

  // Cargar datos de la landing
  useEffect(() => {
    if (isAdult === true) {
      loadLanding();
    } else if (isAdult === false) {
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, [isAdult, slug]);

  const loadLanding = async (country?: string) => {
    try {
      setLoading(true);
      const baseUrl = getBaseUrl();
      
      let countryParam = country || searchParams.get('country') || '';
      if (!countryParam) {
        countryParam = detectCountryByTimezone();
      }
      
      const url = `${baseUrl}/api/go/${slug}${countryParam ? `?country=${countryParam}` : ''}`;
      
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error('Landing no encontrada');
      }
      
      const data = await res.json();
      setLanding(data);
      setSelectedCountry(data.selectedCountry);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAdultConfirm = (isAdultUser: boolean) => {
    if (isAdultUser) {
      localStorage.setItem('antia_adult_confirmed', Date.now().toString());
      setIsAdult(true);
    } else {
      setIsAdult(false);
    }
  };

  const handleCountryChange = (country: string) => {
    setSelectedCountry(country);
    loadLanding(country);
  };

  const handleHouseClick = (houseId: string) => {
    const baseUrl = getBaseUrl();
    const redirectUrl = `${baseUrl}/api/r/${slug}/${houseId}?country=${selectedCountry}`;
    window.open(redirectUrl, '_blank');
  };

  // Gate +18
  if (isAdult === null) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white border border-gray-200 rounded-2xl p-8 text-center shadow-lg">
          <div className="mb-6">
            <div className="w-16 h-16 mx-auto bg-amber-100 rounded-full flex items-center justify-center mb-4">
              <Shield className="w-8 h-8 text-amber-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Verificación de Edad
            </h2>
            <p className="text-gray-600 text-sm mb-6">
              Estás a punto de entrar a un sitio web de información sobre juegos online 
              cuyo contenido se dirige únicamente a <strong className="text-gray-900">mayores de 18 años</strong>.
            </p>
            <p className="text-gray-900 font-medium mb-6">
              ¿Eres mayor de edad?
            </p>
          </div>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => handleAdultConfirm(true)}
              className="px-8 py-3 bg-blue-500 text-white font-medium rounded-full hover:bg-blue-600 transition-colors"
            >
              Sí, soy mayor
            </button>
            <button
              onClick={() => handleAdultConfirm(false)}
              className="px-8 py-3 border border-gray-300 text-gray-700 font-medium rounded-full hover:bg-gray-50 transition-colors"
            >
              No
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-6">
            Al continuar, confirmas que cumples con la edad legal para acceder 
            a contenido relacionado con apuestas en tu jurisdicción.
          </p>
        </div>
      </div>
    );
  }

  // Usuario menor de edad
  if (isAdult === false) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white border border-gray-200 rounded-2xl p-8 text-center shadow-lg">
          <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Acceso Restringido
          </h2>
          <p className="text-gray-600">
            Lo sentimos, no podemos mostrarte este contenido.
            Este sitio está destinado únicamente a mayores de 18 años.
          </p>
          <p className="text-gray-500 text-sm mt-4">
            Gracias por tu comprensión.
          </p>
        </div>
      </div>
    );
  }

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  // Error
  if (error || !landing) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white border border-gray-200 rounded-2xl p-8 text-center shadow-lg">
          <div className="w-16 h-16 mx-auto bg-amber-100 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-amber-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Landing no encontrada
          </h2>
          <p className="text-gray-600">
            {error || 'No se pudo cargar la página solicitada.'}
          </p>
        </div>
      </div>
    );
  }

  // Landing Page Principal - Diseño limpio
  return (
    <div className="min-h-screen bg-white">
      {/* Header con logo */}
      <header className="py-6 border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4">
          <h1 className="text-2xl font-bold text-center text-gray-900">Antia</h1>
        </div>
      </header>

      {/* Hero Banner con Tipster */}
      <div className="max-w-2xl mx-auto px-4 pt-6">
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-blue-900 to-blue-700 h-32">
          {/* Fondo decorativo */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute right-0 top-0 w-48 h-48 bg-blue-400 rounded-full -translate-y-1/2 translate-x-1/4"></div>
            <div className="absolute left-1/2 bottom-0 w-32 h-32 bg-blue-500 rounded-full translate-y-1/2"></div>
          </div>
          
          {/* Contenido del banner */}
          <div className="relative h-full flex items-center px-6">
            {/* Avatar del tipster */}
            <div className="w-20 h-20 rounded-full border-4 border-white overflow-hidden bg-gray-200 flex-shrink-0">
              {landing.tipster?.avatarUrl ? (
                <Image
                  src={landing.tipster.avatarUrl}
                  alt={landing.tipster.publicName}
                  width={80}
                  height={80}
                  className="object-cover w-full h-full"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                  <span className="text-white text-2xl font-bold">
                    {landing.tipster?.publicName?.charAt(0) || 'T'}
                  </span>
                </div>
              )}
            </div>
            
            {/* Info del tipster */}
            <div className="ml-4">
              <div className="flex items-center gap-2">
                <h2 className="text-white text-xl font-bold">
                  {landing.tipster?.publicName || 'Tipster'}
                </h2>
                <CheckCircle className="w-5 h-5 text-blue-300 fill-blue-300" />
              </div>
              <p className="text-blue-200 text-sm">
                #{landing.id.slice(-4).toUpperCase()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Selector de país (si hay múltiples) */}
      {landing.countriesEnabled.length > 1 && (
        <div className="max-w-2xl mx-auto px-4 pt-4">
          <select 
            value={selectedCountry} 
            onChange={e => handleCountryChange(e.target.value)}
            className="w-full bg-white border border-gray-200 text-gray-700 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {landing.countriesEnabled.map(country => (
              <option key={country} value={country}>
                {COUNTRY_INFO[country]?.name || country}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Título y descripción de la campaña (si están configurados) */}
      {(landing.title || landing.description) && (
        <div className="max-w-2xl mx-auto px-4 pt-8">
          {landing.title && (
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {landing.title}
            </h2>
          )}
          {landing.description && (
            <p className="text-gray-600">{landing.description}</p>
          )}
        </div>
      )}

      {/* Título de sección */}
      <div className="max-w-2xl mx-auto px-4 pt-6 pb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Selecciona tu pronostico
        </h3>
      </div>

      {/* Lista de casas de apuestas */}
      <div className="max-w-2xl mx-auto px-4 pb-8">
        <div className="space-y-3">
          {landing.items.map((item) => (
            <div 
              key={item.id} 
              className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-4">
                {/* Logo de la casa */}
                <div className="w-36 h-16 flex items-center justify-center overflow-hidden flex-shrink-0 bg-white rounded-lg p-2">
                  {item.house.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.house.logoUrl}
                      alt={item.house.name}
                      className="max-w-full max-h-full object-contain"
                    />
                  ) : (
                    <span className="text-gray-900 font-bold text-xl">
                      {item.house.name}
                    </span>
                  )}
                </div>
                
                {/* Info de la casa */}
                <div className="flex-1 min-w-0">
                  <p className="text-gray-600 text-sm">
                    {item.house.termsText || 'Deposita al menos 10€'}
                  </p>
                </div>

                {/* Botón de registro */}
                <button 
                  onClick={() => handleHouseClick(item.bettingHouseId)}
                  className="flex-shrink-0 flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium px-5 py-2.5 rounded-full transition-colors"
                >
                  Registrarse
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {landing.items.length === 0 && (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center">
            <p className="text-gray-500">
              No hay casas de apuestas disponibles para tu país.
            </p>
          </div>
        )}
      </div>

      {/* Footer con disclaimers */}
      <footer className="bg-gray-50 border-t border-gray-200 py-6 mt-auto">
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex flex-wrap justify-center gap-4 text-gray-500 text-xs">
            <span className="flex items-center gap-1">
              <Shield className="w-4 h-4" /> +18
            </span>
            <span>Juega con responsabilidad</span>
            <a 
              href="https://www.jugarbien.es" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="hover:text-gray-700 transition-colors"
            >
              jugarbien.es
            </a>
          </div>
          <p className="text-gray-400 text-xs text-center mt-4">
            El juego puede causar adicción. Juega con responsabilidad.
          </p>
        </div>
      </footer>
    </div>
  );
}
