'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { ChevronRight, User, Shield, AlertTriangle } from 'lucide-react';

// For client-side, we need to use NEXT_PUBLIC_ prefix or window.location
const getBaseUrl = () => {
  if (typeof window !== 'undefined') {
    return process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 
           window.location.origin;
  }
  return '';
};

// Mapeo de países a nombres y banderas
const COUNTRY_INFO: Record<string, { name: string; flag: string }> = {
  ES: { name: 'España', flag: '🇪🇸' },
  MX: { name: 'México', flag: '🇲🇽' },
  AR: { name: 'Argentina', flag: '🇦🇷' },
  CO: { name: 'Colombia', flag: '🇨🇴' },
  CL: { name: 'Chile', flag: '🇨🇱' },
  PE: { name: 'Perú', flag: '🇵🇪' },
  US: { name: 'Estados Unidos', flag: '🇺🇸' },
  UK: { name: 'Reino Unido', flag: '🇬🇧' },
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
      // El consentimiento expira en 7 días
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
      const countryParam = country || searchParams.get('country') || '';
      const url = `${BASE_URL}/api/go/${slug}${countryParam ? `?country=${countryParam}` : ''}`;
      
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
    // Redirigir a través del endpoint de tracking
    const redirectUrl = `${BASE_URL}/api/r/${slug}/${houseId}?country=${selectedCountry}`;
    window.open(redirectUrl, '_blank');
  };

  // Gate +18
  if (isAdult === null) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-gray-800 border border-gray-700 rounded-lg p-6 text-center">
          <div className="mb-6">
            <Shield className="w-16 h-16 mx-auto text-yellow-500 mb-4" />
            <h2 className="text-xl font-bold text-white mb-4">
              Verificación de Edad
            </h2>
            <p className="text-gray-300 text-sm mb-6">
              Estás a punto de entrar a un sitio web de información sobre juegos online 
              cuyo contenido se dirige únicamente a <strong>mayores de 18 años</strong>.
            </p>
            <p className="text-white font-medium mb-6">
              ¿Eres mayor de edad?
            </p>
          </div>
          <div className="flex gap-4 justify-center">
            <Button
              onClick={() => handleAdultConfirm(true)}
              className="bg-blue-600 hover:bg-blue-700 px-8"
            >
              Sí
            </Button>
            <button
              onClick={() => handleAdultConfirm(false)}
              className="px-8 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700"
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
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-gray-800 border border-gray-700 rounded-lg p-6 text-center">
          <AlertTriangle className="w-16 h-16 mx-auto text-red-500 mb-4" />
          <h2 className="text-xl font-bold text-white mb-4">
            Acceso Restringido
          </h2>
          <p className="text-gray-300">
            Lo sentimos, no podemos mostrarte este contenido.
            Este sitio está destinado únicamente a mayores de 18 años.
          </p>
          <p className="text-gray-400 text-sm mt-4">
            Gracias por tu comprensión.
          </p>
        </div>
      </div>
    );
  }

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Error
  if (error || !landing) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-gray-800 border border-gray-700 rounded-lg p-6 text-center">
          <AlertTriangle className="w-16 h-16 mx-auto text-yellow-500 mb-4" />
          <h2 className="text-xl font-bold text-white mb-4">
            Landing no encontrada
          </h2>
          <p className="text-gray-300">
            {error || 'No se pudo cargar la página solicitada.'}
          </p>
        </div>
      </div>
    );
  }

  // Landing Page
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black">
      {/* Header */}
      <div className="bg-gray-800/50 border-b border-gray-700">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            {/* Avatar del tipster */}
            <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden">
              {landing.tipster?.avatarUrl ? (
                <Image
                  src={landing.tipster.avatarUrl}
                  alt={landing.tipster.publicName}
                  width={48}
                  height={48}
                  className="object-cover"
                />
              ) : (
                <User className="w-6 h-6 text-gray-400" />
              )}
            </div>
            <div>
              <h1 className="text-white font-bold">
                {landing.tipster?.publicName || 'Tipster'}
              </h1>
              {landing.title && (
                <p className="text-gray-400 text-sm">{landing.title}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Selector de país (si hay múltiples) */}
      {landing.countriesEnabled.length > 1 && (
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-sm">País:</span>
            <select 
              value={selectedCountry} 
              onChange={e => handleCountryChange(e.target.value)}
              className="bg-gray-800 border border-gray-700 text-white px-3 py-2 rounded-lg"
            >
              {landing.countriesEnabled.map(country => (
                <option key={country} value={country}>
                  {COUNTRY_INFO[country]?.flag} {COUNTRY_INFO[country]?.name || country}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Título de la sección */}
      <div className="max-w-2xl mx-auto px-4 py-4">
        <h2 className="text-white text-lg font-semibold mb-2">
          Casas Recomendadas
        </h2>
        {landing.description && (
          <p className="text-gray-400 text-sm">{landing.description}</p>
        )}
      </div>

      {/* Lista de casas */}
      <div className="max-w-2xl mx-auto px-4 pb-8">
        <div className="space-y-3">
          {landing.items.map((item) => (
            <div 
              key={item.id} 
              className="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:border-blue-500 transition-colors cursor-pointer"
              onClick={() => handleHouseClick(item.bettingHouseId)}
            >
              <div className="flex items-center gap-4">
                {/* Logo de la casa */}
                <div className="w-16 h-16 rounded-lg bg-white flex items-center justify-center overflow-hidden flex-shrink-0">
                  {item.house.logoUrl ? (
                    <Image
                      src={item.house.logoUrl}
                      alt={item.house.name}
                      width={64}
                      height={64}
                      className="object-contain p-2"
                    />
                  ) : (
                    <span className="text-gray-900 font-bold text-xs text-center px-1">
                      {item.house.name}
                    </span>
                  )}
                </div>
                
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-semibold">
                    {item.house.name}
                  </h3>
                  <p className="text-gray-400 text-sm truncate">
                    {item.house.termsText}
                  </p>
                </div>

                {/* Botón */}
                <Button 
                  className="bg-blue-600 hover:bg-blue-700 flex items-center gap-1 flex-shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleHouseClick(item.bettingHouseId);
                  }}
                >
                  Regístrate
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {landing.items.length === 0 && (
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 text-center">
            <p className="text-gray-400">
              No hay casas de apuestas disponibles para tu país.
            </p>
          </div>
        )}
      </div>

      {/* Footer con disclaimers */}
      <div className="bg-gray-800/50 border-t border-gray-700 py-6">
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex flex-wrap justify-center gap-4 text-gray-500 text-xs">
            <span className="flex items-center gap-1">
              <Shield className="w-4 h-4" /> +18
            </span>
            <span>Juega con responsabilidad</span>
            <a href="https://www.jugarbien.es" target="_blank" rel="noopener noreferrer" className="hover:text-white">
              jugarbien.es
            </a>
          </div>
          <p className="text-gray-600 text-xs text-center mt-4">
            El juego puede causar adicción. Juega con responsabilidad.
          </p>
        </div>
      </div>
    </div>
  );
}
