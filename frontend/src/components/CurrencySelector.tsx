'use client';

import { useCurrency } from '@/contexts/CurrencyContext';

interface CurrencySelectorProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'minimal' | 'pill';
}

export default function CurrencySelector({ 
  className = '', 
  size = 'md',
  variant = 'default' 
}: CurrencySelectorProps) {
  const { currency, setCurrency, loading } = useCurrency();

  if (loading) {
    return (
      <div className={`animate-pulse bg-gray-200 rounded ${size === 'sm' ? 'w-16 h-6' : 'w-20 h-8'}`} />
    );
  }

  // Pill variant - toggle button style
  if (variant === 'pill') {
    return (
      <div className={`inline-flex rounded-full bg-gray-100 p-1 ${className}`}>
        <button
          onClick={() => setCurrency('EUR')}
          className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
            currency === 'EUR'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          € EUR
        </button>
        <button
          onClick={() => setCurrency('USD')}
          className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
            currency === 'USD'
              ? 'bg-white text-green-600 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          $ USD
        </button>
      </div>
    );
  }

  // Minimal variant - just icons
  if (variant === 'minimal') {
    return (
      <div className={`inline-flex gap-1 ${className}`}>
        <button
          onClick={() => setCurrency('EUR')}
          className={`p-1.5 rounded transition-colors ${
            currency === 'EUR'
              ? 'bg-blue-100 text-blue-600'
              : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
          }`}
          title="Euro"
        >
          €
        </button>
        <button
          onClick={() => setCurrency('USD')}
          className={`p-1.5 rounded transition-colors ${
            currency === 'USD'
              ? 'bg-green-100 text-green-600'
              : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
          }`}
          title="US Dollar"
        >
          $
        </button>
      </div>
    );
  }

  // Default variant - select dropdown
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2',
  };

  return (
    <select
      value={currency}
      onChange={(e) => setCurrency(e.target.value as 'EUR' | 'USD')}
      className={`border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer ${sizeClasses[size]} ${className}`}
    >
      <option value="EUR">€ EUR</option>
      <option value="USD">$ USD</option>
    </select>
  );
}

// Inline currency display with option to switch
export function CurrencyDisplay({ 
  amountCents, 
  fromCurrency = 'EUR',
  className = '',
  showSwitch = false,
}: { 
  amountCents: number; 
  fromCurrency?: 'EUR' | 'USD';
  className?: string;
  showSwitch?: boolean;
}) {
  const { formatPrice, currency, setCurrency } = useCurrency();

  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      <span>{formatPrice(amountCents, fromCurrency)}</span>
      {showSwitch && (
        <button
          onClick={() => setCurrency(currency === 'EUR' ? 'USD' : 'EUR')}
          className="text-xs text-gray-400 hover:text-gray-600"
          title={`Cambiar a ${currency === 'EUR' ? 'USD' : 'EUR'}`}
        >
          ↔
        </button>
      )}
    </span>
  );
}
